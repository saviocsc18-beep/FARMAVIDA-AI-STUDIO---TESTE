import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  Firestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  runTransaction,
  writeBatch
} from 'firebase/firestore';
import bcrypt from 'bcryptjs';
import { 
  User, 
  Store, 
  Terminal, 
  Product, 
  Sale, 
  StockMovement, 
  CashRegister, 
  CashMovement, 
  WorkShift, 
  PurchaseOrder, 
  Supplier, 
  InventoryCount, 
  Customer, 
  SalesGoal, 
  Task, 
  AIReport, 
  AuditLog, 
  ApprovalRequest,
  OperatorCashSummary,
  UnmetDemand
} from '../src/types.js';
import { AuthContext, generateAuthToken } from './auth.js';
import { loadAppConfig, AppConfig } from './config.js';

export async function hashPin(plainPin: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainPin, salt);
}

export async function comparePin(plainPin: string, hash: string): Promise<boolean> {
  if (!plainPin || !hash) return false;
  return bcrypt.compare(plainPin, hash);
}

export class FirestoreDataService {
  private static instance: FirestoreDataService;
  private app: FirebaseApp;
  private db: Firestore;
  private config: AppConfig;

  private constructor() {
    this.config = loadAppConfig();
    const fb = this.config.firebase;

    const firebaseConfig = {
      projectId: fb.projectId || undefined,
      appId: fb.appId || undefined,
      apiKey: fb.apiKey || undefined,
      authDomain: fb.authDomain || undefined,
      storageBucket: fb.storageBucket || undefined,
      messagingSenderId: fb.messagingSenderId || undefined,
    };

    this.app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    this.db = getFirestore(this.app, fb.firestoreDatabaseId || '(default)');
  }

  public static getInstance(): FirestoreDataService {
    if (!FirestoreDataService.instance) {
      FirestoreDataService.instance = new FirestoreDataService();
    }
    return FirestoreDataService.instance;
  }

  public getDb(): Firestore {
    return this.db;
  }

  public getOrgId(): string {
    return this.config.organizationId;
  }

  public getDefaultStoreId(): string {
    return this.config.defaultStoreId;
  }

  private getOrgDocRef() {
    return doc(this.db, 'organizations', this.config.organizationId);
  }

  private getStoreDocRef(storeId?: string) {
    const targetStoreId = storeId || this.config.defaultStoreId;
    return doc(this.db, 'organizations', this.config.organizationId, 'stores', targetStoreId);
  }

  // -------------------------------------------------------------
  // FIRST ADMIN BOOTSTRAP (SAFE REPLAY-PROTECTED)
  // -------------------------------------------------------------
  async bootstrapFirstAdmin(data: {
    name: string;
    email: string;
    pin: string;
    roleTitle?: string;
    phone?: string;
  }): Promise<{ success: boolean; user?: User; token?: string; error?: string }> {
    const orgId = this.config.organizationId;
    const storeId = this.config.defaultStoreId;
    const usersCol = collection(this.db, 'organizations', orgId, 'users');

    // 1. Check if any active admin already exists
    const adminQ = query(usersCol, where('role', '==', 'admin'), where('active', '==', true), limit(1));
    const adminSnap = await getDocs(adminQ);
    if (!adminSnap.empty) {
      return {
        success: false,
        error: 'Bootstrap bloqueado: A organização já possui administrador(es) ativo(s) cadastrado(s).'
      };
    }

    if (!data.name || !data.email || !data.pin || data.pin.length < 4) {
      return {
        success: false,
        error: 'Nome, e-mail válido e PIN de no mínimo 4 dígitos são obrigatórios para o bootstrap.'
      };
    }

    const userId = `usr_admin_${Date.now().toString(36)}`;
    const pinHash = await hashPin(data.pin);
    const now = new Date().toISOString();

    const newAdmin: User = {
      id: userId,
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      role: 'admin',
      roleTitle: data.roleTitle || 'Administrador Geral / Farmacêutico Responsável',
      phone: data.phone || '',
      storeId,
      active: true,
      pin: '', // Never stored in plain text
    };

    // Store in Firestore with secure pinHash
    await setDoc(doc(usersCol, userId), {
      ...newAdmin,
      pinHash,
      createdAt: now,
      isBootstrapAdmin: true,
    });

    // Audit the bootstrap
    const auditId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const auditRef = doc(this.db, 'organizations', orgId, 'stores', storeId, 'auditLogs', auditId);
    const auditLog: AuditLog = {
      id: auditId,
      storeId,
      userId,
      userName: newAdmin.name,
      action: 'BOOTSTRAP_FIRST_ADMIN',
      entity: 'USUARIOS',
      entityType: 'user',
      entityId: userId,
      details: `Primeiro Administrador inicializado com sucesso (${newAdmin.email}) no ambiente ${this.config.env}`,
      timestamp: now,
    };
    await setDoc(auditRef, auditLog);

    const token = generateAuthToken(newAdmin);

    return {
      success: true,
      user: newAdmin,
      token,
    };
  }

