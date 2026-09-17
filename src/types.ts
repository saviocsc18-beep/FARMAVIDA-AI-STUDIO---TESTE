export type UserRole = 'admin' | 'colaborador';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  storeId: string;
  active: boolean;
  pin: string; // PIN de acesso rápido para balcão/terminal
  roleTitle?: string; // ex: Balconista, Farmacêutico(a), Gerente
  phone?: string;
}

export interface Terminal {
  id: string; // ex: 'terminal_01'
  name: string; // ex: 'Terminal Balcão 01'
  storeId: string;
  active: boolean;
  notes?: string;
  createdAt: string;
}

export interface OperatorCashSummary {
  operatorId: string;
  operatorName: string;
  salesCount: number;
  totalSold: number;
  cashSales: number;
  pixSales: number;
  cardDebitSales: number;
  cardCreditSales: number;
  discountTotal: number;
  suppliesTotal: number;
  bleedingsTotal: number;
}

export interface Store {
  id: string;
  name: string;
  tradeName: string;
  cnpj: string;
  address: string;
  phone: string;
  active: boolean;
  settings: {
    maxDiscountWithoutAuthPercent: number; // ex: 10%
    defaultPaymentMethods: string[];
    enableLotTracking: boolean;
    accessToleranceMinutes?: number;
    defaultOpeningAmount?: number;
  };
}

export interface WorkShift {
  id: string;
  userId: string;
  userName: string;
  storeId: string;
  date: string; // YYYY-MM-DD
  startedAt: string; // ISO
  endedAt?: string; // ISO
  status: 'em_andamento' | 'encerrado' | 'pausado';
  breaks: {
    startedAt: string;
    endedAt?: string;
    reason: string;
  }[];
  notes?: string;
}

export type PaymentMethod = 'dinheiro' | 'pix' | 'cartao_debito' | 'cartao_credito' | 'convenio_aprovado';

export interface PaymentSplit {
  method: PaymentMethod;
  amount: number; // valor efetivamente pago
  tenderedAmount?: number; // valor entregue (ex: deu R$ 50 em dinheiro)
  changeAmount?: number; // troco (ex: R$ 12)
  reference?: string; // ex: NSU maquininha ou ID Pix
  confirmed: boolean;
}

export interface Product {
  id: string;
  storeId: string;
  code: string; // Código interno da farmácia
  ean?: string; // Código de barras
  name: string;
  presentation?: string; // ex: 500mg c/ 20 comprimidos, Gotas 20ml
  category: string; // ex: Medicamentos Referência, Genéricos, Similares, Higiene/Perfumaria, OTC, Vitaminas
  unit: string; // UN, CX, FR
  salePrice: number;
  costPrice?: number; // Custo de aquisição (protegido contra acesso de colaborador)
  currentStock: number; // Saldo gerido
  minStock: number;
  maxStock: number;
  safetyDays: number; // dias de margem de segurança para compras
  active: boolean;
  updatedAt: string;
  batch?: string; // Lote (opcional/informativo)
  expirationDate?: string; // Validade (opcional/informativo)
}

export type StockMovementType =
  | 'saldo_inicial'
  | 'venda'
  | 'devolucao'
  | 'compra_entrada'
  | 'perda_avaria'
  | 'perda_validade'
  | 'ajuste_inventario'
  | 'cancelamento_venda'
  | 'ajuste_manual';

export interface StockMovement {
  id: string;
  storeId: string;
  productId: string;
  productName: string;
  productCode: string;
  type: StockMovementType;
  quantity: number; // positiva para entrada, negativa para saída
  previousStock: number;
  newStock: number;
  reason: string;
  authorId: string;
  authorName: string;
  referenceId?: string; // id da venda, do pedido ou do inventário
  timestamp: string;
}

export interface SaleItem {
  productId: string;
  productCode: string;
  productName: string;
  presentation?: string;
  category: string;
  quantity: number;
  unitPrice: number;
  unitCost?: number; // Custo histórico no momento da venda
  discountPercent: number;
  discountAmount: number;
  total: number;
}

