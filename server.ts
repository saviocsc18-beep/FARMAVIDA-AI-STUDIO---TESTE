import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { FarmaVidaDB, DatabaseSchema } from './server/db.js';
import { FirestoreDataService } from './server/firestoreService.js';
import { authMiddleware, requireAuth, requireAdmin, generateAuthToken } from './server/auth.js';
import { generateStoreAnalysis } from './server/gemini.js';
import { loadAppConfig, getPublicClientConfig } from './server/config.js';
import { Sale, StockMovement, CashMovement, PurchaseOrder, CashRegister, Product, ApprovalRequest, InventoryCount, InventoryItemCount, InventoryHistoryVersion, WorkShift, Terminal, OperatorCashSummary } from './src/types.js';

dotenv.config();

// Enforce environment validation on boot
const appConfig = loadAppConfig();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(authMiddleware);

const db = FarmaVidaDB.getInstance();
const firestore = FirestoreDataService.getInstance();

// -------------------------------------------------------------
// HELPER: Strip sensitive cost data for non-admin users
// -------------------------------------------------------------
function sanitizeProductForRole(prod: any, role?: string) {
  if (role !== 'admin') {
    const { costPrice, ...rest } = prod;
    return rest;
  }
  return prod;
}

// -------------------------------------------------------------
// HELPER: Sanitização rigorosa de Inventário para Colaborador (Contagem Cega)
// -------------------------------------------------------------
function sanitizeInventoryForCollaborator(inv: InventoryCount): any {
  const isBlindCountStage =
    inv.status === 'aberto' ||
    inv.status === 'em_contagem' ||
    inv.status === 'reaberto' ||
    inv.status === 'aguardando_revisao';

  const sanitizedItems = (inv.items || []).map((item) => {
    if (isBlindCountStage) {
      const {
        expectedQuantitySnapshot,
        intermediateMovementsQuantity,
        expectedQuantityAdjusted,
        difference,
        financialImpact,
        unitCost,
        recordedStock,
        ...safeProps
      } = item;
      return safeProps;
    }
    return item;
  });

  if (isBlindCountStage) {
    const {
      totalFinancialImpact,
      hasDivergences,
      ...safeInv
    } = inv;
    return {
      ...safeInv,
      items: sanitizedItems,
    };
  }

  return {
    ...inv,
    items: sanitizedItems,
  };
}

// -------------------------------------------------------------
// HELPER: Cálculo de Movimentações Intermediárias (Concorrência Operacional)
// -------------------------------------------------------------
function calculateIntermediateMovements(data: any, productId: string, fromTimestamp: string, toTimestamp?: string): number {
  if (!fromTimestamp) return 0;
  const fromDate = new Date(fromTimestamp).getTime();
  const toDate = toTimestamp ? new Date(toTimestamp).getTime() : Date.now();

  const movements = (data.stockMovements || []).filter((m: StockMovement) => {
    if (m.productId !== productId) return false;
    const movTime = new Date(m.timestamp).getTime();
    return movTime > fromDate && movTime <= toDate;
  });

  return movements.reduce((acc: number, m: StockMovement) => acc + (Number(m.quantity) || 0), 0);
}

function recalculateInventorySummary(data: any, inv: InventoryCount) {
  const toTime = inv.countCompletedAt || new Date().toISOString();

  let totalFinancialImpact = 0;
  let hasDivergences = false;
  let countedProducts = 0;

  for (const item of (inv.items || [])) {
    const snapshot = item.expectedQuantitySnapshot ?? 0;
    const intermediateMovements = calculateIntermediateMovements(
      data,
      item.productId,
      inv.openedAt || inv.createdAt,
      toTime
    );
    item.intermediateMovementsQuantity = intermediateMovements;
    item.expectedQuantityAdjusted = snapshot + intermediateMovements;

    if (item.isCounted && item.countedQuantity !== null && item.countedQuantity !== undefined) {
      countedProducts++;
      item.difference = Number(item.countedQuantity) - item.expectedQuantityAdjusted;
      item.financialImpact = item.difference * (item.unitCost || 0);
      if (Math.abs(item.difference) > 0.0001) {
        hasDivergences = true;
      }
      totalFinancialImpact += item.financialImpact;
    } else {
      item.difference = undefined;
      item.financialImpact = undefined;
    }
  }

  inv.totalProducts = (inv.items || []).length;
  inv.countedProducts = countedProducts;
  inv.hasDivergences = hasDivergences;
  inv.totalFinancialImpact = totalFinancialImpact;
}

// -------------------------------------------------------------
// 1. HEALTH & METADATA & CONFIG
// -------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    time: new Date().toISOString(), 
    app: 'FarmaVida', 
    environment: appConfig.env,
    organizationId: appConfig.organizationId,
    persistence: 'firestore' 
  });
});

app.get('/api/config/public', (req, res) => {
  res.json(getPublicClientConfig());
});

