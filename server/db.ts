import fs from 'fs';
import path from 'path';
import {
  User,
  Store,
  WorkShift,
  Product,
  StockMovement,
  Sale,
  CashRegister,
  CashMovement,
  UnmetDemand,
  Supplier,
  PurchaseOrder,
  InventoryCount,
  Customer,
  StaffTarget,
  TaskItem,
  AIReport,
  AuditLog,
  ApprovalRequest,
  Terminal,
  OperatorCashSummary
} from '../src/types.js';

export interface DatabaseSchema {
  stores: Store[];
  terminals: Terminal[];
  users: User[];
  shifts: WorkShift[];
  products: Product[];
  stockMovements: StockMovement[];
  sales: Sale[];
  cashRegisters: CashRegister[];
  cashMovements: CashMovement[];
  unmetDemands: UnmetDemand[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  inventories: InventoryCount[];
  customers: Customer[];
  targets: StaffTarget[];
  tasks: TaskItem[];
  aiReports: AIReport[];
  auditLogs: AuditLog[];
  approvals: ApprovalRequest[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'farmavida.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

function ensureDirectories() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function getInitialDatabase(): DatabaseSchema {
  const now = new Date();
  const defaultStore: Store = {
    id: 'store_matriz',
    name: 'FarmaVida - Drogaria Matriz',
    tradeName: 'Drogaria FarmaVida',
    cnpj: '12.345.678/0001-90',
    address: 'Av. Central da Saúde, 450 - Centro',
    phone: '(11) 3456-7890',
    active: true,
    settings: {
      maxDiscountWithoutAuthPercent: 12,
      defaultPaymentMethods: ['dinheiro', 'pix', 'cartao_debito', 'cartao_credito'],
      enableLotTracking: true,
    },
  };

  const defaultTerminals: Terminal[] = [
    {
      id: 'terminal_01',
      name: 'Terminal Balcão 01',
      storeId: 'store_matriz',
      active: true,
      notes: 'Computador principal do balcão de atendimento com gaveta física 01',
      createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'terminal_02',
      name: 'Terminal Balcão 02',
      storeId: 'store_matriz',
      active: true,
      notes: 'Computador secundário do balcão de atendimento com gaveta física 02',
      createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const defaultUsers: User[] = [
    {
      id: 'usr_admin',
      name: 'Dr. Roberto Mendes',
      email: 'roberto@farmavida.com.br',
      role: 'admin',
      roleTitle: 'Farmacêutico Gestor / Proprietário',
      storeId: 'store_matriz',
      active: true,
      pin: '1234',
      phone: '(11) 98765-4321',
    },
    {
      id: 'usr_colab1',
      name: 'Camila Santos',
      email: 'camila.balcao@farmavida.com.br',
      role: 'colaborador',
      roleTitle: 'Balconista Pleno',
      storeId: 'store_matriz',
      active: true,
      pin: '1111',
      phone: '(11) 97654-3210',
    },
    {
      id: 'usr_colab2',
      name: 'Lucas Ferreira',
      email: 'lucas.atendimento@farmavida.com.br',
      role: 'colaborador',
      roleTitle: 'Balconista & Caixa',
      storeId: 'store_matriz',
      active: true,
      pin: '2222',
      phone: '(11) 96543-2109',
    },
  ];

  const defaultProducts: Product[] = [
    {
      id: 'prod_1',
      storeId: 'store_matriz',
      code: 'MED-001',
      ean: '7891058001234',
      name: 'Dipirona Monoidratada',
      presentation: '500mg - Caixa c/ 20 comp',
      category: 'Genéricos',
      unit: 'CX',
      costPrice: 4.2,
      salePrice: 10.5,
      currentStock: 48,
      minStock: 25,
      maxStock: 100,
      safetyDays: 5,
      active: true,
      updatedAt: new Date().toISOString(),
      batch: 'L-2401',
      expirationDate: '2027-08-30',
    },
    {
      id: 'prod_2',
      storeId: 'store_matriz',
      code: 'MED-002',
      ean: '7896004705541',
      name: 'Amoxicilina + Clavulanato',
      presentation: '875mg + 125mg - 14 comp',
      category: 'Antibióticos & Referência',
      unit: 'CX',
      costPrice: 38.5,
      salePrice: 72.9,
      currentStock: 12,
      minStock: 10,
      maxStock: 35,
      safetyDays: 7,
      active: true,
      updatedAt: new Date().toISOString(),
      batch: 'L-2409',
      expirationDate: '2026-11-15',
    },
    {
      id: 'prod_3',
      storeId: 'store_matriz',
      code: 'MED-003',
      ean: '7891268102319',
      name: 'Losartana Potássica',
      presentation: '50mg - 30 comp',
      category: 'Genéricos',
      unit: 'CX',
      costPrice: 2.8,
      salePrice: 7.9,
      currentStock: 6,
      minStock: 20,
      maxStock: 80,
      safetyDays: 5,
      active: true,
      updatedAt: new Date().toISOString(),
      batch: 'L-2399',
      expirationDate: '2027-04-10',
    },
    {
      id: 'prod_4',
      storeId: 'store_matriz',
      code: 'PER-001',
      ean: '7891150043210',
      name: 'Protetor Solar Anthelios FPS 60',
      presentation: 'Toque Seco 50g',
      category: 'Dermocosméticos & Higiene',
      unit: 'UN',
      costPrice: 58.0,
      salePrice: 99.9,
      currentStock: 8,
      minStock: 8,
      maxStock: 24,
      safetyDays: 10,
      active: true,
      updatedAt: new Date().toISOString(),
      batch: 'B-771',
      expirationDate: '2027-12-01',
    },
    {
      id: 'prod_5',
      storeId: 'store_matriz',
      code: 'VIT-001',
      ean: '7898040319082',
      name: 'Vitamina C + Zinco Efervescente',
      presentation: '10 comp efervescentes',
      category: 'Vitaminas & Suplementos',
      unit: 'TUBO',
      costPrice: 9.5,
      salePrice: 21.9,
      currentStock: 18,
      minStock: 15,
      maxStock: 50,
      safetyDays: 6,
      active: true,
      updatedAt: new Date().toISOString(),
      batch: 'L-882',
      expirationDate: '2026-10-30',
    },
    {
      id: 'prod_6',
      storeId: 'store_matriz',
      code: 'MED-004',
      ean: '7896714201123',
      name: 'Omeprazol',
      presentation: '20mg - 28 cápsulas',
      category: 'Genéricos',
      unit: 'CX',
      costPrice: 5.1,
      salePrice: 14.9,
      currentStock: 32,
      minStock: 20,
      maxStock: 70,
      safetyDays: 5,
      active: true,
      updatedAt: new Date().toISOString(),
      batch: 'L-911',
      expirationDate: '2027-05-18',
    },
  ];

  const defaultSuppliers: Supplier[] = [
    {
      id: 'sup_1',
      name: 'Distribuidora Santa Cruz Farma',
      tradeName: 'Santa Cruz Medicamentos',
      cnpj: '61.123.456/0001-77',
      contactName: 'Marcos Rezende',
      phone: '(11) 3322-1100',
      email: 'pedidos@santacruzfarma.com.br',
      leadTimeDays: 2,
      active: true,
    },
    {
      id: 'sup_2',
      name: 'Profarma Distribuidora de Produtos Farmacêuticos',
      tradeName: 'Profarma',
      cnpj: '45.987.654/0001-22',
      contactName: 'Juliana Paes',
      phone: '(11) 3344-5566',
      email: 'vendas@profarma.com.br',
      leadTimeDays: 3,
      active: true,
    },
  ];

  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const defaultStockMovements: StockMovement[] = [
    {
      id: 'sm_init_1',
      storeId: 'store_matriz',
      productId: 'prod_1',
      productName: 'Dipirona Monoidratada',
      productCode: 'MED-001',
      type: 'saldo_inicial',
      quantity: 50,
      previousStock: 0,
      newStock: 50,
      reason: 'Inventário inicial homologado de corte',
      authorId: 'usr_admin',
      authorName: 'Dr. Roberto Mendes',
      timestamp: yesterday.toISOString(),
    },
    {
      id: 'sm_init_2',
      storeId: 'store_matriz',
      productId: 'prod_3',
      productName: 'Losartana Potássica',
      productCode: 'MED-003',
      type: 'saldo_inicial',
      quantity: 8,
      previousStock: 0,
      newStock: 8,
      reason: 'Inventário inicial homologado de corte',
      authorId: 'usr_admin',
      authorName: 'Dr. Roberto Mendes',
      timestamp: yesterday.toISOString(),
    },
  ];

  const defaultCashRegister: CashRegister = {
    id: 'cx_hoje',
    storeId: 'store_matriz',
    terminalName: 'Terminal 01 - Balcão Principal',
    openedBy: 'usr_colab2',
    openedByName: 'Lucas Ferreira',
    openedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 55).toISOString(),
    openingAmount: 150.0,
    cashSales: 74.3,
    pixSales: 99.9,
    cardDebitSales: 21.9,
    cardCreditSales: 72.9,
    suppliesTotal: 0,
    bleedingsTotal: 0,
    cashReturnsTotal: 0,
    expectedCash: 224.3, // 150 + 74.3
    status: 'aberto',
    notes: 'Abertura de turno normal com troco conferido',
  };

  const defaultSales: Sale[] = [
    {
      id: 'sale_101',
      code: 'VDA-2026-0001',
      storeId: 'store_matriz',
      timestamp: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 30).toISOString(),
      sellerId: 'usr_colab1',
      sellerName: 'Camila Santos',
      operatorId: 'usr_colab2',
      operatorName: 'Lucas Ferreira',
      cashRegisterId: 'cx_hoje',
      customerName: 'Dona Maria de Lourdes',
      items: [
        {
          productId: 'prod_1',
          productCode: 'MED-001',
          productName: 'Dipirona Monoidratada',
          presentation: '500mg - Caixa c/ 20 comp',
          category: 'Genéricos',
          quantity: 2,
          unitPrice: 10.5,
          unitCost: 4.2,
          discountPercent: 0,
          discountAmount: 0,
          total: 21.0,
        },
      ],
      subtotal: 21.0,
      totalDiscount: 0,
      total: 21.0,
      payments: [
        {
          method: 'dinheiro',
          amount: 21.0,
          tenderedAmount: 50.0,
          changeAmount: 29.0,
          confirmed: true,
        },
      ],
      fiscalStatus: 'vinculado',
      fiscalReference: 'NFCe-5501',
      status: 'concluida',
      history: [
        {
          timestamp: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 30).toISOString(),
          userId: 'usr_colab2',
          userName: 'Lucas Ferreira',
          action: 'Venda finalizada com sucesso',
        },
      ],
      idempotencyKey: 'idemp-0001',
    },
    {
      id: 'sale_102',
      code: 'VDA-2026-0002',
      storeId: 'store_matriz',
      timestamp: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 15).toISOString(),
      sellerId: 'usr_colab2',
      sellerName: 'Lucas Ferreira',
      operatorId: 'usr_colab2',
      operatorName: 'Lucas Ferreira',
      cashRegisterId: 'cx_hoje',
      customerName: 'Carlos Eduardo Ramos',
      items: [
        {
          productId: 'prod_4',
          productCode: 'PER-001',
          productName: 'Protetor Solar Anthelios FPS 60',
          presentation: 'Toque Seco 50g',
          category: 'Dermocosméticos & Higiene',
          quantity: 1,
          unitPrice: 99.9,
          unitCost: 58.0,
          discountPercent: 0,
          discountAmount: 0,
          total: 99.9,
        },
      ],
      subtotal: 99.9,
      totalDiscount: 0,
      total: 99.9,
      payments: [
        {
          method: 'pix',
          amount: 99.9,
          reference: 'PIX-E994821',
          confirmed: true,
        },
      ],
      fiscalStatus: 'pendente_conciliacao',
      status: 'concluida',
      history: [
        {
          timestamp: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 15).toISOString(),
          userId: 'usr_colab2',
          userName: 'Lucas Ferreira',
          action: 'Venda finalizada com sucesso',
        },
      ],
      idempotencyKey: 'idemp-0002',
    },
    {
      id: 'sale_103',
      code: 'VDA-2026-0003',
      storeId: 'store_matriz',
      timestamp: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 40).toISOString(),
      sellerId: 'usr_colab1',
      sellerName: 'Camila Santos',
      operatorId: 'usr_colab2',
      operatorName: 'Lucas Ferreira',
      cashRegisterId: 'cx_hoje',
      customerName: 'Ana Beatriz Souza',
      items: [
        {
          productId: 'prod_3',
          productCode: 'MED-003',
          productName: 'Losartana Potássica',
          presentation: '50mg - 30 comp',
          category: 'Genéricos',
          quantity: 2,
          unitPrice: 7.9,
          unitCost: 2.8,
          discountPercent: 5,
          discountAmount: 0.8,
          total: 15.0,
        },
        {
          productId: 'prod_2',
          productCode: 'MED-002',
          productName: 'Amoxicilina + Clavulanato',
          presentation: '875mg + 125mg - 14 comp',
          category: 'Antibióticos & Referência',
          quantity: 1,
          unitPrice: 72.9,
          unitCost: 38.5,
          discountPercent: 0,
          discountAmount: 0,
          total: 72.9,
        },
      ],
      subtotal: 88.7,
      totalDiscount: 0.8,
      total: 87.9,
      payments: [
        {
          method: 'dinheiro',
          amount: 15.0,
          tenderedAmount: 20.0,
          changeAmount: 5.0,
          confirmed: true,
        },
        {
          method: 'cartao_credito',
          amount: 72.9,
          reference: 'NSU-781923',
          confirmed: true,
        },
      ],
      fiscalStatus: 'vinculado',
      fiscalReference: 'NFCe-5502',
      status: 'concluida',
      history: [
        {
          timestamp: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 40).toISOString(),
          userId: 'usr_colab2',
          userName: 'Lucas Ferreira',
          action: 'Venda finalizada com pagamento misto (Dinheiro + Cartão Crédito)',
        },
      ],
      idempotencyKey: 'idemp-0003',
    },
  ];

  const defaultUnmetDemands: UnmetDemand[] = [
    {
      id: 'dem_1',
      storeId: 'store_matriz',
      productId: 'prod_3',
      productName: 'Losartana Potássica 50mg',
      quantityRequested: 3,
      reason: 'falta_estoque',
      attendantId: 'usr_colab1',
      attendantName: 'Camila Santos',
      notes: 'Cliente procurou 3 caixas para tratamento contínuo, tínhamos poucas unidades',
      timestamp: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 30).toISOString(),
      resolved: false,
    },
    {
      id: 'dem_2',
      storeId: 'store_matriz',
      productName: 'Fita Microporosa Hipoalergênica 25mm x 4.5m',
      quantityRequested: 2,
      reason: 'produto_nao_trabalhado',
      attendantId: 'usr_colab2',
      attendantName: 'Lucas Ferreira',
      notes: 'Cliente do posto de saúde vizinho pediu com frequência nesta semana',
      timestamp: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0).toISOString(),
      resolved: false,
    },
  ];

  const defaultPurchaseOrders: PurchaseOrder[] = [
    {
      id: 'po_01',
      code: 'PED-2026-0001',
      storeId: 'store_matriz',
      supplierId: 'sup_1',
      supplierName: 'Santa Cruz Medicamentos',
      status: 'parcialmente_recebido',
      items: [
        {
          productId: 'prod_1',
          productCode: 'MED-001',
          productName: 'Dipirona Monoidratada 500mg',
          quantityOrdered: 40,
          quantityReceived: 40,
          unitCostEstimated: 4.2,
          unitCostReal: 4.15,
          totalEstimated: 168.0,
        },
        {
          productId: 'prod_3',
          productCode: 'MED-003',
          productName: 'Losartana Potássica 50mg',
          quantityOrdered: 50,
          quantityReceived: 0,
          unitCostEstimated: 2.8,
          totalEstimated: 140.0,
        },
      ],
      totalEstimated: 308.0,
      totalCost: 308.0,
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      approvedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      approvedBy: 'Dr. Roberto Mendes',
      notes: 'Reposição semanal de genéricos de alta rotação',
      receiptsHistory: [
        {
          receiptId: 'rec_101',
          timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
          receivedBy: 'usr_admin',
          receivedByName: 'Dr. Roberto Mendes',
          items: [
            {
              productId: 'prod_1',
              qtyFit: 38,
              qtyDamaged: 2, // 2 caixas amassadas no transporte
              unitCost: 4.15,
            },
          ],
          notes: 'Entregue nota fiscal NF-48291. 2 caixas de Dipirona recusadas por dano na embalagem.',
        },
      ],
    },
  ];

  const defaultCustomers: Customer[] = [
    {
      id: 'cust_1',
      storeId: 'store_matriz',
      name: 'Dona Maria de Lourdes Silva',
      cpf: '123.456.789-00',
      phone: '(11) 98888-1122',
      address: 'Rua das Flores, 120 - Apto 3',
      notes: 'Uso contínuo de anti-hipertensivo',
      createdAt: yesterday.toISOString(),
    },
    {
      id: 'cust_2',
      storeId: 'store_matriz',
      name: 'Carlos Eduardo Ramos',
      cpf: '234.567.890-11',
      phone: '(11) 97777-3344',
      address: 'Av. Paulista, 1000',
      createdAt: yesterday.toISOString(),
    },
  ];

  const defaultTargets: StaffTarget[] = [
    {
      id: 'target_cur',
      storeId: 'store_matriz',
      month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      storeRevenueTarget: 45000.0,
      individualTargets: [
        {
          userId: 'usr_colab1',
          userName: 'Camila Santos',
          revenueTarget: 22000.0,
          maxDiscountAllowedPercent: 10.0,
        },
        {
          userId: 'usr_colab2',
          userName: 'Lucas Ferreira',
          revenueTarget: 20000.0,
          maxDiscountAllowedPercent: 10.0,
        },
      ],
      bonusRules: [
        {
          tierMinPercent: 100,
          bonusValueOrPercent: 'R$ 400,00',
          description: 'Atingimento de 100% da meta com descontos médios abaixo de 8%',
        },
        {
          tierMinPercent: 115,
          bonusValueOrPercent: 'R$ 750,00',
          description: 'Superação de meta (115%+) com excelência no mix e faturamento',
        },
      ],
    },
  ];

  const defaultTasks: TaskItem[] = [
    {
      id: 'tsk_1',
      storeId: 'store_matriz',
      title: 'Cobrar entrega urgente da Losartana Potássica (Santa Cruz)',
      description: 'O estoque de Losartana está crítico (apenas 6 cx restantes) e tivemos 3 procuras sem atendimento hoje.',
      origin: 'estoque',
      priority: 'urgente',
      status: 'pendente',
      assignedToId: 'usr_admin',
      assignedToName: 'Dr. Roberto Mendes',
      createdById: 'usr_colab1',
      createdByName: 'Camila Santos',
      dueDate: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      createdAt: now.toISOString(),
    },
    {
      id: 'tsk_2',
      storeId: 'store_matriz',
      title: 'Cotar Fita Microporosa com distribuidores',
      description: 'Item muito procurado no balcão por pacientes do posto de saúde vizinho.',
      origin: 'manual',
      priority: 'media',
      status: 'pendente',
      assignedToId: 'usr_admin',
      assignedToName: 'Dr. Roberto Mendes',
      createdById: 'usr_colab2',
      createdByName: 'Lucas Ferreira',
      createdAt: now.toISOString(),
    },
  ];

  const defaultApprovals: ApprovalRequest[] = [
    {
      id: 'appr_01',
      storeId: 'store_matriz',
      type: 'desconto_excedente',
      title: 'Desconto de 18% em Amoxicilina + Clavulanato',
      description: 'Cliente dona Maria solicitou desconto de R$ 13,12 para fechar a receita médica mensal.',
      reason: 'Equiparação de preço com concorrente local para cliente fidelizada.',
      requestedByUserId: 'usr_colab1',
      requestedByUserName: 'Camila Santos',
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      status: 'pendente',
      previousValue: '12% (Limite Padrão)',
      newValue: '18% (R$ 13,12)',
      financialImpact: 13.12,
      relatedEntityType: 'sale',
    },
    {
      id: 'appr_02',
      storeId: 'store_matriz',
      type: 'troca_preco',
      title: 'Ajuste de Preço de Venda: Dipirona 500mg',
      description: 'Proposta de alteração de preço unitário de R$ 10,50 para R$ 9,90 no balcão.',
      reason: 'Ajuste promocional de balcão para estímulo de vendas.',
      requestedByUserId: 'usr_colab2',
      requestedByUserName: 'Lucas Ferreira',
      createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
      status: 'pendente',
      previousValue: 'R$ 10,50',
      newValue: 'R$ 9,90',
      financialImpact: 0.60,
      relatedEntityId: 'prod_1',
      relatedEntityType: 'product',
    },
  ];

  return {
    stores: [defaultStore],
    terminals: defaultTerminals,
    users: defaultUsers,
    shifts: [],
    products: defaultProducts,
    stockMovements: defaultStockMovements,
    sales: defaultSales,
    cashRegisters: [defaultCashRegister],
    cashMovements: [],
    unmetDemands: defaultUnmetDemands,
    suppliers: defaultSuppliers,
    purchaseOrders: defaultPurchaseOrders,
    inventories: [],
    customers: defaultCustomers,
    targets: defaultTargets,
    tasks: defaultTasks,
    aiReports: [],
    approvals: defaultApprovals,
    auditLogs: [
      {
        id: 'aud_init',
        storeId: 'store_matriz',
        userId: 'usr_admin',
        userName: 'Dr. Roberto Mendes',
        action: 'INICIALIZACAO_SISTEMA',
        entity: 'SISTEMA',
        details: 'Banco de dados operacional FarmaVida inicializado com dados consistentes da loja.',
        timestamp: yesterday.toISOString(),
      },
    ],
  };
}