export type FiscalStatus = 'pendente_conciliacao' | 'vinculado' | 'divergente' | 'nao_aplicavel';

export interface Sale {
  id: string;
  code: string; // Código visual da venda, ex: VDA-2026-0012
  storeId: string;
  timestamp: string;
  sellerId: string; // Vendedor responsável pelo balcão
  sellerName: string;
  operatorId: string; // Quem registrou no caixa/terminal
  operatorName: string;
  workShiftId?: string; // Vínculo explícito com o turno/expediente do operador
  cashRegisterId?: string;
  terminalId?: string; // ID do terminal (ex: 'terminal_01')
  terminal?: string; // Terminal onde a venda foi registrada
  customerId?: string;
  customerName?: string;
  items: SaleItem[];
  subtotal: number;
  totalDiscount: number;
  total: number;
  payments: PaymentSplit[];
  fiscalStatus: FiscalStatus;
  fiscalReference?: string; // Número do cupom fiscal do sistema satélite
  fiscalNotes?: string;
  status: 'concluida' | 'cancelada' | 'devolvida_parcial';
  history: {
    timestamp: string;
    userId: string;
    userName: string;
    action: string;
    reason?: string;
  }[];
  idempotencyKey?: string;
}

export interface CashRegister {
  id: string;
  displayCode?: string; // Código visual legível (ex: CX-2026-0001)
  storeId: string;
  terminalId?: string; // ID do terminal associado (ex: 'terminal_01')
  terminalName: string;
  workShiftId?: string; // Vínculo com a jornada de trabalho ativa
  openedBy: string;
  openedByName: string;
  openedAt: string;
  closedBy?: string;
  closedByName?: string;
  closedAt?: string;
  openingAmount: number; // Fundo de troco inicial
  cashSales: number; // Total recebido líquido em dinheiro
  pixSales: number;
  cardDebitSales: number;
  cardCreditSales: number;
  suppliesTotal: number; // Suprimentos (+)
  bleedingsTotal: number; // Sangrias (-)
  cashReturnsTotal: number; // Devoluções em dinheiro (-)
  expectedCash: number; // abertura + dinheiro líquido + suprimentos - sangrias - devoluções
  countedCash?: number;
  difference?: number; // countedCash - expectedCash
  divergenceReason?: string; // Justificativa obrigatória em caso de diferença != 0
  retainedFloat?: number; // Fundo mantido para o próximo turno
  withdrawnAmount?: number; // Valor retirado para o cofre (sangria de fechamento)
  closingWithdrawalConfirmed?: boolean; // Confirmação física pelo operador
  reconciliationStatus?: 'aberto' | 'fechado_operador' | 'aguardando_conferencia' | 'divergencia' | 'conferido' | 'resolvido';
  reconciledBy?: string;
  reconciledByName?: string;
  reconciledAt?: string;
  reconciliationNotes?: string;
  status: 'aberto' | 'fechado';
  notes?: string;
  movements?: CashMovement[];
  operatorSummaries?: OperatorCashSummary[]; // Extrato de cada operador nesta gaveta física
  reopenedBy?: string;
  reopenedByName?: string;
  reopenedAt?: string;
  reopenReason?: string;
}

export interface CashMovement {
  id: string;
  cashRegisterId: string;
  storeId: string;
  type: 'suprimento' | 'sangria';
  amount: number;
  reason: string;
  isClosingWithdrawal?: boolean;
  authorizedBy: string;
  authorizedByName: string;
  timestamp: string;
}

export type UnmetDemandReason = 'falta_estoque' | 'produto_nao_trabalhado' | 'preco_alto' | 'outro';

export interface UnmetDemand {
  id: string;
  storeId: string;
  productId?: string;
  productName: string;
  quantityRequested: number;
  reason: UnmetDemandReason;
  attendantId: string;
  attendantName: string;
  notes?: string;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedNotes?: string;
}

export interface Supplier {
  id: string;
  name: string;
  tradeName?: string;
  cnpj: string;
  contactName?: string;
  phone: string;
  email: string;
  leadTimeDays: number; // Prazo médio de entrega em dias
  active: boolean;
}