// -------------------------------------------------------------
// AUTHENTICATION & SECURE PIN VERIFICATION (PHASE-06)
// -------------------------------------------------------------
app.post('/api/auth/bootstrap-first-admin', async (req, res) => {
  try {
    const { name, email, pin, roleTitle, phone } = req.body;
    if (!name || !email || !pin) {
      return res.status(400).json({ error: 'Nome, e-mail e PIN (mínimo 4 dígitos) são obrigatórios.' });
    }

    const bootstrapResult = await firestore.bootstrapFirstAdmin({
      name,
      email,
      pin: String(pin),
      roleTitle,
      phone,
    });

    if (!bootstrapResult.success) {
      return res.status(403).json({ error: bootstrapResult.error });
    }

    res.json({
      success: true,
      message: 'Primeiro Administrador inicializado com sucesso!',
      user: bootstrapResult.user,
      token: bootstrapResult.token,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao inicializar primeiro administrador.' });
  }
});
app.post('/api/auth/login-pin', async (req, res) => {
  try {
    const { username, pin, terminalId } = req.body;
    if (!username || !pin) {
      return res.status(400).json({ error: 'Usuário e PIN são obrigatórios.' });
    }

    const authResult = await firestore.verifyUserPin(username.trim(), String(pin).trim(), terminalId);
    if (!authResult.success) {
      return res.status(401).json({ error: authResult.error || 'Credenciais inválidas.' });
    }

    res.json({
      success: true,
      user: authResult.user,
      token: authResult.token,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro interno na autenticação.' });
  }
});

app.post('/api/auth/switch-operator', async (req, res) => {
  try {
    const { operatorId, toUserId, fromUserId, pin, terminalId, autoStartShift } = req.body;
    const targetUserId = (operatorId || toUserId || '').trim();
    if (!targetUserId || !pin) {
      return res.status(400).json({ error: 'Identificador do operador e PIN são obrigatórios.' });
    }

    const authResult = await firestore.verifyUserPin(targetUserId, String(pin).trim(), terminalId);
    if (!authResult.success) {
      return res.status(401).json({ error: authResult.error || 'PIN de operador incorreto.' });
    }

    const user = authResult.user!;

    // Also update legacy db state for memory consistency
    try {
      const data = db.getRawData();
      if (autoStartShift) {
        const hasOpenShift = (data.shifts || []).some((s: any) => s.userId === user.id && s.status !== 'encerrado');
        if (!hasOpenShift) {
          const newShift: WorkShift = {
            id: `shift_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            userId: user.id,
            userName: user.name,
            storeId: user.storeId || 'store_matriz',
            date: new Date().toISOString().slice(0, 10),
            startedAt: new Date().toISOString(),
            status: 'em_andamento',
            breaks: [],
          };
          if (!data.shifts) data.shifts = [];
          data.shifts.unshift(newShift);
          await db.save(data);
        }
      }
    } catch {}

    res.json({
      success: true,
      user,
      token: authResult.token,
      message: `Operador trocado para ${user.name}. Terminal, turno e caixa permanecem intactos.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro na troca de operador.' });
  }
});

app.post('/api/auth/verify-manager-pin', async (req, res) => {
  try {
    const { managerId, pin } = req.body;
    if (!managerId || !pin) {
      return res.status(400).json({ error: 'Identificador do gerente e PIN são obrigatórios.' });
    }

    const verifyResult = await firestore.verifyManagerPin(managerId.trim(), String(pin).trim());
    if (!verifyResult.success) {
      return res.status(403).json({ error: verifyResult.error || 'PIN de gerente inválido.' });
    }

    res.json({
      success: true,
      managerName: verifyResult.managerName,
      message: `Autorização aprovada por ${verifyResult.managerName}.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao validar autorização.' });
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({
    user: req.authenticatedUser,
  });
});

const normalizePurchaseOrder = (po: any) => {
  const calculatedTotal = (po.items || []).reduce(
    (acc: number, it: any) => acc + (Number(it.totalCost) || Number(it.totalEstimated) || ((Number(it.quantityOrdered) || 0) * (Number(it.unitCost) || Number(it.unitCostEstimated) || 0))),
    0
  );
  const totalCost = typeof po.totalCost === 'number' ? po.totalCost : (typeof po.totalEstimated === 'number' ? po.totalEstimated : calculatedTotal);
  const totalEstimated = typeof po.totalEstimated === 'number' ? po.totalEstimated : totalCost;
  return {
    ...po,
    totalCost,
    totalEstimated,
  };
};

// Full state sync for fast frontend hydration
app.get('/api/sync', (req, res) => {
  try {
    const role = (req.headers['x-user-role'] as string) || (req.query.role as string) || 'colaborador';
    const data = db.getRawData();
    res.json({
      store: data.stores[0] || null,
      terminals: data.terminals || [],
      users: data.users || [],
      products: (data.products || []).map((p) => sanitizeProductForRole(p, role)),
      sales: data.sales || [],
      cashRegisters: (data.cashRegisters || []).map((cr: any) => ({
        ...cr,
        movements: (data.cashMovements || []).filter((m: any) => m.cashRegisterId === cr.id),
      })),
      stockMovements: data.stockMovements || [],
      workShifts: data.shifts || [],
      unmetDemands: data.unmetDemands || [],
      purchaseOrders: (data.purchaseOrders || []).map(normalizePurchaseOrder),
      suppliers: data.suppliers || [],
      tasks: data.tasks || [],
      inventories: (data.inventories || []).map((inv: InventoryCount) => {
        if (role !== 'admin') {
          return sanitizeInventoryForCollaborator(inv);
        }
        recalculateInventorySummary(data, inv);
        return inv;
      }),
      salesGoals: (data.targets || []).flatMap((t: any) => {
        const storeTotal = (data.sales || []).reduce((acc: number, s: any) => acc + (s.total || 0), 0);
        const goals: any[] = [
          {
            id: t.id,
            storeId: t.storeId,
            userId: undefined,
            userName: undefined,
            month: t.month,
            targetAmount: t.storeRevenueTarget || 0,
            currentAmount: storeTotal,
            individualTargets: t.individualTargets || [],
          },
        ];
        if (Array.isArray(t.individualTargets)) {
          for (const it of t.individualTargets) {
            const sellerSales = (data.sales || [])
              .filter((s: any) => s.sellerId === it.userId)
              .reduce((acc: number, s: any) => acc + (s.total || 0), 0);
            goals.push({
              id: `${t.id}_${it.userId}`,
              storeId: t.storeId,
              userId: it.userId,
              userName: it.userName,
              month: t.month,
              targetAmount: it.revenueTarget || 0,
              currentAmount: sellerSales,
              individualTargets: [],
            });
          }
        }
        return goals;
      }),
      auditLogs: data.auditLogs || [],
      aiReports: data.aiReports || [],
      customers: data.customers || [],
      approvals: data.approvals || [],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/customers', (req, res) => {
  const data = db.getRawData();
  res.json(data.customers || []);
});

// -------------------------------------------------------------
// CENTRAL DE APROVAÇÕES & EFEITOS OPERACIONAIS REAIS (PHASE-03)
// -------------------------------------------------------------
app.get('/api/approvals', (req, res) => {
  const data = db.getRawData();
  res.json(data.approvals || []);
});

app.post('/api/approvals', async (req, res) => {
  const { 
    type, 
    title, 
    description, 
    reason, 
    requestedByUserId, 
    requestedByUserName, 
    previousValue, 
    newValue, 
    financialImpact, 
    relatedEntityId, 
    relatedEntityType,
    metadata
  } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Título da solicitação é obrigatório.' });
  }

  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'Justificativa por escrito é obrigatória para submissão de aprovação.' });
  }

  const data = db.getRawData();
  const requester = (data.users || []).find((u) => u.id === requestedByUserId);

  const newApproval: ApprovalRequest = {
    id: `appr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    storeId: data.stores[0]?.id || 'store_matriz',
    type,
    title: title.trim(),
    description: description ? description.trim() : title.trim(),
    reason: reason.trim(),
    requestedByUserId: requestedByUserId || 'usr_colab1',
    requestedByUserName: requestedByUserName || requester?.name || 'Colaborador',
    createdAt: new Date().toISOString(),
    status: 'pendente',
    effectStatus: 'NOT_APPLIED',
    previousValue,
    newValue,
    financialImpact: Number(financialImpact) || 0,
    relatedEntityId,
    relatedEntityType,
    metadata: metadata || undefined,
  };

  if (!data.approvals) data.approvals = [];
  data.approvals.unshift(newApproval);
  await db.save(data);

  db.logAudit(
    newApproval.storeId, 
    newApproval.requestedByUserId, 
    newApproval.requestedByUserName, 
    'SOLICITACAO_APROVACAO', 
    'APROVACOES', 
    `Solicitação de aprovação criada: [${type}] ${newApproval.title}. Justificativa: ${newApproval.reason}`, 
    newApproval.id
  );

  res.json({ success: true, approval: newApproval });
});

app.post('/api/approvals/:id/review', async (req, res) => {
  const { id } = req.params;
  const { status, reviewedByUserId, reviewedByUserName, reviewNotes } = req.body;
  
  if (status !== 'aprovado' && status !== 'rejeitado') {
    return res.status(400).json({ error: 'Status de revisão inválido. Deve ser "aprovado" ou "rejeitado".' });
  }

  if (status === 'rejeitado' && (!reviewNotes || !reviewNotes.trim())) {
    return res.status(400).json({ error: 'Justificativa obrigatória para rejeição de solicitação.' });
  }

  try {
    let resultApproval: ApprovalRequest | null = null;

    await db.mutate((currentData) => {
      const item = (currentData.approvals || []).find((a) => a.id === id);
      if (!item) throw new Error('Solicitação de aprovação não encontrada.');

      const now = new Date().toISOString();
      const reviewer = (currentData.users || []).find((u) => u.id === reviewedByUserId);
      const effectiveReviewerName = reviewedByUserName || reviewer?.name || 'Administrador / Gestor';

      // Validação de Idempotência
      if (item.status === 'aprovado' && item.effectStatus === 'APPLIED') {
        throw new Error('Esta solicitação já foi aprovada e seu efeito operacional já foi aplicado anteriormente (Idempotência garantida).');
      }

      item.status = status;
      item.reviewedByUserId = reviewedByUserId || 'usr_admin';
      item.reviewedByUserName = effectiveReviewerName;
      item.reviewedAt = now;
      item.reviewNotes = reviewNotes ? reviewNotes.trim() : undefined;

      if (status === 'aprovado') {
        // EXECUÇÃO DO EFEITO OPERACIONAL ATÔMICO
        switch (item.type) {
          case 'venda_cancelamento': {
            const saleId = item.relatedEntityId || item.metadata?.saleId || item.metadata?.saleCode;
            const sale = (currentData.sales || []).find((s) => s.id === saleId || s.code === saleId);
            if (!sale) {
              item.effectStatus = 'FAILED';
              item.effectError = `Venda ${saleId || 'referenciada'} não foi encontrada no banco de dados.`;
              throw new Error(item.effectError);
            }

            if (sale.status === 'cancelada') {
              item.effectStatus = 'APPLIED';
              item.effectAppliedAt = now;
              item.effectDetails = `A venda ${sale.code} já havia sido cancelada previamente.`;
            } else {
              sale.status = 'cancelada';
              if (!sale.history) sale.history = [];
              sale.history.push({
                timestamp: now,
                userId: reviewedByUserId || 'usr_admin',
                userName: effectiveReviewerName,
                action: `Cancelamento de venda aprovado pelo gestor (${item.id}). Motivo: ${item.reason}`,
              });

              // Estorno atômico de estoque para cada item da venda
              for (const saleItem of sale.items) {
                const prod = (currentData.products || []).find((p) => p.id === saleItem.productId);
                if (prod) {
                  const prevStock = prod.currentStock;
                  const newStock = prevStock + saleItem.quantity;
                  prod.currentStock = newStock;
                  prod.updatedAt = now;

                  const movement: StockMovement = {
                    id: `sm_estorno_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    storeId: prod.storeId,
                    productId: prod.id,
                    productName: prod.name,
                    productCode: prod.code,
                    type: 'cancelamento_venda',
                    quantity: saleItem.quantity,
                    previousStock: prevStock,
                    newStock: newStock,
                    reason: `Estorno de estoque por cancelamento da venda ${sale.code} (Aprovação ${item.id})`,
                    authorId: reviewedByUserId || 'usr_admin',
                    authorName: effectiveReviewerName,
                    referenceId: sale.code,
                    timestamp: now,
                  };
                  if (!currentData.stockMovements) currentData.stockMovements = [];
                  currentData.stockMovements.unshift(movement);
                }
              }

              // Compensação financeira no caixa caso ainda esteja aberto
              if (sale.cashRegisterId) {
                const activeCash = (currentData.cashRegisters || []).find((c) => c.id === sale.cashRegisterId && c.status === 'aberto');
                if (activeCash) {
                  for (const p of sale.payments || []) {
                    const amt = Number(p.amount) || 0;
                    if (p.method === 'dinheiro') {
                      activeCash.cashSales = Math.max(0, Math.round((activeCash.cashSales - amt) * 100) / 100);
                      activeCash.expectedCash = Math.max(0, Math.round((activeCash.expectedCash - amt) * 100) / 100);
                    } else if (p.method === 'pix') {
                      activeCash.pixSales = Math.max(0, Math.round((activeCash.pixSales - amt) * 100) / 100);
                    } else if (p.method === 'cartao_debito') {
                      activeCash.cardDebitSales = Math.max(0, Math.round((activeCash.cardDebitSales - amt) * 100) / 100);
                    } else if (p.method === 'cartao_credito') {
                      activeCash.cardCreditSales = Math.max(0, Math.round((activeCash.cardCreditSales - amt) * 100) / 100);
                    }
                  }
                }
              }

              item.effectStatus = 'APPLIED';
              item.effectAppliedAt = now;
              item.effectDetails = `Venda ${sale.code} (R$ ${sale.total.toFixed(2)}) cancelada com sucesso. Estoque de ${sale.items.length} produto(s) estornado para o saldo vendável.`;
            }
            break;
          }

          case 'troca_preco': {
            const prodId = item.relatedEntityId || item.metadata?.productId;
            const product = (currentData.products || []).find((p) => p.id === prodId || p.code === prodId);
            if (!product) {
              item.effectStatus = 'FAILED';
              item.effectError = `Produto ${prodId || 'referenciado'} não foi encontrado no catálogo.`;
              throw new Error(item.effectError);
            }

            const oldPrice = product.salePrice;
            const newPrice = Number(item.newValue);
            if (isNaN(newPrice) || newPrice <= 0) {
              item.effectStatus = 'FAILED';
              item.effectError = `Novo preço informado (R$ ${item.newValue}) é inválido.`;
              throw new Error(item.effectError);
            }

            product.salePrice = newPrice;
            product.updatedAt = now;

            item.effectStatus = 'APPLIED';
            item.effectAppliedAt = now;
            item.effectDetails = `Preço de venda do produto "${product.name}" atualizado de R$ ${oldPrice.toFixed(2)} para R$ ${newPrice.toFixed(2)}.`;
            break;
          }

          case 'ajuste_estoque': {
            const prodId = item.relatedEntityId || item.metadata?.productId;
            const product = (currentData.products || []).find((p) => p.id === prodId || p.code === prodId);
            if (!product) {
              item.effectStatus = 'FAILED';
              item.effectError = `Produto ${prodId || 'referenciado'} não foi encontrado no catálogo.`;
              throw new Error(item.effectError);
            }

            const targetStock = Number(item.newValue);
            if (isNaN(targetStock) || targetStock < 0) {
              item.effectStatus = 'FAILED';
              item.effectError = `Saldo de estoque informado (${item.newValue}) é inválido.`;
              throw new Error(item.effectError);
            }

            const prevStock = product.currentStock;
            const diff = targetStock - prevStock;
            product.currentStock = targetStock;
            product.updatedAt = now;

            const movement: StockMovement = {
              id: `sm_appr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              storeId: product.storeId,
              productId: product.id,
              productName: product.name,
              productCode: product.code,
              type: 'ajuste_inventario',
              quantity: diff,
              previousStock: prevStock,
              newStock: targetStock,
              reason: `Ajuste aprovado na Central de Aprovações (${item.id}): ${item.reason}`,
              authorId: reviewedByUserId || 'usr_admin',
              authorName: effectiveReviewerName,
              referenceId: item.id,
              timestamp: now,
            };
            if (!currentData.stockMovements) currentData.stockMovements = [];
            currentData.stockMovements.unshift(movement);

            item.effectStatus = 'APPLIED';
            item.effectAppliedAt = now;
            item.effectDetails = `Saldo do produto "${product.name}" ajustado de ${prevStock} para ${targetStock} un. (Diferença: ${diff > 0 ? '+' : ''}${diff}).`;
            break;
          }

          case 'desconto_excedente': {
            item.effectStatus = 'APPLIED';
            item.effectAppliedAt = now;
            item.effectDetails = `Autorização de desconto de ${item.newValue}% concedida para utilização na venda/balcão.`;
            break;
          }

          case 'sangria_excepcional': {
            const regId = item.relatedEntityId || item.metadata?.cashRegisterId;
            const register = (currentData.cashRegisters || []).find((c) => c.id === regId && c.status === 'aberto');
            const amount = Number(item.newValue || item.financialImpact || 0);

            if (register && amount > 0) {
              register.bleedingsTotal = Math.round((register.bleedingsTotal + amount) * 100) / 100;
              register.expectedCash = Math.round((register.expectedCash - amount) * 100) / 100;

              const cm: CashMovement = {
                id: `cm_sangria_appr_${Date.now()}`,
                cashRegisterId: register.id,
                storeId: register.storeId,
                type: 'sangria',
                amount,
                reason: `Sangria Excepcional autorizada (${item.id}): ${item.reason}`,
                authorizedBy: reviewedByUserId || 'usr_admin',
                authorizedByName: effectiveReviewerName,
                timestamp: now,
              };
              if (!currentData.cashMovements) currentData.cashMovements = [];
              currentData.cashMovements.unshift(cm);

              item.effectStatus = 'APPLIED';
              item.effectAppliedAt = now;
              item.effectDetails = `Sangria excepcional de R$ ${amount.toFixed(2)} aplicada no caixa "${register.terminalName}".`;
            } else {
              item.effectStatus = 'APPLIED';
              item.effectAppliedAt = now;
              item.effectDetails = `Autorização de sangria excepcional concedida pelo gestor.`;
            }
            break;
          }

          default: {
            item.effectStatus = 'APPLIED';
            item.effectAppliedAt = now;
            item.effectDetails = `Solicitação ${item.type} aprovada com sucesso pelo gestor.`;
            break;
          }
        }

        db.logAudit(
          item.storeId,
          reviewedByUserId || 'usr_admin',
          effectiveReviewerName,
          'APROVACAO_CONCEDIDA_EFEITO_APLICADO',
          'APROVACOES',
          `Solicitação "${item.title}" [${item.type}] aprovada. ${item.effectDetails || ''} Notas do gestor: ${reviewNotes || 'Nenhuma'}`,
          item.id
        );
      } else {
        // REJEIÇÃO
        item.effectStatus = 'NOT_APPLIED';
        item.effectDetails = `Solicitação rejeitada pelo gestor. Nenhum efeito operacional executado no sistema.`;

        db.logAudit(
          item.storeId,
          reviewedByUserId || 'usr_admin',
          effectiveReviewerName,
          'APROVACAO_REJEITADA',
          'APROVACOES',
          `Solicitação "${item.title}" [${item.type}] foi rejeitada. Justificativa: ${reviewNotes}`,
          item.id
        );
      }

      resultApproval = item;
    });

    res.json({ success: true, approval: resultApproval, message: status === 'aprovado' ? 'Aprovação concedida e efeito operacional executado com sucesso!' : 'Solicitação rejeitada com sucesso.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Erro ao processar revisão de aprovação.' });
  }
});

// Endpoint direto de cancelamento de venda (com alçada e auditoria)
app.post('/api/sales/:id/cancel', async (req, res) => {
  const { id } = req.params;
  const { reason, userId, userName, adminPin } = req.body;
  const data = db.getRawData();

  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'Justificativa é obrigatória para cancelamento de venda.' });
  }

  const requestingUser = (data.users || []).find((u) => u.id === userId);
  let isAuthorizedAdmin = requestingUser?.role === 'admin';

  if (!isAuthorizedAdmin && adminPin) {
    const adminUser = (data.users || []).find((u) => u.pin === adminPin && u.role === 'admin' && u.active);
    if (adminUser) {
      isAuthorizedAdmin = true;
    }
  }

  // Se for colaborador e não forneceu PIN admin, cria uma solicitação de aprovação na Central
  if (!isAuthorizedAdmin) {
    const sale = data.sales.find((s) => s.id === id || s.code === id);
    if (!sale) return res.status(404).json({ error: 'Venda não encontrada.' });

    const newApproval: ApprovalRequest = {
      id: `appr_cancel_${Date.now()}`,
      storeId: sale.storeId,
      type: 'venda_cancelamento',
      title: `Cancelamento da Venda ${sale.code}`,
      description: `Solicitação de cancelamento da venda ${sale.code} de R$ ${sale.total.toFixed(2)} (${sale.items.length} itens).`,
      reason: reason.trim(),
      requestedByUserId: userId || 'usr_colab1',
      requestedByUserName: userName || requestingUser?.name || 'Colaborador',
      createdAt: new Date().toISOString(),
      status: 'pendente',
      effectStatus: 'NOT_APPLIED',
      financialImpact: sale.total,
      relatedEntityId: sale.id,
      relatedEntityType: 'sale',
      metadata: { saleId: sale.id, saleCode: sale.code, total: sale.total, itemsCount: sale.items.length },
    };

    if (!data.approvals) data.approvals = [];
    data.approvals.unshift(newApproval);
    await db.save(data);

    db.logAudit(
      sale.storeId,
      userId || 'usr_colab1',
      userName || 'Colaborador',
      'SOLICITACAO_CANCELAMENTO_VENDA',
      'APROVACOES',
      `Solicitado cancelamento da venda ${sale.code}. Motivo: ${reason}`,
      newApproval.id
    );

    return res.json({
      success: true,
      pendingApproval: true,
      approval: newApproval,
      message: 'Solicitação de cancelamento enviada para a Central de Aprovações do Gestor.',
    });
  }

  // Executa cancelamento direto autorizado por Admin
  try {
    let cancelledSale: Sale | null = null;
    await db.mutate((currentData) => {
      const sale = (currentData.sales || []).find((s) => s.id === id || s.code === id);
      if (!sale) throw new Error('Venda não encontrada.');
      if (sale.status === 'cancelada') throw new Error('Esta venda já se encontra cancelada.');

      const now = new Date().toISOString();
      const operatorName = userName || requestingUser?.name || 'Administrador';

      sale.status = 'cancelada';
      if (!sale.history) sale.history = [];
      sale.history.push({
        timestamp: now,
        userId: userId || 'usr_admin',
        userName: operatorName,
        action: `Venda cancelada diretamente pelo gestor. Motivo: ${reason.trim()}`,
      });

      // Estorno atômico de estoque
      for (const saleItem of sale.items) {
        const prod = (currentData.products || []).find((p) => p.id === saleItem.productId);
        if (prod) {
          const prevStock = prod.currentStock;
          const newStock = prevStock + saleItem.quantity;
          prod.currentStock = newStock;
          prod.updatedAt = now;

          const movement: StockMovement = {
            id: `sm_estorno_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            storeId: prod.storeId,
            productId: prod.id,
            productName: prod.name,
            productCode: prod.code,
            type: 'cancelamento_venda',
            quantity: saleItem.quantity,
            previousStock: prevStock,
            newStock: newStock,
            reason: `Estorno de estoque por cancelamento direto da venda ${sale.code}`,
            authorId: userId || 'usr_admin',
            authorName: operatorName,
            referenceId: sale.code,
            timestamp: now,
          };
          if (!currentData.stockMovements) currentData.stockMovements = [];
          currentData.stockMovements.unshift(movement);
        }
      }

      // Reversão financeira se caixa aberto
      if (sale.cashRegisterId) {
        const activeCash = (currentData.cashRegisters || []).find((c) => c.id === sale.cashRegisterId && c.status === 'aberto');
        if (activeCash) {
          for (const p of sale.payments || []) {
            const amt = Number(p.amount) || 0;
            if (p.method === 'dinheiro') {
              activeCash.cashSales = Math.max(0, Math.round((activeCash.cashSales - amt) * 100) / 100);
              activeCash.expectedCash = Math.max(0, Math.round((activeCash.expectedCash - amt) * 100) / 100);
            } else if (p.method === 'pix') {
              activeCash.pixSales = Math.max(0, Math.round((activeCash.pixSales - amt) * 100) / 100);
            } else if (p.method === 'cartao_debito') {
              activeCash.cardDebitSales = Math.max(0, Math.round((activeCash.cardDebitSales - amt) * 100) / 100);
            } else if (p.method === 'cartao_credito') {
              activeCash.cardCreditSales = Math.max(0, Math.round((activeCash.cardCreditSales - amt) * 100) / 100);
            }
          }
        }
      }

      db.logAudit(
        sale.storeId,
        userId || 'usr_admin',
        operatorName,
        'VENDA_CANCELADA_DIRETO',
        'VENDAS',
        `Venda ${sale.code} de R$ ${sale.total.toFixed(2)} cancelada pelo gestor. Motivo: ${reason}`,
        sale.id
      );

      cancelledSale = sale;
    });

    res.json({ success: true, sale: cancelledSale, message: 'Venda cancelada e estoque estornado com sucesso.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Erro ao cancelar venda.' });
  }
});

// -------------------------------------------------------------
// 2. AUTH & SESSIONS
// -------------------------------------------------------------
app.post('/api/auth/login', (req, res) => {
  const { pin, email, role } = req.body;
  const data = db.getRawData();

  let user = null;
  if (pin) {
    user = data.users.find((u) => u.pin === pin && u.active);
  } else if (email) {
    user = data.users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.active);
  } else if (role) {
    user = data.users.find((u) => u.role === role && u.active);
  }

  if (!user) {
    return res.status(401).json({ error: 'Credencial ou PIN inválido ou usuário inativo.' });
  }

  db.logAudit(user.storeId, user.id, user.name, 'LOGIN', 'USUARIOS', `Usuário realizou login com sucesso.`);
  res.json({ user, store: data.stores[0] });
});

// PHASE-05: Troca Segura de Operador com Autenticação de PIN Individual
app.post('/api/auth/switch-operator', async (req, res) => {
  const { terminalId, toUserId, pin, autoStartShift } = req.body;
  if (!toUserId) {
    return res.status(400).json({ error: 'Identificação do colaborador de destino é obrigatória.' });
  }
  if (!pin || !pin.trim()) {
    return res.status(400).json({ error: 'O PIN individual do colaborador é obrigatório para assumir o terminal.' });
  }

  const data = db.getRawData();
  const targetUser = (data.users || []).find((u) => u.id === toUserId && u.active);
  if (!targetUser) {
    return res.status(404).json({ error: 'Colaborador não encontrado ou inativo.' });
  }

  // Validação estrita de PIN (PIN nunca é exibido nem trafegado em log)
  if (targetUser.pin !== pin.trim()) {
    return res.status(401).json({ error: 'PIN incorreto. Acesso ao terminal não autorizado.' });
  }

  let activeShift = (data.shifts || []).find((s) => s.userId === targetUser.id && s.status !== 'encerrado');

  // Se não tem expediente ativo e autoStartShift solicitado, inicia o ponto automaticamente com o PIN
  if (!activeShift && autoStartShift) {
    const nowStr = new Date().toISOString();
    const todayStr = nowStr.split('T')[0];
    const newShift: WorkShift = {
      id: `ws_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: targetUser.id,
      userName: targetUser.name,
      storeId: targetUser.storeId || 'store_matriz',
      date: todayStr,
      startedAt: nowStr,
      status: 'em_andamento',
      breaks: [],
    };
    if (!data.shifts) data.shifts = [];
    data.shifts.unshift(newShift);
    activeShift = newShift;
    await db.save(data);

    db.logAudit(
      targetUser.storeId || 'store_matriz',
      targetUser.id,
      targetUser.name,
      'INICIO_TURNO',
      'TURNO',
      `Expediente iniciado automaticamente com PIN ao assumir o terminal.`,
      newShift.id
    );
  } else if (!activeShift && targetUser.role === 'colaborador') {
    return res.status(400).json({
      error: 'O colaborador selecionado não possui expediente de trabalho iniciado (ponto). Inicie o expediente antes de assumir o terminal.',
      requiresShift: true,
    });
  }

  const resolvedTerminalId = terminalId || 'terminal_01';
  const terminal = (data.terminals || []).find((t) => t.id === resolvedTerminalId) || {
    id: resolvedTerminalId,
    name: resolvedTerminalId === 'terminal_02' ? 'Terminal Balcão 02' : 'Terminal Balcão 01',
    storeId: targetUser.storeId || 'store_matriz',
    active: true,
    createdAt: new Date().toISOString(),
  };

  // Identifica a gaveta física (sessão de caixa) aberta para este terminal
  const activeCashRegister = (data.cashRegisters || []).find(
    (cr) => cr.status === 'aberto' && (cr.terminalId === terminal.id || cr.terminalName === terminal.name || (!cr.terminalId && terminal.id === 'terminal_01'))
  );

  // Auditoria da Troca de Operador (NUNCA expor PIN)
  db.logAudit(
    targetUser.storeId || 'store_matriz',
    targetUser.id,
    targetUser.name,
    'OPERATOR_SWITCHED',
    'TERMINAL',
    `Operador assumiu o "${terminal.name}" com sucesso.${activeCashRegister ? ` Sessão de gaveta física ${activeCashRegister.displayCode || activeCashRegister.id} preservada.` : ' Nenhuma gaveta física aberta no momento.'}`,
    terminal.id
  );

  res.json({
    success: true,
    user: targetUser,
    terminal,
    activeCashRegister: activeCashRegister || null,
    activeShift,
    message: `Terminal ${terminal.name} assumido com sucesso por ${targetUser.name}.`,
  });
});

app.post('/api/terminals/switch-operator', (req, res) => {
  req.url = '/api/auth/switch-operator';
  app._router.handle(req, res);
});

// Terminais Operacionais
app.get('/api/terminals', (req, res) => {
  const data = db.getRawData();
  const terminals = data.terminals || [];
  const enriched = terminals.map((t) => {
    const activeCash = (data.cashRegisters || []).find(
      (cr) => cr.status === 'aberto' && (cr.terminalId === t.id || cr.terminalName === t.name || (!cr.terminalId && t.id === 'terminal_01'))
    );
    return {
      ...t,
      activeCashRegister: activeCash || null,
    };
  });
  res.json(enriched);
});

app.post('/api/terminals', async (req, res) => {
  const { name, notes } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Nome do terminal é obrigatório.' });
  }
  const data = db.getRawData();
  const seq = (data.terminals || []).length + 1;
  const newTerminal: Terminal = {
    id: `terminal_${String(seq).padStart(2, '0')}`,
    name: name.trim(),
    storeId: data.stores[0]?.id || 'store_matriz',
    active: true,
    notes: notes ? notes.trim() : undefined,
    createdAt: new Date().toISOString(),
  };
  if (!data.terminals) data.terminals = [];
  data.terminals.push(newTerminal);
  await db.save(data);
  res.json({ success: true, terminal: newTerminal });
});

app.get('/api/users', (req, res) => {
  const data = db.getRawData();
  res.json(data.users);
});

app.get('/api/stores/current', (req, res) => {
  const data = db.getRawData();
  res.json(data.stores[0] || null);
});

// Configurações da Drogaria (P0 - Retaguarda)
app.get('/api/store/settings', (req, res) => {
  const data = db.getRawData();
  const store = data.stores[0] || null;
  res.json(store);
});

app.post('/api/store/settings', async (req, res) => {
  const { tradeName, name, legalName, cnpj, phone, address, settings, userId } = req.body;
  const resolvedLegalName = name || legalName;
  const data = db.getRawData();

  if (userId) {
    const user = data.users.find((u) => u.id === userId);
    if (user && user.role !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem alterar configurações da drogaria.' });
    }
  }

  // Validações rigorosas
  if (!tradeName || typeof tradeName !== 'string' || tradeName.trim().length < 2) {
    return res.status(400).json({ error: 'Nome Fantasia da drogaria inválido (mínimo de 2 caracteres).' });
  }

  if (!resolvedLegalName || typeof resolvedLegalName !== 'string' || resolvedLegalName.trim().length < 2) {
    return res.status(400).json({ error: 'Razão Social inválida (mínimo de 2 caracteres).' });
  }

  if (!cnpj || typeof cnpj !== 'string' || cnpj.trim().length < 8) {
    return res.status(400).json({ error: 'CNPJ inválido ou incompleto.' });
  }

  if (settings) {
    if (settings.maxDiscountWithoutAuthPercent !== undefined) {
      const discount = Number(settings.maxDiscountWithoutAuthPercent);
      if (isNaN(discount) || discount < 0 || discount > 100) {
        return res.status(400).json({ error: 'Teto de desconto sem autorização inválido (0 a 100%).' });
      }
    }

    if (settings.accessToleranceMinutes !== undefined) {
      const tol = Number(settings.accessToleranceMinutes);
      if (isNaN(tol) || tol < 0 || tol > 120) {
        return res.status(400).json({ error: 'Tolerância de ponto inválida (0 a 120 minutos).' });
      }
    }

    if (settings.defaultOpeningAmount !== undefined) {
      const opening = Number(settings.defaultOpeningAmount);
      if (isNaN(opening) || opening < 0) {
        return res.status(400).json({ error: 'Fundo de troco sugerido não pode ser negativo.' });
      }
    }
  }

  // Mutação atômica serializada
  await db.mutate((currentData) => {
    if (!currentData.stores || currentData.stores.length === 0) {
      currentData.stores = [{
        id: 'store_matriz',
        name: resolvedLegalName.trim(),
        tradeName: tradeName.trim(),
        cnpj: cnpj.trim(),
        address: address ? address.trim() : '',
        phone: phone ? phone.trim() : '',
        active: true,
        settings: {
          maxDiscountWithoutAuthPercent: 12,
          defaultPaymentMethods: ['dinheiro', 'pix', 'cartao_debito', 'cartao_credito'],
          enableLotTracking: true,
        }
      }];
    }

    const store = currentData.stores[0];
    const previousSummary = `Nome: ${store.tradeName}, CNPJ: ${store.cnpj}, Teto: ${store.settings?.maxDiscountWithoutAuthPercent}%`;

    store.tradeName = tradeName.trim();
    store.name = resolvedLegalName.trim();
    store.cnpj = cnpj.trim();
    if (phone !== undefined) store.phone = String(phone).trim();
    if (address !== undefined) store.address = String(address).trim();

    if (!store.settings) {
      store.settings = {
        maxDiscountWithoutAuthPercent: 12,
        defaultPaymentMethods: ['dinheiro', 'pix', 'cartao_debito', 'cartao_credito'],
        enableLotTracking: true,
      };
    }

    if (settings) {
      if (settings.maxDiscountWithoutAuthPercent !== undefined) {
        store.settings.maxDiscountWithoutAuthPercent = Number(settings.maxDiscountWithoutAuthPercent);
      }
      if (settings.enableLotTracking !== undefined) {
        store.settings.enableLotTracking = Boolean(settings.enableLotTracking);
      }
      if (settings.accessToleranceMinutes !== undefined) {
        store.settings.accessToleranceMinutes = Number(settings.accessToleranceMinutes);
      }
      if (settings.defaultOpeningAmount !== undefined) {
        store.settings.defaultOpeningAmount = Number(settings.defaultOpeningAmount);
      }
      if (settings.defaultPaymentMethods && Array.isArray(settings.defaultPaymentMethods)) {
        store.settings.defaultPaymentMethods = settings.defaultPaymentMethods;
      }
    }

    const newSummary = `Nome: ${store.tradeName}, CNPJ: ${store.cnpj}, Teto: ${store.settings?.maxDiscountWithoutAuthPercent}%`;

    db.logAudit(
      store.id,
      userId || 'usr_admin',
      'Administração',
      'CONFIGURACAO_ALTERADA',
      'CONFIGURACOES',
      `Parâmetros da drogaria atualizados. Antes: [${previousSummary}], Depois: [${newSummary}]`,
      store.id
    );
  });

  const updatedStore = db.getRawData().stores[0];
  res.json({ store: updatedStore, success: true, message: 'Configurações salvas com sucesso.' });
});

app.put('/api/store/settings', async (req, res) => {
  const { tradeName, name, legalName, cnpj, phone, address, settings, userId } = req.body;
  const resolvedLegalName = name || legalName;
  const data = db.getRawData();

  if (userId) {
    const user = data.users.find((u) => u.id === userId);
    if (user && user.role !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem alterar configurações da drogaria.' });
    }
  }

  if (!tradeName || typeof tradeName !== 'string' || tradeName.trim().length < 2) {
    return res.status(400).json({ error: 'Nome Fantasia da drogaria inválido (mínimo de 2 caracteres).' });
  }

  if (!resolvedLegalName || typeof resolvedLegalName !== 'string' || resolvedLegalName.trim().length < 2) {
    return res.status(400).json({ error: 'Razão Social inválida (mínimo de 2 caracteres).' });
  }

  if (!cnpj || typeof cnpj !== 'string' || cnpj.trim().length < 8) {
    return res.status(400).json({ error: 'CNPJ inválido ou incompleto.' });
  }

  if (settings) {
    if (settings.maxDiscountWithoutAuthPercent !== undefined) {
      const discount = Number(settings.maxDiscountWithoutAuthPercent);
      if (isNaN(discount) || discount < 0 || discount > 100) {
        return res.status(400).json({ error: 'Teto de desconto sem autorização inválido (0 a 100%).' });
      }
    }
    if (settings.accessToleranceMinutes !== undefined) {
      const tol = Number(settings.accessToleranceMinutes);
      if (isNaN(tol) || tol < 0 || tol > 120) {
        return res.status(400).json({ error: 'Tolerância de ponto inválida (0 a 120 minutos).' });
      }
    }
    if (settings.defaultOpeningAmount !== undefined) {
      const opening = Number(settings.defaultOpeningAmount);
      if (isNaN(opening) || opening < 0) {
        return res.status(400).json({ error: 'Fundo de troco sugerido não pode ser negativo.' });
      }
    }
  }

  await db.mutate((currentData) => {
    const store = currentData.stores[0];
    store.tradeName = tradeName.trim();
    store.name = resolvedLegalName.trim();
    store.cnpj = cnpj.trim();
    if (phone !== undefined) store.phone = String(phone).trim();
    if (address !== undefined) store.address = String(address).trim();
    if (!store.settings) {
      store.settings = {
        maxDiscountWithoutAuthPercent: 12,
        defaultPaymentMethods: ['dinheiro', 'pix', 'cartao_debito', 'cartao_credito'],
        enableLotTracking: true,
      };
    }
    if (settings) {
      if (settings.maxDiscountWithoutAuthPercent !== undefined) {
        store.settings.maxDiscountWithoutAuthPercent = Number(settings.maxDiscountWithoutAuthPercent);
      }
      if (settings.enableLotTracking !== undefined) {
        store.settings.enableLotTracking = Boolean(settings.enableLotTracking);
      }
      if (settings.accessToleranceMinutes !== undefined) {
        store.settings.accessToleranceMinutes = Number(settings.accessToleranceMinutes);
      }
      if (settings.defaultOpeningAmount !== undefined) {
        store.settings.defaultOpeningAmount = Number(settings.defaultOpeningAmount);
      }
    }

    db.logAudit(
      store.id,
      userId || 'usr_admin',
      'Administração',
      'CONFIGURACAO_ALTERADA',
      'CONFIGURACOES',
      `Parâmetros da drogaria atualizados via PUT.`,
      store.id
    );
  });

  const updatedStore = db.getRawData().stores[0];
  res.json({ store: updatedStore, success: true, message: 'Configurações salvas com sucesso.' });
});

// -------------------------------------------------------------
// 3. EXPEDIENTE & TURNOS (MEU TURNO)
// -------------------------------------------------------------
app.get('/api/shifts', (req, res) => {
  const { userId } = req.query;
  const data = db.getRawData();
  let shifts = data.shifts;
  if (userId) {
    shifts = shifts.filter((s) => s.userId === userId);
  }
  res.json(shifts);
});

app.post('/api/shifts/start', async (req, res) => {
  const { userId, storeId } = req.body;
  const data = db.getRawData();
  const user = data.users.find((u) => u.id === userId);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

  const activeShift = data.shifts.find(
    (s) => s.userId === userId && (s.status === 'em_andamento' || s.status === 'pausado')
  );
  if (activeShift) {
    return res.status(400).json({ error: 'Você já possui um expediente de trabalho em andamento.' });
  }

  const now = new Date();
  const newShift = {
    id: `shift_${Date.now()}`,
    userId,
    userName: user.name,
    storeId: storeId || 'store_matriz',
    date: now.toISOString().split('T')[0],
    startedAt: now.toISOString(),
    status: 'em_andamento' as const,
    breaks: [],
  };

  data.shifts.unshift(newShift);
  await db.save(data);
  db.logAudit(newShift.storeId, user.id, user.name, 'INICIO_TURNO', 'EQUIPE', 'Iniciou expediente de trabalho.');
  res.json({ shift: newShift, success: true });
});

app.post('/api/shifts/break', async (req, res) => {
  const { shiftId, userId, reason } = req.body;
  const data = db.getRawData();
  const shift = shiftId
    ? data.shifts.find((s) => s.id === shiftId)
    : data.shifts.find((s) => s.userId === userId && (s.status === 'em_andamento' || s.status === 'pausado'));

  if (!shift) return res.status(404).json({ error: 'Turno não encontrado.' });
  if (shift.status === 'encerrado') {
    return res.status(400).json({ error: 'Este expediente já foi encerrado.' });
  }

  const lastBreak = shift.breaks[shift.breaks.length - 1];
  const now = new Date().toISOString();

  if (lastBreak && !lastBreak.endedAt) {
    // End current break
    lastBreak.endedAt = now;
    shift.status = 'em_andamento';
  } else {
    // Start new break
    shift.breaks.push({ startedAt: now, reason: reason || 'Intervalo' });
    shift.status = 'pausado';
  }

  await db.save(data);
  res.json({ shift, success: true });
});

app.post('/api/shifts/end', async (req, res) => {
  const { shiftId, userId, notes } = req.body;
  const data = db.getRawData();
  const shift = shiftId
    ? data.shifts.find((s) => s.id === shiftId)
    : data.shifts.find((s) => s.userId === userId && (s.status === 'em_andamento' || s.status === 'pausado'));

  if (!shift) return res.status(404).json({ error: 'Turno não encontrado.' });
  if (shift.status === 'encerrado') {
    return res.status(400).json({ error: 'Este expediente já foi encerrado.' });
  }

  // OP-02 REGRA CRÍTICA: Bloquear encerramento se o colaborador possuir sessão de caixa aberta
  const activeCash = (data.cashRegisters || []).find(
    (c) => c.status === 'aberto' && c.openedBy === shift.userId
  );
  if (activeCash) {
    return res.status(400).json({
      error: 'Você ainda possui um caixa aberto. Faça a conferência e o fechamento do seu caixa antes de encerrar o expediente.',
      cashRegisterId: activeCash.id,
      terminalName: activeCash.terminalName,
    });
  }

  // Finaliza qualquer intervalo em aberto
  const lastBreak = shift.breaks && shift.breaks[shift.breaks.length - 1];
  if (lastBreak && !lastBreak.endedAt) {
    lastBreak.endedAt = new Date().toISOString();
  }

  shift.status = 'encerrado';
  shift.endedAt = new Date().toISOString();
  shift.notes = notes;

  await db.save(data);
  db.logAudit(shift.storeId, shift.userId, shift.userName, 'FIM_TURNO', 'EQUIPE', 'Encerrou expediente de trabalho.');
  res.json({ shift, success: true });
});

// -------------------------------------------------------------
// 4. PRODUTOS & ESTOQUE GERIDO
// -------------------------------------------------------------
app.get('/api/products', (req, res) => {
  const role = (req.headers['x-user-role'] as string) || 'colaborador';
  const data = db.getRawData();
  const sanitized = data.products.map((p) => sanitizeProductForRole(p, role));
  res.json(sanitized);
});

app.post('/api/products', async (req, res) => {
  const role = (req.headers['x-user-role'] as string) || 'colaborador';
  if (role !== 'admin') {
    return res.status(403).json({ error: 'Apenas administradores podem cadastrar ou alterar produtos.' });
  }

  const { id, code, ean, name, presentation, category, unit, salePrice, costPrice, minStock, maxStock, safetyDays, initialStock } = req.body;
  const data = db.getRawData();

  let product = data.products.find((p) => p.id === id || (p.code && p.code === code));
  const isNew = !product;

  if (isNew) {
    product = {
      id: `prod_${Date.now()}`,
      storeId: 'store_matriz',
      code: code || `MED-${Date.now().toString().slice(-4)}`,
      ean: ean || '',
      name,
      presentation: presentation || '',
      category: category || 'Geral',
      unit: unit || 'UN',
      salePrice: Number(salePrice) || 0,
      costPrice: Number(costPrice) || 0,
      currentStock: Number(initialStock) || 0,
      minStock: Number(minStock) || 10,
      maxStock: Number(maxStock) || 50,
      safetyDays: Number(safetyDays) || 5,
      active: true,
      updatedAt: new Date().toISOString(),
    };
    data.products.push(product);

    if (Number(initialStock) > 0) {
      const movement: StockMovement = {
        id: `sm_${Date.now()}`,
        storeId: product.storeId,
        productId: product.id,
        productName: product.name,
        productCode: product.code,
        type: 'saldo_inicial',
        quantity: Number(initialStock),
        previousStock: 0,
        newStock: Number(initialStock),
        reason: 'Cadastro inicial de produto com saldo inicial',
        authorId: 'usr_admin',
        authorName: 'Administrador',
        timestamp: new Date().toISOString(),
      };
      data.stockMovements.unshift(movement);
    }
  } else {
    product.name = name ?? product.name;
    product.presentation = presentation ?? product.presentation;
    product.category = category ?? product.category;
    product.salePrice = Number(salePrice) ?? product.salePrice;
    if (costPrice !== undefined) product.costPrice = Number(costPrice);
    product.minStock = Number(minStock) ?? product.minStock;
    product.maxStock = Number(maxStock) ?? product.maxStock;
    product.safetyDays = Number(safetyDays) ?? product.safetyDays;
    product.ean = ean ?? product.ean;
    product.updatedAt = new Date().toISOString();
  }

  await db.save(data);
  res.json({ product });
});

app.post('/api/products/adjust-stock', async (req, res) => {
  const { productId, newStock, reason, authorId, authorName } = req.body;
  if (!reason) {
    return res.status(400).json({ error: 'Justificativa obrigatória para ajuste de estoque.' });
  }

  const data = db.getRawData();
  const product = data.products.find((p) => p.id === productId);
  if (!product) return res.status(404).json({ error: 'Produto não encontrado.' });

  const prev = product.currentStock;
  const target = Number(newStock);
  const diff = target - prev;

  product.currentStock = target;
  product.updatedAt = new Date().toISOString();

  const movement: StockMovement = {
    id: `sm_${Date.now()}`,
    storeId: product.storeId,
    productId: product.id,
    productName: product.name,
    productCode: product.code,
    type: 'ajuste_inventario',
    quantity: diff,
    previousStock: prev,
    newStock: target,
    reason,
    authorId: authorId || 'usr_admin',
    authorName: authorName || 'Administrador',
    timestamp: new Date().toISOString(),
  };

  data.stockMovements.unshift(movement);
  await db.save(data);
  db.logAudit(product.storeId, authorId || 'usr_admin', authorName || 'Admin', 'AJUSTE_ESTOQUE', 'ESTOQUE', `Ajuste manual de ${prev} para ${target}. Motivo: ${reason}`, product.id);

  res.json({ product, movement });
});

app.post('/api/products/:id/adjust', async (req, res) => {
  const { id } = req.params;
  const { newStock, reason, userId, userName, authorId, authorName } = req.body;
  const data = db.getRawData();
  const product = data.products.find((p) => p.id === id);
  if (!product) return res.status(404).json({ error: 'Produto não encontrado.' });

  const prev = product.currentStock;
  const target = Number(newStock);
  const diff = target - prev;

  product.currentStock = target;
  product.updatedAt = new Date().toISOString();

  const movement: StockMovement = {
    id: `sm_${Date.now()}`,
    storeId: product.storeId,
    productId: product.id,
    productName: product.name,
    productCode: product.code,
    type: 'ajuste_inventario',
    quantity: diff,
    previousStock: prev,
    newStock: target,
    reason: reason || 'Ajuste manual de inventário',
    authorId: userId || authorId || 'usr_admin',
    authorName: userName || authorName || 'Administrador',
    timestamp: new Date().toISOString(),
  };

  data.stockMovements.unshift(movement);
  await db.save(data);
  db.logAudit(product.storeId, movement.authorId, movement.authorName, 'AJUSTE_ESTOQUE', 'ESTOQUE', `Ajuste manual de ${prev} para ${target}. Motivo: ${reason}`, product.id);

  res.json({ product, movement });
});

app.get('/api/stock-movements', (req, res) => {
  const { productId } = req.query;
  const data = db.getRawData();
  let movements = data.stockMovements;
  if (productId) {
    movements = movements.filter((m) => m.productId === productId);
  }
  res.json(movements);
});

// -------------------------------------------------------------
// 4.1 INVENTÁRIO FÍSICO & CONTAGEM CEGA DE ESTOQUE (PHASE-02)
// -------------------------------------------------------------
app.get('/api/inventories', (req, res) => {
  const role = (req.headers['x-user-role'] as string) || (req.query.role as string) || 'colaborador';
  const data = db.getRawData();
  const list = data.inventories || [];

  const result = list.map((inv) => {
    if (role !== 'admin') {
      return sanitizeInventoryForCollaborator(inv);
    }
    recalculateInventorySummary(data, inv);
    return inv;
  });

  res.json(result);
});

app.get('/api/inventories/:id', (req, res) => {
  const { id } = req.params;
  const role = (req.headers['x-user-role'] as string) || (req.query.role as string) || 'colaborador';
  const data = db.getRawData();
  const inv = (data.inventories || []).find((i) => i.id === id || i.code === id);
  if (!inv) return res.status(404).json({ error: 'Inventário não encontrado.' });

  if (role !== 'admin') {
    return res.json(sanitizeInventoryForCollaborator(inv));
  }

  recalculateInventorySummary(data, inv);
  res.json(inv);
});

app.post('/api/inventories', async (req, res) => {
  const role = (req.headers['x-user-role'] as string) || (req.query.role as string) || 'colaborador';
  if (role !== 'admin') {
    return res.status(403).json({ error: 'Apenas administradores podem criar novos inventários de estoque.' });
  }

  const { title, scope, category, assignedUserIds, dueDate, notes, creatorId, creatorName, specificProductIds } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'O título do inventário é obrigatório.' });
  }

  const validScopes = ['geral', 'categoria', 'selecao'];
  const resolvedScope = validScopes.includes(scope) ? scope : 'geral';

  if (resolvedScope === 'categoria' && (!category || !category.trim())) {
    return res.status(400).json({ error: 'A categoria é obrigatória quando o escopo é por categoria.' });
  }

  const data = db.getRawData();
  if (!Array.isArray(data.inventories)) {
    data.inventories = [];
  }

  // Filtragem de produtos para inclusão no inventário
  let eligibleProducts = (data.products || []).filter((p) => p.active !== false);

  if (resolvedScope === 'categoria') {
    eligibleProducts = eligibleProducts.filter((p) => (p.category || '').toLowerCase() === (category || '').trim().toLowerCase());
  } else if (resolvedScope === 'selecao') {
    if (Array.isArray(specificProductIds) && specificProductIds.length > 0) {
      eligibleProducts = eligibleProducts.filter((p) => specificProductIds.includes(p.id));
    }
  }

  if (eligibleProducts.length === 0) {
    return res.status(400).json({ error: 'Nenhum produto elegível encontrado para o escopo selecionado.' });
  }

  const assignedUsers = (data.users || []).filter((u) => (assignedUserIds || []).includes(u.id));
  const assignedNames = assignedUsers.map((u) => u.name);

  const inventorySeq = (data.inventories.length || 0) + 1;
  const currentYear = new Date().getFullYear();
  const code = `INV-${currentYear}-${String(inventorySeq).padStart(4, '0')}`;
  const id = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const nowStr = new Date().toISOString();

  const items: InventoryItemCount[] = eligibleProducts.map((p) => ({
    productId: p.id,
    productCode: p.code,
    productName: p.name,
    presentation: p.presentation || '',
    category: p.category || 'Geral',
    ean: p.ean || '',
    unit: p.unit || 'UN',
    unitCost: Number(p.costPrice) || 0,
    expectedQuantitySnapshot: Number(p.currentStock) || 0,
    intermediateMovementsQuantity: 0,
    expectedQuantityAdjusted: Number(p.currentStock) || 0,
    countedQuantity: null,
    isCounted: false,
  }));

  const newInventory: InventoryCount = {
    id,
    code,
    storeId: data.stores[0]?.id || 'store_matriz',
    title: title.trim(),
    scope: resolvedScope,
    category: resolvedScope === 'categoria' ? category.trim() : undefined,
    status: 'aberto',
    assignedUserIds: assignedUserIds || [],
    assignedUserNames: assignedNames.length > 0 ? assignedNames : ['Equipe Operacional'],
    createdById: creatorId || 'usr_admin',
    createdByName: creatorName || 'Administrador',
    createdAt: nowStr,
    openedAt: nowStr,
    dueDate: dueDate || undefined,
    notes: notes ? notes.trim() : undefined,
    items,
    totalProducts: items.length,
    countedProducts: 0,
    reopenCount: 0,
    previousVersions: [],
  };

  data.inventories.unshift(newInventory);
  await db.save(data);

  db.logAudit(
    newInventory.storeId,
    newInventory.createdById,
    newInventory.createdByName,
    'INVENTORY_CREATED',
    'INVENTARIO',
    `Inventário ${newInventory.code} criado (${newInventory.title}). Escopo: ${newInventory.scope}. Total de itens: ${newInventory.totalProducts}.`,
    newInventory.id
  );

  res.json({ success: true, inventory: newInventory });
});

app.post('/api/inventories/:id/count', async (req, res) => {
  const { id } = req.params;
  const { userId, userName, items, notes } = req.body;
  const data = db.getRawData();
  const inv = (data.inventories || []).find((i) => i.id === id || i.code === id);

  if (!inv) return res.status(404).json({ error: 'Inventário não encontrado.' });

  const editableStatuses = ['aberto', 'em_contagem', 'reaberto'];
  if (!editableStatuses.includes(inv.status)) {
    return res.status(400).json({
      error: `Inventário com status "${inv.status}" está travado para contagem. Não é possível alterar contagens já finalizadas ou aprovadas.`,
    });
  }

  if (Array.isArray(items)) {
    for (const entry of items) {
      if (entry.countedQuantity !== undefined && entry.countedQuantity !== null) {
        const qtyNum = Number(entry.countedQuantity);
        if (isNaN(qtyNum) || qtyNum < 0) {
          return res.status(400).json({
            error: `Quantidade contada inválida para o produto ${entry.productId || 'selecionado'}. O valor deve ser um número maior ou igual a zero.`,
          });
        }
      }
    }

    const nowStr = new Date().toISOString();
    for (const entry of items) {
      const targetItem = inv.items.find((it) => it.productId === entry.productId);
      if (targetItem) {
        if (entry.countedQuantity !== undefined && entry.countedQuantity !== null) {
          targetItem.countedQuantity = Number(entry.countedQuantity);
          targetItem.isCounted = true;
          targetItem.countedAt = nowStr;
        } else if (entry.isCounted === false) {
          targetItem.countedQuantity = null;
          targetItem.isCounted = false;
        }
      }
    }
  }

  if (inv.status === 'aberto') {
    inv.status = 'em_contagem';
  }

  inv.countedProducts = inv.items.filter((it) => it.isCounted).length;
  if (notes !== undefined) {
    inv.notes = notes;
  }

  await db.save(data);

  db.logAudit(
    inv.storeId,
    userId || 'usr_colab',
    userName || 'Colaborador',
    'INVENTORY_COUNT_SAVED',
    'INVENTARIO',
    `Progresso de contagem salvo no inventário ${inv.code}: ${inv.countedProducts}/${inv.totalProducts} produtos contados.`,
    inv.id
  );

  const role = (req.headers['x-user-role'] as string) || 'colaborador';
  const responseData = role === 'admin' ? inv : sanitizeInventoryForCollaborator(inv);
  res.json({ success: true, inventory: responseData, message: 'Progresso de contagem gravado com sucesso.' });
});

app.post('/api/inventories/:id/complete-count', async (req, res) => {
  const { id } = req.params;
  const { userId, userName, notes } = req.body;
  const data = db.getRawData();
  const inv = (data.inventories || []).find((i) => i.id === id || i.code === id);

  if (!inv) return res.status(404).json({ error: 'Inventário não encontrado.' });

  const editableStatuses = ['aberto', 'em_contagem', 'reaberto'];
  if (!editableStatuses.includes(inv.status)) {
    return res.status(400).json({
      error: `Inventário com status "${inv.status}" não pode ser finalizado. Apenas inventários em contagem aberta podem ser concluídos.`,
    });
  }

  // Validação: Todos os itens devem ter isCounted === true
  const uncounted = inv.items.filter((it) => !it.isCounted || it.countedQuantity === null || it.countedQuantity === undefined);
  if (uncounted.length > 0) {
    return res.status(400).json({
      error: `Existem ${uncounted.length} produto(s) pendente(s) de contagem física. Todos os itens obrigatórios do inventário devem ser contados (ou explicitamente marcados como 0 caso não encontrados na gôndola).`,
      uncountedCount: uncounted.length,
      uncountedProductNames: uncounted.slice(0, 5).map((u) => u.productName),
    });
  }

  const nowStr = new Date().toISOString();
  inv.status = 'aguardando_revisao';
  inv.countCompletedAt = nowStr;
  inv.countCompletedBy = userId || 'usr_colab';
  inv.countCompletedByName = userName || 'Colaborador';
  if (notes) inv.notes = notes;

  recalculateInventorySummary(data, inv);

  await db.save(data);

  db.logAudit(
    inv.storeId,
    inv.countCompletedBy,
    inv.countCompletedByName,
    'INVENTORY_COUNT_COMPLETED',
    'INVENTARIO',
    `Contagem física concluída para o inventário ${inv.code} por ${inv.countCompletedByName}. Enviado para conferência e revisão gerencial.`,
    inv.id
  );

  res.json({
    success: true,
    message: 'Contagem física concluída e enviada com sucesso para conferência gerencial.',
    inventory: sanitizeInventoryForCollaborator(inv),
  });
});

app.post('/api/inventories/:id/approve', async (req, res) => {
  const { id } = req.params;
  const { reviewerId, reviewerName, reviewNotes } = req.body;
  const role = (req.headers['x-user-role'] as string) || (req.query.role as string) || 'colaborador';
  if (role !== 'admin') {
    return res.status(403).json({ error: 'Apenas administradores podem aprovar ajustes de inventário.' });
  }

  let updatedInventory: any = null;

  try {
    await db.mutate((currentData) => {
      const inv = (currentData.inventories || []).find((i) => i.id === id || i.code === id);
      if (!inv) throw new Error('Inventário não encontrado.');

      if (inv.status !== 'aguardando_revisao' && inv.status !== 'aprovado') {
        throw new Error(`Inventário em status "${inv.status}" não está aguardando revisão.`);
      }

      if (inv.adjustmentApplied) {
        throw new Error('Ajuste de estoque já foi aplicado anteriormente para este inventário.');
      }

      recalculateInventorySummary(currentData, inv);
      const nowStr = new Date().toISOString();

      for (const item of inv.items) {
        const targetProd = (currentData.products || []).find((p) => p.id === item.productId);
        if (targetProd && item.difference !== undefined && Math.abs(item.difference) > 0.0001) {
          const prevStock = targetProd.currentStock;
          const newStock = Math.max(0, prevStock + item.difference);
          targetProd.currentStock = newStock;
          targetProd.updatedAt = nowStr;

          const movement: StockMovement = {
            id: `sm_inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            storeId: inv.storeId,
            productId: targetProd.id,
            productName: targetProd.name,
            productCode: targetProd.code,
            type: 'ajuste_inventario',
            quantity: item.difference,
            previousStock: prevStock,
            newStock: newStock,
            reason: `Ajuste de Inventário Físico ${inv.code} (${inv.title}): Contado ${item.countedQuantity} vs Esperado Ajustado ${item.expectedQuantityAdjusted}`,
            authorId: reviewerId || 'usr_admin',
            authorName: reviewerName || 'Administrador',
            timestamp: nowStr,
          };
          currentData.stockMovements.unshift(movement);
        }
      }

      inv.status = 'ajustado';
      inv.adjustmentApplied = true;
      inv.adjustedAt = nowStr;
      inv.reviewedBy = reviewerId || 'usr_admin';
      inv.reviewedByName = reviewerName || 'Administrador';
      inv.reviewedAt = nowStr;
      inv.reviewNotes = reviewNotes ? reviewNotes.trim() : undefined;

      db.logAudit(
        inv.storeId,
        reviewerId || 'usr_admin',
        reviewerName || 'Administrador',
        'INVENTORY_ADJUSTMENT_APPROVED',
        'INVENTARIO',
        `Ajustes de estoque do inventário ${inv.code} foram aprovados e aplicados com sucesso. Impacto financeiro total: R$ ${(inv.totalFinancialImpact || 0).toFixed(2)}.`,
        inv.id
      );

      updatedInventory = inv;
    });

    res.json({ success: true, inventory: updatedInventory, message: 'Ajuste de estoque aplicado com sucesso!' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Erro ao aprovar inventário.' });
  }
});

app.post('/api/inventories/:id/reject', async (req, res) => {
  const { id } = req.params;
  const { reviewerId, reviewerName, reviewNotes } = req.body;
  const role = (req.headers['x-user-role'] as string) || (req.query.role as string) || 'colaborador';
  if (role !== 'admin') {
    return res.status(403).json({ error: 'Apenas administradores podem rejeitar inventários.' });
  }

  const data = db.getRawData();
  const inv = (data.inventories || []).find((i) => i.id === id || i.code === id);
  if (!inv) return res.status(404).json({ error: 'Inventário não encontrado.' });

  const nowStr = new Date().toISOString();
  inv.status = 'rejeitado';
  inv.reviewedBy = reviewerId || 'usr_admin';
  inv.reviewedByName = reviewerName || 'Administrador';
  inv.reviewedAt = nowStr;
  inv.reviewNotes = reviewNotes ? reviewNotes.trim() : undefined;

  await db.save(data);

  db.logAudit(
    inv.storeId,
    reviewerId || 'usr_admin',
    reviewerName || 'Administrador',
    'INVENTORY_ADJUSTMENT_REJECTED',
    'INVENTARIO',
    `Inventário ${inv.code} rejeitado pela gerência sem alteração de saldos de estoque. Justificativa: ${reviewNotes || 'Nenhuma'}`,
    inv.id
  );

  res.json({ success: true, inventory: inv, message: 'Inventário rejeitado com sucesso.' });
});

app.post('/api/inventories/:id/reopen', async (req, res) => {
  const { id } = req.params;
  const { reviewerId, reviewerName, reason } = req.body;
  const role = (req.headers['x-user-role'] as string) || (req.query.role as string) || 'colaborador';
  if (role !== 'admin') {
    return res.status(403).json({ error: 'Apenas administradores podem reabrir inventários para recontagem.' });
  }

  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'A justificativa por escrito é obrigatória para reabrir o inventário para recontagem.' });
  }

  const data = db.getRawData();
  const inv = (data.inventories || []).find((i) => i.id === id || i.code === id);
  if (!inv) return res.status(404).json({ error: 'Inventário não encontrado.' });

  if (inv.adjustmentApplied) {
    return res.status(400).json({ error: 'Inventários já ajustados e consolidados no estoque não podem ser reabertos.' });
  }

  if (!Array.isArray(inv.previousVersions)) {
    inv.previousVersions = [];
  }

  const currentVersionNum = (inv.previousVersions.length || 0) + 1;
  const nowStr = new Date().toISOString();

  // Snapshot da versão anterior
  const previousVersionSnapshot: InventoryHistoryVersion = {
    version: currentVersionNum,
    countedBy: inv.countCompletedBy || inv.assignedUserIds[0] || 'usr_colab',
    countedByName: inv.countCompletedByName || inv.assignedUserNames[0] || 'Colaborador',
    completedAt: inv.countCompletedAt || nowStr,
    items: inv.items.map((it) => ({
      productId: it.productId,
      productCode: it.productCode,
      productName: it.productName,
      countedQuantity: it.countedQuantity ?? 0,
      countedAt: it.countedAt,
    })),
    reopenReason: reason.trim(),
    reopenedBy: reviewerId || 'usr_admin',
    reopenedByName: reviewerName || 'Administrador',
    reopenedAt: nowStr,
  };

  inv.previousVersions.unshift(previousVersionSnapshot);

  // Reinicia contagem para os itens
  for (const item of inv.items) {
    item.isCounted = false;
    item.countedQuantity = null;
    item.countedAt = undefined;
    item.difference = undefined;
    item.financialImpact = undefined;
  }

  inv.status = 'reaberto';
  inv.reopenCount = (inv.reopenCount || 0) + 1;
  inv.reopenReason = reason.trim();
  inv.reopenedAt = nowStr;
  inv.reopenedBy = reviewerId || 'usr_admin';
  inv.reopenedByName = reviewerName || 'Administrador';
  inv.countedProducts = 0;
  inv.countCompletedAt = undefined;
  inv.countCompletedBy = undefined;
  inv.countCompletedByName = undefined;

  await db.save(data);

  db.logAudit(
    inv.storeId,
    reviewerId || 'usr_admin',
    reviewerName || 'Administrador',
    'INVENTORY_REOPENED',
    'INVENTARIO',
    `Inventário ${inv.code} reaberto para recontagem (Versão ${currentVersionNum + 1}). Justificativa: "${reason.trim()}".`,
    inv.id
  );

  res.json({ success: true, inventory: inv, message: 'Inventário reaberto com sucesso para nova contagem cega.' });
});

app.post('/api/inventories/:id/cancel', async (req, res) => {
  const { id } = req.params;
  const { userId, userName, reason } = req.body;
  const role = (req.headers['x-user-role'] as string) || (req.query.role as string) || 'colaborador';
  if (role !== 'admin') {
    return res.status(403).json({ error: 'Apenas administradores podem cancelar inventários.' });
  }

  const data = db.getRawData();
  const inv = (data.inventories || []).find((i) => i.id === id || i.code === id);
  if (!inv) return res.status(404).json({ error: 'Inventário não encontrado.' });

  if (inv.adjustmentApplied) {
    return res.status(400).json({ error: 'Inventários com ajuste de estoque já aplicado não podem ser cancelados.' });
  }

  inv.status = 'cancelado';
  await db.save(data);

  db.logAudit(
    inv.storeId,
    userId || 'usr_admin',
    userName || 'Administrador',
    'INVENTORY_CANCELLED',
    'INVENTARIO',
    `Inventário ${inv.code} foi cancelado. Motivo: ${reason || 'Cancelado pelo administrador'}`,
    inv.id
  );

  res.json({ success: true, inventory: inv, message: 'Inventário cancelado com sucesso.' });
});

// -------------------------------------------------------------
// 5. VENDAS OPERACIONAIS & DEDUPLICAÇÃO IDEMPOTENTE
// -------------------------------------------------------------
app.get('/api/sales', (req, res) => {
  const data = db.getRawData();
  res.json(data.sales);
});

app.post('/api/sales', async (req, res) => {
  const {
    idempotencyKey,
    sellerId,
    sellerName,
    operatorId,
    operatorName,
    cashRegisterId,
    customerName,
    items,
    payments,
    subtotal,
    totalDiscount,
    total,
    fiscalReference,
    adminPin,
    managerPin,
    approvalId,
  } = req.body;

  const data = db.getRawData();

  // 1. Idempotency protection: Prevent double-click or retry duplications
  if (idempotencyKey) {
    const existing = data.sales.find((s) => s.idempotencyKey === idempotencyKey);
    if (existing) {
      return res.json({ success: true, sale: existing, note: 'Venda já processada anteriormente (idempotência respeitada).' });
    }
  }

  // 2. Authoritative Operator & Session Validation (PHASE-05 / OP-03)
  const effectiveOperatorId = operatorId || sellerId;
  const operatorUser = (data.users || []).find((u) => u.id === effectiveOperatorId);
  if (!effectiveOperatorId || !operatorUser) {
    return res.status(400).json({ error: 'Operador não identificado ou inválido para esta operação.' });
  }

  // REGRA OP-03 / PHASE-05: Expediente Ativo Obrigatório para o operador individual
  const activeShift = (data.shifts || []).find(
    (s) => s.userId === effectiveOperatorId && (s.status === 'em_andamento' || s.status === 'pausado')
  );
  if (!activeShift) {
    return res.status(400).json({
      error: 'Você precisa iniciar seu expediente de trabalho (ponto) antes de registrar uma venda.',
    });
  }

  // REGRA PHASE-05: Terminal compartilhado com gaveta física única
  const requestedTerminalId = req.body.terminalId || 'terminal_01';
  let activeCash = (data.cashRegisters || []).find(
    (c) => c.status === 'aberto' && (c.id === cashRegisterId || c.terminalId === requestedTerminalId || (!c.terminalId && requestedTerminalId === 'terminal_01'))
  );

  if (!activeCash && cashRegisterId) {
    activeCash = (data.cashRegisters || []).find((c) => c.id === cashRegisterId && c.status === 'aberto');
  }

  if (!activeCash) {
    // Fallback: qualquer caixa aberto na drogaria
    activeCash = (data.cashRegisters || []).find((c) => c.status === 'aberto');
  }

  if (!activeCash) {
    return res.status(400).json({
      error: 'A gaveta de caixa deste terminal ainda não foi aberta com fundo de troco. Abra o caixa antes de vender.',
    });
  }

  // 3. Validação do Carrinho
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      error: 'O carrinho está vazio. Adicione pelo menos um produto para finalizar a venda.',
    });
  }

  // 4. Validação e Controle de Alçada de Desconto (PHASE-03 - DESCONTO_EXCEDENTE)
  const numSubtotal = Number(subtotal) || 0;
  const numDiscount = Number(totalDiscount) || 0;
  const storeSettingMaxDiscount = data.stores[0]?.settings?.maxDiscountWithoutAuthPercent ?? 12;

  let discountPercent = 0;
  if (numSubtotal > 0 && numDiscount > 0) {
    discountPercent = Math.round(((numDiscount / numSubtotal) * 100) * 100) / 100;
  }

  // Verifica também se algum item individual tem desconto percentual superior ao teto
  let maxItemDiscountPercent = 0;
  for (const it of items) {
    const itSub = (Number(it.unitPrice) || 0) * (Number(it.quantity) || 1);
    const itDisc = Number(it.discountAmount) || 0;
    if (itSub > 0 && itDisc > 0) {
      const itPct = (itDisc / itSub) * 100;
      if (itPct > maxItemDiscountPercent) maxItemDiscountPercent = itPct;
    }
  }

  const effectiveDiscountPercent = Math.max(discountPercent, maxItemDiscountPercent);

  let authorizedByManagerName: string | null = null;
  let authorizedApprovalId: string | null = null;

  if (effectiveDiscountPercent > storeSettingMaxDiscount) {
    // Verificar se o próprio operador é admin
    if (operatorUser.role === 'admin') {
      authorizedByManagerName = `${operatorUser.name} (Próprio Admin)`;
    } else {
      // Verificar se forneceu PIN gerencial
      const pinToCheck = adminPin || managerPin;
      if (pinToCheck) {
        const adminUser = (data.users || []).find((u) => u.pin === pinToCheck && u.role === 'admin' && u.active);
        if (adminUser) {
          authorizedByManagerName = adminUser.name;
        }
      }

      // Verificar se forneceu ID de aprovação prévia aprovada
      if (!authorizedByManagerName && approvalId) {
        const appr = (data.approvals || []).find(
          (a) => a.id === approvalId && a.type === 'desconto_excedente' && a.status === 'aprovado'
        );
        if (appr) {
          authorizedApprovalId = appr.id;
          authorizedByManagerName = appr.reviewedByUserName || 'Gestor Autorizador';
        }
      }

      // Se não houver autorização válida, bloqueia com erro estruturado
      if (!authorizedByManagerName) {
        return res.status(403).json({
          error: `Desconto aplicado de ${effectiveDiscountPercent.toFixed(1)}% ultrapassa o teto máximo permitido de ${storeSettingMaxDiscount}% sem autorização gerencial.`,
          requiresApproval: true,
          discountPercent: effectiveDiscountPercent,
          maxDiscountAllowed: storeSettingMaxDiscount,
          totalDiscount: numDiscount,
          subtotal: numSubtotal,
        });
      }
    }
  }

  // 5. Validação Prévia e Atômica de Estoque (ANTES de deduzir qualquer item)
  for (const item of items) {
    if (!item.productId || typeof item.quantity !== 'number' || item.quantity <= 0) {
      return res.status(400).json({ error: 'Item com dados ou quantidade inválida.' });
    }
    const prod = (data.products || []).find((p) => p.id === item.productId);
    if (!prod) {
      return res.status(400).json({ error: `Produto não encontrado no catálogo (ID: ${item.productId}).` });
    }
    if (prod.currentStock < item.quantity) {
      return res.status(400).json({
        error: `Estoque insuficiente para o produto "${prod.name}". Saldo disponível: ${prod.currentStock}, Quantidade solicitada: ${item.quantity}.`,
      });
    }
  }

  // 6. Validação de Pagamentos
  if (!payments || !Array.isArray(payments) || payments.length === 0) {
    return res.status(400).json({ error: 'Nenhuma forma de pagamento foi informada.' });
  }

  const saleTotal = Math.round(Number(total) * 100) / 100;
  let paymentSum = 0;
  for (const p of payments) {
    const amt = Number(p.amount);
    if (isNaN(amt) || amt <= 0) {
      return res.status(400).json({ error: 'Cada parcela de pagamento deve ter valor numérico positivo.' });
    }
    paymentSum += amt;
  }
  paymentSum = Math.round(paymentSum * 100) / 100;

  if (Math.abs(paymentSum - saleTotal) > 0.05) {
    if (paymentSum < saleTotal - 0.05) {
      return res.status(400).json({
        error: `O total de pagamentos aplicados (R$ ${paymentSum.toFixed(2)}) é inferior ao total da venda (R$ ${saleTotal.toFixed(2)}).`,
      });
    } else {
      return res.status(400).json({
        error: `A soma dos pagamentos aplicados (R$ ${paymentSum.toFixed(2)}) deve fechar exatamente com o total da venda (R$ ${saleTotal.toFixed(2)}).`,
      });
    }
  }

  // 7. FASE DE COMMIT ATÔMICO COM DB.MUTATE
  try {
    let committedSale: Sale | null = null;

    await db.mutate((currentData) => {
      const liveCash = (currentData.cashRegisters || []).find((c) => c.id === activeCash.id && c.status === 'aberto');
      if (!liveCash) throw new Error('A sessão de caixa não se encontra mais aberta para gravação.');

      const saleCode = `VDA-2026-${String((currentData.sales || []).length + 1).padStart(4, '0')}`;
      const now = new Date().toISOString();

      // 7.1 Deduzir estoque e registrar movimentações de saída
      for (const item of items) {
        const prod = (currentData.products || []).find((p) => p.id === item.productId);
        if (!prod) throw new Error(`Produto ${item.productId} não encontrado durante gravação.`);
        if (prod.currentStock < item.quantity) {
          throw new Error(`Estoque insuficiente no momento da gravação para o produto "${prod.name}".`);
        }

        const prev = prod.currentStock;
        const next = prev - item.quantity;
        prod.currentStock = next;
        prod.updatedAt = now;

        item.unitCost = prod.costPrice;

        const movement: StockMovement = {
          id: `sm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          storeId: prod.storeId,
          productId: prod.id,
          productName: prod.name,
          productCode: prod.code,
          type: 'venda',
          quantity: -item.quantity,
          previousStock: prev,
          newStock: next,
          reason: `Venda balcão ${saleCode}`,
          authorId: effectiveOperatorId,
          authorName: operatorUser.name,
          referenceId: saleCode,
          timestamp: now,
        };
        if (!currentData.stockMovements) currentData.stockMovements = [];
        currentData.stockMovements.unshift(movement);
      }

      // 7.2 Atualizar sessão ativa do caixa
      for (const p of payments) {
        const amt = Number(p.amount);
        if (p.method === 'dinheiro') {
          liveCash.cashSales = Math.round((liveCash.cashSales + amt) * 100) / 100;
          liveCash.expectedCash = Math.round((liveCash.expectedCash + amt) * 100) / 100;
        } else if (p.method === 'pix') {
          liveCash.pixSales = Math.round((liveCash.pixSales + amt) * 100) / 100;
        } else if (p.method === 'cartao_debito') {
          liveCash.cardDebitSales = Math.round((liveCash.cardDebitSales + amt) * 100) / 100;
        } else if (p.method === 'cartao_credito') {
          liveCash.cardCreditSales = Math.round((liveCash.cardCreditSales + amt) * 100) / 100;
        }
      }

      // 7.3 Criar histórico da venda
      const historyItems = [
        {
          timestamp: now,
          userId: effectiveOperatorId,
          userName: operatorUser.name,
          action: 'Venda finalizada no balcão (Recibo Não Fiscal)',
        },
      ];

      if (authorizedByManagerName) {
        historyItems.push({
          timestamp: now,
          userId: effectiveOperatorId,
          userName: authorizedByManagerName,
          action: `Desconto de ${effectiveDiscountPercent.toFixed(1)}% (R$ ${numDiscount.toFixed(2)}) autorizado por ${authorizedByManagerName}${authorizedApprovalId ? ` [Aprovação: ${authorizedApprovalId}]` : ' via PIN'}`,
        });
      }

      // 7.4 Criar registro autoritativo da venda
      const newSale: Sale = {
        id: `sale_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        code: saleCode,
        storeId: liveCash.storeId || operatorUser.storeId || 'store_matriz',
        timestamp: now,
        sellerId: sellerId || effectiveOperatorId,
        sellerName: sellerName || operatorUser.name,
        operatorId: effectiveOperatorId,
        operatorName: operatorName || operatorUser.name,
        workShiftId: activeShift.id,
        cashRegisterId: liveCash.id,
        terminalId: liveCash.terminalId || requestedTerminalId || 'terminal_01',
        terminal: liveCash.terminalName,
        customerId: req.body.customerId || undefined,
        customerName: customerName || undefined,
        items,
        subtotal: numSubtotal || saleTotal,
        totalDiscount: numDiscount,
        total: saleTotal,
        payments,
        fiscalStatus: 'pendente_conciliacao',
        fiscalReference: fiscalReference || undefined,
        status: 'concluida',
        history: historyItems,
        idempotencyKey,
      };

      if (!currentData.sales) currentData.sales = [];
      currentData.sales.unshift(newSale);

      // 7.5 Auditoria
      db.logAudit(
        newSale.storeId,
        effectiveOperatorId,
        operatorUser.name,
        'VENDA_FINALIZADA',
        'VENDAS',
        `Venda ${newSale.code} de R$ ${newSale.total.toFixed(2)} registrada no caixa ${liveCash.terminalName}. Turno: ${activeShift.id}.${authorizedByManagerName ? ` Desconto autorizado por: ${authorizedByManagerName}.` : ''}`,
        newSale.id
      );

      committedSale = newSale;
    });

    return res.json({ success: true, sale: committedSale });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Erro durante gravação atômica da venda.' });
  }
});

app.post('/api/sales/reconcile-fiscal', async (req, res) => {
  const { saleId, fiscalReference, fiscalNotes } = req.body;
  const data = db.getRawData();
  const sale = data.sales.find((s) => s.id === saleId);
  if (!sale) return res.status(404).json({ error: 'Venda não encontrada.' });

  sale.fiscalReference = fiscalReference;
  sale.fiscalStatus = fiscalReference ? 'vinculado' : 'divergente';
  sale.fiscalNotes = fiscalNotes;
  sale.history.push({
    timestamp: new Date().toISOString(),
    userId: 'usr_admin',
    userName: 'Administrador',
    action: `Conciliação fiscal: Referência ${fiscalReference || 'N/A'} associada.`,
  });

  await db.save(data);
  res.json({ sale });
});

app.post('/api/sales/:id/reconcile-fiscal', async (req, res) => {
  const { id } = req.params;
  const { fiscalReference, fiscalNotes } = req.body;
  const data = db.getRawData();
  const sale = data.sales.find((s) => s.id === id);
  if (!sale) return res.status(404).json({ error: 'Venda não encontrada.' });

  sale.fiscalReference = fiscalReference;
  sale.fiscalStatus = fiscalReference ? 'vinculado' : 'divergente';
  sale.fiscalNotes = fiscalNotes;
  if (!sale.history) sale.history = [];
  sale.history.push({
    timestamp: new Date().toISOString(),
    userId: 'usr_admin',
    userName: 'Administrador',
    action: `Conciliação fiscal: Referência ${fiscalReference || 'N/A'} associada.`,
  });

  await db.save(data);
  res.json({ success: true, sale });
});

// -------------------------------------------------------------
// 6. CAIXA GERENCIAL & OPERACIONAL (MEU CAIXA & TERMINAL COMPARTILHADO)
// -------------------------------------------------------------
app.get('/api/cash-registers/active', (req, res) => {
  const { userId, terminalId } = req.query as { userId?: string; terminalId?: string };
  const data = db.getRawData();
  let active: any = null;

  // Busca preferencial pela gaveta física do terminal
  if (terminalId) {
    active = (data.cashRegisters || []).find(
      (c) => c.status === 'aberto' && (c.terminalId === terminalId || c.terminalName === terminalId || (!c.terminalId && terminalId === 'terminal_01'))
    );
  }

  // Se não encontrou por terminal e veio userId
  if (!active && userId) {
    active = (data.cashRegisters || []).find((c) => c.status === 'aberto' && c.openedBy === userId);
    if (!active) {
      active = (data.cashRegisters || []).find((c) => c.status === 'aberto') || null;
    }
  } else if (!active) {
    active = (data.cashRegisters || []).find((c) => c.status === 'aberto') || null;
  }

  if (!active) return res.json(null);
  const movements = (data.cashMovements || []).filter((m: any) => m.cashRegisterId === active.id);
  const operatorSummaries = computeCashRegisterOperatorSummaries(data, active.id, active);
  res.json({ ...active, movements, operatorSummaries });
});

app.get('/api/cash-registers', (req, res) => {
  const { userId } = req.query;
  const data = db.getRawData();
  let registers = data.cashRegisters || [];
  if (userId) {
    const reqUser = (data.users || []).find((u) => u.id === userId);
    if (reqUser && reqUser.role !== 'admin') {
      registers = registers.filter((cr: any) => cr.openedBy === userId);
    }
  }
  const result = registers.map((cr: any) => ({
    ...cr,
    movements: (data.cashMovements || []).filter((m: any) => m.cashRegisterId === cr.id),
    operatorSummaries: cr.operatorSummaries || computeCashRegisterOperatorSummaries(data, cr.id, cr),
  }));
  res.json(result);
});

// Helper de cálculo de fechamento e prestação de contas por operador na mesma gaveta
function computeCashRegisterOperatorSummaries(data: DatabaseSchema, registerId: string, register: CashRegister): OperatorCashSummary[] {
  const registerSales = (data.sales || []).filter((s) => s.cashRegisterId === registerId && s.status !== 'cancelada');
  const operatorMap: Record<string, OperatorCashSummary> = {};

  // Inicializa o operador que abriu a gaveta
  const openerId = register.openedBy;
  const openerName = register.openedByName || (data.users.find(u => u.id === openerId)?.name || 'Operador Abertura');
  operatorMap[openerId] = {
    operatorId: openerId,
    operatorName: openerName,
    salesCount: 0,
    totalSold: 0,
    cashSales: 0,
    pixSales: 0,
    cardDebitSales: 0,
    cardCreditSales: 0,
    discountTotal: 0,
    suppliesTotal: 0,
    bleedingsTotal: 0,
  };

  for (const s of registerSales) {
    const opId = s.operatorId || s.sellerId || openerId;
    const opName = s.operatorName || s.sellerName || (data.users.find(u => u.id === opId)?.name || 'Colaborador');
    if (!operatorMap[opId]) {
      operatorMap[opId] = {
        operatorId: opId,
        operatorName: opName,
        salesCount: 0,
        totalSold: 0,
        cashSales: 0,
        pixSales: 0,
        cardDebitSales: 0,
        cardCreditSales: 0,
        discountTotal: 0,
        suppliesTotal: 0,
        bleedingsTotal: 0,
      };
    }
    operatorMap[opId].salesCount += 1;
    operatorMap[opId].totalSold = Math.round((operatorMap[opId].totalSold + (Number(s.total) || 0)) * 100) / 100;
    operatorMap[opId].discountTotal = Math.round((operatorMap[opId].discountTotal + (Number(s.totalDiscount) || 0)) * 100) / 100;
    for (const p of s.payments || []) {
      const val = Number(p.amount) || 0;
      if (p.method === 'dinheiro') operatorMap[opId].cashSales = Math.round((operatorMap[opId].cashSales + val) * 100) / 100;
      else if (p.method === 'pix') operatorMap[opId].pixSales = Math.round((operatorMap[opId].pixSales + val) * 100) / 100;
      else if (p.method === 'cartao_debito') operatorMap[opId].cardDebitSales = Math.round((operatorMap[opId].cardDebitSales + val) * 100) / 100;
      else if (p.method === 'cartao_credito') operatorMap[opId].cardCreditSales = Math.round((operatorMap[opId].cardCreditSales + val) * 100) / 100;
    }
  }

  const registerMovements = (data.cashMovements || []).filter((m) => m.cashRegisterId === registerId && !m.isClosingWithdrawal);
  for (const m of registerMovements) {
    const authId = m.authorizedBy || openerId;
    const authName = m.authorizedByName || (data.users.find(u => u.id === authId)?.name || 'Operador');
    if (!operatorMap[authId]) {
      operatorMap[authId] = {
        operatorId: authId,
        operatorName: authName,
        salesCount: 0,
        totalSold: 0,
        cashSales: 0,
        pixSales: 0,
        cardDebitSales: 0,
        cardCreditSales: 0,
        discountTotal: 0,
        suppliesTotal: 0,
        bleedingsTotal: 0,
      };
    }
    if (m.type === 'suprimento') {
      operatorMap[authId].suppliesTotal = Math.round((operatorMap[authId].suppliesTotal + (Number(m.amount) || 0)) * 100) / 100;
    } else if (m.type === 'sangria') {
      operatorMap[authId].bleedingsTotal = Math.round((operatorMap[authId].bleedingsTotal + (Number(m.amount) || 0)) * 100) / 100;
    }
  }

  return Object.values(operatorMap);
}

// Endpoint de relatório por operador para uma sessão de caixa específica
app.get('/api/cash-registers/:id/operator-summary', (req, res) => {
  const { id } = req.params;
  const data = db.getRawData();
  const register = (data.cashRegisters || []).find((c) => c.id === id);
  if (!register) return res.status(404).json({ error: 'Sessão de caixa não encontrada.' });

  const summaries = computeCashRegisterOperatorSummaries(data, register.id, register);
  res.json({ cashRegisterId: register.id, displayCode: register.displayCode, summaries });
});

// Helper de validação e abertura de sessão de caixa (fundo de troco da gaveta do terminal)
async function executeCashRegisterOpen(params: {
  terminalId?: string;
  terminalName?: string;
  openedBy?: string;
  openedByName?: string;
  openingAmount: number | string;
  notes?: string;
  workShiftId?: string;
}) {
  const { terminalId, terminalName, openedBy, openedByName, openingAmount, notes, workShiftId } = params;
  const data = db.getRawData();

  const numOpening = Number(openingAmount);
  if (isNaN(numOpening) || numOpening < 0) {
    return { status: 400, error: 'Fundo inicial de abertura inválido. Deve ser maior ou igual a zero.' };
  }

  const operatorId = openedBy || 'usr_colab1';
  const resolvedTerminalId = terminalId || 'terminal_01';
  const resolvedTerminalName = terminalName && terminalName.trim() ? terminalName.trim() : (resolvedTerminalId === 'terminal_02' ? 'Terminal Balcão 02' : 'Terminal Balcão 01');

  // REGRA 01: Validação de expediente ativo obrigatória no backend
  const userShift = (data.shifts || []).find((s) => s.userId === operatorId && (s.status === 'em_andamento' || s.status === 'pausado'));
  if (!userShift) {
    return { status: 400, error: 'Você precisa ter um expediente de trabalho ativo (ponto iniciado) para abrir uma sessão de caixa.' };
  }

  // REGRA PHASE-05: Cada terminal só pode ter UMA gaveta física aberta por vez
  const existingTerminalRegister = (data.cashRegisters || []).find(
    (c) => c.status === 'aberto' && (c.terminalId === resolvedTerminalId || c.terminalName.toLowerCase() === resolvedTerminalName.toLowerCase())
  );
  if (existingTerminalRegister) {
    return {
      status: 400,
      error: `O ${resolvedTerminalName} já possui uma gaveta física aberta (${existingTerminalRegister.displayCode}). A gaveta já está disponível para uso compartilhado.`,
    };
  }

  const sessionSeq = (data.cashRegisters || []).length + 1;
  const displayCode = `CX-${new Date().getFullYear()}-${String(sessionSeq).padStart(4, '0')}`;
  const uniqueId = `cx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const newRegister: CashRegister = {
    id: uniqueId,
    displayCode,
    storeId: 'store_matriz',
    terminalId: resolvedTerminalId,
    terminalName: resolvedTerminalName,
    workShiftId: workShiftId || userShift.id,
    openedBy: operatorId,
    openedByName: openedByName || (data.users.find(u => u.id === operatorId)?.name || 'Operador'),
    openedAt: new Date().toISOString(),
    openingAmount: numOpening,
    cashSales: 0,
    pixSales: 0,
    cardDebitSales: 0,
    cardCreditSales: 0,
    suppliesTotal: 0,
    bleedingsTotal: 0,
    cashReturnsTotal: 0,
    expectedCash: numOpening,
    status: 'aberto',
    reconciliationStatus: 'aberto',
    notes: notes || 'Abertura de gaveta física com fundo de troco operacional',
    operatorSummaries: [],
  };

  data.cashRegisters.unshift(newRegister);
  await db.save(data);
  db.logAudit(
    newRegister.storeId, 
    newRegister.openedBy, 
    newRegister.openedByName, 
    'ABERTURA_CAIXA', 
    'CAIXA', 
    `Caixa ${newRegister.displayCode} (${newRegister.terminalName}) aberto com fundo de troco de R$ ${newRegister.openingAmount.toFixed(2)}`,
    newRegister.id
  );

  return { status: 200, cashRegister: newRegister, success: true };
}

// Helper de movimentação de caixa (sangria / suprimento na gaveta compartilhada)
async function executeCashRegisterMovement(params: {
  cashRegisterId: string;
  type: 'suprimento' | 'sangria';
  amount: number | string;
  reason?: string;
  authorizedBy?: string;
  authorizedByName?: string;
  isClosingWithdrawal?: boolean;
}) {
  const { cashRegisterId, type, amount, reason, authorizedBy, authorizedByName, isClosingWithdrawal } = params;
  const data = db.getRawData();
  const register = data.cashRegisters.find((c) => c.id === cashRegisterId && c.status === 'aberto');
  if (!register) return { status: 404, error: 'Caixa aberto não encontrado ou já encerrado.' };

  // REGRA PHASE-05: Qualquer colaborador com expediente ativo na loja ou gestor/admin pode registrar sangria/suprimento
  const requestingUser = (data.users || []).find((u) => u.id === authorizedBy);
  const isOwner = register.openedBy === authorizedBy;
  const isAdminOrManager = requestingUser && requestingUser.role === 'admin';
  const hasActiveShift = (data.shifts || []).some((s) => s.userId === authorizedBy && s.status !== 'encerrado');

  if (!isOwner && !isAdminOrManager && !hasActiveShift) {
    return { status: 403, error: 'Acesso negado: Você precisa ter um expediente ativo de trabalho para registrar movimentação na gaveta.' };
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) return { status: 400, error: 'O valor da movimentação deve ser maior que zero.' };

  // REGRA 13: Sangria exige justificativa obrigatória; Suprimento é opcional por padrão
  if (type === 'sangria' && (!reason || !reason.trim())) {
    return { status: 400, error: 'A justificativa por escrito é obrigatória para sangria de caixa.' };
  }

  const finalReason = reason && reason.trim() ? reason.trim() : (type === 'suprimento' ? 'Suprimento de troco operacional' : 'Sangria de caixa');

  if (type === 'suprimento') {
    register.suppliesTotal += numAmount;
    register.expectedCash += numAmount;
  } else if (type === 'sangria') {
    register.bleedingsTotal += numAmount;
    register.expectedCash -= numAmount;
  }

  const movementId = `cm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const effectiveAuthId = authorizedBy || register.openedBy;
  const effectiveAuthName = authorizedByName || (data.users.find(u => u.id === effectiveAuthId)?.name || register.openedByName);

  const movement: CashMovement = {
    id: movementId,
    cashRegisterId,
    storeId: register.storeId,
    type,
    amount: numAmount,
    reason: finalReason,
    isClosingWithdrawal: Boolean(isClosingWithdrawal),
    authorizedBy: effectiveAuthId,
    authorizedByName: effectiveAuthName,
    timestamp: new Date().toISOString(),
  };

  if (!data.cashMovements) data.cashMovements = [];
  data.cashMovements.unshift(movement);
  await db.save(data);

  const actionName = isClosingWithdrawal ? 'SANGRIA_FECHAMENTO' : (type === 'sangria' ? 'SANGRIA_CAIXA' : 'SUPRIMENTO_CAIXA');
  db.logAudit(
    register.storeId,
    movement.authorizedBy,
    movement.authorizedByName,
    actionName,
    'CAIXA',
    `${type === 'sangria' ? 'Sangria' : 'Suprimento'} de R$ ${numAmount.toFixed(2)} no terminal "${register.terminalName}". Motivo: ${finalReason}`,
    movement.id
  );

  return { status: 200, cashRegister: register, movement, success: true };
}

// Helper de fechamento de gaveta física (prestação consolidada de contas do terminal)
async function executeCashRegisterClose(params: {
  cashRegisterId: string;
  closedBy?: string;
  closedByName?: string;
  countedCash: number | string;
  retainedFloat?: number | string;
  withdrawnAmount?: number | string;
  closingWithdrawalConfirmed?: boolean;
  divergenceReason?: string;
  notes?: string;
}) {
  const { 
    cashRegisterId, 
    closedBy, 
    closedByName, 
    countedCash, 
    retainedFloat, 
    withdrawnAmount, 
    closingWithdrawalConfirmed, 
    divergenceReason, 
    notes 
  } = params;
  const data = db.getRawData();
  const register = data.cashRegisters.find((c) => c.id === cashRegisterId && c.status === 'aberto');
  if (!register) return { status: 404, error: 'Caixa aberto não encontrado ou já encerrado.' };

  // Permissão: qualquer operador com turno ativo ou gestor/admin pode fechar
  const requestingUser = (data.users || []).find((u) => u.id === closedBy);
  const isOwner = register.openedBy === closedBy;
  const isAdminOrManager = requestingUser && requestingUser.role === 'admin';
  const hasActiveShift = (data.shifts || []).some((s) => s.userId === closedBy && s.status !== 'encerrado');
  if (!isOwner && !isAdminOrManager && !hasActiveShift) {
    return { status: 403, error: 'Acesso negado: Você precisa ter um expediente ativo ou perfil gestor para fechar a gaveta do terminal.' };
  }

  const counted = Number(countedCash);
  if (isNaN(counted) || counted < 0) {
    return { status: 400, error: 'Valor em dinheiro contado inválido.' };
  }

  // FONTE AUTORITATIVA ÚNICA: Recalcular totais de vendas diretamente da coleção de vendas
  const registerSales = (data.sales || []).filter((s) => s.cashRegisterId === register.id && s.status !== 'cancelada');
  let authoritativeCashSales = 0;
  let authoritativePixSales = 0;
  let authoritativeDebitSales = 0;
  let authoritativeCreditSales = 0;

  for (const s of registerSales) {
    for (const p of s.payments || []) {
      const val = Number(p.amount) || 0;
      if (p.method === 'dinheiro') authoritativeCashSales += val;
      else if (p.method === 'pix') authoritativePixSales += val;
      else if (p.method === 'cartao_debito') authoritativeDebitSales += val;
      else if (p.method === 'cartao_credito') authoritativeCreditSales += val;
    }
  }

  // FONTE AUTORITATIVA ÚNICA: Recalcular suprimentos e sangrias da coleção de movimentações
  const priorMovements = (data.cashMovements || []).filter((m) => m.cashRegisterId === register.id && !m.isClosingWithdrawal);
  const authoritativeSupplies = priorMovements.filter(m => m.type === 'suprimento').reduce((sum, m) => sum + Number(m.amount || 0), 0);
  const authoritativeBleedings = priorMovements.filter(m => m.type === 'sangria').reduce((sum, m) => sum + Number(m.amount || 0), 0);

  register.cashSales = authoritativeCashSales;
  register.pixSales = authoritativePixSales;
  register.cardDebitSales = authoritativeDebitSales;
  register.cardCreditSales = authoritativeCreditSales;
  register.suppliesTotal = authoritativeSupplies;
  register.bleedingsTotal = authoritativeBleedings;

  // Fonte única de cálculo aritmético:
  const expected = Math.round((register.openingAmount + authoritativeCashSales + authoritativeSupplies - authoritativeBleedings - (register.cashReturnsTotal || 0)) * 100) / 100;
  register.expectedCash = expected;

  const diff = Math.round((counted - expected) * 100) / 100;
  if (Math.abs(diff) > 0.01 && (!divergenceReason || !divergenceReason.trim())) {
    return { status: 400, error: 'Justificativa por escrito é obrigatória quando houver divergência entre o dinheiro contado e o esperado.' };
  }

  register.countedCash = counted;
  register.difference = diff;
  register.divergenceReason = divergenceReason ? divergenceReason.trim() : undefined;
  register.retainedFloat = Number(retainedFloat) || 0;
  register.closedBy = closedBy || register.openedBy;
  register.closedByName = closedByName || register.openedByName;
  register.closedAt = new Date().toISOString();
  register.status = 'fechado';
  register.reconciliationStatus = Math.abs(diff) > 0.01 ? 'divergencia' : 'aguardando_conferencia';
  register.notes = notes || register.notes;

  // Prestação de contas por operador na sessão de gaveta
  register.operatorSummaries = computeCashRegisterOperatorSummaries(data, register.id, register);

  // Apenas registra sangria de fechamento se o operador confirmar fisicamente
  const numWithdrawn = Number(withdrawnAmount) || 0;
  if (numWithdrawn > 0 && closingWithdrawalConfirmed) {
    register.withdrawnAmount = numWithdrawn;
    register.closingWithdrawalConfirmed = true;
    register.bleedingsTotal += numWithdrawn;
    register.expectedCash -= numWithdrawn;

    const closingSangria: CashMovement = {
      id: `cm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      cashRegisterId: register.id,
      storeId: register.storeId,
      type: 'sangria',
      amount: numWithdrawn,
      reason: 'Sangria de fechamento para recolhimento ao cofre',
      isClosingWithdrawal: true,
      authorizedBy: register.closedBy,
      authorizedByName: register.closedByName,
      timestamp: new Date().toISOString(),
    };
    if (!data.cashMovements) data.cashMovements = [];
    data.cashMovements.unshift(closingSangria);

    db.logAudit(
      register.storeId,
      register.closedBy,
      register.closedByName,
      'SANGRIA_FECHAMENTO',
      'CAIXA',
      `Sangria de fechamento de R$ ${numWithdrawn.toFixed(2)} recolhida para o cofre. Fundo mantido: R$ ${(register.retainedFloat || 0).toFixed(2)}`,
      register.id
    );
  } else {
    register.withdrawnAmount = 0;
    register.closingWithdrawalConfirmed = false;
  }

  await db.save(data);

  // Auditoria do fechamento
  db.logAudit(
    register.storeId,
    register.closedBy,
    register.closedByName,
    'FECHAMENTO_CAIXA',
    'CAIXA',
    `Fechamento de caixa ${register.displayCode || register.id} (${register.terminalName}). Esperado: R$ ${expected.toFixed(2)}, Contado: R$ ${counted.toFixed(2)}, Diferença: R$ ${diff.toFixed(2)}. ${register.operatorSummaries?.length || 0} operadores registraram movimentos nesta gaveta.`,
    register.id
  );

  if (Math.abs(diff) > 0.01) {
    db.logAudit(
      register.storeId,
      register.closedBy,
      register.closedByName,
      'DIVERGENCIA_CAIXA',
      'CAIXA',
      `Divergência registrada no caixa ${register.displayCode || register.id}: R$ ${diff.toFixed(2)}. Justificativa: ${register.divergenceReason}`,
      register.id
    );
  }

  const movements = (data.cashMovements || []).filter((m: any) => m.cashRegisterId === register.id);
  return { status: 200, cashRegister: { ...register, movements }, success: true };
}

// Endpoints REST principais
app.post('/api/cash-registers/open', async (req, res) => {
  const result = await executeCashRegisterOpen(req.body);
  if (result.status !== 200) {
    return res.status(result.status).json({ error: result.error });
  }
  res.json({ cashRegister: result.cashRegister, success: true });
});

app.post('/api/cash-registers/movement', async (req, res) => {
  const result = await executeCashRegisterMovement(req.body);
  if (result.status !== 200) {
    return res.status(result.status).json({ error: result.error });
  }
  res.json({ cashRegister: result.cashRegister, movement: result.movement, success: true });
});

app.post('/api/cash-registers/close', async (req, res) => {
  const result = await executeCashRegisterClose(req.body);
  if (result.status !== 200) {
    return res.status(result.status).json({ error: result.error });
  }
  res.json({ cashRegister: result.cashRegister, success: true });
});

// Aliases para /api/cash/*
app.post('/api/cash/open', async (req, res) => {
  req.body.openedBy = req.body.openedBy || req.body.openedById;
  const result = await executeCashRegisterOpen(req.body);
  if (result.status !== 200) {
    return res.status(result.status).json({ error: result.error });
  }
  res.json({ cashRegister: result.cashRegister, success: true });
});

app.post('/api/cash/movement', async (req, res) => {
  req.body.authorizedBy = req.body.authorizedBy || req.body.authorizedById;
  const result = await executeCashRegisterMovement(req.body);
  if (result.status !== 200) {
    return res.status(result.status).json({ error: result.error });
  }
  res.json({ cashRegister: result.cashRegister, movement: result.movement, success: true });
});

app.post('/api/cash/close', async (req, res) => {
  req.body.closedBy = req.body.closedBy || req.body.closedById;
  req.body.countedCash = req.body.countedCash ?? req.body.closingAmount;
  const result = await executeCashRegisterClose(req.body);
  if (result.status !== 200) {
    return res.status(result.status).json({ error: result.error });
  }
  res.json({ cashRegister: result.cashRegister, success: true });
});

// Reconciliação / Auditoria da Tesouraria e Gerência
app.post('/api/cash-registers/:id/reconcile', async (req, res) => {
  const { id } = req.params;
  const { reviewerId, reviewerName, status, notes } = req.body;
  const data = db.getRawData();

  const register = (data.cashRegisters || []).find((c) => c.id === id);
  if (!register) {
    return res.status(404).json({ error: 'Sessão de caixa não encontrada.' });
  }

  if (register.status !== 'fechado') {
    return res.status(400).json({ error: 'Apenas caixas com fechamento concluído pelo operador podem ser reconciliados pela tesouraria.' });
  }

  const validStatuses = ['conferido', 'resolvido', 'aguardando_conferencia', 'divergencia'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Status de reconciliação inválido. Permitidos: conferido, resolvido, aguardando_conferencia, divergencia.' });
  }

  await db.mutate((currentData) => {
    const reg = (currentData.cashRegisters || []).find((c) => c.id === id);
    if (!reg) return;

    const previousStatus = reg.reconciliationStatus || (Math.abs(reg.difference || 0) > 0.01 ? 'divergencia' : 'aguardando_conferencia');
    reg.reconciliationStatus = status;
    reg.reconciledBy = reviewerId || 'usr_admin';
    reg.reconciledByName = reviewerName || 'Dr. Roberto Mendes (Gestor)';
    reg.reconciledAt = new Date().toISOString();
    if (notes !== undefined) {
      reg.reconciliationNotes = typeof notes === 'string' ? notes.trim() : notes;
    }

    db.logAudit(
      reg.storeId,
      reviewerId || 'usr_admin',
      reviewerName || 'Dr. Roberto Mendes (Gestor)',
      'CONCILIACAO_CAIXA',
      'TESOURARIA',
      `Sessão ${reg.displayCode || reg.id} reconciliada na tesouraria. Status: ${previousStatus} -> ${status}. Notas: ${notes || 'Sem observações adicionais'}`,
      reg.id
    );
  });

  const updatedRegister = (db.getRawData().cashRegisters || []).find((c) => c.id === id);
  const movements = (db.getRawData().cashMovements || []).filter((m: any) => m.cashRegisterId === id);
  res.json({ success: true, cashRegister: { ...updatedRegister, movements }, message: 'Reconciliação registrada com sucesso.' });
});

app.post('/api/cash-registers/:id/review', async (req, res) => {
  req.url = `/api/cash-registers/${req.params.id}/reconcile`;
  app._router.handle(req, res);
});

// -------------------------------------------------------------
// 7. DEMANDA NÃO ATENDIDA (PRODUTOS PROCURADOS & FALTA)
// -------------------------------------------------------------
app.get('/api/demands', (req, res) => {
  const data = db.getRawData();
  res.json(data.unmetDemands);
});

app.post('/api/demands', async (req, res) => {
  const { productId, productName, quantityRequested, reason, attendantId, attendantName, notes } = req.body;
  if (!productName || !productName.trim()) {
    return res.status(400).json({ error: 'Nome do produto procurado é obrigatório.' });
  }

  const data = db.getRawData();
  const newDemand = {
    id: `dem_${Date.now()}`,
    storeId: 'store_matriz',
    productId: productId || undefined,
    productName: productName.trim(),
    quantityRequested: Number(quantityRequested) || 1,
    reason: reason || 'falta_estoque',
    attendantId: attendantId || 'usr_colab1',
    attendantName: attendantName || 'Balconista',
    notes: notes || undefined,
    timestamp: new Date().toISOString(),
    resolved: false,
  };

  data.unmetDemands.unshift(newDemand);
  await db.save(data);

  db.logAudit(newDemand.storeId, newDemand.attendantId, newDemand.attendantName, 'REGISTRO_FALTA', 'DEMANDA', `Registrada falta de ${newDemand.quantityRequested}x "${newDemand.productName}"`);

  res.json({ demand: newDemand, success: true });
});

app.patch('/api/demands/:id/resolve', async (req, res) => {
  const { id } = req.params;
  const data = db.getRawData();
  const demand = data.unmetDemands.find((d) => d.id === id);
  if (!demand) return res.status(404).json({ error: 'Demanda não encontrada.' });
  demand.resolved = true;
  demand.resolvedAt = new Date().toISOString();
  await db.save(data);
  res.json({ success: true, demand });
});
app.get('/api/unmet-demands', (req, res) => {
  const data = db.getRawData();
  res.json(data.unmetDemands);
});

app.post('/api/unmet-demands', async (req, res) => {
  const { productId, productName, quantityRequested, reason, attendantId, attendantName, notes } = req.body;
  if (!productName || !productName.trim()) {
    return res.status(400).json({ error: 'Nome do produto procurado é obrigatório.' });
  }

  const data = db.getRawData();
  const newDemand = {
    id: `dem_${Date.now()}`,
    storeId: 'store_matriz',
    productId: productId || undefined,
    productName: productName.trim(),
    quantityRequested: Number(quantityRequested) || 1,
    reason: reason || 'falta_estoque',
    attendantId: attendantId || 'usr_colab1',
    attendantName: attendantName || 'Balconista',
    notes: notes || undefined,
    timestamp: new Date().toISOString(),
    resolved: false,
  };

  data.unmetDemands.unshift(newDemand);
  await db.save(data);

  db.logAudit(newDemand.storeId, newDemand.attendantId, newDemand.attendantName, 'REGISTRO_FALTA', 'DEMANDA', `Registrada falta de ${newDemand.quantityRequested}x "${newDemand.productName}"`);

  res.json({ demand: newDemand });
});

// -------------------------------------------------------------
// 8. COMPRAS, FORNECEDORES & RECEBIMENTOS
// -------------------------------------------------------------
app.get('/api/suppliers', (req, res) => {
  const data = db.getRawData();
  res.json(data.suppliers);
});

app.get('/api/purchases', (req, res) => {
  const data = db.getRawData();
  res.json((data.purchaseOrders || []).map(normalizePurchaseOrder));
});

app.post('/api/purchases', async (req, res) => {
  const { supplierId, supplierName, items, notes } = req.body;
  const data = db.getRawData();

  const code = `PED-2026-${String(data.purchaseOrders.length + 1).padStart(4, '0')}`;
  const totalEstimated = (items || []).reduce((acc: number, it: any) => acc + (Number(it.totalEstimated) || 0), 0);
  const totalCost = Number(req.body.totalCost) || totalEstimated;

  const newOrder: PurchaseOrder = {
    id: `po_${Date.now()}`,
    code,
    storeId: 'store_matriz',
    supplierId,
    supplierName,
    status: 'rascunho',
    items: items || [],
    totalEstimated,
    totalCost,
    createdAt: new Date().toISOString(),
    notes,
    receiptsHistory: [],
  };

  data.purchaseOrders.unshift(newOrder);
  await db.save(data);
  res.json({ order: newOrder });
});

app.post('/api/purchases/:id/approve', async (req, res) => {
  const { id } = req.params;
  const { approvedBy } = req.body;
  const data = db.getRawData();
  const order = data.purchaseOrders.find((p) => p.id === id);
  if (!order) return res.status(404).json({ error: 'Pedido não encontrado.' });

  order.status = 'aprovado';
  order.approvedAt = new Date().toISOString();
  order.approvedBy = approvedBy || 'Dr. Roberto Mendes';

  await db.save(data);
  res.json({ order });
});

app.post('/api/purchases/:id/receive', async (req, res) => {
  const { id } = req.params;
  const { receivedBy, receivedByName, receipts: rawReceipts, receivedItems, invoiceNumber, notes } = req.body;
  const data = db.getRawData();
  const order = data.purchaseOrders.find((p) => p.id === id);
  if (!order) return res.status(404).json({ error: 'Pedido não encontrado.' });

  order.items = order.items || [];
  order.receiptsHistory = order.receiptsHistory || [];

  if (invoiceNumber) {
    order.invoiceNumber = invoiceNumber;
  }

  const rawList = rawReceipts || receivedItems || [];
  const receipts = rawList.map((r: any) => ({
    productId: r.productId,
    qtyFit: Number(r.qtyFit !== undefined ? r.qtyFit : r.receivedQuantity) || 0,
    qtyDamaged: Number(r.qtyDamaged !== undefined ? r.qtyDamaged : r.damagedQuantity) || 0,
    unitCost: Number(r.unitCost) || 0,
  }));

  const now = new Date().toISOString();
  const receiptHistoryEntry = {
    receiptId: `rec_${Date.now()}`,
    timestamp: now,
    receivedBy: receivedBy || 'usr_admin',
    receivedByName: receivedByName || 'Administrador',
    items: [] as any[],
    notes,
  };

  for (const r of receipts || []) {
    const orderItem = order.items.find((it) => it.productId === r.productId);
    const prod = data.products.find((p) => p.id === r.productId);

    const qtyFit = Number(r.qtyFit) || 0; // Quantidade apta para venda
    const qtyDamaged = Number(r.qtyDamaged) || 0; // Quantidade avariada (não entra no saldo vendável)
    const unitCost = Number(r.unitCost) || (orderItem ? orderItem.unitCostEstimated : 0);

    if (orderItem) {
      orderItem.quantityReceived += qtyFit + qtyDamaged;
      orderItem.unitCostReal = unitCost;
    }

    if (prod && qtyFit > 0) {
      const prev = prod.currentStock;
      const next = prev + qtyFit;
      prod.currentStock = next;
      prod.costPrice = unitCost; // Atualiza custo real
      prod.updatedAt = now;

      // Entra no estoque exatamente uma vez
      const movement: StockMovement = {
        id: `sm_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        storeId: prod.storeId,
        productId: prod.id,
        productName: prod.name,
        productCode: prod.code,
        type: 'compra_entrada',
        quantity: qtyFit,
        previousStock: prev,
        newStock: next,
        reason: `Recebimento pedido ${order.code}. Custo real R$ ${unitCost.toFixed(2)}`,
        authorId: receivedBy || 'usr_admin',
        authorName: receivedByName || 'Administrador',
        referenceId: order.code,
        timestamp: now,
      };
      data.stockMovements.unshift(movement);
    }

    // Se houve avaria, registra movimentação de perda separada
    if (prod && qtyDamaged > 0) {
      const lossMovement: StockMovement = {
        id: `sm_${Date.now()}_loss`,
        storeId: prod.storeId,
        productId: prod.id,
        productName: prod.name,
        productCode: prod.code,
        type: 'perda_avaria',
        quantity: 0, // Não altera saldo vendável pois nem chegou a entrar
        previousStock: prod.currentStock,
        newStock: prod.currentStock,
        reason: `Item recebido com avaria no pedido ${order.code} (${qtyDamaged} un recusadas)`,
        authorId: receivedBy || 'usr_admin',
        authorName: receivedByName || 'Administrador',
        referenceId: order.code,
        timestamp: now,
      };
      data.stockMovements.unshift(lossMovement);
    }

    receiptHistoryEntry.items.push({
      productId: r.productId,
      qtyFit,
      qtyDamaged,
      unitCost,
    });
  }

  order.receiptsHistory.push(receiptHistoryEntry);

  // Check if fully received or partially received
  const totalOrdered = order.items.reduce((acc, it) => acc + it.quantityOrdered, 0);
  const totalReceived = order.items.reduce((acc, it) => acc + it.quantityReceived, 0);

  if (totalReceived >= totalOrdered) {
    order.status = 'recebido';
    order.receivedAt = now;
  } else {
    order.status = 'parcialmente_recebido';
  }

  await db.save(data);
  res.json({ order });
});

app.post('/api/purchases/:id/cancel-remainder', async (req, res) => {
  const { id } = req.params;
  const data = db.getRawData();
  const order = data.purchaseOrders.find((p) => p.id === id);
  if (!order) return res.status(404).json({ error: 'Pedido não encontrado.' });

  // Cancel remaining items without deleting already received items
  order.status = 'cancelado';
  order.notes = (order.notes ? order.notes + ' | ' : '') + 'Saldo pendente cancelado pelo gestor.';

  await db.save(data);
  res.json({ order });
});

// -------------------------------------------------------------
// 9. CLIENTES
// -------------------------------------------------------------
app.get('/api/customers', (req, res) => {
  const data = db.getRawData();
  res.json(data.customers);
});

app.post('/api/customers', async (req, res) => {
  const { name, cpf, phone, address, notes } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Nome do cliente é obrigatório.' });

  const data = db.getRawData();
  const newCustomer = {
    id: `cust_${Date.now()}`,
    storeId: 'store_matriz',
    name: name.trim(),
    cpf: cpf || undefined,
    phone: phone || undefined,
    address: address || undefined,
    notes: notes || undefined,
    createdAt: new Date().toISOString(),
  };

  data.customers.push(newCustomer);
  await db.save(data);
  res.json({ customer: newCustomer });
});

// -------------------------------------------------------------
// 10. EQUIPE, METAS & DESEMPENHO
// -------------------------------------------------------------
app.get('/api/targets', (req, res) => {
  const data = db.getRawData();
  res.json(data.targets);
});

app.post('/api/targets', async (req, res) => {
  const { month, storeRevenueTarget, individualTargets, bonusRules } = req.body;
  const data = db.getRawData();

  let target = data.targets.find((t) => t.month === month);
  if (target) {
    target.storeRevenueTarget = Number(storeRevenueTarget);
    target.individualTargets = individualTargets;
    target.bonusRules = bonusRules;
  } else {
    target = {
      id: `target_${Date.now()}`,
      storeId: 'store_matriz',
      month,
      storeRevenueTarget: Number(storeRevenueTarget),
      individualTargets: individualTargets || [],
      bonusRules: bonusRules || [],
    };
    data.targets.push(target);
  }

  await db.save(data);
  res.json({ target });
});

// -------------------------------------------------------------
// 11. TAREFAS & PENDÊNCIAS
// -------------------------------------------------------------
app.get('/api/tasks', (req, res) => {
  const data = db.getRawData();
  res.json(data.tasks);
});

app.post('/api/tasks', async (req, res) => {
  const { title, description, origin, priority, assignedToId, assignedToName, createdById, createdByName, dueDate, referenceLink } = req.body;
  if (!title) return res.status(400).json({ error: 'Título da tarefa é obrigatório.' });

  const data = db.getRawData();
  const newTask = {
    id: `tsk_${Date.now()}`,
    storeId: 'store_matriz',
    title,
    description: description || '',
    origin: origin || 'manual',
    priority: priority || 'media',
    status: 'pendente' as const,
    assignedToId,
    assignedToName,
    createdById: createdById || 'usr_admin',
    createdByName: createdByName || 'Administrador',
    dueDate,
    createdAt: new Date().toISOString(),
    referenceLink,
  };

  data.tasks.unshift(newTask);
  await db.save(data);
  res.json({ task: newTask });
});

app.patch('/api/tasks/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const data = db.getRawData();
  const task = data.tasks.find((t) => t.id === id);
  if (!task) return res.status(404).json({ error: 'Tarefa não encontrada.' });

  task.status = status;
  if (status === 'concluida') {
    task.completedAt = new Date().toISOString();
  }

  await db.save(data);
  res.json({ task });
});

app.patch('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { status, priority, title, description } = req.body;
  const data = db.getRawData();
  const task = data.tasks.find((t) => t.id === id);
  if (!task) return res.status(404).json({ error: 'Tarefa não encontrada.' });

  if (status) {
    task.status = status;
    if (status === 'concluida') {
      task.completedAt = new Date().toISOString();
    }
  }
  if (priority) task.priority = priority;
  if (title) task.title = title;
  if (description !== undefined) task.description = description;

  await db.save(data);
  res.json({ success: true, task });
});

app.post('/api/goals', async (req, res) => {
  const { userId, month, targetAmount } = req.body;
  const data = db.getRawData();

  let target = data.targets.find((t) => t.month === month);
  if (!target) {
    target = {
      id: `target_${Date.now()}`,
      storeId: 'store_matriz',
      month,
      storeRevenueTarget: Number(targetAmount) || 20000,
      individualTargets: [],
      bonusRules: [],
    };
    data.targets.push(target);
  }

  if (userId) {
    const user = data.users.find((u) => u.id === userId);
    const existingIndiv = target.individualTargets.find((it) => it.userId === userId);
    if (existingIndiv) {
      existingIndiv.revenueTarget = Number(targetAmount) || existingIndiv.revenueTarget;
    } else {
      target.individualTargets.push({
        userId,
        userName: user?.name || 'Colaborador',
        revenueTarget: Number(targetAmount) || 10000,
        maxDiscountAllowedPercent: 5,
      });
    }
  } else {
    target.storeRevenueTarget = Number(targetAmount) || target.storeRevenueTarget;
  }

  await db.save(data);
  res.json({ success: true, target });
});

// -------------------------------------------------------------
// 12. INTELIGÊNCIA ARTIFICIAL (GEMINI 3.8 FLASH) & RELATÓRIOS
// -------------------------------------------------------------
app.get('/api/ai/reports', (req, res) => {
  const data = db.getRawData();
  res.json(data.aiReports);
});

app.post('/api/ai/generate-analysis', async (req, res) => {
  const data = db.getRawData();
  const store = data.stores[0];

  // 1. Calculate deterministic sales metrics
  const totalRevenue = data.sales.reduce((acc, s) => acc + s.total, 0);
  const salesCount = data.sales.length;
  const averageTicket = salesCount > 0 ? totalRevenue / salesCount : 0;
  const discountTotal = data.sales.reduce((acc, s) => acc + s.totalDiscount, 0);
  const subtotalTotal = data.sales.reduce((acc, s) => acc + s.subtotal, 0);
  const averageDiscountPercent = subtotalTotal > 0 ? (discountTotal / subtotalTotal) * 100 : 0;

  // 2. Strict cost coverage calculation:
  // Parcela da receita líquida com custo conhecido (não apenas % de itens)
  let knownCostRevenue = 0;
  let totalCostOfKnownRevenue = 0;

  for (const sale of data.sales) {
    for (const item of (sale.items || [])) {
      if (item.unitCost !== undefined && item.unitCost > 0) {
        knownCostRevenue += item.total;
        totalCostOfKnownRevenue += item.unitCost * item.quantity;
      }
    }
  }

  const costCoveragePercent = totalRevenue > 0 ? (knownCostRevenue / totalRevenue) * 100 : 0;
  const grossMarginPercent = knownCostRevenue > 0 ? ((knownCostRevenue - totalCostOfKnownRevenue) / knownCostRevenue) * 100 : undefined;

  // 3. Products in critical stock
  const criticalProducts = data.products
    .filter((p) => p.currentStock <= p.minStock)
    .map((p) => ({
      code: p.code,
      name: p.name,
      stock: p.currentStock,
      minStock: p.minStock,
    }));

  // 4. Unmet demands
  const unmetDemands = data.unmetDemands.slice(0, 5).map((d) => ({
    productName: d.productName,
    quantity: d.quantityRequested,
    reason: d.reason,
  }));

  // 5. Staff sales stats
  const staffStatsMap: Record<string, { name: string; role: string; salesCount: number; totalSold: number; totalDiscount: number; totalSubtotal: number }> = {};
  for (const u of data.users) {
    staffStatsMap[u.id] = {
      name: u.name,
      role: u.roleTitle || u.role,
      salesCount: 0,
      totalSold: 0,
      totalDiscount: 0,
      totalSubtotal: 0,
    };
  }

  for (const sale of data.sales) {
    const seller = staffStatsMap[sale.sellerId];
    if (seller) {
      seller.salesCount += 1;
      seller.totalSold += sale.total;
      seller.totalDiscount += sale.totalDiscount;
      seller.totalSubtotal += sale.subtotal;
    }
  }

  const staffPerformance = Object.values(staffStatsMap).map((s) => ({
    name: s.name,
    role: s.role,
    salesCount: s.salesCount,
    totalSold: s.totalSold,
    avgDiscountPercent: s.totalSubtotal > 0 ? (s.totalDiscount / s.totalSubtotal) * 100 : 0,
  }));

  const openPurchasesCount = data.purchaseOrders.filter((p) => p.status === 'rascunho' || p.status === 'aprovado' || p.status === 'parcialmente_recebido').length;

  const analysis = await generateStoreAnalysis({
    storeName: store.name,
    periodLabel: 'Visão Consolidada Recente (Histórico Ativo)',
    metrics: {
      totalRevenue,
      salesCount,
      averageTicket,
      discountTotal,
      averageDiscountPercent,
      knownCostRevenue,
      costCoveragePercent,
      grossMarginPercent,
    },
    criticalProducts,
    unmetDemands,
    staffPerformance,
    openPurchasesCount,
  });

  const report: any = {
    id: `rep_${Date.now()}`,
    storeId: store.id,
    timestamp: new Date().toISOString(),
    periodLabel: 'Últimos 30 dias / Operação Atual',
    promptType: 'diagnostico_geral',
    facts: analysis.facts,
    hypotheses: analysis.hypotheses,
    limitations: analysis.limitations,
    recommendations: analysis.recommendations,
    rawMetricsSnapshot: {
      totalRevenue,
      salesCount,
      averageTicket,
      discountTotal,
      grossMarginPercent,
      marginCostCoveragePercent: costCoveragePercent,
    },
  };

  data.aiReports.unshift(report);
  await db.save(data);

  res.json({ report });
});

app.post('/api/ai/analyze', async (req, res) => {
  const data = db.getRawData();
  const store = data.stores[0];

  const totalRevenue = data.sales.reduce((acc, s) => acc + s.total, 0);
  const salesCount = data.sales.length;
  const averageTicket = salesCount > 0 ? totalRevenue / salesCount : 0;
  const discountTotal = data.sales.reduce((acc, s) => acc + s.totalDiscount, 0);
  const subtotalTotal = data.sales.reduce((acc, s) => acc + s.subtotal, 0);
  const averageDiscountPercent = subtotalTotal > 0 ? (discountTotal / subtotalTotal) * 100 : 0;

  let knownCostRevenue = 0;
  let totalCostOfKnownRevenue = 0;

  for (const sale of data.sales) {
    for (const item of (sale.items || [])) {
      if (item.unitCost !== undefined && item.unitCost > 0) {
        knownCostRevenue += item.total;
        totalCostOfKnownRevenue += item.unitCost * item.quantity;
      }
    }
  }

  const costCoveragePercent = totalRevenue > 0 ? (knownCostRevenue / totalRevenue) * 100 : 0;
  const grossMarginPercent = knownCostRevenue > 0 ? ((knownCostRevenue - totalCostOfKnownRevenue) / knownCostRevenue) * 100 : undefined;

  const criticalProducts = data.products
    .filter((p) => p.currentStock <= p.minStock)
    .map((p) => ({
      code: p.code,
      name: p.name,
      stock: p.currentStock,
      minStock: p.minStock,
    }));

  const unmetDemands = data.unmetDemands.slice(0, 5).map((d) => ({
    productName: d.productName,
    quantity: d.quantityRequested,
    reason: d.reason,
  }));

  const staffStatsMap: Record<string, { name: string; role: string; salesCount: number; totalSold: number; totalDiscount: number; totalSubtotal: number }> = {};
  for (const u of data.users) {
    staffStatsMap[u.id] = {
      name: u.name,
      role: u.roleTitle || u.role,
      salesCount: 0,
      totalSold: 0,
      totalDiscount: 0,
      totalSubtotal: 0,
    };
  }

  for (const sale of data.sales) {
    const seller = staffStatsMap[sale.sellerId];
    if (seller) {
      seller.salesCount += 1;
      seller.totalSold += sale.total;
      seller.totalDiscount += sale.totalDiscount;
      seller.totalSubtotal += sale.subtotal;
    }
  }

  const staffPerformance = Object.values(staffStatsMap).map((s) => ({
    name: s.name,
    role: s.role,
    salesCount: s.salesCount,
    totalSold: s.totalSold,
    avgDiscountPercent: s.totalSubtotal > 0 ? (s.totalDiscount / s.totalSubtotal) * 100 : 0,
  }));

  const openPurchasesCount = data.purchaseOrders.filter((p) => p.status === 'rascunho' || p.status === 'aprovado' || p.status === 'parcialmente_recebido').length;

  const analysis = await generateStoreAnalysis({
    storeName: store.name,
    periodLabel: 'Visão Consolidada Recente (Histórico Ativo)',
    metrics: {
      totalRevenue,
      salesCount,
      averageTicket,
      discountTotal,
      averageDiscountPercent,
      knownCostRevenue,
      costCoveragePercent,
      grossMarginPercent,
    },
    criticalProducts,
    unmetDemands,
    staffPerformance,
    openPurchasesCount,
  });

  const report: any = {
    id: `rep_${Date.now()}`,
    storeId: store.id,
    timestamp: new Date().toISOString(),
    periodLabel: 'Últimos 30 dias / Operação Atual',
    promptType: 'diagnostico_geral',
    facts: analysis.facts,
    hypotheses: analysis.hypotheses,
    limitations: analysis.limitations,
    recommendations: analysis.recommendations,
    rawMetricsSnapshot: {
      totalRevenue,
      salesCount,
      averageTicket,
      discountTotal,
      grossMarginPercent,
      marginCostCoveragePercent: costCoveragePercent,
    },
  };

  data.aiReports.unshift(report);
  await db.save(data);

  res.json({ report });
});

app.post('/api/ai/convert-recommendation-to-task', async (req, res) => {
  const { reportId, recommendationIndex, assignedToId, assignedToName } = req.body;
  const data = db.getRawData();
  const report = data.aiReports.find((r) => r.id === reportId);
  if (!report) return res.status(404).json({ error: 'Relatório não encontrado.' });

  const rec = report.recommendations[recommendationIndex];
  if (!rec) return res.status(404).json({ error: 'Recomendação não encontrada.' });

  const task = {
    id: `tsk_ai_${Date.now()}`,
    storeId: report.storeId,
    title: rec.title,
    description: `${rec.rationale}\n\nAção sugerida: ${rec.suggestedAction}`,
    origin: 'ia' as const,
    priority: rec.category === 'compras' || rec.category === 'estoque' ? ('alta' as const) : ('media' as const),
    status: 'pendente' as const,
    assignedToId: assignedToId || 'usr_admin',
    assignedToName: assignedToName || 'Dr. Roberto Mendes',
    createdById: 'ai_system',
    createdByName: 'Inteligência Artificial FarmaVida',
    createdAt: new Date().toISOString(),
  };

  rec.convertedToTaskId = task.id;
  data.tasks.unshift(task);

  await db.save(data);
  res.json({ task });
});

// -------------------------------------------------------------
// 13. IMPORTAÇÃO E CONCILIAÇÃO INTELIGENTE (CSV/XLSX)
// -------------------------------------------------------------
app.post('/api/import/sales', async (req, res) => {
  const { rows, sourceName } = req.body;
  if (!Array.isArray(rows)) return res.status(400).json({ error: 'Linhas para importação não fornecidas.' });

  const data = db.getRawData();
  let importedCount = 0;
  let duplicatedCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const externalCode = row.externalCode || row.codigo || row.numero || row.cupom || `IMP-${i}`;

    // Deduplication check: Do not duplicate if sale reference already exists!
    const existing = data.sales.find((s) => s.fiscalReference === externalCode || s.code === externalCode || s.idempotencyKey === `imp_${externalCode}`);

    if (existing) {
      duplicatedCount++;
      // Link fiscal reference if not yet linked
      if (!existing.fiscalReference) {
        existing.fiscalReference = externalCode;
        existing.fiscalStatus = 'vinculado';
      }
      continue;
    }

    const total = Number(row.total || row.valor || row.valorTotal || 0);
    if (total <= 0) {
      skippedCount++;
      continue;
    }

    // Try finding product
    const prodName = row.produto || row.descricao || row.item || 'Medicamento Genérico';
    const prod = data.products.find((p) => p.name.toLowerCase().includes(prodName.toLowerCase()) || p.code === row.codigoItem);

    const quantity = Number(row.quantidade || row.qtd || 1);
    const itemTotal = total;

    const newSale: Sale = {
      id: `sale_imp_${Date.now()}_${i}`,
      code: `IMP-${externalCode}`,
      storeId: 'store_matriz',
      timestamp: row.data || new Date().toISOString(),
      sellerId: 'usr_externo',
      sellerName: row.vendedor || 'Não identificado (Sistema Legado)',
      operatorId: 'usr_admin',
      operatorName: 'Importação por Dr. Roberto Mendes',
      customerName: row.cliente || undefined,
      items: [
        {
          productId: prod ? prod.id : 'prod_generico',
          productCode: prod ? prod.code : 'EXT-001',
          productName: prod ? prod.name : prodName,
          category: prod ? prod.category : 'Geral',
          quantity,
          unitPrice: total / quantity,
          unitCost: prod ? prod.costPrice : undefined,
          discountPercent: Number(row.desconto || 0),
          discountAmount: 0,
          total,
        },
      ],
      subtotal: total,
      totalDiscount: Number(row.desconto || 0),
      total,
      payments: [
        {
          method: (row.formaPagamento as any) || 'dinheiro',
          amount: total,
          confirmed: true,
        },
      ],
      fiscalStatus: 'vinculado',
      fiscalReference: String(externalCode),
      status: 'concluida',
      history: [
        {
          timestamp: new Date().toISOString(),
          userId: 'usr_admin',
          userName: 'Dr. Roberto Mendes',
          action: `Importado de planilha externa: ${sourceName || 'Arquivo'}`,
        },
      ],
      idempotencyKey: `imp_${externalCode}`,
    };

    data.sales.unshift(newSale);
    importedCount++;
  }

  await db.save(data);
  db.logAudit('store_matriz', 'usr_admin', 'Dr. Roberto Mendes', 'IMPORTACAO_VENDAS', 'VENDAS', `Importação de planilhas: ${importedCount} novas vendas, ${duplicatedCount} duplicadas reconciliadas, ${skippedCount} ignoradas.`);

  res.json({ importedCount, duplicatedCount, skippedCount, errors });
});

// Importação de produtos do catálogo
app.post('/api/import/products', async (req, res) => {
  const { products: newProducts } = req.body;
  if (!Array.isArray(newProducts)) {
    return res.status(400).json({ error: 'Array de produtos esperado.' });
  }

  const data = db.getRawData();
  let count = 0;

  for (const item of newProducts) {
    const existing = data.products.find((p) => p.code === item.code || (p.name.toLowerCase() === item.name.toLowerCase() && p.presentation === item.presentation));
    if (existing) {
      existing.salePrice = Number(item.salePrice) || existing.salePrice;
      existing.costPrice = Number(item.costPrice) || existing.costPrice;
      existing.currentStock = Number(item.currentStock) || existing.currentStock;
      existing.updatedAt = new Date().toISOString();
    } else {
      const prod: Product = {
        id: `prod_imp_${Date.now()}_${count}`,
        storeId: 'store_matriz',
        code: item.code || `IMP-${Math.floor(1000 + Math.random() * 9000)}`,
        name: item.name,
        presentation: item.presentation || '',
        category: item.category || 'Medicamentos',
        salePrice: Number(item.salePrice) || 0,
        costPrice: Number(item.costPrice) || 0,
        currentStock: Number(item.currentStock) || 0,
        minStock: Number(item.minStock) || 5,
        maxStock: Number(item.maxStock) || 30,
        safetyDays: 15,
        unit: item.unit || 'cx',
        active: true,
        updatedAt: new Date().toISOString(),
      };
      data.products.push(prod);
    }
    count++;
  }

  await db.save(data);
  db.logAudit('store_matriz', 'usr_admin', 'Administrador', 'IMPORTACAO_PRODUTOS', 'CATALOGO', `${count} produtos importados/atualizados via planilha.`);

  res.json({ success: true, count });
});

// -------------------------------------------------------------
// 14. BACKUP & RESTAURAÇÃO COMPLETA
// -------------------------------------------------------------
app.get('/api/data/export', (req, res) => {
  const data = db.getRawData();
  res.json(data);
});
app.get('/api/backup/export', (req, res) => {
  const data = db.getRawData();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=farmavida_backup_${new Date().toISOString().slice(0, 10)}.json`);
  res.json({
    app: 'FarmaVida',
    version: '1.0.0',
    exportTimestamp: new Date().toISOString(),
    checksum: `chk_${Date.now()}`,
    data,
  });
});

app.post('/api/backup/restore', async (req, res) => {
  const { backupData } = req.body;
  if (!backupData || !backupData.data || !Array.isArray(backupData.data.products)) {
    return res.status(400).json({ error: 'Formato de arquivo de backup inválido.' });
  }

  const restoredData = backupData.data;
  await db.save(restoredData);

  db.logAudit('store_matriz', 'usr_admin', 'Dr. Roberto Mendes', 'RESTAURACAO_BACKUP', 'SISTEMA', `Restauração completa de backup efetuada com sucesso.`);
  res.json({ message: 'Backup restaurado com sucesso.', productsCount: restoredData.products.length, salesCount: restoredData.sales.length });
});

// -------------------------------------------------------------
// 15. AUDITORIA
// -------------------------------------------------------------
app.get('/api/audit', (req, res) => {
  const data = db.getRawData();
  res.json(data.auditLogs);
});

// -------------------------------------------------------------
// VITE MIDDLEWARE & SERVER STARTUP
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[FarmaVida] Servidor operacional rodando em http://localhost:${PORT}`);
  });
}

startServer();