export class FarmaVidaDB {
  private static instance: FarmaVidaDB;
  private cache: DatabaseSchema | null = null;
  private writeQueue: Promise<void> = Promise.resolve();

  private constructor() {
    ensureDirectories();
  }

  public static getInstance(): FarmaVidaDB {
    if (!FarmaVidaDB.instance) {
      FarmaVidaDB.instance = new FarmaVidaDB();
    }
    return FarmaVidaDB.instance;
  }

  public getRawData(): DatabaseSchema {
    if (this.cache) return this.cache;

    ensureDirectories();
    if (!fs.existsSync(DB_FILE)) {
      const initial = getInitialDatabase();
      this.writeSync(initial);
      this.cache = initial;
      return initial;
    }

    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      this.cache = JSON.parse(raw);
      if (!Array.isArray(this.cache?.approvals)) {
        if (this.cache) {
          const now = new Date();
          this.cache.approvals = [
            {
              id: 'appr_01',
              storeId: 'store_matriz',
              type: 'desconto_excedente',
              title: 'Desconto de 18% em Amoxicilina + Clavulanato',
              description: 'Cliente dona Maria solicitou desconto de R$ 13,12 para fechar a receita médica mensal.',
              reason: 'Equiparação de preço com concorrente local para cliente fidelizada.',
              requestedByUserId: 'usr_colab1',
              requestedByUserName: 'Camila Santos',
              createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
              status: 'pendente',
              previousValue: '12% (Limite Padrão)',
              newValue: '18% (R$ 13,12)',
              financialImpact: 13.12,
              relatedEntityType: 'sale',
            },
            {
              id: 'appr_02',
              storeId: 'store_matriz',
              type: 'troca_preco',
              title: 'Ajuste de Preço de Venda: Dipirona 500mg',
              description: 'Proposta de alteração de preço unitário de R$ 10,50 para R$ 9,90 no balcão.',
              reason: 'Ajuste promocional de balcão para estímulo de vendas.',
              requestedByUserId: 'usr_colab2',
              requestedByUserName: 'Lucas Ferreira',
              createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
              status: 'pendente',
              previousValue: 'R$ 10,50',
              newValue: 'R$ 9,90',
              financialImpact: 0.60,
              relatedEntityId: 'prod_1',
              relatedEntityType: 'product',
            },
          ];
        }
      }
      if (!Array.isArray(this.cache?.terminals) || this.cache.terminals.length === 0) {
        if (this.cache) {
          const now = new Date();
          this.cache.terminals = [
            {
              id: 'terminal_01',
              name: 'Terminal Balcão 01',
              storeId: 'store_matriz',
              active: true,
              notes: 'Computador principal do balcão de atendimento com gaveta física 01',
              createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            },
            {
              id: 'terminal_02',
              name: 'Terminal Balcão 02',
              storeId: 'store_matriz',
              active: true,
              notes: 'Computador secundário do balcão de atendimento com gaveta física 02',
              createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            },
          ];
        }
      }
      return this.cache!;
    } catch (err) {
      console.error('Falha ao ler banco de dados. Criando recuperação:', err);
      const initial = getInitialDatabase();
      this.writeSync(initial);
      this.cache = initial;
      return initial;
    }
  }

  /**
   * Mutação atômica serializada via Mutex/Queue na memória do processo.
   * Evita condições de corrida e escritas concorrentes sobrepostas no arquivo JSON.
   */
  public async mutate<T>(mutator: (data: DatabaseSchema) => Promise<T> | T): Promise<T> {
    let resolveResult!: (value: T) => void;
    let rejectResult!: (reason?: any) => void;
    const resultPromise = new Promise<T>((res, rej) => {
      resolveResult = res;
      rejectResult = rej;
    });

    this.writeQueue = this.writeQueue
      .catch(() => {}) // Garante que falhas anteriores não travem requisições subsequentes
      .then(async () => {
        try {
          const data = this.getRawData();
          const result = await mutator(data);
          await this.atomicSave(data);
          resolveResult(result);
        } catch (err) {
          rejectResult(err);
        }
      });

    return resultPromise;
  }

  public async save(data: DatabaseSchema): Promise<void> {
    return this.mutate(() => {
      this.cache = data;
    });
  }

  private async atomicSave(data: DatabaseSchema): Promise<void> {
    this.cache = data;
    ensureDirectories();
    const tempFile = path.join(DATA_DIR, `.farmavida.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 7)}`);
    await fs.promises.writeFile(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    await fs.promises.rename(tempFile, DB_FILE);
  }

  private writeSync(data: DatabaseSchema): void {
    ensureDirectories();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  }

  public logAudit(storeId: string, userId: string, userName: string, action: string, entity: string, details: string, entityId?: string) {
    const db = this.getRawData();
    const log: AuditLog = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      storeId,
      userId,
      userName,
      action,
      entity,
      entityId,
      details,
      timestamp: new Date().toISOString(),
    };
    db.auditLogs.unshift(log);
    if (db.auditLogs.length > 1000) {
      db.auditLogs = db.auditLogs.slice(0, 1000);
    }
    this.save(db).catch((e) => console.error('Erro ao gravar auditoria:', e));
  }
}
