import React, { useState, useMemo } from 'react';
import { 
  Product, 
  SaleItem, 
  User, 
  Customer, 
  PaymentSplit, 
  PaymentMethod,
  CashRegister,
  WorkShift,
  Terminal
} from '../types';
import { 
  Search, 
  Plus, 
  Trash2, 
  ShoppingCart, 
  CreditCard, 
  Banknote, 
  QrCode, 
  CheckCircle2, 
  AlertTriangle, 
  UserPlus, 
  Clock, 
  Coffee, 
  Flame, 
  Package, 
  Receipt,
  FileQuestion,
  Sparkles,
  ArrowRight,
  Monitor,
  KeyRound
} from 'lucide-react';

interface ColaboradorWorkspaceProps {
  currentUser: User;
  allProducts: Product[];
  allUsers: User[];
  customers: Customer[];
  activeCashRegister: CashRegister | null;
  activeShift: WorkShift | null;
  terminalId?: string;
  terminals?: Terminal[];
  onOpenSwitchOperatorModal?: () => void;
  onSaveSale: (saleData: any) => Promise<{ success: boolean; sale?: any; error?: string }>;
  onRegisterDemand: (demandData: any) => Promise<{ success: boolean; error?: string }>;
  onRegisterCustomer: (customerData: any) => Promise<{ success: boolean; customer?: any; error?: string }>;
  onOpenCashModal: () => void;
  onToggleShift: () => void;
  onToggleBreak: () => void;
  onGoToTurno?: () => void;
  onGoToCaixa?: () => void;
}

