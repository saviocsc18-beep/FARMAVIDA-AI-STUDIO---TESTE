import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  Package, 
  Receipt,
  Sparkles,
  ArrowRight,
  Monitor,
  KeyRound,
  Check,
  ScanLine,
  UserCheck,
  Percent,
  CircleDollarSign,
  ChevronRight,
  X
} from 'lucide-react';
import { cn, formatMoney, formatQty, daysUntil } from '../lib/ui';
import { notify } from './ui/feedback';
import { Modal, ConfirmDialog } from './ui/Modal';
import { Button } from './ui/Button';
import { TarjaBadge, ExpiryBadge, Badge } from './ui/Badge';
import { QtyStepper, Chips } from './ui/Field';

export interface ColaboradorWorkspaceProps {
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
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  
  // Sale details
  const [selectedSellerId, setSelectedSellerId] = useState(currentUser.id);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  
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

  // Operational State Evaluation
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

  // Discount mode per item ('pct' | 'fixed') & Search auto-focus
  const [itemDiscountMode, setItemDiscountMode] = useState<Record<string, 'pct' | 'fixed'>>({});
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Filter categories
  const categories = useMemo(() => {
    const defaultChips = ['Todos', 'Genéricos', 'Tarja vermelha', 'Tarja preta', 'Perfumaria', 'Infantil'];
    const customCats = Array.from(new Set(allProducts.map((p) => p.category).filter(Boolean)));
    const merged = Array.from(new Set([...defaultChips, ...customCats]));
    return merged;
  }, [allProducts]);