  // -------------------------------------------------------------
  // AUTH & USER VERIFICATION
  // -------------------------------------------------------------
  async getUserByUsernameOrId(usernameOrId: string): Promise<(User & { pinHash?: string; pin?: string }) | null> {
    const orgId = this.config.organizationId;
    const usersCol = collection(this.db, 'organizations', orgId, 'users');
    
    // Direct ID doc
    const directDoc = await getDoc(doc(usersCol, usernameOrId));
    if (directDoc.exists()) {
      return directDoc.data() as any;
    }

    // By email
    const emailQ = query(usersCol, where('email', '==', usernameOrId), limit(1));
    const emailSnap = await getDocs(emailQ);
    if (!emailSnap.empty) {
      return emailSnap.docs[0].data() as any;
    }

    // By name fallback
    const allUsersSnap = await getDocs(usersCol);
    for (const d of allUsersSnap.docs) {
      const u = d.data() as any;
      if (u.name && u.name.toLowerCase() === usernameOrId.toLowerCase()) {
        return u;
      }
    }
    return null;
  }

  async verifyUserPin(userIdOrUsername: string, plainPin: string, terminalId?: string): Promise<{ success: boolean; user?: User; token?: string; error?: string }> {
    const orgId = this.config.organizationId;
    const user = await this.getUserByUsernameOrId(userIdOrUsername);
    if (!user) {
      return { success: false, error: 'Usuário não encontrado' };
    }
    if (!user.active) {
      return { success: false, error: 'Usuário inativo. Contate o administrador.' };
    }

    let isMatch = false;
    if (user.pinHash) {
      isMatch = await comparePin(plainPin, user.pinHash);
    } else if (user.pin) {
      // Legacy PIN check and upgrade
      if (user.pin === plainPin) {
        isMatch = true;
        const newHash = await hashPin(plainPin);
        await updateDoc(doc(this.db, 'organizations', orgId, 'users', user.id), {
          pinHash: newHash,
          pin: null
        });
      }
    }

    if (!isMatch) {
      return { success: false, error: 'PIN de acesso incorreto.' };
    }

    const { pinHash: _h, pin: _p, ...safeUser } = user as any;
    const token = generateAuthToken(safeUser as User, terminalId);

    return {
      success: true,
      user: safeUser as User,
      token,
    };
  }

  async verifyManagerPin(managerId: string, plainPin: string): Promise<{ success: boolean; managerName?: string; error?: string }> {
    const user = await this.getUserByUsernameOrId(managerId);
    if (!user) {
      return { success: false, error: 'Gerente não encontrado' };
    }
    if (user.role !== 'admin') {
      return { success: false, error: 'Usuário não possui privilégios de administrador/gerente' };
    }
    if (!user.active) {
      return { success: false, error: 'Usuário inativo' };
    }

    let isMatch = false;
    if (user.pinHash) {
      isMatch = await comparePin(plainPin, user.pinHash);
    } else if (user.pin) {
      isMatch = user.pin === plainPin;
    }

    if (!isMatch) {
      return { success: false, error: 'PIN de gerente incorreto.' };
    }

    return { success: true, managerName: user.name };
  }

