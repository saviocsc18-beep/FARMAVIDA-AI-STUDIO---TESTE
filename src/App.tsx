import React, { useState, useEffect, useCallback } from 'react';
import { 
  Store, 
  User, 
  Product, 
  Sale, 
  CashRegister, 
  StockMovement, 
  WorkShift, 
  UnmetDemand, 
  PurchaseOrder, 
  Supplier, 
  Task, 
  SalesGoal, 
  AuditLog, 
  AIReport, 
  Customer,
  ApprovalRequest,
  InventoryCount,
  Terminal
} from './types';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ColaboradorWorkspace } from './components/ColaboradorWorkspace';
import { MeuCaixaView } from './components/MeuCaixaView';
import { MeuTurnoView } from './components/MeuTurnoView';
import { ColaboradorMetas } from './components/ColaboradorMetas';
import { RestrictedAccessView } from './components/RestrictedAccessView';
import { AdminOverview } from './components/AdminOverview';
import { AdminSales } from './components/AdminSales';
import { AdminCash } from './components/AdminCash';
import { AdminStock } from './components/AdminStock';
import { AdminPurchases } from './components/AdminPurchases';
import { AdminDemands } from './components/AdminDemands';
import { AdminStaff } from './components/AdminStaff';
import { AdminAIReports } from './components/AdminAIReports';
import { AdminImport } from './components/AdminImport';
import { AdminTasksAndAudit } from './components/AdminTasksAndAudit';
import { AdminApprovals } from './components/AdminApprovals';
import { AdminSettings } from './components/AdminSettings';
import { RecebimentoMercadoriaView } from './components/RecebimentoMercadoriaView';
import { ContagemEstoqueView } from './components/ContagemEstoqueView';
import { ContextualHelpModal } from './components/ContextualHelpModal';
import { OperatorSwitchModal } from './components/OperatorSwitchModal';
import { apiFetch, getStoredToken, setStoredToken, getStoredUser, setStoredUser } from './lib/api';

const MODULE_TITLES: Record<string, string> = {
  balcao: 'Balcão & PDV',
  meu_caixa: 'Meu Caixa Operacional',
  meu_turno: 'Meu Turno & Ponto',
  receber_mercadoria: 'Receber Mercadoria (Conferência Física)',
  contagem_estoque: 'Contagem de Estoque (Inventário Físico)',
  colab_metas: 'Minhas Metas',
  admin_demands: 'Falta de Medicamentos',
  admin_approvals: 'Central de Aprovações',
  admin_overview: 'Painel Executivo',
  admin_sales: 'Vendas & Histórico',
  admin_cash: 'Caixa & Tesouraria',
  admin_stock: 'Estoque & Produtos',
  admin_purchases: 'Compras & Pedidos',
  admin_staff: 'Equipe & Metas da Loja',
  admin_ai: 'Relatórios IA (Gemini)',
  admin_settings: 'Configurações Gerais',
  admin_import: 'Importar Planilhas',
  admin_tasks: 'Tarefas & Auditoria',
};