  // Filtered products for search
  const filteredProducts = useMemo(() => {
    return allProducts.filter((p) => {
      if (!p.active) return false;

      // Filter by category or tarja
      let matchesCat = true;
      if (selectedCategory === 'Todos') {
        matchesCat = true;
      } else if (selectedCategory === 'Genéricos') {
        matchesCat = p.category?.toLowerCase().includes('genérico') || p.name.toLowerCase().includes('genérico') || p.isGeneric === true;
      } else if (selectedCategory === 'Tarja vermelha') {
        matchesCat = p.stripe === 'red' || p.category?.toLowerCase().includes('vermelha');
      } else if (selectedCategory === 'Tarja preta') {
        matchesCat = p.stripe === 'black' || p.category?.toLowerCase().includes('preta') || p.controlled === true;
      } else if (selectedCategory === 'Perfumaria') {
        matchesCat = p.category?.toLowerCase().includes('perfumaria') || p.category?.toLowerCase().includes('cosmético') || p.category?.toLowerCase().includes('dermo');
      } else if (selectedCategory === 'Infantil') {
        matchesCat = p.category?.toLowerCase().includes('infantil') || p.name.toLowerCase().includes('infantil') || p.name.toLowerCase().includes('fralda');
      } else {
        matchesCat = p.category === selectedCategory;
      }

      const query = searchTerm.toLowerCase().trim();
      if (!query) return matchesCat;

      const matchesText =
        p.name.toLowerCase().includes(query) ||
        p.code.toLowerCase().includes(query) ||
        (p.ean && p.ean.includes(query)) ||
        (p.presentation && p.presentation.toLowerCase().includes(query)) ||
        (p.activePrinciple && p.activePrinciple.toLowerCase().includes(query)) ||
        (p.manufacturer && p.manufacturer.toLowerCase().includes(query));

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

  // Auto-focus search input when workspace opens
  useEffect(() => {
    if (pdvOperationalState === 'STATE_C') {
      searchInputRef.current?.focus();
    }
  }, [pdvOperationalState]);

  // Keyboard shortcut F2 to finalize sale
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        if (
          !isSubmitting &&
          pdvOperationalState === 'STATE_C' &&
          cartItems.length > 0 &&
          Math.abs(remainingBalance) <= 0.05
        ) {
          handleFinalizeSale();
        } else if (cartItems.length === 0) {
          notify.aviso('O carrinho está vazio. Adicione produtos para finalizar.');
        } else if (Math.abs(remainingBalance) > 0.05) {
          notify.aviso(`Pagamento pendente: ${formatMoney(remainingBalance)}`);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, pdvOperationalState, cartItems, remainingBalance]);

  // Add product to cart
  const handleAddToCart = (product: Product) => {
    if (product.currentStock <= 0) {
      notify.aviso(`O produto "${product.name}" está sem saldo em estoque.`);
      return;
    }

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

    notify.sucesso(`${product.name} adicionado`);
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
    notify.sucesso(`Pagamento em ${activePaymentMethod.replace('_', ' ')} registrado`);
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
      notify.aviso('Inicie seu expediente antes de vender.');
      return;
    }

    // Hard block check 2: Active Cash Register (STATE B)
    if (!hasActiveCash) {
      setErrorMessage('Seu expediente está ativo, mas você ainda não abriu o caixa.');
      notify.aviso('Abra seu caixa no terminal antes de vender.');
      return;
    }

    if (cartItems.length === 0) {
      setErrorMessage('O carrinho está vazio. Adicione pelo menos um produto.');
      notify.aviso('Carrinho vazio.');
      return;
    }

    if (Math.abs(remainingBalance) > 0.05) {
      const msg = `O total de pagamentos (${formatMoney(totalPaymentsApplied)}) não fecha o total devido (${formatMoney(totalToPay)}). Falta ${formatMoney(remainingBalance)}.`;
      setErrorMessage(msg);
      notify.aviso(msg);
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
        notify.sucesso('Venda finalizada com sucesso!');
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
        notify.erro(res.error || 'Erro ao registrar venda.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao comunicar com o servidor.');
      notify.erro(err.message || 'Falha ao comunicar com o servidor.');
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
        notify.sucesso('Desconto autorizado e venda finalizada!');
      } else {
        notify.erro(res.error || 'PIN gerencial incorreto ou inválido.');
      }
    } catch (err: any) {
      notify.erro(err.message || 'Falha ao validar autorização.');
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
          description: `Operador ${currentUser.name} solicitou desconto total de ${formatMoney(totalDiscount)} (${effPercent}%) em venda de ${formatMoney(subtotal)}.`,
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
        notify.info('Solicitação enviada para a Central de Aprovações');
      } else {
        notify.erro(data.error || 'Erro ao enviar solicitação para a Central de Aprovações.');
      }
    } catch (err: any) {
      notify.erro(err.message || 'Erro de conexão.');
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
      notify.sucesso(`Falta de "${demandProductName}" registrada com sucesso!`);
      setDemandProductName('');
      setDemandQuantity(1);
      setDemandNotes('');
      setIsDemandModalOpen(false);
    } else {
      notify.erro(res.error || 'Erro ao registrar falta.');
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
      notify.sucesso(`Cliente ${res.customer.name} cadastrado e selecionado!`);
    } else {
      notify.erro(res.error || 'Erro ao cadastrar cliente.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-12">
      {/* Status Bar Operacional ou Banner Guiado */}
      {pdvOperationalState === 'STATE_C' && activeCashRegister ? (
        <div id="pdv-operador-statusbar" className="bg-white border border-[#E1E9E4] rounded-2xl px-4 sm:px-5 py-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Operador Autenticado */}
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0E7A53] animate-pulse shrink-0" />
              <span className="text-[#56675E]">Operador:</span>
              <strong className="text-[#13231B] font-bold text-sm">{currentUser.name}</strong>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#E6F4EC] text-[#0B6445] border border-[#C2E4D2] font-semibold">
                {currentUser.roleTitle || (currentUser.role === 'admin' ? 'Farmacêutico / Gerência' : 'Balconista')}
              </span>
            </div>

            <div className="hidden sm:block text-[#E1E9E4]">|</div>

            {/* Turno */}
            <div className="flex items-center gap-1.5 text-[#56675E]">
              <Clock className="w-4 h-4 text-[#0E7A53]" />
              <span>Turno: <strong className="text-[#0B6445] font-bold">Em Andamento</strong></span>
            </div>

            <div className="hidden sm:block text-[#E1E9E4]">|</div>

            {/* Terminal & Gaveta */}
            <div className="flex items-center gap-1.5 text-[#56675E]">
              <Monitor className="w-4 h-4 text-[#0E7A53]" />
              <span>Terminal: <strong className="text-[#13231B] font-bold">{terminals?.find(t => t.id === (terminalId || activeCashRegister.terminalId))?.name || activeCashRegister.terminalName}</strong></span>
            </div>

            <div className="hidden sm:block text-[#E1E9E4]">|</div>

            {/* Caixa */}
            <div className="flex items-center gap-1.5 text-[#56675E]">
              <Banknote className="w-4 h-4 text-[#0E7A53]" />
              <span>Gaveta: <strong className="text-[#0B6445] font-bold">{activeCashRegister.displayCode || 'Sessão Ativa'}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenSwitchOperatorModal && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onOpenSwitchOperatorModal}
                icon={KeyRound}
                title="Trocar de operador neste terminal com validação segura de PIN"
              >
                Trocar Atendente
              </Button>
            )}

            <Button
              variant="soft"
              size="sm"
              onClick={() => setIsDemandModalOpen(true)}
              icon={Sparkles}
              title="Registrar falta de produto procurado por cliente"
            >
              Anotar Demanda
            </Button>

            {onGoToCaixa && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onGoToCaixa}
              >
                Meu Caixa
              </Button>
            )}

            {onGoToTurno && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onGoToTurno}
              >
                Meu Turno
              </Button>
            )}
          </div>
        </div>
      ) : (
        /* State A or B: Guided Journey Banner */
        <div className={cn(
          "p-5 sm:p-6 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs",
          pdvOperationalState === 'STATE_A' 
            ? 'bg-[#FFF4E0] border-[#FFE1A8]' 
            : 'bg-[#E6F4EC] border-[#C2E4D2]'
        )}>
          <div className="flex items-center gap-3.5">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-xs",
              pdvOperationalState === 'STATE_A' 
                ? 'bg-[#D98A0B] text-white' 
                : 'bg-[#0E7A53] text-white'
            )}>
              {pdvOperationalState === 'STATE_A' ? <Clock className="w-6 h-6" /> : <Banknote className="w-6 h-6" />}
            </div>
            <div>
              <div className={cn(
                "text-xs font-bold uppercase tracking-wider",
                pdvOperationalState === 'STATE_A' ? 'text-[#8A5300]' : 'text-[#0B6445]'
              )}>
                {pdvOperationalState === 'STATE_A' ? 'Próxima Ação Necessária' : 'Caixa Não Vinculado'}
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-[#13231B] mt-0.5">
                {pdvOperationalState === 'STATE_A' 
                  ? 'Inicie seu expediente antes de registrar vendas' 
                  : 'Abra seu terminal de caixa para operar o PDV'}
              </h2>
              <p className="text-xs text-[#56675E] mt-0.5">
                {pdvOperationalState === 'STATE_A'
                  ? 'O registro de ponto inicializa seu turno oficial de trabalho na FarmaVida.'
                  : 'Seu turno está ativo! Falta apenas conferir o fundo de troco e abrir o caixa.'}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            {pdvOperationalState === 'STATE_A' ? (
              <Button
                variant="primary"
                size="lg"
                onClick={onGoToTurno || onToggleShift}
                icon={ArrowRight}
                iconPosition="right"
              >
                INICIAR EXPEDIENTE
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                onClick={onGoToCaixa || onOpenCashModal}
                icon={ArrowRight}
                iconPosition="right"
              >
                ABRIR MEU CAIXA
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Main Counter Screen (Página 4 do PDF) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Column: Product Search, Filter Chips & Product Cards */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl border border-[#E1E9E4] shadow-2xs p-4 sm:p-5 space-y-4">
            
            {/* Big Search Input (56px com Leitor Ativo) */}
            <div className="relative">
              <Search className="w-5 h-5 text-[#84968D] absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                id="input-busca-produto-balcao"
                ref={searchInputRef}
                type="text"
                placeholder="Buscar por nome, princípio ativo ou código de barras..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-14 pl-12 pr-32 bg-[#F3F7F4] border-2 border-[#E1E9E4] focus:border-[#0E7A53] focus:bg-white rounded-[14px] text-base font-semibold text-[#13231B] placeholder:text-[#84968D] focus:outline-hidden transition-all"
                autoFocus
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#CFDAD3] rounded-lg text-xs font-bold text-[#56675E] select-none">
                <ScanLine className="w-3.5 h-3.5 text-[#0E7A53]" />
                <span>Leitor ativo</span>
              </div>
            </div>

            {/* Chips de Categorias Rápidas */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer select-none",
                      isSelected
                        ? "bg-[#0E7A53] text-white shadow-2xs"
                        : "bg-[#F3F7F4] text-[#56675E] hover:bg-[#E1E9E4] hover:text-[#13231B]"
                    )}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Contador de Resultados */}
            <div className="text-xs text-[#56675E] font-medium flex items-center justify-between px-1">
              <span>
                {filteredProducts.length} {filteredProducts.length === 1 ? 'resultado' : 'resultados'}
                {searchTerm ? ` para "${searchTerm}"` : ''} • ordenado por mais vendidos
              </span>
            </div>

            {/* Lista / Grid de Produtos Formatados (Estilo Página 4 do PDF) */}
            <div className="grid grid-cols-1 gap-2.5 max-h-[520px] overflow-y-auto pr-1">
              {filteredProducts.map((p) => {
                const isCriticalStock = p.currentStock <= p.minStock && p.currentStock > 0;
                const isOutOfStock = p.currentStock <= 0;
                const expDays = daysUntil(p.expiryDate);

                return (
                  <div
                    key={p.id}
                    className="p-3.5 sm:p-4 rounded-xl border border-[#E1E9E4] hover:border-[#C2E4D2] hover:bg-[#F0F9F4]/40 transition-all bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                  >
                    {/* Informações do Medicamento */}
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <h3 className="font-bold text-[#13231B] text-sm sm:text-base leading-snug truncate">
                          {p.name}
                        </h3>
                      </div>

                      <div className="text-xs text-[#56675E] flex flex-wrap items-center gap-1.5">
                        {p.presentation && <span>{p.presentation}</span>}
                        {p.manufacturer && (
                          <>
                            <span>•</span>
                            <span className="font-semibold">{p.manufacturer}</span>
                          </>
                        )}
                        {p.activePrinciple && (
                          <>
                            <span>•</span>
                            <span className="italic">{p.activePrinciple}</span>
                          </>
                        )}
                      </div>

                      {/* Selos de Classificação & Tarja */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <TarjaBadge stripe={p.stripe} controlled={p.controlled} isGeneric={p.isGeneric} />
                        
                        {p.isGeneric && (
                          <span className="text-xs px-2 py-0.5 rounded-md font-bold bg-[#F3F7F4] text-[#56675E] border border-[#E1E9E4]">
                            Genérico
                          </span>
                        )}

                        {expDays <= 90 && p.expiryDate && (
                          <ExpiryBadge date={p.expiryDate} />
                        )}

                        {isCriticalStock && (
                          <Badge variant="warn">Estoque baixo</Badge>
                        )}
                      </div>
                    </div>

                    {/* Preço e Botão Adicionar */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#F3F7F4]">
                      <div className="text-left sm:text-right">
                        <div className="text-xs text-[#56675E] font-medium">
                          {isOutOfStock ? (
                            <span className="text-[#A8261B] font-bold">Sem estoque</span>
                          ) : (
                            <span>{p.currentStock} em estoque</span>
                          )}
                        </div>
                        <div className="text-lg sm:text-xl font-extrabold text-[#13231B] tabular">
                          {formatMoney(p.salePrice)}
                        </div>
                      </div>

                      <Button
                        variant={isOutOfStock ? "secondary" : "primary"}
                        size="md"
                        onClick={() => handleAddToCart(p)}
                        disabled={isOutOfStock}
                        icon={Plus}
                        className={isOutOfStock ? "opacity-50 cursor-not-allowed" : ""}
                        title={isOutOfStock ? 'Produto sem saldo em estoque' : 'Adicionar ao carrinho de venda'}
                      >
                        Adicionar
                      </Button>
                    </div>
                  </div>
                );
              })}

              {filteredProducts.length === 0 && (
                <div className="text-center py-12 px-4 bg-[#F3F7F4] rounded-2xl border border-dashed border-[#CFDAD3] space-y-3">
                  <Package className="w-10 h-10 mx-auto text-[#84968D]" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-[#13231B]">Nenhum produto encontrado</p>
                    <p className="text-xs text-[#56675E]">Não encontramos resultados para "{searchTerm}".</p>
                  </div>
                  <Button
                    variant="soft"
                    size="sm"
                    onClick={() => {
                      setDemandProductName(searchTerm);
                      setIsDemandModalOpen(true);
                    }}
                    icon={Sparkles}
                  >
                    Registrar falta de produto procurado
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Checkout, Venda Atual & Pagamentos (Página 4 do PDF) */}
        <div className="lg:col-span-5 xl:col-span-5 space-y-4">
          <div className="bg-white rounded-[20px] border border-[#E1E9E4] shadow-sm p-4 sm:p-5 flex flex-col justify-between min-h-[620px]">
            
            {/* Top: Header do Carrinho */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-[#E1E9E4]">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-[#0E7A53]" />
                  <h2 className="font-extrabold text-base text-[#13231B]">Venda atual</h2>
                  <span className="text-xs font-bold bg-[#E6F4EC] text-[#0B6445] px-2.5 py-0.5 rounded-full tabular">
                    {cartItems.reduce((acc, it) => acc + it.quantity, 0)} {cartItems.reduce((acc, it) => acc + it.quantity, 0) === 1 ? 'item' : 'itens'}
                  </span>
                </div>
                {cartItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCartItems([])}
                    className="text-xs text-[#84968D] hover:text-[#A8261B] transition-colors font-semibold cursor-pointer"
                  >
                    Limpar carrinho
                  </button>
                )}
              </div>

              {/* Vendedor & Cliente com Ação Destacada */}
              <div className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-[#56675E] mb-1">Vendedor:</label>
                    <select
                      value={selectedSellerId}
                      onChange={(e) => setSelectedSellerId(e.target.value)}
                      className="w-full h-10 px-3 bg-[#F3F7F4] border border-[#CFDAD3] rounded-xl text-xs font-bold text-[#13231B] focus:border-[#0E7A53] focus:bg-white outline-hidden cursor-pointer"
                    >
                      {allUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#56675E] mb-1">Cliente:</label>
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="w-full h-10 px-3 bg-[#F3F7F4] border border-[#CFDAD3] rounded-xl text-xs font-bold text-[#13231B] focus:border-[#0E7A53] focus:bg-white outline-hidden cursor-pointer"
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

                {/* Cadastrar Cliente Destacado */}
                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <div className="text-xs text-[#56675E] truncate">
                    {selectedCustomerId ? (
                      <span className="text-[#0B6445] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#0E7A53] shrink-0" />
                        <span className="truncate">{customers.find((c) => c.id === selectedCustomerId)?.name}</span>
                      </span>
                    ) : (
                      <span>Balcão (sem CPF vinculado)</span>
                    )}
                  </div>

                  <Button
                    variant="soft"
                    size="sm"
                    onClick={() => setIsCustomerModalOpen(true)}
                    icon={UserPlus}
                    title="Cadastrar novo cliente mantendo todos os itens da venda"
                  >
                    Cadastrar Cliente
                  </Button>
                </div>
              </div>

              {/* Lista de Itens no Carrinho */}
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {cartItems.map((item) => {
                  const currentMode = itemDiscountMode[item.productId] || 'pct';
                  return (
                    <div
                      key={item.productId}
                      className="p-3 rounded-xl bg-[#F3F7F4]/80 border border-[#E1E9E4] flex flex-col gap-2 text-xs hover:border-[#CFDAD3] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-[#13231B] text-sm truncate">{item.productName}</div>
                          <div className="text-xs text-[#56675E] mt-0.5">
                            {formatMoney(item.unitPrice)} un.
                            {item.discountPercent > 0 && (
                              <span className="ml-1 text-[#8A5300] font-semibold">
                                • desc. {item.discountPercent}%
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-extrabold text-[#13231B] text-sm tabular">
                            {formatMoney(item.total)}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.productId)}
                            className="text-[#84968D] hover:text-[#A8261B] p-1 transition-colors cursor-pointer mt-0.5"
                            title="Remover produto do carrinho"
                            aria-label="Remover item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Controles de Quantidade e Desconto */}
                      <div className="flex items-center justify-between pt-1.5 border-t border-[#E1E9E4]">
                        <QtyStepper
                          value={item.quantity}
                          onChange={(next) => handleUpdateQuantity(item.productId, next)}
                          min={1}
                          max={999}
                        />

                        {/* Toggle de Desconto % ou R$ */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setItemDiscountMode((prev) => ({
                                ...prev,
                                [item.productId]: currentMode === 'pct' ? 'fixed' : 'pct',
                              }))
                            }
                            className="px-1.5 py-1 rounded bg-[#E1E9E4] hover:bg-[#CFDAD3] text-xs font-bold text-[#13231B] transition-colors cursor-pointer"
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
                              className="w-14 h-8 px-2 bg-white border border-[#CFDAD3] rounded-lg text-right font-bold text-[#13231B] text-xs focus:border-[#0E7A53] outline-hidden"
                            />
                          ) : (
                            <input
                              type="number"
                              min="0"
                              step="0.50"
                              value={item.discountAmount > 0 ? item.discountAmount : ''}
                              onChange={(e) => handleUpdateDiscountAmount(item.productId, Number(e.target.value))}
                              placeholder="R$ 0"
                              className="w-16 h-8 px-2 bg-white border border-[#CFDAD3] rounded-lg text-right font-bold text-[#13231B] text-xs focus:border-[#0E7A53] outline-hidden"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {cartItems.length === 0 && (
                  <div className="text-center py-8 text-[#84968D] space-y-1">
                    <p className="text-xs font-bold text-[#56675E]">Carrinho vazio</p>
                    <p className="text-xs text-[#84968D]">Adicione produtos pelo catálogo ao lado</p>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom: Totais, Formas de Pagamento & Finalização */}
            <div className="mt-4 pt-3 border-t border-[#E1E9E4] space-y-3">
              
              {/* Resumo Financeiro (Subtotal, Descontos, Total Grande) */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-[#56675E]">
                  <span className="font-semibold">Subtotal</span>
                  <span className="font-bold text-[#13231B] tabular">{formatMoney(subtotal)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-[#8A5300] font-semibold">
                    <span>Descontos</span>
                    <span className="tabular">- {formatMoney(totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline pt-2 border-t border-[#E1E9E4]">
                  <span className="text-sm font-extrabold text-[#13231B]">Total</span>
                  <span className="text-2xl sm:text-3xl font-extrabold text-[#13231B] tracking-tight tabular">
                    {formatMoney(totalToPay)}
                  </span>
                </div>
              </div>

              {/* Botões de Seleção da Forma de Pagamento */}
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'dinheiro', label: 'Dinheiro', icon: Banknote },
                    { id: 'pix', label: 'PIX', icon: QrCode },
                    { id: 'cartao_debito', label: 'Débito', icon: CreditCard },
                    { id: 'cartao_credito', label: 'Crédito', icon: CreditCard },
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
                        className={cn(
                          "h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 border text-xs font-bold transition-all cursor-pointer select-none",
                          isSelected
                            ? "bg-[#0E7A53] text-white border-[#0E7A53] shadow-xs"
                            : "bg-[#F3F7F4] text-[#56675E] border-[#CFDAD3] hover:bg-[#E1E9E4] hover:text-[#13231B]"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Venda em Dinheiro: Cálculo de Troco em Destaque Verde */}
                {activePaymentMethod === 'dinheiro' && remainingBalance > 0 && (
                  <div className="p-3 bg-[#F3F7F4] rounded-xl border border-[#E1E9E4] space-y-2.5">
                    <div>
                      <label className="block text-xs font-bold text-[#56675E] mb-1">
                        Valor recebido:
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#56675E] font-bold text-sm">
                          R$
                        </span>
                        <input
                          id="input-valor-recebido-dinheiro"
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          value={cashTenderedInput}
                          onChange={(e) => setCashTenderedInput(e.target.value)}
                          className="w-full h-11 pl-10 pr-3 bg-white border border-[#CFDAD3] focus:border-[#0E7A53] rounded-xl text-[#13231B] font-extrabold text-base outline-hidden tabular"
                        />
                      </div>

                      {/* Botões Rápidos */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <button
                          type="button"
                          onClick={() => setCashTenderedInput((Number(paymentAmountInput) || remainingBalance).toFixed(2))}
                          className="px-2.5 py-1 bg-white hover:bg-[#E6F4EC] text-[#0B6445] border border-[#C2E4D2] rounded-lg text-xs font-bold cursor-pointer transition-colors"
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
                              className="px-2.5 py-1 bg-white hover:bg-[#E1E9E4] text-[#56675E] border border-[#CFDAD3] rounded-lg text-xs font-bold cursor-pointer transition-colors"
                            >
                              R$ {val}
                            </button>
                          ))}
                      </div>
                    </div>

                    {/* Bloco de Troco em Destaque Verde (Página 4 do PDF) */}
                    {Number(cashTenderedInput) > (Number(paymentAmountInput) || remainingBalance) && (
                      <div id="troco-destaque-cliente" className="p-3 bg-[#E6F4EC] border border-[#C2E4D2] rounded-xl text-[#0B6445] flex items-center justify-between">
                        <span className="text-xs font-extrabold uppercase">Troco</span>
                        <span className="text-xl sm:text-2xl font-extrabold text-[#0B6445] tabular">
                          {formatMoney(Number(cashTenderedInput) - (Number(paymentAmountInput) || remainingBalance))}
                        </span>
                      </div>
                    )}

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleAddPayment}
                      icon={Check}
                      className="w-full"
                    >
                      Confirmar pagamento em dinheiro
                    </Button>
                  </div>
                )}

                {/* Pagamento em PIX */}
                {activePaymentMethod === 'pix' && remainingBalance > 0 && (
                  <div className="p-3 bg-[#F3F7F4] rounded-xl border border-[#E1E9E4] space-y-2.5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white border border-[#CFDAD3] rounded-lg flex items-center justify-center shrink-0">
                        <QrCode className="w-6 h-6 text-[#0E7A53]" />
                      </div>
                      <div className="text-xs">
                        <div className="font-bold text-[#13231B]">Chave PIX da Loja (CNPJ)</div>
                        <div className="text-xs text-[#56675E] font-mono">12.345.678/0001-90</div>
                      </div>
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleAddPayment}
                      icon={Check}
                      className="w-full"
                    >
                      Confirmar recebimento PIX
                    </Button>
                  </div>
                )}

                {/* Pagamento em Cartão (Débito ou Crédito) */}
                {(activePaymentMethod === 'cartao_debito' || activePaymentMethod === 'cartao_credito') && remainingBalance > 0 && (
                  <div className="p-3 bg-[#F3F7F4] rounded-xl border border-[#E1E9E4] space-y-2.5">
                    <div className="text-xs text-[#56675E] font-medium">
                      Insira ou aproxime o cartão na maquininha POS ({activePaymentMethod === 'cartao_debito' ? 'Débito' : 'Crédito'}).
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleAddPayment}
                      icon={Check}
                      className="w-full"
                    >
                      Confirmar transação na maquininha
                    </Button>
                  </div>
                )}

                {/* Lista de Pagamentos Confirmados */}
                {payments.map((p, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-[#E6F4EC] border border-[#C2E4D2] px-3 py-2 rounded-xl text-xs text-[#0B6445]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold capitalize">{p.method.replace('_', ' ')}:</span>
                      <span className="font-extrabold tabular">{formatMoney(p.amount)}</span>
                      {p.tenderedAmount !== undefined && (
                        <span className="text-xs text-[#0B6445]">
                          (Troco: {formatMoney(p.changeAmount || 0)})
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePayment(idx)}
                      className="text-[#84968D] hover:text-[#A8261B] p-1 transition-colors cursor-pointer"
                      title="Remover pagamento"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Mensagem de Erro se houver */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-[#FDEDEB] border border-[#F8B5AF] text-[#A8261B] text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Botão Gigante de Finalizar Venda (56px com F2) */}
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
                className={cn(
                  "w-full h-14 rounded-xl font-extrabold text-base flex items-center justify-center gap-2 transition-all cursor-pointer select-none shadow-xs",
                  isSubmitting || pdvOperationalState !== 'STATE_C' || cartItems.length === 0 || Math.abs(remainingBalance) > 0.05
                    ? "bg-[#E1E9E4] text-[#84968D] cursor-not-allowed border border-[#CFDAD3]"
                    : "bg-[#0E7A53] hover:bg-[#0A5F40] text-white shadow-md active:scale-[0.99]"
                )}
                title="Finalizar venda atual [F2]"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>{isSubmitting ? 'Gravando venda...' : 'Finalizar venda • F2'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Recibo Não Fiscal / Venda Finalizada */}
      <Modal
        isOpen={Boolean(lastFinishedSale)}
        onClose={() => {
          setLastFinishedSale(null);
          setTimeout(() => searchInputRef.current?.focus(), 50);
        }}
        title="Venda Finalizada com Sucesso"
        subtitle={`Identificador FarmaVida: ${lastFinishedSale?.code || ''}`}
        maxWidth="md"
        footer={
          <div className="flex w-full gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              icon={Receipt}
              onClick={() => window.print()}
            >
              Imprimir Recibo
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => {
                setLastFinishedSale(null);
                setTimeout(() => searchInputRef.current?.focus(), 50);
              }}
            >
              Nova Venda
            </Button>
          </div>
        }
      >
        {lastFinishedSale && (
          <div className="space-y-3.5 text-xs text-[#13231B]">
            <div className="p-2.5 bg-[#F3F7F4] border border-[#E1E9E4] rounded-xl text-center text-xs text-[#56675E] font-bold uppercase tracking-wider">
              Recibo Não Fiscal • Controle Operacional Interno
            </div>

            <div className="bg-[#F3F7F4] rounded-xl p-3.5 border border-[#E1E9E4] space-y-2">
              <div className="flex justify-between">
                <span className="text-[#56675E]">Vendedor:</span>
                <span className="font-bold text-[#13231B]">{lastFinishedSale.sellerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#56675E]">Operador:</span>
                <span className="font-semibold text-[#13231B]">{lastFinishedSale.operatorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#56675E]">Terminal:</span>
                <span className="font-semibold text-[#13231B]">{lastFinishedSale.terminal || activeCashRegister?.terminalName || 'Caixa Balcão'}</span>
              </div>
              {lastFinishedSale.customerName && (
                <div className="flex justify-between">
                  <span className="text-[#56675E]">Cliente:</span>
                  <span className="font-semibold text-[#13231B]">{lastFinishedSale.customerName}</span>
                </div>
              )}

              {/* Itens */}
              {lastFinishedSale.items && lastFinishedSale.items.length > 0 && (
                <div className="pt-2 border-t border-[#E1E9E4] space-y-1">
                  <span className="text-[#56675E] font-bold">Itens da Venda:</span>
                  <div className="max-h-28 overflow-y-auto space-y-1 text-xs text-[#13231B] pr-1">
                    {lastFinishedSale.items.map((it: any, idx: number) => (
                      <div key={idx} className="flex justify-between">
                        <span className="truncate max-w-[220px]">{it.quantity}x {it.productName || it.name}</span>
                        <span className="font-bold tabular">{formatMoney(it.quantity * it.unitPrice)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pagamentos */}
              {lastFinishedSale.payments && lastFinishedSale.payments.length > 0 && (
                <div className="pt-2 border-t border-[#E1E9E4] space-y-1">
                  <span className="text-[#56675E] font-bold">Pagamento:</span>
                  <div className="space-y-1 text-xs text-[#13231B]">
                    {lastFinishedSale.payments.map((p: any, idx: number) => (
                      <div key={idx} className="flex justify-between">
                        <span className="capitalize">{p.method.replace('_', ' ')}</span>
                        <span className="font-bold tabular">
                          {formatMoney(p.amount)}
                          {p.changeAmount ? ` (Troco: ${formatMoney(p.changeAmount)})` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-2 border-t border-[#E1E9E4] text-sm">
                <span className="font-bold text-[#13231B]">Total Liquidado:</span>
                <span className="font-extrabold text-[#0B6445] tabular">{formatMoney(lastFinishedSale.total)}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Anotar Demanda / Falta no Balcão */}
      <Modal
        isOpen={isDemandModalOpen}
        onClose={() => setIsDemandModalOpen(false)}
        title="Registrar Procura / Falta no Balcão"
        subtitle="Alimenta diretamente as sugestões automáticas de compras"
        maxWidth="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsDemandModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSubmitDemand}>
              Salvar Registro de Falta
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmitDemand} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-xs font-bold text-[#13231B] mb-1">
              Nome do Produto ou Medicamento Procurado *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Fita Microporosa 25mm, Losartana 50mg, etc..."
              value={demandProductName}
              onChange={(e) => setDemandProductName(e.target.value)}
              className="w-full h-11 px-3 bg-[#F3F7F4] border border-[#CFDAD3] focus:border-[#0E7A53] focus:bg-white rounded-xl text-sm font-semibold text-[#13231B] outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#13231B] mb-1">Quantidade Solicitada:</label>
              <input
                type="number"
                min="1"
                value={demandQuantity}
                onChange={(e) => setDemandQuantity(Math.max(1, Number(e.target.value)))}
                className="w-full h-11 px-3 bg-[#F3F7F4] border border-[#CFDAD3] focus:border-[#0E7A53] focus:bg-white rounded-xl text-sm font-semibold text-[#13231B] outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#13231B] mb-1">Motivo da Falta:</label>
              <select
                value={demandReason}
                onChange={(e) => setDemandReason(e.target.value as any)}
                className="w-full h-11 px-3 bg-[#F3F7F4] border border-[#CFDAD3] focus:border-[#0E7A53] focus:bg-white rounded-xl text-xs font-bold text-[#13231B] outline-hidden cursor-pointer"
              >
                <option value="falta_estoque">Falta de Estoque (Esgotado)</option>
                <option value="produto_nao_trabalhado">Produto Não Trabalhado</option>
                <option value="preco_alto">Preço Considerado Alto</option>
                <option value="outro">Outro Motivo</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#13231B] mb-1">Observação do Balconista (Opcional):</label>
            <input
              type="text"
              placeholder="Ex: Cliente vizinho da UBS, procura recorrente..."
              value={demandNotes}
              onChange={(e) => setDemandNotes(e.target.value)}
              className="w-full h-11 px-3 bg-[#F3F7F4] border border-[#CFDAD3] focus:border-[#0E7A53] focus:bg-white rounded-xl text-xs text-[#13231B] outline-hidden"
            />
          </div>
        </form>
      </Modal>

      {/* Modal: Cadastro Rápido de Cliente */}
      <Modal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        title="Cadastro Rápido de Cliente"
        subtitle="Vincule o cliente sem perder o carrinho atual"
        maxWidth="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsCustomerModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSubmitCustomer}>
              Salvar Cliente
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmitCustomer} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-xs font-bold text-[#13231B] mb-1">Nome Completo *</label>
            <input
              type="text"
              required
              placeholder="Nome do cliente"
              value={newCustomerName}
              onChange={(e) => setNewCustomerName(e.target.value)}
              className="w-full h-11 px-3 bg-[#F3F7F4] border border-[#CFDAD3] focus:border-[#0E7A53] focus:bg-white rounded-xl text-sm font-semibold text-[#13231B] outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#13231B] mb-1">CPF (Opcional)</label>
            <input
              type="text"
              placeholder="000.000.000-00"
              value={newCustomerCpf}
              onChange={(e) => setNewCustomerCpf(e.target.value)}
              className="w-full h-11 px-3 bg-[#F3F7F4] border border-[#CFDAD3] focus:border-[#0E7A53] focus:bg-white rounded-xl text-xs font-semibold text-[#13231B] outline-hidden font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#13231B] mb-1">Telefone / WhatsApp (Opcional)</label>
            <input
              type="text"
              placeholder="(00) 00000-0000"
              value={newCustomerPhone}
              onChange={(e) => setNewCustomerPhone(e.target.value)}
              className="w-full h-11 px-3 bg-[#F3F7F4] border border-[#CFDAD3] focus:border-[#0E7A53] focus:bg-white rounded-xl text-xs font-semibold text-[#13231B] outline-hidden"
            />
          </div>
        </form>
      </Modal>

      {/* Modal: Autorização de Desconto Excedente */}
      <Modal
        isOpen={isDiscountApprovalOpen}
        onClose={() => setIsDiscountApprovalOpen(false)}
        title="Autorização de Desconto"
        subtitle="Alçada operacional excedida no balcão"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 bg-[#FFF4E0] rounded-xl border border-[#FFE1A8] text-[#8A5300] space-y-1.5">
            <div className="flex justify-between items-center font-bold">
              <span>Desconto Solicitado:</span>
              <span className="text-[#8A5300] tabular">
                {discountApprovalData?.discountPercent.toFixed(1)}% ({formatMoney(totalDiscount)})
              </span>
            </div>
            <div className="flex justify-between items-center text-[#56675E]">
              <span>Limite Sem Autorização:</span>
              <span className="font-bold">{discountApprovalData?.maxAllowed}%</span>
            </div>
            <p className="text-xs text-[#8A5300] pt-1 border-t border-[#FFE1A8]/60">
              Descontos acima de {discountApprovalData?.maxAllowed}% exigem liberação por PIN gerencial ou envio à Central de Aprovações.
            </p>
          </div>

          {discountApprovalPendingCode ? (
            <div className="p-4 bg-[#E6F4EC] rounded-xl border border-[#C2E4D2] text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-[#0E7A53] mx-auto" />
              <h4 className="text-sm font-extrabold text-[#0B6445]">Solicitação Registrada!</h4>
              <p className="text-xs text-[#0B6445] font-mono font-bold bg-white p-2 rounded-lg border border-[#C2E4D2]">
                Código: {discountApprovalPendingCode}
              </p>
              <p className="text-xs text-[#56675E]">
                Aguarde a liberação remota por um gerente na <strong>Central de Aprovações</strong>.
              </p>
              <Button
                variant="primary"
                onClick={() => setIsDiscountApprovalOpen(false)}
                className="w-full mt-2"
              >
                Entendido
              </Button>
            </div>
          ) : (
            <div className="space-y-3.5">
              {/* Opção 1: PIN Gerencial */}
              <form onSubmit={handleAuthorizeDiscountWithPin} className="space-y-2">
                <div className="p-3.5 bg-[#F3F7F4] rounded-xl border border-[#E1E9E4] space-y-2">
                  <label className="block text-xs font-bold text-[#13231B]">
                    Opção 1: Digitar PIN do Gerente/Farmacêutico
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      maxLength={8}
                      placeholder="PIN Gerencial"
                      value={discountPinInput}
                      onChange={(e) => setDiscountPinInput(e.target.value)}
                      className="flex-1 h-10 px-3 bg-white border border-[#CFDAD3] focus:border-[#0E7A53] rounded-xl text-sm text-[#13231B] outline-hidden font-mono"
                    />
                    <Button
                      variant="primary"
                      type="submit"
                      disabled={!discountPinInput.trim() || isAuthorizingDiscount}
                    >
                      {isAuthorizingDiscount ? 'Validando...' : 'Liberar'}
                    </Button>
                  </div>
                </div>
              </form>

              {/* Opção 2: Central de Aprovações */}
              <div className="p-3.5 bg-[#F3F7F4] rounded-xl border border-[#E1E9E4] space-y-2">
                <div className="font-bold text-[#13231B]">
                  Opção 2: Enviar para Central de Aprovações
                </div>
                <p className="text-xs text-[#56675E]">
                  Gera uma solicitação formal para revisão remota por gestores.
                </p>
                <Button
                  variant="secondary"
                  onClick={handleCreateDiscountApprovalRequest}
                  disabled={isAuthorizingDiscount}
                  className="w-full"
                >
                  {isAuthorizingDiscount ? 'Enviando...' : 'Solicitar na Central de Aprovações'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