  // -------------------------------------------------------------
  // FULL SYNC / HYDRATION (SOURCE OF TRUTH)
  // -------------------------------------------------------------
  async getFullSyncData(storeId?: string) {
    const targetStoreId = storeId || this.config.defaultStoreId;
    const orgId = this.config.organizationId;
    const storeDocRef = this.getStoreDocRef(targetStoreId);

    const [
      storeDocSnap,
      terminalsSnap,
      usersSnap,
      shiftsSnap,
      productsSnap,
      stockMovSnap,
      salesSnap,
      cashRegSnap,
      cashMovSnap,
      demandsSnap,
      suppliersSnap,
      purchaseOrdersSnap,
      inventoriesSnap,
      customersSnap,
      targetsSnap,
      tasksSnap,
      aiReportsSnap,
      auditLogsSnap,
      approvalsSnap,
    ] = await Promise.all([
      getDoc(storeDocRef),
      getDocs(collection(this.db, 'organizations', orgId, 'stores', targetStoreId, 'terminals')),
      getDocs(collection(this.db, 'organizations', orgId, 'users')),
      getDocs(collection(this.db, 'organizations', orgId, 'stores', targetStoreId, 'shifts')),
      getDocs(collection(this.db, 'organizations', orgId, 'stores', targetStoreId, 'products')),
      getDocs(query(collection(this.db, 'organizations', orgId, 'stores', targetStoreId, 'stockMovements'), orderBy('timestamp', 'desc'), limit(2000))),
      getDocs(query(collection(this.db, 'organizations', orgId, 'stores', targetStoreId, 'sales'), orderBy('timestamp', 'desc'), limit(1000))),
      getDocs(query(collection(this.db, 'organizations', orgId, 'stores', targetStoreId, 'cashRegisters'), orderBy('openedAt', 'desc'), limit(200))),
      getDocs(query(collection(this.db, 'organizations', orgId, 'stores', targetStoreId, 'cashMovements'), orderBy('timestamp', 'desc'), limit(1000))),
      getDocs(query(collection(this.db, 'organizations', orgId, 'stores', targetStoreId, 'unmetDemands'), orderBy('timestamp', 'desc'), limit(500))),
      getDocs(collection(this.db, 'organizations', orgId, 'stores', targetStoreId, 'suppliers')),
      getDocs(query(collection(this.db, 'organizations', orgId, 'stores', targetStoreId, 'purchaseOrders'), orderBy('createdAt', 'desc'), limit(500))),
      getDocs(query(collection(this.db, 'organizations', orgId, 'stores', targetStoreId, 'inventories'), orderBy('createdAt', 'desc'), limit(200))),
      getDocs(collection(this.db, 'organizations', orgId, 'stores', targetStoreId, 'customers')),
      getDocs(collection(this.db, 'organizations', orgId, 'stores', targetStoreId, 'targets')),
      getDocs(collection(this.db, 'organizations', orgId, 'stores', targetStoreId, 'tasks')),
      getDocs(query(collection(this.db, 'organizations', orgId, 'stores', targetStoreId, 'aiReports'), orderBy('timestamp', 'desc'), limit(100))),
      getDocs(query(collection(this.db, 'organizations', orgId, 'stores', targetStoreId, 'auditLogs'), orderBy('timestamp', 'desc'), limit(1000))),
      getDocs(query(collection(this.db, 'organizations', orgId, 'stores', targetStoreId, 'approvals'), orderBy('createdAt', 'desc'), limit(500))),
    ]);

    const store: Store = storeDocSnap.exists() ? (storeDocSnap.data() as Store) : {
      id: targetStoreId,
      name: 'FarmaVida - Drogaria Matriz',
      tradeName: 'Drogaria FarmaVida',
      cnpj: '12.345.678/0001-90',
      address: 'Av. Brasil, 1420 - Centro',
      phone: '(11) 3456-7890',
      active: true,
      settings: {
        maxDiscountWithoutAuthPercent: 10,
        defaultPaymentMethods: ['dinheiro', 'pix', 'cartao_debito', 'cartao_credito'],
        enableLotTracking: true,
      },
    };

    const terminals = terminalsSnap.docs.map(d => d.data() as Terminal);
    const users = usersSnap.docs.map(d => {
      const u = d.data();
      const { pinHash: _h, pin: _p, ...safeUser } = u as any;
      return safeUser as User;
    });

    return {
      store,
      terminals,
      users,
      shifts: shiftsSnap.docs.map(d => d.data() as WorkShift),
      products: productsSnap.docs.map(d => d.data() as Product),
      stockMovements: stockMovSnap.docs.map(d => d.data() as StockMovement),
      sales: salesSnap.docs.map(d => d.data() as Sale),
      cashRegisters: cashRegSnap.docs.map(d => d.data() as CashRegister),
      cashMovements: cashMovSnap.docs.map(d => d.data() as CashMovement),
      unmetDemands: demandsSnap.docs.map(d => d.data() as UnmetDemand),
      suppliers: suppliersSnap.docs.map(d => d.data() as Supplier),
      purchaseOrders: purchaseOrdersSnap.docs.map(d => d.data() as PurchaseOrder),
      inventories: inventoriesSnap.docs.map(d => d.data() as InventoryCount),
      customers: customersSnap.docs.map(d => d.data() as Customer),
      targets: targetsSnap.docs.map(d => d.data() as any),
      tasks: tasksSnap.docs.map(d => d.data() as Task),
      aiReports: aiReportsSnap.docs.map(d => d.data() as AIReport),
      auditLogs: auditLogsSnap.docs.map(d => d.data() as AuditLog),
      approvals: approvalsSnap.docs.map(d => d.data() as ApprovalRequest),
    };
  }

  // -------------------------------------------------------------
  // ATOMIC SALE TRANSACTION
  // -------------------------------------------------------------
  async executeSaleTransaction(saleData: any, authContext: AuthContext): Promise<{ success: boolean; sale?: Sale; error?: string }> {
    const orgId = this.config.organizationId;
    const storeId = authContext.storeId || this.config.defaultStoreId;
    const idempotencyKey = saleData.idempotencyKey;

    if (idempotencyKey) {
      const salesCol = collection(this.db, 'organizations', orgId, 'stores', storeId, 'sales');
      const idempQ = query(salesCol, where('idempotencyKey', '==', idempotencyKey), limit(1));
      const existingSnap = await getDocs(idempQ);
      if (!existingSnap.empty) {
        return { success: true, sale: existingSnap.docs[0].data() as Sale };
      }
    }

    const saleId = saleData.id || `sale_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const terminalId = saleData.terminalId || 'terminal_01';

    try {
      const result = await runTransaction(this.db, async (transaction) => {
        // 1. Get Active Cash Register for Terminal
        const cashCol = collection(this.db, 'organizations', orgId, 'stores', storeId, 'cashRegisters');
        const termCashQ = query(cashCol, where('status', '==', 'aberto'), where('terminalId', '==', terminalId), limit(1));
        const cashSnap = await getDocs(termCashQ);

        let activeCashReg: CashRegister | null = null;
        let cashDocRef: any = null;

        if (!cashSnap.empty) {
          activeCashReg = cashSnap.docs[0].data() as CashRegister;
          cashDocRef = doc(this.db, 'organizations', orgId, 'stores', storeId, 'cashRegisters', cashSnap.docs[0].id);
        } else {
          // Fallback to any open cash in store
          const genCashQ = query(cashCol, where('status', '==', 'aberto'), limit(1));
          const genCashSnap = await getDocs(genCashQ);
          if (!genCashSnap.empty) {
            activeCashReg = genCashSnap.docs[0].data() as CashRegister;
            cashDocRef = doc(this.db, 'organizations', orgId, 'stores', storeId, 'cashRegisters', genCashSnap.docs[0].id);
          }
        }

        if (!activeCashReg || !cashDocRef) {
          throw new Error('Não há gaveta/caixa aberto para este terminal para processar a venda.');
        }

        // 2. Validate and Deduct Stock
        const stockMovementsToCreate: StockMovement[] = [];
        for (const item of (saleData.items || [])) {
          const prodRef = doc(this.db, 'organizations', orgId, 'stores', storeId, 'products', item.productId);
          const prodSnap = await transaction.get(prodRef);
          if (!prodSnap.exists()) {
            throw new Error(`Produto não encontrado no catálogo: ${item.productName || item.productId}`);
          }
          const prod = prodSnap.data() as Product;
          const requestedQty = Number(item.quantity) || 1;
          const currentStock = Number(prod.currentStock) || 0;

          if (currentStock < requestedQty) {
            throw new Error(`Estoque insuficiente para "${prod.name}". Saldo disponível: ${currentStock}, Solicitado: ${requestedQty}`);
          }

          const newStock = currentStock - requestedQty;
          transaction.update(prodRef, {
            currentStock: newStock,
            updatedAt: new Date().toISOString(),
          });

          const movId = `sm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          stockMovementsToCreate.push({
            id: movId,
            storeId,
            productId: prod.id,
            productName: prod.name,
            productCode: prod.code || item.productCode || prod.id,
            type: 'venda',
            quantity: -requestedQty,
            previousStock: currentStock,
            newStock,
            reason: `Venda #${saleId}`,
            referenceId: saleId,
            authorId: authContext.employeeId,
            authorName: authContext.name,
            timestamp: new Date().toISOString(),
          });
        }