export type PurchaseOrderStatus =
  | 'rascunho'
  | 'aprovado'
  | 'parcialmente_recebido'
  | 'recebido'
  | 'cancelado';

export interface PurchaseOrderItem {
  productId: string;
  productCode: string;
  productName: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCostEstimated?: number;
  unitCost?: number;
  unitCostReal?: number;
  totalEstimated?: number;
  totalCost?: number;
}

export interface PurchaseOrder {
  id: string;
  code: string; // ex: PED-2026-0004
  storeId: string;
  supplierId: string;
  supplierName: string;
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
  totalEstimated?: number;
  totalCost?: number;
  invoiceNumber?: string;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  receivedAt?: string;
  notes?: string;
  receiptsHistory?: {
    receiptId: string;
    timestamp: string;
    receivedBy: string;
    receivedByName: string;
    items: {
      productId: string;
      qtyFit: number; // quantidade apta (entra no estoque)
      qtyDamaged: number; // avariada (não entra no saldo vendável)
      unitCost: number;
    }[];
    notes?: string;
  }[];
}

export type InventoryScope = 'geral' | 'categoria' | 'selecao';

export type InventoryStatus =
  | 'rascunho'
  | 'aberto'
  | 'em_contagem'
  | 'aguardando_revisao'
  | 'aprovado'
  | 'ajustado'
  | 'reaberto'
  | 'cancelado'
  | 'rejeitado';

export interface InventoryHistoryVersion {
  version: number;
  countedBy: string;
  countedByName: string;
  completedAt: string;
  items: {
    productId: string;
    productCode: string;
    productName: string;
    countedQuantity: number;
    countedAt?: string;
  }[];
  reopenReason?: string;
  reopenedBy?: string;
  reopenedByName?: string;
  reopenedAt?: string;
}

export interface InventoryItemCount {
  productId: string;
  productCode: string;
  productName: string;
  presentation?: string;
  category: string;
  ean?: string;
  unit?: string;
  unitCost?: number; // Custo de aquisição unitário (protegido contra colaborador)
  expectedQuantitySnapshot?: number; // Saldo no momento da abertura do inventário (protegido)
  intermediateMovementsQuantity?: number; // Movimentações ocorridas pós-abertura (protegido)
  expectedQuantityAdjusted?: number; // Saldo esperado calculado no fechamento/revisão (protegido)
  countedQuantity?: number | null; // Quantidade física contada pelo operador (0 explícito ou null se não contado)
  isCounted: boolean; // Flag indicando se foi explicitamente contado
  countedAt?: string;
  difference?: number; // Contado - Esperado Ajustado (protegido)
  financialImpact?: number; // Diferença * unitCost (protegido)
  // Legacy / Compatibility fields
  recordedStock?: number;
  countedStock?: number;
  approved?: boolean;
  reason?: string;
}

export interface InventoryCount {
  id: string;
  code: string; // Ex: INV-2026-0001
  storeId: string;
  title: string;
  scope: InventoryScope;
  category?: string;
  status: InventoryStatus;
  assignedUserIds: string[];
  assignedUserNames: string[];
  createdById: string;
  createdByName: string;
  createdAt: string;
  openedAt?: string;
  dueDate?: string;
  notes?: string;
  items: InventoryItemCount[];
  totalProducts: number;
  countedProducts: number;
  hasDivergences?: boolean;
  totalFinancialImpact?: number;
  countCompletedAt?: string;
  countCompletedBy?: string;
  countCompletedByName?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  adjustmentApplied?: boolean;
  adjustedAt?: string;
  reopenReason?: string;
  reopenedAt?: string;
  reopenedBy?: string;
  reopenedByName?: string;
  reopenCount?: number;
  previousVersions?: InventoryHistoryVersion[];
  // Compatibility fields
  date?: string;
  countedBy?: string;
  countedByName?: string;
  approvedBy?: string;
  approvedByName?: string;
  completedAt?: string;
}