export const ColaboradorWorkspace: React.FC<ColaboradorWorkspaceProps> = ({
  currentUser,
  allProducts,
  allUsers,
  customers,
  activeCashRegister,
  activeShift,
  terminalId,
  terminals,
  onOpenSwitchOperatorModal,
  onSaveSale,
  onRegisterDemand,
  onRegisterCustomer,
  onOpenCashModal,
  onToggleShift,
  onToggleBreak,
  onGoToTurno,
  onGoToCaixa,
}) => {
  // Cart state
  const [cartItems, setCartItems] = useState<SaleItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  
  // Sale details
  const [selectedSellerId, setSelectedSellerId] = useState(currentUser.id);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  
  // Payment split state
  const [payments, setPayments] = useState<PaymentSplit[]>([]);
  const [activePaymentMethod, setActivePaymentMethod] = useState<PaymentMethod>('dinheiro');
  const [paymentAmountInput, setPaymentAmountInput] = useState('');
  const [cashTenderedInput, setCashTenderedInput] = useState('');
  const [paymentReferenceInput, setPaymentReferenceInput] = useState('');
  
  // Submission & feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastFinishedSale, setLastFinishedSale] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Demand / Falta quick modal
  const [isDemandModalOpen, setIsDemandModalOpen] = useState(false);
  const [demandProductName, setDemandProductName] = useState('');
  const [demandQuantity, setDemandQuantity] = useState(1);
  const [demandReason, setDemandReason] = useState<'falta_estoque' | 'produto_nao_trabalhado' | 'preco_alto' | 'outro'>('falta_estoque');
  const [demandNotes, setDemandNotes] = useState('');
  const [demandSuccessMsg, setDemandSuccessMsg] = useState('');

  // OP-03: Operational State Evaluation (Authoritative frontend state check)
  const hasActiveShift = Boolean(activeShift && (activeShift.status === 'em_andamento' || activeShift.status === 'pausado'));
  const hasActiveCash = Boolean(activeCashRegister && activeCashRegister.status === 'aberto');

  const pdvOperationalState: 'STATE_A' | 'STATE_B' | 'STATE_C' = !hasActiveShift
    ? 'STATE_A'
    : !hasActiveCash
    ? 'STATE_B'
    : 'STATE_C';

  // Quick Customer modal
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerCpf, setNewCustomerCpf] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  // UX-01: Discount mode per item ('pct' | 'fixed') & Search auto-focus
  const [itemDiscountMode, setItemDiscountMode] = useState<Record<string, 'pct' | 'fixed'>>({});
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Discount Approval Modal State
  const [isDiscountApprovalOpen, setIsDiscountApprovalOpen] = useState(false);
  const [discountApprovalData, setDiscountApprovalData] = useState<{
    discountPercent: number;
    maxAllowed: number;
    error?: string;
  } | null>(null);
  const [discountPinInput, setDiscountPinInput] = useState('');
  const [discountApprovalPendingCode, setDiscountApprovalPendingCode] = useState<string | null>(null);
  const [isAuthorizingDiscount, setIsAuthorizingDiscount] = useState(false);

  // Categories list
  const categories = useMemo(() => {
    const cats = new Set(allProducts.map((p) => p.category));
    return ['Todas', ...Array.from(cats)];
  }, [allProducts]);

  // Filtered products for search
  const filteredProducts = useMemo(() => {
    return allProducts.filter((p) => {
      if (!p.active) return false;
      const matchesCat = selectedCategory === 'Todas' || p.category === selectedCategory;
      const query = searchTerm.toLowerCase();
      const matchesText =
        p.name.toLowerCase().includes(query) ||
        p.code.toLowerCase().includes(query) ||
        (p.ean && p.ean.includes(query)) ||
        (p.presentation && p.presentation.toLowerCase().includes(query));
      return matchesCat && matchesText;
    });
  }, [allProducts, selectedCategory, searchTerm]);

  // Calculations
  const subtotal = useMemo(() => {
    return cartItems.reduce((acc, it) => acc + it.quantity * it.unitPrice, 0);
  }, [cartItems]);

  const totalDiscount = useMemo(() => {
    return cartItems.reduce((acc, it) => acc + it.discountAmount, 0);
  }, [cartItems]);

  const totalToPay = Math.max(0, subtotal - totalDiscount);

  const totalPaymentsApplied = useMemo(() => {
    return payments.reduce((acc, p) => acc + p.amount, 0);
  }, [payments]);

  const remainingBalance = Math.max(0, totalToPay - totalPaymentsApplied);

  // Add product to cart
  const handleAddToCart = (product: Product) => {
    setCartItems((prev) => {
      const existing = prev.find((it) => it.productId === product.id);
      if (existing) {
        return prev.map((it) => {
          if (it.productId === product.id) {
            const nextQty = it.quantity + 1;
            const itemSub = nextQty * it.unitPrice;
            const discAmt = (itemSub * it.discountPercent) / 100;
            return {
              ...it,
              quantity: nextQty,
              discountAmount: discAmt,
              total: itemSub - discAmt,
            };
          }
          return it;
        });
      }
      return [
        ...prev,
        {
          productId: product.id,
          productCode: product.code,
          productName: product.name,
          presentation: product.presentation,
          category: product.category,
          quantity: 1,
          unitPrice: product.salePrice,
          unitCost: product.costPrice,
          discountPercent: 0,
          discountAmount: 0,
          total: product.salePrice,
        },
      ];
    });
  };

  const handleUpdateQuantity = (productId: string, qty: number) => {
    if (qty <= 0) {
      handleRemoveItem(productId);
      return;
    }
    setCartItems((prev) =>
      prev.map((it) => {
        if (it.productId === productId) {
          const itemSub = qty * it.unitPrice;
          const discAmt = (itemSub * it.discountPercent) / 100;
          return {
            ...it,
            quantity: qty,
            discountAmount: discAmt,
            total: itemSub - discAmt,
          };
        }
        return it;
      })
    );
  };

  const handleUpdateDiscount = (productId: string, percent: number) => {
    const safePercent = Math.min(100, Math.max(0, percent));
    setCartItems((prev) =>
      prev.map((it) => {
        if (it.productId === productId) {
          const itemSub = it.quantity * it.unitPrice;
          const discAmt = (itemSub * safePercent) / 100;
          return {
            ...it,
            discountPercent: safePercent,
            discountAmount: discAmt,
            total: itemSub - discAmt,
          };
        }
        return it;
      })
    );
  };

  const handleUpdateDiscountAmount = (productId: string, amount: number) => {
    setCartItems((prev) =>
      prev.map((it) => {
        if (it.productId === productId) {
          const itemSub = it.quantity * it.unitPrice;
          const safeAmt = Math.min(itemSub, Math.max(0, amount));
          const pct = itemSub > 0 ? (safeAmt / itemSub) * 100 : 0;
          return {
            ...it,
            discountPercent: Math.round(pct * 10) / 10,
            discountAmount: safeAmt,
            total: itemSub - safeAmt,
          };
        }
        return it;
      })
    );
  };

  // Auto-focus search input when workspace opens
  React.useEffect(() => {
    if (pdvOperationalState === 'STATE_C') {
      searchInputRef.current?.focus();
    }
  }, [pdvOperationalState]);

  const handleRemoveItem = (productId: string) => {
    setCartItems((prev) => prev.filter((it) => it.productId !== productId));
  };

  // Add split payment
  const handleAddPayment = () => {
    const amount = Number(paymentAmountInput) || remainingBalance;
    if (amount <= 0) return;

    let tendered: number | undefined;
    let change: number | undefined;

    if (activePaymentMethod === 'dinheiro') {
      const t = Number(cashTenderedInput);
      if (t > 0 && t >= amount) {
        tendered = t;
        change = t - amount;
      }
    }

    const newPayment: PaymentSplit = {
      method: activePaymentMethod,
      amount,
      tenderedAmount: tendered,
      changeAmount: change,
      reference: paymentReferenceInput.trim() || undefined,
      confirmed: true,
    };

    setPayments((prev) => [...prev, newPayment]);
    setPaymentAmountInput('');
    setCashTenderedInput('');
    setPaymentReferenceInput('');
  };

  const handleRemovePayment = (index: number) => {
    setPayments((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Finalize Sale
  const handleFinalizeSale = async () => {
    if (isSubmitting) return;
    setErrorMessage(null);

    // Hard block check 1: Active Work Shift (STATE A)
    if (!hasActiveShift) {
      setErrorMessage('Você precisa iniciar seu expediente antes de registrar uma venda.');
      return;
    }

    // Hard block check 2: Active Cash Register (STATE B / STATE D)
    if (!hasActiveCash) {
      setErrorMessage('Seu expediente está ativo, mas você ainda não abriu o caixa.');
      return;
    }

    if (cartItems.length === 0) {
      setErrorMessage('O carrinho está vazio. Adicione pelo menos um produto.');
      return;
    }

    if (Math.abs(remainingBalance) > 0.05) {
      setErrorMessage(
        `O total de pagamentos (R$ ${totalPaymentsApplied.toFixed(2)}) não fecha o total devido (R$ ${totalToPay.toFixed(2)}). Falta R$ ${remainingBalance.toFixed(2)}.`
      );
      return;
    }

    const seller = allUsers.find((u) => u.id === selectedSellerId) || currentUser;
    const customer = customers.find((c) => c.id === selectedCustomerId);

    const idempotencyKey = `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    setIsSubmitting(true);
    try {
      const res: any = await onSaveSale({
        idempotencyKey,
        terminalId: terminalId || activeCashRegister?.terminalId || 'terminal_01',
        sellerId: seller.id,
        sellerName: seller.name,
        operatorId: currentUser.id,
        operatorName: currentUser.name,
        cashRegisterId: activeCashRegister ? activeCashRegister.id : undefined,
        customerName: customer ? customer.name : undefined,
        items: cartItems,
        subtotal,
        totalDiscount,
        total: totalToPay,
        payments,
      });

      if (res.success) {
        setLastFinishedSale(res.sale);
        setCartItems([]);
        setPayments([]);
        setSelectedCustomerId('');
      } else if (res.requiresApproval || (res.error && res.error.includes('alçada permitida'))) {
        setDiscountApprovalData({
          discountPercent: res.discountPercent || (subtotal > 0 ? (totalDiscount / subtotal) * 100 : 0),
          maxAllowed: res.maxAllowed || 10,
          error: res.error,
        });
        setDiscountPinInput('');
        setDiscountApprovalPendingCode(null);
        setIsDiscountApprovalOpen(true);
      } else {
        setErrorMessage(res.error || 'Erro ao registrar venda.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao comunicar com o servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAuthorizeDiscountWithPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discountPinInput.trim() || isAuthorizingDiscount) return;

    setIsAuthorizingDiscount(true);
    setErrorMessage(null);

    const seller = allUsers.find((u) => u.id === selectedSellerId) || currentUser;
    const customer = customers.find((c) => c.id === selectedCustomerId);
    const idempotencyKey = `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
      const res: any = await onSaveSale({
        idempotencyKey,
        sellerId: seller.id,
        sellerName: seller.name,
        operatorId: currentUser.id,
        operatorName: currentUser.name,
        cashRegisterId: activeCashRegister ? activeCashRegister.id : undefined,
        customerName: customer ? customer.name : undefined,
        items: cartItems,
        subtotal,
        totalDiscount,
        total: totalToPay,
        payments,
        adminPin: discountPinInput.trim(),
      });

      if (res.success) {
        setIsDiscountApprovalOpen(false);
        setDiscountPinInput('');
        setDiscountApprovalData(null);
        setLastFinishedSale(res.sale);
        setCartItems([]);
        setPayments([]);
        setSelectedCustomerId('');
      } else {
        alert(res.error || 'PIN gerencial incorreto ou inválido.');
      }
    } catch (err: any) {
      alert(err.message || 'Falha ao validar autorização.');
    } finally {
      setIsAuthorizingDiscount(false);
    }
  };

  const handleCreateDiscountApprovalRequest = async () => {
    if (isAuthorizingDiscount) return;
    setIsAuthorizingDiscount(true);

    try {
      const effPercent = subtotal > 0 ? ((totalDiscount / subtotal) * 100).toFixed(1) : '0';
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'DESCONTO_EXCEDENTE',
          originDomain: 'PDV',
          requesterId: currentUser.id,
          requesterName: currentUser.name,
          title: `Desconto de ${effPercent}% no Balcão (${cartItems.length} itens)`,
          description: `Operador ${currentUser.name} solicitou desconto total de R$ ${totalDiscount.toFixed(2)} (${effPercent}%) em venda de R$ ${subtotal.toFixed(2)}.`,
          proposedPayload: {
            items: cartItems,
            subtotal,
            totalDiscount,
            total: totalToPay,
            discountPercent: Number(effPercent),
          },
          justification: `Desconto de ${effPercent}% solicitado no checkout do balcão pelo operador ${currentUser.name}.`,
        }),
      });

      const data = await res.json();
      if (res.ok && (data.approval || data.code)) {
        setDiscountApprovalPendingCode(data.approval?.code || data.code || 'APP-SOLICITADA');
      } else {
        alert(data.error || 'Erro ao enviar solicitação para a Central de Aprovações.');
      }
    } catch (err: any) {
      alert(err.message || 'Erro de conexão.');
    } finally {
      setIsAuthorizingDiscount(false);
    }
  };

  // Submit quick demand/falta
  const handleSubmitDemand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demandProductName.trim()) return;

    const res = await onRegisterDemand({
      productName: demandProductName.trim(),
      quantityRequested: demandQuantity,
      reason: demandReason,
      attendantId: currentUser.id,
      attendantName: currentUser.name,
      notes: demandNotes.trim() || undefined,
    });

    if (res.success) {
      setDemandSuccessMsg(`Registro de falta de "${demandProductName}" salvo com sucesso!`);
      setDemandProductName('');
      setDemandQuantity(1);
      setDemandNotes('');
      setTimeout(() => {
        setDemandSuccessMsg('');
        setIsDemandModalOpen(false);
      }, 1500);
    }
  };

  // Submit quick customer
  const handleSubmitCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) return;

    const res = await onRegisterCustomer({
      name: newCustomerName.trim(),
      cpf: newCustomerCpf.trim() || undefined,
      phone: newCustomerPhone.trim() || undefined,
    });

    if (res.success && res.customer) {
      setSelectedCustomerId(res.customer.id);
      setIsCustomerModalOpen(false);
      setNewCustomerName('');
      setNewCustomerCpf('');
      setNewCustomerPhone('');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* UX-01: Header & Operational Status */}
      {pdvOperationalState === 'STATE_C' && activeCashRegister ? (
        <div id="pdv-operador-statusbar" className="bg-white border border-neutral-200 rounded-2xl px-5 py-3.5 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            {/* Operador Autenticado */}
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-neutral-500">Operador:</span>
              <strong className="text-neutral-900 font-bold text-sm">{currentUser.name}</strong>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200 font-semibold">
                {currentUser.roleTitle || (currentUser.role === 'admin' ? 'Farmacêutico / Gerência' : 'Balconista')}
              </span>
            </div>

            <div className="hidden sm:block text-neutral-300">|</div>

            {/* Turno */}
            <div className="flex items-center gap-1.5 text-neutral-700">
              <Clock className="w-4 h-4 text-emerald-700" />
              <span>Turno: <strong className="text-emerald-800 font-bold">Em Andamento</strong></span>
            </div>

            <div className="hidden sm:block text-neutral-300">|</div>

            {/* Terminal & Gaveta */}
            <div className="flex items-center gap-1.5 text-neutral-700">
              <Monitor className="w-4 h-4 text-emerald-700" />
              <span>Terminal: <strong className="text-emerald-900 font-bold">{terminals?.find(t => t.id === (terminalId || activeCashRegister.terminalId))?.name || activeCashRegister.terminalName}</strong></span>
            </div>

            <div className="hidden sm:block text-neutral-300">|</div>

            {/* Caixa */}
            <div className="flex items-center gap-1.5 text-neutral-700">
              <Banknote className="w-4 h-4 text-emerald-700" />
              <span>Gaveta: <strong className="text-emerald-800 font-bold">{activeCashRegister.displayCode || 'Sessão Ativa'}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenSwitchOperatorModal && (
              <button
                id="btn-statusbar-trocar-operador"
                type="button"
                onClick={onOpenSwitchOperatorModal}
                className="px-3.5 py-2 bg-neutral-900 hover:bg-black text-white font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Trocar de operador neste terminal com validação segura de PIN"
              >
                <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                <span>Trocar Atendente [PIN]</span>
              </button>
            )}

            <button
              id="btn-statusbar-anotar-demanda"
              type="button"
              onClick={() => setIsDemandModalOpen(true)}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Registrar falta de produto procurado por cliente"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
              <span>Anotar Demanda</span>
            </button>

            {onGoToCaixa && (
              <button
                id="btn-statusbar-meu-caixa"
                type="button"
                onClick={onGoToCaixa}
                className="px-3.5 py-2 border border-neutral-300 hover:bg-neutral-50 text-neutral-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Meu Caixa
              </button>
            )}

            {onGoToTurno && (
              <button
                id="btn-statusbar-meu-turno"
                type="button"
                onClick={onGoToTurno}
                className="px-3.5 py-2 border border-neutral-300 hover:bg-neutral-50 text-neutral-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Meu Turno
              </button>
            )}
          </div>
        </div>
      ) : (
        /* State A or B: Clear, non-alarmist Guided Journey Banner */
        <div className={`p-6 rounded-2xl border-2 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          pdvOperationalState === 'STATE_A' 
            ? 'bg-amber-50/70 border-amber-300' 
            : 'bg-emerald-50/70 border-emerald-300'
        }`}>
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
              pdvOperationalState === 'STATE_A' 
                ? 'bg-amber-600 text-white' 
                : 'bg-emerald-700 text-white'
            }`}>
              {pdvOperationalState === 'STATE_A' ? <Clock className="w-6 h-6" /> : <Banknote className="w-6 h-6" />}
            </div>
            <div>
              <div className={`text-xs font-bold uppercase tracking-wider ${
                pdvOperationalState === 'STATE_A' ? 'text-amber-800' : 'text-emerald-800'
              }`}>
                {pdvOperationalState === 'STATE_A' ? 'Próxima Ação Necessária' : 'Caixa Não Vinculado'}
              </div>
              <h2 className="text-lg sm:text-xl font-black text-neutral-900 mt-0.5">
                {pdvOperationalState === 'STATE_A' 
                  ? 'Inicie seu expediente antes de registrar vendas' 
                  : 'Abra seu terminal de caixa para operar o PDV'}
              </h2>
              <p className="text-xs text-neutral-600 mt-0.5">
                {pdvOperationalState === 'STATE_A'
                  ? 'O registro de ponto inicializa seu turno oficial de trabalho na FarmaVida.'
                  : 'Seu turno está ativo! Falta apenas conferir o fundo de troco e abrir o caixa.'}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            {pdvOperationalState === 'STATE_A' ? (
              <button
                id="btn-pdv-iniciar-turno"
                type="button"
                onClick={onGoToTurno || onToggleShift}
                className="min-h-[46px] px-6 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>INICIAR EXPEDIENTE</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                id="btn-pdv-abrir-caixa"
                type="button"
                onClick={onGoToCaixa || onOpenCashModal}
                className="min-h-[46px] px-6 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>ABRIR MEU CAIXA</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Counter Screen: Left: Search & Products | Right: Cart & Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left column: Product lookup & quick shelf */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-xl border border-neutral-200 shadow-xs p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full">
                <Search className="w-5 h-5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="input-busca-produto-balcao"
                  ref={searchInputRef}
                  type="text"
                  placeholder="Digite o nome do remédio ou bipe o código de barras..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-neutral-50 border-2 border-neutral-200 focus:border-emerald-600 rounded-xl text-base font-medium text-neutral-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white shadow-2xs transition-all"
                  autoFocus
                />
              </div>

              {/* Category filter pills */}
              <div className="w-full sm:w-auto flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                {categories.slice(0, 4).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
                      selectedCategory === cat
                        ? 'bg-emerald-700 text-white font-medium'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Products grid */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
              {filteredProducts.map((p) => {
                const isCriticalStock = p.currentStock <= p.minStock;
                const isOutOfStock = p.currentStock <= 0;

                return (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-lg border border-neutral-200 hover:border-emerald-300 hover:shadow-xs transition-all bg-white flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                          {p.code}
                        </span>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded flex items-center gap-1 ${
                          isOutOfStock 
                            ? 'bg-red-50 text-red-700 border border-red-200' 
                            : isCriticalStock 
                            ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                            : 'bg-neutral-100 text-neutral-700'
                        }`}>
                          {isOutOfStock && <AlertTriangle className="w-3 h-3" />}
                          <span>Saldo: {p.currentStock} {p.unit}</span>
                        </span>
                      </div>

                      <div className="mt-1.5 font-medium text-neutral-900 text-sm line-clamp-1">
                        {p.name}
                      </div>
                      <div className="text-xs text-neutral-500 line-clamp-1">
                        {p.presentation || p.category}
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between">
                      <div className="text-base font-bold text-emerald-800">
                        R$ {(p.salePrice || 0).toFixed(2)}
                      </div>

                      <button
                        onClick={() => handleAddToCart(p)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                          isOutOfStock
                            ? 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
                            : 'bg-emerald-700 text-white hover:bg-emerald-800'
                        }`}
                        disabled={isOutOfStock}
                        title={isOutOfStock ? 'Produto sem saldo em estoque' : 'Adicionar ao carrinho de venda'}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar</span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredProducts.length === 0 && (
                <div className="col-span-2 text-center py-10 text-neutral-400 space-y-2">
                  <Package className="w-8 h-8 mx-auto text-neutral-300" />
                  <p className="text-sm">Nenhum produto encontrado para "{searchTerm}".</p>
                  <button
                    onClick={() => {
                      setDemandProductName(searchTerm);
                      setIsDemandModalOpen(true);
                    }}
                    className="text-xs font-semibold text-emerald-700 hover:underline inline-flex items-center gap-1"
                  >
                    <span>Registrar como procura de cliente no balcão</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column: Active Cart & Split Payment Checkout */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl border border-neutral-200 shadow-xs p-4 flex flex-col justify-between min-h-[580px]">
            {/* Cart Header */}
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-emerald-700" />
                  <h2 className="font-bold text-neutral-900 text-sm">Carrinho de Atendimento</h2>
                  <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    {cartItems.reduce((acc, it) => acc + it.quantity, 0)} itens
                  </span>
                </div>
                {cartItems.length > 0 && (
                  <button
                    onClick={() => setCartItems([])}
                    className="text-xs text-neutral-400 hover:text-red-600 transition-colors"
                  >
                    Limpar
                  </button>
                )}
              </div>

              {/* Attendant & Customer assignment */}
              <div className="grid grid-cols-2 gap-2 my-3 text-xs">
                <div>
                  <label className="block text-neutral-600 font-medium mb-1">Vendedor do Balcão:</label>
                  <select
                    value={selectedSellerId}
                    onChange={(e) => setSelectedSellerId(e.target.value)}
                    className="w-full py-1.5 px-2 bg-neutral-50 border border-neutral-200 rounded text-neutral-800 text-xs focus:ring-1 focus:ring-emerald-500"
                  >
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-neutral-600 font-medium">Cliente (Opcional):</label>
                    <button
                      type="button"
                      onClick={() => setIsCustomerModalOpen(true)}
                      className="text-emerald-700 font-semibold hover:underline text-[11px]"
                    >
                      + Novo
                    </button>
                  </div>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full py-1.5 px-2 bg-neutral-50 border border-neutral-200 rounded text-neutral-800 text-xs focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Consumidor Geral / Balcão</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.cpf ? `(${c.cpf.slice(0, 7)}...)` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2.5 max-h-[240px] overflow-y-auto pr-1">
                {cartItems.map((item) => {
                  const currentMode = itemDiscountMode[item.productId] || 'pct';
                  return (
                    <div
                      key={item.productId}
                      className="p-3 rounded-xl bg-neutral-50/80 border border-neutral-200/90 flex flex-col gap-2 text-xs hover:border-neutral-300 transition-colors shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="font-bold text-neutral-900 text-sm">{item.productName}</div>
                          <div className="text-[11px] text-neutral-500 mt-0.5">
                            {item.presentation || item.category} • R$ {item.unitPrice.toFixed(2)}/un
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.productId)}
                          className="text-neutral-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                          title="Remover produto do carrinho"
                          aria-label="Remover item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-1.5 border-t border-neutral-200/60">
                        {/* Quantity buttons - Big & Touch-friendly */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-neutral-500 font-medium text-[11px]">Qtd:</span>
                          <div className="flex items-center border border-neutral-300 rounded-lg bg-white overflow-hidden shadow-2xs">
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1)}
                              className="w-7 h-7 flex items-center justify-center font-bold text-neutral-700 hover:bg-neutral-100 cursor-pointer text-sm"
                              aria-label="Diminuir quantidade"
                            >
                              -
                            </button>
                            <span className="w-8 text-center font-bold text-neutral-900 text-sm">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)}
                              className="w-7 h-7 flex items-center justify-center font-bold text-neutral-700 hover:bg-neutral-100 cursor-pointer text-sm"
                              aria-label="Aumentar quantidade"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Discount input: toggle % or R$ */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setItemDiscountMode((prev) => ({
                                ...prev,
                                [item.productId]: currentMode === 'pct' ? 'fixed' : 'pct',
                              }))
                            }
                            className="px-1.5 py-1 rounded bg-neutral-200 hover:bg-neutral-300 text-[10px] font-bold text-neutral-800 transition-colors cursor-pointer"
                            title="Alternar entre % e R$"
                          >
                            {currentMode === 'pct' ? '%' : 'R$'}
                          </button>

                          {currentMode === 'pct' ? (
                            <input
                              type="number"
                              min="0"
                              max="50"
                              value={item.discountPercent > 0 ? item.discountPercent : ''}
                              onChange={(e) => handleUpdateDiscount(item.productId, Number(e.target.value))}
                              placeholder="0%"
                              className="w-13 px-1.5 py-1 bg-white border border-neutral-300 rounded-lg text-right font-semibold text-neutral-800 text-xs focus:ring-1 focus:ring-emerald-500"
                            />
                          ) : (
                            <input
                              type="number"
                              min="0"
                              step="0.50"
                              value={item.discountAmount > 0 ? item.discountAmount : ''}
                              onChange={(e) => handleUpdateDiscountAmount(item.productId, Number(e.target.value))}
                              placeholder="R$ 0"
                              className="w-16 px-1.5 py-1 bg-white border border-neutral-300 rounded-lg text-right font-semibold text-neutral-800 text-xs focus:ring-1 focus:ring-emerald-500"
                            />
                          )}
                        </div>

                        {/* Item Total */}
                        <div className="text-right">
                          <div className="font-black text-emerald-900 text-sm">
                            R$ {item.total.toFixed(2)}
                          </div>
                          {item.discountAmount > 0 && (
                            <div className="text-[10px] text-amber-700 font-medium">
                              desc. -R$ {item.discountAmount.toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {cartItems.length === 0 && (
                  <div className="text-center py-8 text-neutral-400 space-y-1">
                    <p className="text-xs font-semibold text-neutral-500">O carrinho está vazio.</p>
                    <p className="text-[11px] text-neutral-400">Busque e selecione os produtos ao lado para iniciar o atendimento.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Subtotal & Split Payments Section */}
            <div className="mt-4 pt-3 border-t border-neutral-200 space-y-3">
              {/* Financial summary numbers */}
              <div className="bg-neutral-50/90 p-3.5 rounded-xl border border-neutral-200 space-y-1 text-xs">
                <div className="flex justify-between text-neutral-600">
                  <span className="font-medium">Subtotal da Compra:</span>
                  <span className="font-semibold text-neutral-800">R$ {subtotal.toFixed(2)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-amber-700 font-semibold">
                    <span>Desconto Concedido:</span>
                    <span>- R$ {totalDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline pt-2 border-t border-neutral-200">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-700">Total a Pagar:</span>
                  <span className="text-xl font-black text-emerald-800 tracking-tight">R$ {totalToPay.toFixed(2)}</span>
                </div>
              </div>

              {/* Payments Split Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-neutral-800">
                  <span>Formas de Pagamento</span>
                  <span className={remainingBalance > 0 ? 'text-amber-700 font-bold' : 'text-emerald-700 font-bold'}>
                    {remainingBalance > 0 ? `Restante: R$ ${remainingBalance.toFixed(2)}` : 'Total 100% Liquidado'}
                  </span>
                </div>

                {/* List applied payments */}
                {payments.map((p, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-emerald-50/70 border border-emerald-200 px-3 py-2 rounded-xl text-xs text-neutral-800 shadow-2xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold capitalize text-emerald-900">{p.method.replace('_', ' ')}:</span>
                      <span className="font-black text-neutral-900">R$ {(p.amount || 0).toFixed(2)}</span>
                      {p.tenderedAmount !== undefined && (
                        <span className="text-emerald-700 text-[11px] font-medium">
                          (Entregue R$ {Number(p.tenderedAmount || 0).toFixed(2)} • Troco R$ {(p.changeAmount || 0).toFixed(2)})
                        </span>
                      )}
                      {p.reference && <span className="text-neutral-400 text-[10px]">[{p.reference}]</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePayment(idx)}
                      className="text-neutral-400 hover:text-red-600 p-1 rounded transition-colors cursor-pointer"
                      title="Remover pagamento"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {/* Add Payment Form if remaining balance > 0 */}
                {remainingBalance > 0 && (
                  <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3 text-xs shadow-xs">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                      Selecione a Forma de Pagamento:
                    </div>

                    {/* Botões Grandes dos Meios de Pagamento */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'dinheiro', label: 'DINHEIRO', icon: Banknote },
                        { id: 'pix', label: 'PIX', icon: QrCode },
                        { id: 'cartao_debito', label: 'DÉBITO', icon: CreditCard },
                        { id: 'cartao_credito', label: 'CRÉDITO', icon: CreditCard },
                      ].map((m) => {
                        const Icon = m.icon;
                        const isSelected = activePaymentMethod === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setActivePaymentMethod(m.id as PaymentMethod);
                              setPaymentAmountInput(remainingBalance.toFixed(2));
                            }}
                            className={`min-h-[50px] py-2 px-2 rounded-xl flex flex-col items-center justify-center gap-1 border-2 font-black text-xs transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-500/20'
                                : 'bg-white text-neutral-800 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-100'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                            <span>{m.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Venda em Dinheiro: Troco Sem Confusão */}
                    {activePaymentMethod === 'dinheiro' && (
                      <div className="p-3 bg-white rounded-xl border border-neutral-200 space-y-3">
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs font-bold text-neutral-700">Total a Pagar em Dinheiro:</span>
                          <span className="text-lg font-black text-emerald-800">
                            R$ {(Number(paymentAmountInput) || remainingBalance).toFixed(2)}
                          </span>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-neutral-800 mb-1">
                            Valor Recebido do Cliente:
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-black text-base">
                              R$
                            </span>
                            <input
                              id="input-valor-recebido-dinheiro"
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={cashTenderedInput}
                              onChange={(e) => setCashTenderedInput(e.target.value)}
                              className="w-full pl-10 pr-3 py-2 bg-white border-2 border-emerald-400 focus:border-emerald-600 rounded-xl text-neutral-950 font-black text-lg shadow-2xs focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                            />
                          </div>

                          {/* Botões Rápidos de Valores Recebidos */}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <span className="text-[10px] font-bold text-neutral-500 uppercase self-center mr-1">Rápido:</span>
                            <button
                              type="button"
                              onClick={() => setCashTenderedInput((Number(paymentAmountInput) || remainingBalance).toFixed(2))}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                            >
                              Exato
                            </button>
                            {[10, 20, 50, 100, 200]
                              .filter((v) => v >= (Number(paymentAmountInput) || remainingBalance) || v === 50 || v === 100)
                              .slice(0, 4)
                              .map((val) => (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => setCashTenderedInput(val.toFixed(2))}
                                  className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                                >
                                  R$ {val}
                                </button>
                              ))}
                          </div>
                        </div>

                        {/* Bloco de Troco a Devolver Gigante */}
                        {Number(cashTenderedInput) > (Number(paymentAmountInput) || remainingBalance) && (
                          <div id="troco-destaque-cliente" className="p-3.5 bg-emerald-100 border-2 border-emerald-500 rounded-xl text-emerald-950 flex items-center justify-between shadow-xs">
                            <div>
                              <span className="text-xs font-black uppercase tracking-wider text-emerald-900 block">TROCO A DEVOLVER:</span>
                              <span className="text-[11px] text-emerald-800 font-medium">Entregar ao consumidor</span>
                            </div>
                            <span className="text-2xl sm:text-3xl font-black text-emerald-950 tracking-tight">
                              R$ {(Number(cashTenderedInput) - (Number(paymentAmountInput) || remainingBalance)).toFixed(2)}
                            </span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={handleAddPayment}
                          className="w-full min-h-[42px] bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>CONFIRMAR RECEBIMENTO EM DINHEIRO</span>
                        </button>
                      </div>
                    )}

                    {/* Venda em Pix */}
                    {activePaymentMethod === 'pix' && (
                      <div className="p-3 bg-white rounded-xl border border-neutral-200 space-y-3">
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs font-bold text-neutral-700">Total a Receber no Pix:</span>
                          <span className="text-lg font-black text-teal-800">
                            R$ {(Number(paymentAmountInput) || remainingBalance).toFixed(2)}
                          </span>
                        </div>

                        <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl flex items-center gap-3">
                          <div className="w-12 h-12 bg-teal-600 text-white rounded-lg flex items-center justify-center shrink-0">
                            <QrCode className="w-7 h-7" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-teal-950">Chave Pix da Loja (CNPJ)</div>
                            <div className="text-[11px] text-teal-800 font-mono select-all truncate">
                              12.345.678/0001-90 (FarmaVida)
                            </div>
                            <div className="text-[11px] text-neutral-600 mt-1">
                              Aguarde a confirmação do cliente ou confira o comprovante.
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleAddPayment}
                          className="w-full min-h-[42px] bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>CONFIRMAR RECEBIMENTO PIX</span>
                        </button>
                      </div>
                    )}

                    {/* Venda em Cartão (Débito ou Crédito) */}
                    {(activePaymentMethod === 'cartao_debito' || activePaymentMethod === 'cartao_credito') && (
                      <div className="p-3 bg-white rounded-xl border border-neutral-200 space-y-3">
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs font-bold text-neutral-700">
                            Total a Passar na Maquininha ({activePaymentMethod === 'cartao_debito' ? 'Débito' : 'Crédito'}):
                          </span>
                          <span className="text-lg font-black text-blue-800">
                            R$ {(Number(paymentAmountInput) || remainingBalance).toFixed(2)}
                          </span>
                        </div>

                        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center gap-3">
                          <CreditCard className="w-6 h-6 text-blue-700 shrink-0" />
                          <div className="text-xs text-blue-950 font-medium">
                            Insira ou aproxime o cartão do cliente na maquininha POS e aguarde a impressão do comprovante.
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleAddPayment}
                          className="w-full min-h-[42px] bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>CONFIRMAR TRANSAÇÃO NO CARTÃO</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* OP-03: Operational State Guidance Block */}
              {pdvOperationalState === 'STATE_A' && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg space-y-2">
                  <div className="flex items-start gap-2 text-amber-900 text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                    <div>
                      <p className="font-bold">Expediente Não Iniciado</p>
                      <p className="text-amber-800 mt-0.5">Você precisa iniciar seu expediente antes de registrar uma venda.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onGoToTurno || onToggleShift}
                    className="w-full py-2 bg-amber-700 hover:bg-amber-800 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>INICIAR EXPEDIENTE</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {pdvOperationalState === 'STATE_B' && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg space-y-2">
                  <div className="flex items-start gap-2 text-amber-900 text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                    <div>
                      <p className="font-bold">Caixa Não Aberto</p>
                      <p className="text-amber-800 mt-0.5">Seu expediente está ativo, mas você ainda não abriu o caixa.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onGoToCaixa || onOpenCashModal}
                    className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    <span>ABRIR MEU CAIXA</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {pdvOperationalState === 'STATE_C' && activeCashRegister && (
                <div className="flex items-center justify-between text-[11px] px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    <span className="font-bold tracking-wider">EXPEDIENTE ATIVO</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>CAIXA ABERTO ({activeCashRegister.terminalName})</span>
                  </div>
                </div>
              )}

              {/* Error messages */}
              {errorMessage && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Finalize button */}
              <button
                id="btn-finalizar-venda-balcao"
                type="button"
                onClick={handleFinalizeSale}
                disabled={
                  isSubmitting ||
                  pdvOperationalState !== 'STATE_C' ||
                  cartItems.length === 0 ||
                  Math.abs(remainingBalance) > 0.05
                }
                className={`w-full min-h-[48px] rounded-xl font-black text-sm shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isSubmitting || pdvOperationalState !== 'STATE_C' || cartItems.length === 0 || Math.abs(remainingBalance) > 0.05
                    ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed border border-neutral-300'
                    : 'bg-emerald-700 text-white hover:bg-emerald-800 shadow-md hover:shadow-lg'
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>{isSubmitting ? 'Gravando Venda...' : 'CONFIRMAR VENDA (BALCÃO)'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Finished Sale Modal / Non-Fiscal Receipt Dialog (OP-03) */}
      {lastFinishedSale && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-neutral-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900">Venda Finalizada com Sucesso!</h3>
              <p className="text-xs text-neutral-500">
                Identificador FarmaVida: <strong className="text-neutral-800">{lastFinishedSale.code}</strong>
              </p>
            </div>

            {/* Non-Fiscal Notice Pill */}
            <div className="p-2 bg-neutral-100 border border-neutral-300 rounded text-center text-[11px] text-neutral-600 uppercase font-semibold tracking-wider">
              Recibo Não Fiscal • Controle Operacional Interno
            </div>

            <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-neutral-500">Vendedor:</span>
                <span className="font-semibold text-neutral-800">{lastFinishedSale.sellerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Operador do Caixa:</span>
                <span className="text-neutral-700">{lastFinishedSale.operatorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Terminal de Caixa:</span>
                <span className="font-medium text-neutral-800">{lastFinishedSale.terminal || activeCashRegister?.terminalName || 'Caixa Balcão'}</span>
              </div>
              {lastFinishedSale.customerName && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Cliente:</span>
                  <span className="font-medium text-neutral-800">{lastFinishedSale.customerName}</span>
                </div>
              )}
              
              {/* Itens */}
              {lastFinishedSale.items && lastFinishedSale.items.length > 0 && (
                <div className="pt-2 border-t border-neutral-200 space-y-1">
                  <span className="text-neutral-500 font-medium">Itens da Venda:</span>
                  <div className="max-h-24 overflow-y-auto space-y-0.5 text-[11px] text-neutral-700 pr-1">
                    {lastFinishedSale.items.map((it: any, idx: number) => (
                      <div key={idx} className="flex justify-between">
                        <span className="truncate max-w-[200px]">{it.quantity}x {it.productName || it.name}</span>
                        <span>R$ {(it.quantity * it.unitPrice).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pagamentos */}
              {lastFinishedSale.payments && lastFinishedSale.payments.length > 0 && (
                <div className="pt-2 border-t border-neutral-200 space-y-1">
                  <span className="text-neutral-500 font-medium">Pagamento:</span>
                  <div className="space-y-0.5 text-[11px] text-neutral-700">
                    {lastFinishedSale.payments.map((p: any, idx: number) => (
                      <div key={idx} className="flex justify-between">
                        <span className="capitalize">{p.method.replace('_', ' ')}</span>
                        <span>
                          R$ {p.amount.toFixed(2)}
                          {p.changeAmount ? ` (Troco: R$ ${p.changeAmount.toFixed(2)})` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-2 border-t border-neutral-200">
                <span className="text-neutral-700 font-bold">Total Liquidado:</span>
                <span className="text-sm font-bold text-emerald-800">R$ {lastFinishedSale.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 border border-neutral-300 text-neutral-700 font-semibold rounded-xl hover:bg-neutral-50 text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Receipt className="w-4 h-4 text-neutral-500" />
                <span>Imprimir Recibo Não Fiscal</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setLastFinishedSale(null);
                  setTimeout(() => searchInputRef.current?.focus(), 50);
                }}
                className="flex-1 py-2.5 bg-emerald-700 text-white font-bold rounded-xl hover:bg-emerald-800 text-xs transition-colors cursor-pointer shadow-xs"
              >
                Nova Venda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Anotar Demanda / Falta no Balcão */}
      {isDemandModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-neutral-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-700" />
                <h3 className="font-bold text-neutral-900 text-base">Registrar Procura / Falta no Balcão</h3>
              </div>
              <button
                onClick={() => setIsDemandModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-neutral-500">
              O que o cliente procurou na farmácia e não encontrou? Essa informação alimentará diretamente as sugestões inteligentes de pedidos de compra.
            </p>

            {demandSuccessMsg ? (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{demandSuccessMsg}</span>
              </div>
            ) : (
              <form onSubmit={handleSubmitDemand} className="space-y-3 text-xs">
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">
                    Nome do Produto ou Medicamento Procurado *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Fita Microporosa 25mm, Losartana 50mg, etc..."
                    value={demandProductName}
                    onChange={(e) => setDemandProductName(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-sm text-neutral-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-neutral-700 font-semibold mb-1">Quantidade Solicitada:</label>
                    <input
                      type="number"
                      min="1"
                      value={demandQuantity}
                      onChange={(e) => setDemandQuantity(Math.max(1, Number(e.target.value)))}
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-700 font-semibold mb-1">Motivo da Não Venda:</label>
                    <select
                      value={demandReason}
                      onChange={(e) => setDemandReason(e.target.value as any)}
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900"
                    >
                      <option value="falta_estoque">Falta de Estoque (Item Cadastrado Esgotado)</option>
                      <option value="produto_nao_trabalhado">Produto Não Trabalhado na Loja</option>
                      <option value="preco_alto">Preço Considerado Alto pelo Cliente</option>
                      <option value="outro">Outro Motivo</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">Observação do Balconista (Opcional):</label>
                  <input
                    type="text"
                    placeholder="Ex: Cliente é do posto de saúde vizinho, procura recorrente..."
                    value={demandNotes}
                    onChange={(e) => setDemandNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200">
                  <button
                    type="button"
                    onClick={() => setIsDemandModalOpen(false)}
                    className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700 font-medium hover:bg-neutral-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-700 text-white font-semibold rounded-lg hover:bg-emerald-800"
                  >
                    Salvar Registro de Falta
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: Cadastro Rápido de Cliente */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-neutral-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-700" />
                <h3 className="font-bold text-neutral-900 text-base">Cadastro Rápido de Cliente</h3>
              </div>
              <button onClick={() => setIsCustomerModalOpen(false)} className="text-neutral-400 hover:text-neutral-700">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-700 font-semibold mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Nome do cliente"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-sm text-neutral-900"
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">CPF (Opcional)</label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={newCustomerCpf}
                  onChange={(e) => setNewCustomerCpf(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900"
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">Telefone / WhatsApp (Opcional)</label>
                <input
                  type="text"
                  placeholder="(00) 00000-0000"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700 font-medium hover:bg-neutral-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 text-white font-semibold rounded-lg hover:bg-emerald-800"
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal: Autorização de Desconto Excedente */}
      {isDiscountApprovalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900 text-base">Autorização de Desconto</h3>
                  <p className="text-xs text-neutral-500">Alçada operacional excedida</p>
                </div>
              </div>
              <button
                onClick={() => setIsDiscountApprovalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1.5">
              <div className="flex justify-between items-center font-semibold">
                <span>Desconto Total Solicitado:</span>
                <span className="text-amber-800 font-bold">
                  {discountApprovalData?.discountPercent.toFixed(1)}% (R$ {totalDiscount.toFixed(2)})
                </span>
              </div>
              <div className="flex justify-between items-center text-neutral-600">
                <span>Limite Máximo Sem Autorização:</span>
                <span className="font-semibold">{discountApprovalData?.maxAllowed}%</span>
              </div>
              <p className="text-[11px] text-amber-800 pt-1 border-t border-amber-200/60">
                Vendas com desconto superior a {discountApprovalData?.maxAllowed}% exigem validação de um gerente/administrador por PIN ou via Central de Aprovações.
              </p>
            </div>

            {discountApprovalPendingCode ? (
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h4 className="text-sm font-bold text-emerald-900">Solicitação Enviada!</h4>
                <p className="text-xs text-emerald-700 font-mono font-bold bg-white p-2 rounded border border-emerald-200">
                  Código: {discountApprovalPendingCode}
                </p>
                <p className="text-xs text-neutral-600">
                  A solicitação foi registrada na <strong>Central de Aprovações</strong>. Peça a um gerente para revisar.
                </p>
                <button
                  type="button"
                  onClick={() => setIsDiscountApprovalOpen(false)}
                  className="w-full py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 mt-2"
                >
                  Entendido
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Option 1: PIN gerencial */}
                <form onSubmit={handleAuthorizeDiscountWithPin} className="space-y-3">
                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
                    <label className="block text-xs font-bold text-neutral-800">
                      Opção 1: Digitar PIN do Gerente/Administrador
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        maxLength={8}
                        placeholder="PIN Gerencial (ex: 9999)"
                        value={discountPinInput}
                        onChange={(e) => setDiscountPinInput(e.target.value)}
                        className="flex-1 px-3 py-2 bg-white border border-neutral-300 rounded-lg text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <button
                        type="submit"
                        disabled={!discountPinInput.trim() || isAuthorizingDiscount}
                        className="px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 disabled:opacity-50 transition-colors shadow-xs"
                      >
                        {isAuthorizingDiscount ? 'Validando...' : 'Liberar'}
                      </button>
                    </div>
                  </div>
                </form>

                {/* Option 2: Send to Central de Aprovações */}
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2 text-xs">
                  <div className="font-bold text-neutral-800">
                    Opção 2: Enviar para Central de Aprovações
                  </div>
                  <p className="text-neutral-500 text-[11px]">
                    Gera uma pendência administrativa formal para revisão remota por gestores.
                  </p>
                  <button
                    type="button"
                    onClick={handleCreateDiscountApprovalRequest}
                    disabled={isAuthorizingDiscount}
                    className="w-full py-2 bg-neutral-800 text-white rounded-lg text-xs font-semibold hover:bg-neutral-900 transition-colors"
                  >
                    {isAuthorizingDiscount ? 'Enviando...' : 'Solicitar na Central de Aprovações'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