        // 3. Update Operator Multi-Attendant Summary in Cash Register
        const operatorId = authContext.employeeId;
        const operatorName = authContext.name;
        const operatorSummaries = [...(activeCashReg.operatorSummaries || [])];
        let opSummary = operatorSummaries.find(op => op.operatorId === operatorId);

        if (!opSummary) {
          opSummary = {
            operatorId,
            operatorName,
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
          operatorSummaries.push(opSummary);
        }

        const saleTotal = Number(saleData.total) || 0;
        const totalDiscount = Number(saleData.totalDiscount) || 0;

        opSummary.salesCount += 1;
        opSummary.totalSold += saleTotal;
        opSummary.discountTotal += totalDiscount;

        for (const pay of (saleData.payments || [])) {
          const amt = Number(pay.amount) || 0;
          if (pay.method === 'dinheiro') opSummary.cashSales += amt;
          else if (pay.method === 'pix') opSummary.pixSales += amt;
          else if (pay.method === 'cartao_debito') opSummary.cardDebitSales += amt;
          else if (pay.method === 'cartao_credito') opSummary.cardCreditSales += amt;
        }

        transaction.update(cashDocRef, {
          operatorSummaries,
        });

        // 4. Construct Final Sale Document
        const completedSale: Sale = {
          ...saleData,
          id: saleId,
          code: saleData.code || `VDA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          idempotencyKey,
          storeId,
          terminalId,
          cashRegisterId: activeCashReg.id,
          operatorId: authContext.employeeId,
          operatorName: authContext.name,
          sellerId: saleData.sellerId || authContext.employeeId,
          sellerName: saleData.sellerName || authContext.name,
          timestamp: saleData.timestamp || new Date().toISOString(),
          status: 'concluida',
          history: saleData.history || [
            {
              timestamp: new Date().toISOString(),
              userId: authContext.employeeId,
              userName: authContext.name,
              action: 'Venda finalizada no PDV',
            }
          ],
        };

        const saleRef = doc(this.db, 'organizations', orgId, 'stores', storeId, 'sales', saleId);
        transaction.set(saleRef, completedSale);

        // 5. Append Stock Movements
        for (const mov of stockMovementsToCreate) {
          const movRef = doc(this.db, 'organizations', orgId, 'stores', storeId, 'stockMovements', mov.id);
          transaction.set(movRef, mov);
        }

        // 6. Append Audit Log
        const auditId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const auditRef = doc(this.db, 'organizations', orgId, 'stores', storeId, 'auditLogs', auditId);
        const auditLog: AuditLog = {
          id: auditId,
          storeId,
          userId: authContext.employeeId,
          userName: authContext.name,
          action: 'VENDA_REALIZADA',
          entity: 'VENDAS',
          entityType: 'sale',
          entityId: saleId,
          details: `Venda #${saleId} no valor de R$ ${saleTotal.toFixed(2)} [Terminal ${terminalId}]`,
          timestamp: new Date().toISOString(),
        };
        transaction.set(auditRef, auditLog);

        return completedSale;
      });

      return { success: true, sale: result };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro ao processar venda' };
    }
  }

  // -------------------------------------------------------------
  // ATOMIC CASH REGISTER OPENING
  // -------------------------------------------------------------
  async openCashRegister(data: {
    terminalId: string;
    terminalName: string;
    openingAmount: number;
    notes?: string;
  }, authContext: AuthContext): Promise<{ success: boolean; cashRegister?: CashRegister; error?: string }> {
    const orgId = this.config.organizationId;
    const storeId = authContext.storeId || this.config.defaultStoreId;
    const terminalId = data.terminalId || 'terminal_01';

    try {
      const result = await runTransaction(this.db, async (transaction) => {
        const cashCol = collection(this.db, 'organizations', orgId, 'stores', storeId, 'cashRegisters');
        const openQ = query(cashCol, where('status', '==', 'aberto'), where('terminalId', '==', terminalId), limit(1));
        const snap = await getDocs(openQ);

        if (!snap.empty) {
          const existing = snap.docs[0].data() as CashRegister;
          throw new Error(`O terminal "${data.terminalName || terminalId}" já possui gaveta aberta (#${existing.displayCode || existing.id.slice(-6)}).`);
        }

        const id = `cash_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const openedAt = new Date().toISOString();
        const initialOpSummary: OperatorCashSummary = {
          operatorId: authContext.employeeId,
          operatorName: authContext.name,
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

        const newCashRegister: CashRegister = {
          id,
          displayCode: `CX-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
          storeId,
          terminalId,
          terminalName: data.terminalName || 'Terminal Balcão 01',
          openedBy: authContext.employeeId,
          openedByName: authContext.name,
          openedAt,
          openingAmount: Number(data.openingAmount) || 0,
          cashSales: 0,
          pixSales: 0,
          cardDebitSales: 0,
          cardCreditSales: 0,
          suppliesTotal: 0,
          bleedingsTotal: 0,
          cashReturnsTotal: 0,
          expectedCash: Number(data.openingAmount) || 0,
          status: 'aberto',
          notes: data.notes || '',
          movements: [],
          operatorSummaries: [initialOpSummary],
        };

        const regRef = doc(this.db, 'organizations', orgId, 'stores', storeId, 'cashRegisters', id);
        transaction.set(regRef, newCashRegister);

        // Audit Log
        const auditId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const auditRef = doc(this.db, 'organizations', orgId, 'stores', storeId, 'auditLogs', auditId);
        const auditLog: AuditLog = {
          id: auditId,
          storeId,
          userId: authContext.employeeId,
          userName: authContext.name,
          action: 'ABERTURA_CAIXA',
          entity: 'CAIXA',
          entityType: 'cash_register',
          entityId: id,
          details: `Abertura do caixa ${newCashRegister.displayCode} (${data.terminalName}) com fundo de R$ ${Number(data.openingAmount || 0).toFixed(2)}`,
          timestamp: openedAt,
        };
        transaction.set(auditRef, auditLog);

        return newCashRegister;
      });

      return { success: true, cashRegister: result };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro ao abrir caixa' };
    }
  }

  // -------------------------------------------------------------
  // ATOMIC CASH MOVEMENT
  // -------------------------------------------------------------
  async addCashMovement(data: {
    cashRegisterId: string;
    type: 'suprimento' | 'sangria';
    amount: number;
    reason: string;
  }, authContext: AuthContext): Promise<{ success: boolean; cashMovement?: CashMovement; error?: string }> {
    const orgId = this.config.organizationId;
    const storeId = authContext.storeId || this.config.defaultStoreId;

    try {
      const result = await runTransaction(this.db, async (transaction) => {
        const regRef = doc(this.db, 'organizations', orgId, 'stores', storeId, 'cashRegisters', data.cashRegisterId);
        const regSnap = await transaction.get(regRef);
        if (!regSnap.exists()) {
          throw new Error('Sessão de caixa não encontrada');
        }
        const cashReg = regSnap.data() as CashRegister;
        if (cashReg.status !== 'aberto') {
          throw new Error('Não é possível movimentar um caixa já encerrado');
        }

        const movId = `cmov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const now = new Date().toISOString();
        const movement: CashMovement = {
          id: movId,
          storeId,
          cashRegisterId: cashReg.id,
          type: data.type,
          amount: Number(data.amount) || 0,
          reason: data.reason,
          authorizedBy: authContext.employeeId,
          authorizedByName: authContext.name,
          timestamp: now,
        };

        const updatedMovements = [...(cashReg.movements || []), movement];
        const opSummaries = [...(cashReg.operatorSummaries || [])];
        const op = opSummaries.find(o => o.operatorId === authContext.employeeId);
        if (op) {
          if (data.type === 'suprimento') op.suppliesTotal += movement.amount;
          if (data.type === 'sangria') op.bleedingsTotal += movement.amount;
        }

        const suppliesTotal = (cashReg.suppliesTotal || 0) + (data.type === 'suprimento' ? movement.amount : 0);
        const bleedingsTotal = (cashReg.bleedingsTotal || 0) + (data.type === 'sangria' ? movement.amount : 0);
        const expectedCash = cashReg.openingAmount + (cashReg.cashSales || 0) + suppliesTotal - bleedingsTotal - (cashReg.cashReturnsTotal || 0);

        transaction.update(regRef, {
          movements: updatedMovements,
          operatorSummaries: opSummaries,
          suppliesTotal,
          bleedingsTotal,
          expectedCash,
        });

        const movRef = doc(this.db, 'organizations', orgId, 'stores', storeId, 'cashMovements', movId);
        transaction.set(movRef, movement);

        const auditId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const auditRef = doc(this.db, 'organizations', orgId, 'stores', storeId, 'auditLogs', auditId);
        const auditLog: AuditLog = {
          id: auditId,
          storeId,
          userId: authContext.employeeId,
          userName: authContext.name,
          action: data.type === 'sangria' ? 'SANGRIA_CAIXA' : 'SUPRIMENTO_CAIXA',
          entity: 'CAIXA',
          entityType: 'cash_register',
          entityId: cashReg.id,
          details: `${data.type === 'sangria' ? 'Sangria' : 'Suprimento'} de R$ ${movement.amount.toFixed(2)} no caixa ${cashReg.displayCode || cashReg.id} (${data.reason})`,
          timestamp: now,
        };
        transaction.set(auditRef, auditLog);

        return movement;
      });

      return { success: true, cashMovement: result };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro ao registrar movimentação' };
    }
  }

  // -------------------------------------------------------------
  // ATOMIC CASH REGISTER CLOSE
  // -------------------------------------------------------------
  async closeCashRegister(data: {
    cashRegisterId: string;
    countedCash: number;
    divergenceReason?: string;
    notes?: string;
  }, authContext: AuthContext): Promise<{ success: boolean; cashRegister?: CashRegister; error?: string }> {
    const orgId = this.config.organizationId;
    const storeId = authContext.storeId || this.config.defaultStoreId;

    try {
      const result = await runTransaction(this.db, async (transaction) => {
        const regRef = doc(this.db, 'organizations', orgId, 'stores', storeId, 'cashRegisters', data.cashRegisterId);
        const regSnap = await transaction.get(regRef);
        if (!regSnap.exists()) {
          throw new Error('Sessão de caixa não encontrada');
        }
        const cashReg = regSnap.data() as CashRegister;
        if (cashReg.status === 'fechado') {
          throw new Error('Este caixa já foi fechado anteriormente');
        }

        const closedAt = new Date().toISOString();
        const difference = Number(data.countedCash) - cashReg.expectedCash;

        const updatedRegister: CashRegister = {
          ...cashReg,
          closedBy: authContext.employeeId,
          closedByName: authContext.name,
          closedAt,
          status: 'fechado',
          countedCash: Number(data.countedCash),
          difference,
          divergenceReason: data.divergenceReason,
          notes: data.notes || cashReg.notes,
        };

        transaction.update(regRef, updatedRegister as any);

        const auditId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const auditRef = doc(this.db, 'organizations', orgId, 'stores', storeId, 'auditLogs', auditId);
        const auditLog: AuditLog = {
          id: auditId,
          storeId,
          userId: authContext.employeeId,
          userName: authContext.name,
          action: 'FECHAMENTO_CAIXA',
          entity: 'CAIXA',
          entityType: 'cash_register',
          entityId: cashReg.id,
          details: `Fechamento do caixa ${cashReg.displayCode || cashReg.id} com contagem em dinheiro de R$ ${Number(data.countedCash || 0).toFixed(2)} (Diferença: R$ ${difference.toFixed(2)})`,
          timestamp: closedAt,
        };
        transaction.set(auditRef, auditLog);

        return updatedRegister;
      });

      return { success: true, cashRegister: result };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro ao fechar caixa' };
    }
  }

  // -------------------------------------------------------------
  // ATOMIC APPROVAL ENGINE
  // -------------------------------------------------------------
  async processApproval(data: {
    approvalId: string;
    status: 'aprovado' | 'rejeitado';
    reviewNotes?: string;
  }, authContext: AuthContext): Promise<{ success: boolean; approval?: ApprovalRequest; error?: string }> {
    const orgId = this.config.organizationId;
    const storeId = authContext.storeId || this.config.defaultStoreId;

    try {
      const result = await runTransaction(this.db, async (transaction) => {
        const apprRef = doc(this.db, 'organizations', orgId, 'stores', storeId, 'approvals', data.approvalId);
        const apprSnap = await transaction.get(apprRef);
        if (!apprSnap.exists()) {
          throw new Error('Solicitação de aprovação não encontrada');
        }
        const appr = apprSnap.data() as ApprovalRequest;

        if (appr.status !== 'pendente') {
          throw new Error(`Esta solicitação já foi processada anteriormente (${appr.status}).`);
        }

        const reviewedAt = new Date().toISOString();
        const updatedAppr: ApprovalRequest = {
          ...appr,
          status: data.status,
          reviewedByUserId: authContext.employeeId,
          reviewedByUserName: authContext.name,
          reviewedAt,
          reviewNotes: data.reviewNotes || '',
          effectStatus: data.status === 'aprovado' ? 'APPLIED' : 'NOT_APPLIED',
        };

        if (data.status === 'aprovado') {
          if (appr.type === 'ajuste_estoque' && appr.relatedEntityId) {
            const prodRef = doc(this.db, 'organizations', orgId, 'stores', storeId, 'products', appr.relatedEntityId);
            const prodSnap = await transaction.get(prodRef);
            if (prodSnap.exists()) {
              const prod = prodSnap.data() as Product;
              const prevStock = prod.currentStock;
              const newStock = Number(appr.newValue ?? prevStock);
              transaction.update(prodRef, {
                currentStock: newStock,
                updatedAt: reviewedAt,
              });

              const movId = `sm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
              const movRef = doc(this.db, 'organizations', orgId, 'stores', storeId, 'stockMovements', movId);
              const mov: StockMovement = {
                id: movId,
                storeId,
                productId: prod.id,
                productName: prod.name,
                productCode: prod.code || prod.id,
                type: 'ajuste_manual',
                quantity: newStock - prevStock,
                previousStock: prevStock,
                newStock,
                reason: `Ajuste aprovado: ${appr.reason}`,
                referenceId: appr.id,
                authorId: authContext.employeeId,
                authorName: authContext.name,
                timestamp: reviewedAt,
              };
              transaction.set(movRef, mov);
            }
          }
        }

        transaction.update(apprRef, updatedAppr as any);

        const auditId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const auditRef = doc(this.db, 'organizations', orgId, 'stores', storeId, 'auditLogs', auditId);
        const auditLog: AuditLog = {
          id: auditId,
          storeId,
          userId: authContext.employeeId,
          userName: authContext.name,
          action: data.status === 'aprovado' ? 'APROVACAO_CONCEDIDA' : 'APROVACAO_REJEITADA',
          entity: 'APROVACOES',
          entityType: 'approval',
          entityId: appr.id,
          details: `Decisão de ${data.status === 'aprovado' ? 'Aprovação' : 'Rejeição'} para ${appr.title} (${appr.id})`,
          timestamp: reviewedAt,
        };
        transaction.set(auditRef, auditLog);

        return updatedAppr;
      });

      return { success: true, approval: result };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro ao processar aprovação' };
    }
  }

  // -------------------------------------------------------------
  // GENERIC ENTITY HELPERS & QUERIES
  // -------------------------------------------------------------
  async getDocsList<T>(collectionName: string, storeId?: string): Promise<T[]> {
    const targetStoreId = storeId || this.config.defaultStoreId;
    const orgId = this.config.organizationId;
    const colRef = collection(this.db, 'organizations', orgId, 'stores', targetStoreId, collectionName);
    const snap = await getDocs(colRef);
    return snap.docs.map(d => d.data() as T);
  }

  async getDocData<T>(collectionName: string, docId: string, storeId?: string): Promise<T | null> {
    const targetStoreId = storeId || this.config.defaultStoreId;
    const orgId = this.config.organizationId;
    const docRef = doc(this.db, 'organizations', orgId, 'stores', targetStoreId, collectionName, docId);
    const snap = await getDoc(docRef);
    return snap.exists() ? (snap.data() as T) : null;
  }

  async getStore(storeId?: string): Promise<Store | null> {
    const targetStoreId = storeId || this.config.defaultStoreId;
    const orgId = this.config.organizationId;
    const storeRef = doc(this.db, 'organizations', orgId, 'stores', targetStoreId);
    const snap = await getDoc(storeRef);
    return snap.exists() ? (snap.data() as Store) : null;
  }

  async updateStore(storeData: Partial<Store>, storeId?: string): Promise<Store> {
    const targetStoreId = storeId || this.config.defaultStoreId;
    const orgId = this.config.organizationId;
    const storeRef = doc(this.db, 'organizations', orgId, 'stores', targetStoreId);
    await setDoc(storeRef, {
      ...storeData,
      id: targetStoreId,
      organizationId: orgId,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    const updated = await this.getStore(targetStoreId);
    return updated!;
  }

  async getUsers(): Promise<User[]> {
    const orgId = this.config.organizationId;
    const usersCol = collection(this.db, 'organizations', orgId, 'users');
    const snap = await getDocs(usersCol);
    return snap.docs.map(d => {
      const u = d.data() as User;
      const { pinHash, ...safe } = u as any;
      return safe as User;
    });
  }

  async saveUserWithPin(userData: Partial<User>, plainPin?: string): Promise<User> {
    const orgId = this.config.organizationId;
    const userId = userData.id || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const userRef = doc(this.db, 'organizations', orgId, 'users', userId);
    
    let pinHash: string | undefined;
    if (plainPin) {
      pinHash = await hashPin(plainPin);
    }

    const payload: any = {
      ...userData,
      id: userId,
      organizationId: orgId,
      updatedAt: new Date().toISOString(),
    };
    if (pinHash) {
      payload.pinHash = pinHash;
    }

    await setDoc(userRef, payload, { merge: true });
    const snap = await getDoc(userRef);
    const saved = snap.data() as User;
    const { pinHash: _, ...safe } = saved as any;
    return safe as User;
  }

  async logAudit(
    storeId: string,
    userId: string,
    userName: string,
    action: string,
    entity: string,
    details: string,
    entityId?: string,
    entityType?: string
  ): Promise<void> {
    const orgId = this.config.organizationId;
    const targetStore = storeId || this.config.defaultStoreId;
    const auditId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const auditRef = doc(this.db, 'organizations', orgId, 'stores', targetStore, 'auditLogs', auditId);
    const auditLog: AuditLog = {
      id: auditId,
      storeId: targetStore,
      userId,
      userName,
      action,
      entity,
      entityType,
      entityId,
      details,
      timestamp: new Date().toISOString(),
    };
    await setDoc(auditRef, auditLog);
  }

  async saveDoc(collectionName: string, docId: string, docData: any, storeId?: string) {
    const targetStoreId = storeId || this.config.defaultStoreId;
    const orgId = this.config.organizationId;
    const docRef = doc(this.db, 'organizations', orgId, 'stores', targetStoreId, collectionName, docId);
    await setDoc(docRef, {
      ...docData,
      id: docId,
      storeId: targetStoreId,
      organizationId: orgId,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  }

  async deleteDoc(collectionName: string, docId: string, storeId?: string) {
    const targetStoreId = storeId || this.config.defaultStoreId;
    const orgId = this.config.organizationId;
    const docRef = doc(this.db, 'organizations', orgId, 'stores', targetStoreId, collectionName, docId);
    await deleteDoc(docRef);
  }

  // -------------------------------------------------------------
  // ATOMIC SALE CANCELLATION
  // -------------------------------------------------------------
  async cancelSale(saleId: string, reason: string, authContext: AuthContext): Promise<{ success: boolean; sale?: Sale; error?: string }> {
    const orgId = this.config.organizationId;
    const storeId = authContext.storeId || this.config.defaultStoreId;

    try {
      const result = await runTransaction(this.db, async (transaction) => {
        const saleRef = doc(this.db, 'organizations', orgId, 'stores', storeId, 'sales', saleId);
        const saleSnap = await transaction.get(saleRef);
        if (!saleSnap.exists()) {
          throw new Error('Venda não encontrada');
        }
        const sale = saleSnap.data() as Sale;
        if (sale.status === 'cancelada') {
          throw new Error('Esta venda já está cancelada');
        }

        const now = new Date().toISOString();

        // Restore stock for all items
        for (const item of sale.items) {
          const prodRef = doc(this.db, 'organizations', orgId, 'stores', storeId, 'products', item.productId);
          const prodSnap = await transaction.get(prodRef);
          if (prodSnap.exists()) {
            const prod = prodSnap.data() as Product;
            const prevStock = prod.currentStock;
            const newStock = prevStock + item.quantity;
            transaction.update(prodRef, {
              currentStock: newStock,
              updatedAt: now,
            });

            const movId = `sm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            const movRef = doc(this.db, 'organizations', orgId, 'stores', storeId, 'stockMovements', movId);
            const mov: StockMovement = {
              id: movId,
              storeId,
              productId: prod.id,
              productName: prod.name,
              productCode: prod.code || prod.id,
              type: 'devolucao',
              quantity: item.quantity,
              previousStock: prevStock,
              newStock,
              reason: `Cancelamento da venda ${sale.code || sale.id}: ${reason}`,
              referenceId: sale.id,
              authorId: authContext.employeeId,
              authorName: authContext.name,
              timestamp: now,
            };
            transaction.set(movRef, mov);
          }
        }

        const updatedSale: Sale = {
          ...sale,
          status: 'cancelada',
          cancelledAt: now,
          cancelledByUserId: authContext.employeeId,
          cancelledByUserName: authContext.name,
          cancelReason: reason,
        };

        transaction.update(saleRef, updatedSale as any);

        const auditId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const auditRef = doc(this.db, 'organizations', orgId, 'stores', storeId, 'auditLogs', auditId);
        const auditLog: AuditLog = {
          id: auditId,
          storeId,
          userId: authContext.employeeId,
          userName: authContext.name,
          action: 'CANCELAMENTO_VENDA',
          entity: 'VENDAS',
          entityType: 'sale',
          entityId: sale.id,
          details: `Venda ${sale.code || sale.id} cancelada. Motivo: ${reason}`,
          timestamp: now,
        };
        transaction.set(auditRef, auditLog);

        return updatedSale;
      });

      return { success: true, sale: result };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro ao cancelar venda' };
    }
  }

  // -------------------------------------------------------------
  // ATOMIC STOCK ADJUSTMENT
  // -------------------------------------------------------------
  async adjustProductStock(
    productId: string, 
    newStock: number, 
    reason: string, 
    authContext: AuthContext
  ): Promise<{ success: boolean; product?: Product; error?: string }> {
    const orgId = this.config.organizationId;
    const storeId = authContext.storeId || this.config.defaultStoreId;

    try {
      const result = await runTransaction(this.db, async (transaction) => {
        const prodRef = doc(this.db, 'organizations', orgId, 'stores', storeId, 'products', productId);
        const prodSnap = await transaction.get(prodRef);
        if (!prodSnap.exists()) {
          throw new Error('Produto não encontrado');
        }
        const prod = prodSnap.data() as Product;
        const prevStock = prod.currentStock;
        const now = new Date().toISOString();

        const updatedProduct: Product = {
          ...prod,
          currentStock: Number(newStock),
          updatedAt: now,
        };

        transaction.update(prodRef, updatedProduct as any);

        const movId = `sm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const movRef = doc(this.db, 'organizations', orgId, 'stores', storeId, 'stockMovements', movId);
        const mov: StockMovement = {
          id: movId,
          storeId,
          productId: prod.id,
          productName: prod.name,
          productCode: prod.code || prod.id,
          type: 'ajuste_manual',
          quantity: Number(newStock) - prevStock,
          previousStock: prevStock,
          newStock: Number(newStock),
          reason: reason || 'Ajuste manual de estoque',
          referenceId: `adj_${Date.now()}`,
          authorId: authContext.employeeId,
          authorName: authContext.name,
          timestamp: now,
        };
        transaction.set(movRef, mov);

        const auditId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const auditRef = doc(this.db, 'organizations', orgId, 'stores', storeId, 'auditLogs', auditId);
        const auditLog: AuditLog = {
          id: auditId,
          storeId,
          userId: authContext.employeeId,
          userName: authContext.name,
          action: 'AJUSTE_ESTOQUE',
          entity: 'ESTOQUE',
          entityType: 'product',
          entityId: prod.id,
          details: `Ajuste manual de ${prod.name}: ${prevStock} -> ${newStock} unidades. Motivo: ${reason}`,
          timestamp: now,
        };
        transaction.set(auditRef, auditLog);

        return updatedProduct;
      });

      return { success: true, product: result };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro ao ajustar estoque' };
    }
  }
}