export interface Customer {
  id: string;
  storeId: string;
  name: string;
  cpf?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt: string;
}

export interface StaffTarget {
  id: string;
  storeId: string;
  month: string; // YYYY-MM
  storeRevenueTarget: number;
  individualTargets: {
    userId: string;
    userName: string;
    revenueTarget: number;
    maxDiscountAllowedPercent: number;
  }[];
  bonusRules: {
    tierMinPercent: number; // ex: 100% da meta
    bonusValueOrPercent: string; // ex: "R$ 300,00" ou "2% sobre vendas"
    description: string;
  }[];
}

export type TaskPriority = 'baixa' | 'media' | 'alta' | 'urgente';
export type TaskStatus = 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';
export type TaskOrigin = 'manual' | 'ia' | 'caixa' | 'estoque' | 'compras';

export interface TaskItem {
  id: string;
  storeId: string;
  title: string;
  description: string;
  origin: TaskOrigin;
  priority: TaskPriority;
  status: TaskStatus;
  assignedToId?: string;
  assignedToName?: string;
  createdById: string;
  createdByName: string;
  dueDate?: string;
  createdAt: string;
  completedAt?: string;
  referenceLink?: string;
}

export interface AIReport {
  id: string;
  storeId: string;
  timestamp: string;
  title?: string;
  periodLabel?: string;
  period?: string;
  promptType?: 'diagnostico_geral' | 'sugestao_compras' | 'auditoria_equipe';
  facts: string[];
  hypotheses: string[];
  limitations?: string[];
  dataLimitations?: string[];
  recommendations: {
    title: string;
    rationale?: string;
    suggestedAction: string;
    expectedImpact?: string;
    priority?: 'alta' | 'media' | 'baixa';
    category?: 'compras' | 'descontos' | 'equipe' | 'estoque';
    convertedToTaskId?: string;
  }[];
  rawMetricsSnapshot?: {
    totalRevenue: number;
    salesCount: number;
    averageTicket: number;
    discountTotal: number;
    grossMarginPercent?: number;
    marginCostCoveragePercent: number;
  };
}

export interface AuditLog {
  id: string;
  storeId: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityType?: string;
  entityId?: string;
  details: any;
  timestamp: string;
}

export interface Task {
  id: string;
  storeId?: string;
  title: string;
  description?: string;
  origin?: string;
  priority: 'baixa' | 'media' | 'alta' | 'urgente';
  status: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';
  assignedToId?: string;
  assignedToName?: string;
  createdById?: string;
  createdByName?: string;
  dueDate?: string;
  createdAt?: string;
  completedAt?: string;
}

export interface SalesGoal {
  id: string;
  storeId?: string;
  userId?: string;
  userName?: string;
  month: string;
  targetAmount: number;
  currentAmount: number;
}

export type ApprovalType = 
  | 'venda_modificacao'
  | 'venda_cancelamento'
  | 'troca_preco'
  | 'ajuste_estoque'
  | 'desconto_excedente'
  | 'hora_extra'
  | 'troca_turno'
  | 'sangria_excepcional';

export type ApprovalStatus = 'pendente' | 'aprovado' | 'rejeitado';
export type ApprovalEffectStatus = 'NOT_APPLIED' | 'APPLIED' | 'COMPENSATED' | 'FAILED';

export interface ApprovalRequest {
  id: string;
  storeId: string;
  type: ApprovalType;
  title: string;
  description: string;
  reason: string;
  requestedByUserId: string;
  requestedByUserName: string;
  createdAt: string;
  status: ApprovalStatus;
  reviewedByUserId?: string;
  reviewedByUserName?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  previousValue?: string | number;
  newValue?: string | number;
  financialImpact?: number;
  relatedEntityId?: string;
  relatedEntityType?: 'sale' | 'product' | 'cash_register' | 'work_shift' | 'inventory_count';
  effectStatus?: ApprovalEffectStatus;
  effectAppliedAt?: string;
  effectError?: string;
  effectDetails?: string;
  metadata?: Record<string, any>;
}