export default function App() {
  // Main Domain State
  const [store, setStore] = useState<Store>({
    id: 'store_matriz',
    code: 'LJ-01',
    tradeName: 'Drogaria FarmaVida',
    companyName: 'FarmaVida Farmácia e Drogaria Ltda',
    cnpj: '12.345.678/0001-90',
    address: 'Av. Brasil, 1420 - Centro',
    phone: '(11) 3456-7890',
    active: true,
  });

  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [workShifts, setWorkShifts] = useState<WorkShift[]>([]);
  const [unmetDemands, setUnmetDemands] = useState<UnmetDemand[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [salesGoals, setSalesGoals] = useState<SalesGoal[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [aiReports, setAiReports] = useState<AIReport[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [inventories, setInventories] = useState<InventoryCount[]>([]);
  const [terminals, setTerminals] = useState<Terminal[]>([
    {
      id: 'terminal_01',
      name: 'Terminal Balcão 01',
      storeId: 'store_matriz',
      active: true,
      notes: 'Computador principal do balcão com gaveta física 01',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'terminal_02',
      name: 'Terminal Balcão 02',
      storeId: 'store_matriz',
      active: true,
      notes: 'Computador secundário do balcão com gaveta física 02',
      createdAt: new Date().toISOString(),
    },
  ]);
  const [currentTerminalId, setCurrentTerminalId] = useState<string>(() => {
    try {
      return localStorage.getItem('farmavida_current_terminal_id') || 'terminal_01';
    } catch {
      return 'terminal_01';
    }
  });
  const [isOperatorSwitchModalOpen, setIsOperatorSwitchModalOpen] = useState<boolean>(false);

  // Navigation and UI state
  const [activeTab, setActiveTab] = useState<string>('balcao');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('farmavida_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isAnalyzingAi, setIsAnalyzingAi] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);

  // Sync data from backend API
  const refreshAllData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await apiFetch('/api/sync');
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();

      if (data.store) setStore(data.store);
      if (data.users && data.users.length > 0) {
        setUsers(data.users);
        if (!currentUser) {
          const storedUser = getStoredUser();
          const matchedUser = storedUser ? data.users.find((u: any) => u.id === storedUser.id) : null;
          const effectiveUser = matchedUser || data.users[0];
          setCurrentUser(effectiveUser);
          setStoredUser(effectiveUser);

          if (effectiveUser.role === 'colaborador') {
            const hasShift = (data.workShifts || []).some(
              (ws: any) => ws.userId === effectiveUser.id && ws.status !== 'encerrado'
            );
            if (!hasShift) {
              setActiveTab('meu_turno');
            }
          }
        }
      }
      if (data.products) setProducts(data.products);
      if (data.sales) setSales(data.sales);
      if (data.cashRegisters) setCashRegisters(data.cashRegisters);
      if (data.stockMovements) setStockMovements(data.stockMovements);
      if (data.workShifts) setWorkShifts(data.workShifts);
      if (data.unmetDemands) setUnmetDemands(data.unmetDemands);
      if (data.purchaseOrders) setPurchaseOrders(data.purchaseOrders);
      if (data.suppliers) setSuppliers(data.suppliers);
      if (data.tasks) setTasks(data.tasks);
      if (data.salesGoals) setSalesGoals(data.salesGoals);
      if (data.auditLogs) setAuditLogs(data.auditLogs);
      if (data.aiReports) setAiReports(data.aiReports);
      if (data.approvals) setApprovals(data.approvals);

      // Load customers
      const custRes = await apiFetch('/api/customers');
      if (custRes.ok) {
        const custData = await custRes.json();
        setCustomers(custData);
      }

      // Load inventories (with role header)
      try {
        const invRes = await apiFetch('/api/inventories');
        if (invRes.ok) {
          const invData = await invRes.json();
          setInventories(invData);
        }
      } catch (err) {
        console.error('Erro ao buscar inventários:', err);
      }

      setIsOnline(true);
    } catch (err) {
      console.error('Falha ao sincronizar dados com o servidor:', err);
      setIsOnline(false);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // Real browser connectivity listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Keyboard shortcut: Press 'S' or 's' outside inputs to toggle sidebar, '?' for help
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 's' || e.key === 'S') {
        if (!e.ctrlKey && !e.altKey && !e.metaKey) {
          setIsSidebarCollapsed((prev) => {
            const next = !prev;
            try {
              localStorage.setItem('farmavida_sidebar_collapsed', String(next));
            } catch {}
            return next;
          });
        }
      }

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        setIsHelpOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('farmavida_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Derived current user shift
  const activeShift = currentUser
    ? workShifts.find((ws) => ws.userId === currentUser.id && ws.status !== 'encerrado') || null
    : null;

  const handleSwitchUser = (newUser: User) => {
    setCurrentUser(newUser);
    if (newUser.role === 'colaborador') {
      const hasShift = workShifts.some(
        (ws) => ws.userId === newUser.id && ws.status !== 'encerrado'
      );
      if (!hasShift) {
        setActiveTab('meu_turno');
      }
    }
  };

  const activeShiftStatus: 'em_andamento' | 'pausado' | 'sem_turno' = activeShift
    ? (activeShift.status as 'em_andamento' | 'pausado')
    : 'sem_turno';

  // Derived active cash register (Shared Terminal Physical Drawer Aware)
  const activeCashRegister = cashRegisters.find(
    (cr) => cr.status === 'aberto' && (cr.terminalId === currentTerminalId || (!cr.terminalId && currentTerminalId === 'terminal_01'))
  ) || cashRegisters.find((cr) => cr.status === 'aberto' && (cr.openedBy === currentUser?.id || cr.openedById === currentUser?.id)) || null;

  // --- Handlers ---

  // 1. Sales
  const handleSaveSale = async (saleData: any) => {
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleData),
      });
      const data = await res.json();
      if (res.ok && (data.success || data.sale)) {
        await refreshAllData();
        return { success: true, sale: data.sale };
      }
      return {
        success: false,
        error: data.error || 'Erro ao registrar venda',
        requiresApproval: data.requiresApproval,
        approvalType: data.approvalType,
        discountPercent: data.discountPercent,
        maxAllowed: data.maxAllowed,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const handleReconcileFiscal = async (saleId: string, fiscalRef: string, notes?: string) => {
    try {
      const res = await fetch(`/api/sales/${saleId}/reconcile-fiscal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fiscalReference: fiscalRef, fiscalNotes: notes }),
      });
      if (res.ok) {
        await refreshAllData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // 2. Unmet demands / faltas
  const handleRegisterDemand = async (demandData: any) => {
    try {
      const res = await fetch('/api/demands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(demandData),
      });
      if (res.ok) {
        await refreshAllData();
        return { success: true };
      }
      return { success: false, error: 'Erro ao registrar falta' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const handleResolveDemand = async (demandId: string) => {
    try {
      const res = await fetch(`/api/demands/${demandId}/resolve`, { method: 'PATCH' });
      if (res.ok) {
        await refreshAllData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // 3. Customers
  const handleRegisterCustomer = async (customerData: any) => {
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData),
      });
      const data = await res.json();
      if (res.ok && data.customer) {
        await refreshAllData();
        return { success: true, customer: data.customer };
      }
      return { success: false, error: data.error };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // 4. Shifts
  const handleStartShift = async () => {
    if (!currentUser) return { success: false, error: 'Usuário não autenticado' };
    try {
      const res = await fetch('/api/shifts/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, storeId: currentUser.storeId }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Erro ao iniciar expediente.' };
      }
      await refreshAllData();
      return { success: true };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  const handleToggleBreak = async () => {
    if (!currentUser) return { success: false, error: 'Usuário não autenticado' };
    try {
      const res = await fetch('/api/shifts/break', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shiftId: activeShift?.id, userId: currentUser.id, reason: 'Intervalo de descanso/alimentação' }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Erro ao alterar intervalo.' };
      }
      await refreshAllData();
      return { success: true };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  const handleEndShift = async (notes?: string) => {
    if (!currentUser) return { success: false, error: 'Usuário não autenticado' };
    try {
      const res = await fetch('/api/shifts/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shiftId: activeShift?.id, userId: currentUser.id, notes }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Erro ao encerrar expediente.' };
      }
      await refreshAllData();
      return { success: true };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  // 5. Cash register (Operational and Administrative)
  const handleOpenCash = async (terminalName: string, openingAmount: number, notes?: string, workShiftId?: string) => {
    if (!currentUser) return { success: false, error: 'Usuário não autenticado' };
    try {
      const res = await fetch('/api/cash-registers/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          terminalId: currentTerminalId,
          terminalName,
          openingAmount,
          openedBy: currentUser.id,
          openedByName: currentUser.name,
          workShiftId: workShiftId || activeShift?.id,
          notes,
        }),
      });
      const data = await res.json();
      if (res.ok && (data.success || data.cashRegister)) {
        await refreshAllData();
        return { success: true };
      }
      return { success: false, error: data.error || 'Erro ao abrir sessão de caixa.' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const handleAddCashMovement = async (type: 'suprimento' | 'sangria' | 'devolucao', amount: number, reason: string) => {
    if (!activeCashRegister || !currentUser) return { success: false, error: 'Nenhum caixa aberto encontrado.' };
    try {
      const res = await fetch('/api/cash-registers/movement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cashRegisterId: activeCashRegister.id,
          type,
          amount,
          reason,
          authorizedBy: currentUser.id,
          authorizedByName: currentUser.name,
        }),
      });
      const data = await res.json();
      if (res.ok && (data.success || data.movement)) {
        await refreshAllData();
        return { success: true };
      }
      return { success: false, error: data.error || 'Erro ao registrar movimentação.' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const handleCloseCash = async (
    closeDataOrCounted: number | {
      countedCash: number;
      retainedFloat: number;
      withdrawnAmount: number;
      closingWithdrawalConfirmed: boolean;
      divergenceReason?: string;
      notes?: string;
    },
    legacyNotes?: string
  ) => {
    if (!activeCashRegister || !currentUser) return { success: false, error: 'Nenhum caixa aberto encontrado.' };
    try {
      let payload: any = {};
      if (typeof closeDataOrCounted === 'number') {
        payload = {
          cashRegisterId: activeCashRegister.id,
          countedCash: closeDataOrCounted,
          closedBy: currentUser.id,
          closedByName: currentUser.name,
          notes: legacyNotes,
        };
      } else {
        payload = {
          cashRegisterId: activeCashRegister.id,
          ...closeDataOrCounted,
          closedBy: currentUser.id,
          closedByName: currentUser.name,
        };
      }

      const res = await fetch('/api/cash-registers/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && (data.success || data.cashRegister)) {
        await refreshAllData();
        return { success: true };
      }
      return { success: false, error: data.error || 'Erro ao fechar caixa.' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const handleReconcileCashRegister = async (registerId: string, status: 'conferido' | 'resolvido', notes?: string) => {
    if (!currentUser) return false;
    try {
      const res = await fetch(`/api/cash-registers/${registerId}/reconcile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewerId: currentUser.id,
          reviewerName: currentUser.name,
          status,
          notes,
        }),
      });
      if (res.ok) {
        await refreshAllData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleCancelSale = async (saleId: string, reason: string, adminPin?: string) => {
    if (!currentUser) return { success: false, error: 'Usuário não autenticado.' };
    try {
      const res = await fetch(`/api/sales/${saleId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          userName: currentUser.name,
          reason,
          adminPin,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        await refreshAllData();
        return { success: true, message: data.message, approvalRequired: data.approvalRequired };
      }
      return { success: false, error: data.error || 'Erro ao processar cancelamento.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro de rede.' };
    }
  };

  // 6. Products & Stock
  const handleSaveProduct = async (productData: any) => {
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });
      if (res.ok) {
        await refreshAllData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleAdjustStock = async (productId: string, newStock: number, reason: string) => {
    if (!currentUser) return false;
    try {
      const res = await fetch(`/api/products/${productId}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newStock,
          reason,
          userId: currentUser.id,
          userName: currentUser.name,
        }),
      });
      if (res.ok) {
        await refreshAllData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // 7. Purchasing
  const handleCreatePurchaseOrder = async (orderData: any) => {
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });
      if (res.ok) {
        await refreshAllData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleApproveOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/purchases/${orderId}/approve`, { method: 'POST' });
      if (res.ok) {
        await refreshAllData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleReceiveOrder = async (
    orderId: string,
    receivedItems: { productId: string; receivedQuantity: number; damagedQuantity: number }[],
    invoiceNumber?: string
  ) => {
    if (!currentUser) return false;
    try {
      const res = await fetch(`/api/purchases/${orderId}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receivedItems,
          invoiceNumber,
          userId: currentUser.id,
          userName: currentUser.name,
        }),
      });
      if (res.ok) {
        await refreshAllData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // 8. AI Analysis
  const handleRunAiAnalysis = async () => {
    setIsAnalyzingAi(true);
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period: 'Últimos 30 dias / Operação em curso' }),
      });
      if (res.ok) {
        await refreshAllData();
        setActiveTab('admin_ai');
      }
    } catch (err) {
      console.error('Erro na análise de IA:', err);
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  // 9. Spreadsheet import
  const handleImportProducts = async (importedProducts: any[]) => {
    try {
      const res = await fetch('/api/import/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: importedProducts }),
      });
      if (res.ok) {
        await refreshAllData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // 10. Tasks
  const handleSaveTask = async (taskData: any) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });
      if (res.ok) {
        await refreshAllData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleToggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'pendente' ? 'em_andamento' : currentStatus === 'em_andamento' ? 'concluida' : 'pendente';
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        await refreshAllData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleCreateTaskFromAi = async (title: string, description: string, priority: 'alta' | 'media' | 'baixa') => {
    return handleSaveTask({
      title,
      description,
      priority,
      status: 'pendente',
    });
  };

  // 11. Goals
  const handleSaveGoal = async (goalData: any) => {
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goalData),
      });
      if (res.ok) {
        await refreshAllData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // 12. Physical Inventory & Blind Count Handlers (PHASE-02)
  const handleCreateInventory = async (inventoryData: any) => {
    if (!currentUser) return false;
    try {
      const res = await fetch('/api/inventories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({
          ...inventoryData,
          createdById: currentUser.id,
          createdByName: currentUser.name,
        }),
      });
      if (res.ok) {
        await refreshAllData();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Erro ao criar inventário:', err);
      return false;
    }
  };

  const handleSaveInventoryCount = async (inventoryId: string, items: any[], notes?: string) => {
    if (!currentUser) return false;
    try {
      const res = await fetch(`/api/inventories/${inventoryId}/count`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({
          countedItems: items,
          notes,
          userId: currentUser.id,
          userName: currentUser.name,
        }),
      });
      if (res.ok) {
        await refreshAllData();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Erro ao salvar contagem:', err);
      return false;
    }
  };

  const handleCompleteInventoryCount = async (inventoryId: string, items: any[], notes?: string) => {
    if (!currentUser) return false;
    try {
      const res = await fetch(`/api/inventories/${inventoryId}/complete-count`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({
          countedItems: items,
          notes,
          userId: currentUser.id,
          userName: currentUser.name,
        }),
      });
      if (res.ok) {
        await refreshAllData();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Erro ao concluir contagem:', err);
      return false;
    }
  };

  const handleApproveInventory = async (inventoryId: string, reviewNotes?: string) => {
    if (!currentUser) return false;
    try {
      const res = await fetch(`/api/inventories/${inventoryId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({
          reviewNotes,
          userId: currentUser.id,
          userName: currentUser.name,
        }),
      });
      if (res.ok) {
        await refreshAllData();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Erro ao aprovar inventário:', err);
      return false;
    }
  };

  const handleRejectInventory = async (inventoryId: string, reviewNotes?: string) => {
    if (!currentUser) return false;
    try {
      const res = await fetch(`/api/inventories/${inventoryId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({
          reviewNotes,
          userId: currentUser.id,
          userName: currentUser.name,
        }),
      });
      if (res.ok) {
        await refreshAllData();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Erro ao rejeitar inventário:', err);
      return false;
    }
  };

  const handleReopenInventory = async (inventoryId: string, reason: string) => {
    if (!currentUser) return false;
    try {
      const res = await fetch(`/api/inventories/${inventoryId}/reopen`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({
          reason,
          userId: currentUser.id,
          userName: currentUser.name,
        }),
      });
      if (res.ok) {
        await refreshAllData();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Erro ao reabrir inventário:', err);
      return false;
    }
  };

  const handleCancelInventory = async (inventoryId: string) => {
    if (!currentUser) return false;
    try {
      const res = await fetch(`/api/inventories/${inventoryId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({
          userId: currentUser.id,
          userName: currentUser.name,
        }),
      });
      if (res.ok) {
        await refreshAllData();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Erro ao cancelar inventário:', err);
      return false;
    }
  };

  if (isLoading || !currentUser) {
    return (
      <div className="min-h-screen bg-neutral-100 flex flex-col items-center justify-center p-4 space-y-4">
        <div className="w-12 h-12 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-xl shadow-md animate-pulse">
          FV
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-base font-bold text-neutral-900">Drogaria FarmaVida</h2>
          <p className="text-xs text-neutral-500">Iniciando sistema operacional e carregando banco de dados...</p>
        </div>
      </div>
    );
  }

  const getAdminModuleName = (tab: string) => {
    switch (tab) {
      case 'admin_overview': return 'Painel Executivo & DRE';
      case 'admin_sales': return 'Vendas & Reconciliação Fiscal';
      case 'admin_cash': return 'Caixa & Tesouraria Gerencial';
      case 'admin_stock': return 'Estoque, Lotes & Validades';
      case 'admin_purchases': return 'Compras & Cotações com Fornecedores';
      case 'admin_staff': return 'Gestão de Equipe & Metas da Loja';
      case 'admin_ai': return 'Relatórios de Inteligência Artificial Gemini';
      case 'admin_import': return 'Importação de Planilhas (CSV/XLS)';
      case 'admin_tasks': return 'Tarefas & Auditoria de Sistema';
      default: return 'Módulo Administrativo';
    }
  };

  const isAdmin = currentUser?.role === 'admin';
  const pendingApprovalsCount = approvals.filter((a) => a.status === 'pendente').length;

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 flex flex-col font-sans antialiased">
      {/* Compact Header */}
      <Navbar
        currentUser={currentUser}
        currentStore={store}
        activeTab={activeTab}
        activeModuleTitle={MODULE_TITLES[activeTab] || 'FarmaVida'}
        activeShiftStatus={activeShiftStatus}
        onToggleShift={activeShift ? () => setActiveTab('meu_turno') : handleStartShift}
        onSwitchUser={handleSwitchUser}
        availableUsers={users}
        isOnline={isOnline}
        onRefreshData={refreshAllData}
        isRefreshing={isRefreshing}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={handleToggleSidebar}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
        pendingApprovalsCount={pendingApprovalsCount}
        onNavigateToApprovals={() => setActiveTab('admin_approvals')}
        terminals={terminals}
        currentTerminalId={currentTerminalId}
        onSelectTerminal={(tId) => {
          setCurrentTerminalId(tId);
          try {
            localStorage.setItem('farmavida_current_terminal_id', tId);
          } catch {}
        }}
        onOpenSwitchOperatorModal={() => setIsOperatorSwitchModalOpen(true)}
        activeCashRegister={activeCashRegister}
      />

      {/* Main Workspace Layout with Collapsible Sidebar */}
      <div className="flex-1 flex overflow-hidden min-h-[calc(100vh-3.5rem)]">
        <Sidebar
          currentUser={currentUser}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          unmetDemandsCount={unmetDemands.filter((d) => !d.resolved).length}
          pendingOrdersCount={purchaseOrders.filter((p) => p.status === 'rascunho' || p.status === 'aprovado').length}
          pendingApprovalsCount={pendingApprovalsCount}
          activeCashRegister={activeCashRegister}
          openInventoriesCount={inventories.filter((i) => i.status === 'aberto' || i.status === 'em_contagem' || i.status === 'reaberto').length}
        />

        {/* Content Workspace Area */}
        <main className="flex-1 overflow-y-auto bg-neutral-100 min-w-0 flex flex-col justify-between">
          <div className="p-2 sm:p-4 lg:p-6">
            {/* Operational Modules - Available to all */}
            {activeTab === 'balcao' && (
              <ColaboradorWorkspace
                currentUser={currentUser}
                allProducts={products}
                allUsers={users}
                customers={customers}
                activeCashRegister={activeCashRegister}
                activeShift={activeShift}
                terminalId={currentTerminalId}
                terminals={terminals}
                onOpenSwitchOperatorModal={() => setIsOperatorSwitchModalOpen(true)}
                onSaveSale={handleSaveSale}
                onRegisterDemand={handleRegisterDemand}
                onRegisterCustomer={handleRegisterCustomer}
                onOpenCashModal={() => setActiveTab('meu_caixa')}
                onToggleShift={activeShift ? () => setActiveTab('meu_turno') : handleStartShift}
                onToggleBreak={handleToggleBreak}
                onGoToTurno={() => setActiveTab('meu_turno')}
                onGoToCaixa={() => setActiveTab('meu_caixa')}
              />
            )}

            {activeTab === 'meu_caixa' && (
              <MeuCaixaView
                currentUser={currentUser}
                activeShift={activeShift}
                activeCashRegister={activeCashRegister}
                cashHistory={cashRegisters}
                sales={sales}
                store={store}
                terminalId={currentTerminalId}
                terminals={terminals}
                onOpenSwitchOperatorModal={() => setIsOperatorSwitchModalOpen(true)}
                onOpenCash={handleOpenCash}
                onAddMovement={handleAddCashMovement}
                onCloseCash={handleCloseCash}
                onGoToTurno={() => setActiveTab('meu_turno')}
                onGoToBalcao={() => setActiveTab('balcao')}
              />
            )}

            {activeTab === 'meu_turno' && (
              <MeuTurnoView
                currentUser={currentUser}
                activeShift={activeShift}
                activeCashRegister={activeCashRegister}
                cashRegisters={cashRegisters}
                allShifts={workShifts}
                onStartShift={handleStartShift}
                onToggleBreak={handleToggleBreak}
                onEndShift={handleEndShift}
                onGoToCash={() => setActiveTab('meu_caixa')}
                onGoToBalcao={() => setActiveTab('balcao')}
              />
            )}

            {activeTab === 'receber_mercadoria' && (
              <RecebimentoMercadoriaView
                purchaseOrders={purchaseOrders}
                products={products}
                currentUser={currentUser}
                onReceiveOrder={handleReceiveOrder}
                onGoToBalcao={() => setActiveTab('balcao')}
              />
            )}

            {activeTab === 'contagem_estoque' && (
              <ContagemEstoqueView
                inventories={inventories}
                currentUser={currentUser}
                onSaveCount={handleSaveInventoryCount}
                onCompleteCount={handleCompleteInventoryCount}
                onGoToBalcao={() => setActiveTab('balcao')}
                onRefreshData={refreshAllData}
              />
            )}

            {activeTab === 'colab_metas' && (
              <ColaboradorMetas
                currentUser={currentUser}
                sales={sales}
                salesGoals={salesGoals}
                onNavigateToBalcao={() => setActiveTab('balcao')}
              />
            )}

            {activeTab === 'admin_demands' && (
              <AdminDemands
                unmetDemands={unmetDemands}
                currentUser={currentUser}
                onResolveDemand={handleResolveDemand}
                onNavigateToPurchases={() => setActiveTab('admin_purchases')}
              />
            )}

            {/* Administrative Modules - Protected by Role Separation */}
            {activeTab === 'admin_overview' && (
              isAdmin ? (
                <AdminOverview
                  sales={sales}
                  products={products}
                  cashRegisters={cashRegisters}
                  unmetDemands={unmetDemands}
                  purchaseOrders={purchaseOrders}
                  latestAiReport={aiReports[0] || null}
                  onNavigateTab={setActiveTab}
                  onRunAiAnalysis={handleRunAiAnalysis}
                  isAnalyzing={isAnalyzingAi}
                />
              ) : (
                <RestrictedAccessView
                  currentUser={currentUser}
                  moduleName={getAdminModuleName(activeTab)}
                  onNavigateToBalcao={() => setActiveTab('balcao')}
                  onNavigateToTurno={() => setActiveTab('meu_turno')}
                  onSwitchToAdmin={() => {
                    const adminUser = users.find((u) => u.role === 'admin');
                    if (adminUser) setCurrentUser(adminUser);
                  }}
                />
              )
            )}

            {activeTab === 'admin_sales' && (
              isAdmin ? (
                <AdminSales
                  sales={sales}
                  users={users}
                  currentUser={currentUser}
                  onReconcileFiscal={handleReconcileFiscal}
                  onCancelSale={handleCancelSale}
                />
              ) : (
                <RestrictedAccessView
                  currentUser={currentUser}
                  moduleName={getAdminModuleName(activeTab)}
                  onNavigateToBalcao={() => setActiveTab('balcao')}
                  onNavigateToTurno={() => setActiveTab('meu_turno')}
                  onSwitchToAdmin={() => {
                    const adminUser = users.find((u) => u.role === 'admin');
                    if (adminUser) setCurrentUser(adminUser);
                  }}
                />
              )
            )}

            {activeTab === 'admin_cash' && (
              isAdmin ? (
                <AdminCash
                  currentUser={currentUser}
                  activeCashRegister={activeCashRegister}
                  cashHistory={cashRegisters}
                  sales={sales}
                  onOpenCash={async (terminalName, openingAmount, notes) => {
                    const res = await handleOpenCash(terminalName, openingAmount, notes);
                    return res.success;
                  }}
                  onAddCashMovement={async (type, amount, reason) => {
                    const res = await handleAddCashMovement(type, amount, reason);
                    return res.success;
                  }}
                  onCloseCash={async (countedAmount, notes) => {
                    const res = await handleCloseCash(countedAmount, notes);
                    return res.success;
                  }}
                  onReconcileCashRegister={handleReconcileCashRegister}
                />
              ) : (
                <RestrictedAccessView
                  currentUser={currentUser}
                  moduleName={getAdminModuleName(activeTab)}
                  onNavigateToBalcao={() => setActiveTab('balcao')}
                  onNavigateToTurno={() => setActiveTab('meu_turno')}
                  onSwitchToAdmin={() => {
                    const adminUser = users.find((u) => u.role === 'admin');
                    if (adminUser) setCurrentUser(adminUser);
                  }}
                />
              )
            )}

            {activeTab === 'admin_stock' && (
              isAdmin ? (
                <AdminStock
                  products={products}
                  stockMovements={stockMovements}
                  inventories={inventories}
                  users={users}
                  currentUser={currentUser}
                  onSaveProduct={handleSaveProduct}
                  onAdjustStock={handleAdjustStock}
                  onCreateInventory={handleCreateInventory}
                  onApproveInventory={handleApproveInventory}
                  onRejectInventory={handleRejectInventory}
                  onReopenInventory={handleReopenInventory}
                  onCancelInventory={handleCancelInventory}
                  onRefreshData={refreshAllData}
                />
              ) : (
                <RestrictedAccessView
                  currentUser={currentUser}
                  moduleName={getAdminModuleName(activeTab)}
                  onNavigateToBalcao={() => setActiveTab('balcao')}
                  onNavigateToTurno={() => setActiveTab('meu_turno')}
                  onSwitchToAdmin={() => {
                    const adminUser = users.find((u) => u.role === 'admin');
                    if (adminUser) setCurrentUser(adminUser);
                  }}
                />
              )
            )}

            {activeTab === 'admin_purchases' && (
              isAdmin ? (
                <AdminPurchases
                  purchaseOrders={purchaseOrders}
                  suppliers={suppliers}
                  products={products}
                  unmetDemands={unmetDemands}
                  currentUser={currentUser}
                  onCreatePurchaseOrder={handleCreatePurchaseOrder}
                  onApproveOrder={handleApproveOrder}
                  onReceiveOrder={handleReceiveOrder}
                />
              ) : (
                <RestrictedAccessView
                  currentUser={currentUser}
                  moduleName={getAdminModuleName(activeTab)}
                  onNavigateToBalcao={() => setActiveTab('balcao')}
                  onNavigateToTurno={() => setActiveTab('meu_turno')}
                  onSwitchToAdmin={() => {
                    const adminUser = users.find((u) => u.role === 'admin');
                    if (adminUser) setCurrentUser(adminUser);
                  }}
                />
              )
            )}

            {activeTab === 'admin_staff' && (
              isAdmin ? (
                <AdminStaff
                  users={users}
                  workShifts={workShifts}
                  sales={sales}
                  salesGoals={salesGoals}
                  onSaveGoal={handleSaveGoal}
                />
              ) : (
                <RestrictedAccessView
                  currentUser={currentUser}
                  moduleName={getAdminModuleName(activeTab)}
                  onNavigateToBalcao={() => setActiveTab('balcao')}
                  onNavigateToTurno={() => setActiveTab('meu_turno')}
                  onSwitchToAdmin={() => {
                    const adminUser = users.find((u) => u.role === 'admin');
                    if (adminUser) setCurrentUser(adminUser);
                  }}
                />
              )
            )}

            {activeTab === 'admin_ai' && (
              isAdmin ? (
                <AdminAIReports
                  reports={aiReports}
                  currentUser={currentUser}
                  isAnalyzing={isAnalyzingAi}
                  onRunAiAnalysis={handleRunAiAnalysis}
                  onCreateTaskFromRecommendation={handleCreateTaskFromAi}
                />
              ) : (
                <RestrictedAccessView
                  currentUser={currentUser}
                  moduleName={getAdminModuleName(activeTab)}
                  onNavigateToBalcao={() => setActiveTab('balcao')}
                  onNavigateToTurno={() => setActiveTab('meu_turno')}
                  onSwitchToAdmin={() => {
                    const adminUser = users.find((u) => u.role === 'admin');
                    if (adminUser) setCurrentUser(adminUser);
                  }}
                />
              )
            )}

            {activeTab === 'admin_import' && (
              isAdmin ? (
                <AdminImport
                  existingProducts={products}
                  onImportProducts={handleImportProducts}
                />
              ) : (
                <RestrictedAccessView
                  currentUser={currentUser}
                  moduleName={getAdminModuleName(activeTab)}
                  onNavigateToBalcao={() => setActiveTab('balcao')}
                  onNavigateToTurno={() => setActiveTab('meu_turno')}
                  onSwitchToAdmin={() => {
                    const adminUser = users.find((u) => u.role === 'admin');
                    if (adminUser) setCurrentUser(adminUser);
                  }}
                />
              )
            )}

            {activeTab === 'admin_tasks' && (
              isAdmin ? (
                <AdminTasksAndAudit
                  tasks={tasks}
                  auditLogs={auditLogs}
                  currentUser={currentUser}
                  users={users}
                  onSaveTask={handleSaveTask}
                  onToggleTaskStatus={handleToggleTaskStatus}
                />
              ) : (
                <RestrictedAccessView
                  currentUser={currentUser}
                  moduleName={getAdminModuleName(activeTab)}
                  onNavigateToBalcao={() => setActiveTab('balcao')}
                  onNavigateToTurno={() => setActiveTab('meu_turno')}
                  onSwitchToAdmin={() => {
                    const adminUser = users.find((u) => u.role === 'admin');
                    if (adminUser) setCurrentUser(adminUser);
                  }}
                />
              )
            )}

            {activeTab === 'admin_approvals' && (
              isAdmin ? (
                <AdminApprovals
                  currentUser={currentUser}
                  approvals={approvals}
                  onRefresh={refreshAllData}
                />
              ) : (
                <RestrictedAccessView
                  currentUser={currentUser}
                  moduleName="Central de Aprovações"
                  onNavigateToBalcao={() => setActiveTab('balcao')}
                  onNavigateToTurno={() => setActiveTab('meu_turno')}
                  onSwitchToAdmin={() => {
                    const adminUser = users.find((u) => u.role === 'admin');
                    if (adminUser) setCurrentUser(adminUser);
                  }}
                />
              )
            )}

            {activeTab === 'admin_settings' && (
              isAdmin ? (
                <AdminSettings
                  currentUser={currentUser}
                  store={store}
                  users={users}
                  onRefresh={refreshAllData}
                />
              ) : (
                <RestrictedAccessView
                  currentUser={currentUser}
                  moduleName="Configurações Gerais"
                  onNavigateToBalcao={() => setActiveTab('balcao')}
                  onNavigateToTurno={() => setActiveTab('meu_turno')}
                  onSwitchToAdmin={() => {
                    const adminUser = users.find((u) => u.role === 'admin');
                    if (adminUser) setCurrentUser(adminUser);
                  }}
                />
              )
            )}
          </div>

          {/* Footer info */}
          <footer className="bg-white border-t border-neutral-200 py-2.5 px-4 text-xs text-neutral-500 mt-auto">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <strong>FarmaVida</strong> • {isAdmin ? 'Perfil Gerencial Completo' : 'Perfil Operacional de Balcão'}
              </span>
              <span className="text-neutral-400 text-[11px]">
                Atalhos: pressione <kbd className="px-1 py-0.5 font-mono bg-neutral-100 border border-neutral-300 rounded text-neutral-600">S</kbd> para menu lateral, <kbd className="px-1 py-0.5 font-mono bg-neutral-100 border border-neutral-300 rounded text-neutral-600">?</kbd> para ajuda contextual
              </span>
            </div>
          </footer>
        </main>
      </div>

      {/* Contextual Help Modal */}
      <ContextualHelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        activeTab={activeTab}
        currentUser={currentUser}
      />

      {/* Operator Switch Modal (PIN-based terminal operator change) */}
      <OperatorSwitchModal
        isOpen={isOperatorSwitchModalOpen}
        onClose={() => setIsOperatorSwitchModalOpen(false)}
        currentTerminalId={currentTerminalId}
        currentTerminalName={terminals.find((t) => t.id === currentTerminalId)?.name || 'Terminal Balcão 01'}
        currentOperator={currentUser}
        availableUsers={users}
        activeShifts={workShifts}
        activeCashRegister={activeCashRegister}
        onOperatorSwitched={(newOp) => {
          setCurrentUser(newOp);
          refreshAllData();
        }}
      />
    </div>
  );
}
