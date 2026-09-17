import React, { useState, useMemo } from 'react';
import { CashRegister, CashMovement, User, Sale, WorkShift, Store, Terminal, OperatorCashSummary } from '../types';
import { 
  Banknote, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Lock, 
  Unlock, 
  AlertCircle, 
  CheckCircle2, 
  Calculator,
  History,
  Clock,
  CreditCard,
  QrCode,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Info,
  Users,
  KeyRound,
  Monitor
} from 'lucide-react';

interface MeuCaixaViewProps {
  currentUser: User;
  activeShift: WorkShift | null;
  activeCashRegister: CashRegister | null;
  cashHistory: CashRegister[];
  sales: Sale[];
  store: Store;
  terminalId?: string;
  terminals?: Terminal[];
  onOpenSwitchOperatorModal?: () => void;
  onOpenCash: (terminalName: string, openingAmount: number, notes?: string) => Promise<{ success: boolean; error?: string }>;
  onAddMovement: (type: 'suprimento' | 'sangria', amount: number, reason: string) => Promise<{ success: boolean; error?: string }>;
  onCloseCash: (data: {
    countedCash: number;
    retainedFloat: number;
    withdrawnAmount: number;
    closingWithdrawalConfirmed: boolean;
    divergenceReason?: string;
    notes?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  onGoToTurno: () => void;
  onGoToBalcao?: () => void;
}

export const MeuCaixaView: React.FC<MeuCaixaViewProps> = ({
  currentUser,
  activeShift,
  activeCashRegister,
  cashHistory,
  sales,
  store,
  terminalId,
  terminals,
  onOpenSwitchOperatorModal,
  onOpenCash,
  onAddMovement,
  onCloseCash,
  onGoToTurno,
  onGoToBalcao,
}) => {
  // State machine for screen
  const [isClosingFlowActive, setIsClosingFlowActive] = useState(false);
  const [selectedClosedSession, setSelectedClosedSession] = useState<CashRegister | null>(null);

  // UX-01: Guidance states for opening and post-closing
  const [justOpenedInfo, setJustOpenedInfo] = useState<{ terminalName: string; openingAmount: number } | null>(null);
  const [closedSummaryData, setClosedSummaryData] = useState<{
    terminalName: string;
    displayCode: string;
    expectedCash: number;
    countedCash: number;
    discrepancy: number;
    closedAt: string;
  } | null>(null);

  // Modal: Abertura
  const [isOpenModalActive, setIsOpenModalActive] = useState(false);
  const suggestedFloat = (store.settings as any)?.defaultOpeningAmount || 150;
  const [terminalNameInput, setTerminalNameInput] = useState('Terminal Balcão 01');
  const [openingAmountInput, setOpeningAmountInput] = useState(suggestedFloat.toString());
  const [openNotesInput, setOpenNotesInput] = useState('');

  // Modal: Sangria ou Suprimento
  const [isMovementModalActive, setIsMovementModalActive] = useState(false);
  const [movementType, setMovementType] = useState<'suprimento' | 'sangria'>('sangria');
  const [movementAmountInput, setMovementAmountInput] = useState('');
  const [movementReasonInput, setMovementReasonInput] = useState('');
  const [movementConfirmedCheck, setMovementConfirmedCheck] = useState(false);

  // Flow: Fechamento
  const [countedCashInput, setCountedCashInput] = useState('');
  const [countedPixInput, setCountedPixInput] = useState('');
  const [countedDebitInput, setCountedDebitInput] = useState('');
  const [countedCreditInput, setCountedCreditInput] = useState('');
  const [divergenceReasonInput, setDivergenceReasonInput] = useState('');
  const [closeNotesInput, setCloseNotesInput] = useState('');
  const [confirmWithdrawalCheck, setConfirmWithdrawalCheck] = useState(false);

  // General state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uiError, setUiError] = useState<string | null>(null);
  const [uiSuccess, setUiSuccess] = useState<string | null>(null);

  // Single source of arithmetic truth: Sales linked to current active register
  const registerSalesMetrics = useMemo(() => {
    if (!activeCashRegister) {
      return {
        totalSalesAmount: 0,
        salesCount: 0,
        cashSales: 0,
        pixSales: 0,
        debitSales: 0,
        creditSales: 0,
        splitCount: 0,
      };
    }

    let total = 0;
    let count = 0;
    let cash = 0;
    let pix = 0;
    let debit = 0;
    let credit = 0;
    let splits = 0;

    for (const s of sales) {
      const isAssociated = s.cashRegisterId === activeCashRegister.id ||
        (!s.cashRegisterId && new Date(s.timestamp) >= new Date(activeCashRegister.openedAt));

      if (isAssociated) {
        count++;
        total += s.total;

        const payments = s.payments || [];
        if (payments.length > 1) splits++;

        for (const p of payments) {
          const val = Number(p.amount) || 0;
          if (p.method === 'dinheiro') cash += val;
          else if (p.method === 'pix') pix += val;
          else if (p.method === 'cartao_debito') debit += val;
          else if (p.method === 'cartao_credito') credit += val;
        }
      }
    }

    return {
      totalSalesAmount: total,
      salesCount: count,
      cashSales: cash,
      pixSales: pix,
      debitSales: debit,
      creditSales: credit,
      splitCount: splits,
    };
  }, [activeCashRegister, sales]);

  // Operator-by-operator aggregation within this shared cash drawer
  const computedOperatorSummaries = useMemo<OperatorCashSummary[]>(() => {
    if (activeCashRegister?.operatorSummaries && activeCashRegister.operatorSummaries.length > 0) {
      return activeCashRegister.operatorSummaries;
    }
    if (!activeCashRegister) return [];

    const map = new Map<string, OperatorCashSummary>();
    for (const s of sales) {
      const isAssociated = s.cashRegisterId === activeCashRegister.id ||
        (!s.cashRegisterId && new Date(s.timestamp) >= new Date(activeCashRegister.openedAt));
      if (isAssociated) {
        const opId = s.operatorId || s.sellerId || activeCashRegister.openedBy;
        const opName = s.operatorName || s.sellerName || activeCashRegister.openedByName;
        const current = map.get(opId) || {
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
        current.salesCount++;
        current.totalSold += s.total || 0;
        current.discountTotal += s.totalDiscount || 0;
        for (const p of (s.payments || [])) {
          if (p.method === 'dinheiro') current.cashSales += p.amount || 0;
          else if (p.method === 'pix') current.pixSales += p.amount || 0;
          else if (p.method === 'cartao_debito') current.cardDebitSales += p.amount || 0;
          else if (p.method === 'cartao_credito') current.cardCreditSales += p.amount || 0;
        }
        map.set(opId, current);
      }
    }
    return Array.from(map.values());
  }, [activeCashRegister, sales]);

  // Calculations for active cash drawer
  const movements = activeCashRegister?.movements || [];
  let cashSuprimentos = 0;
  let cashSangrias = 0;
  for (const m of movements) {
    if (m.type === 'suprimento') cashSuprimentos += Number(m.amount) || 0;
    if (m.type === 'sangria') cashSangrias += Number(m.amount) || 0;
  }

  const openingAmount = activeCashRegister ? Number(activeCashRegister.openingAmount) || 0 : 0;
  const expectedPhysicalCash = openingAmount + registerSalesMetrics.cashSales + cashSuprimentos - cashSangrias;

  // Fechamento math
  const countedNum = Number(countedCashInput.replace(',', '.')) || 0;
  const cashDiscrepancy = countedCashInput.trim() === '' ? 0 : Math.round((countedNum - expectedPhysicalCash) * 100) / 100;
  
  const countedPixNum = Number(countedPixInput.replace(',', '.')) || 0;
  const pixDiscrepancy = countedPixInput.trim() === '' ? 0 : Math.round((countedPixNum - registerSalesMetrics.pixSales) * 100) / 100;

  const countedDebitNum = Number(countedDebitInput.replace(',', '.')) || 0;
  const debitDiscrepancy = countedDebitInput.trim() === '' ? 0 : Math.round((countedDebitNum - registerSalesMetrics.debitSales) * 100) / 100;

  const countedCreditNum = Number(countedCreditInput.replace(',', '.')) || 0;
  const creditDiscrepancy = countedCreditInput.trim() === '' ? 0 : Math.round((countedCreditNum - registerSalesMetrics.creditSales) * 100) / 100;
  
  // Suggested next float and withdrawal
  const targetNextFloat = Math.min(suggestedFloat, countedNum > 0 ? countedNum : 0);
  const suggestedWithdrawal = Math.max(0, Math.round((countedNum - targetNextFloat) * 100) / 100);

  // Handler: Abertura
  const handleOpenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUiError(null);
    const amount = Number(openingAmountInput.replace(',', '.'));
    if (isNaN(amount) || amount < 0) {
      setUiError('Informe um valor válido e não negativo para o fundo inicial.');
      return;
    }

    setIsSubmitting(true);
    const res = await onOpenCash(terminalNameInput.trim(), amount, openNotesInput.trim() || undefined);
    setIsSubmitting(false);

    if (res.success) {
      setIsOpenModalActive(false);
      setOpenNotesInput('');
      setJustOpenedInfo({
        terminalName: terminalNameInput.trim() || 'Terminal Balcão 01',
        openingAmount: amount,
      });
      setUiSuccess('Caixa aberto com sucesso!');
      setTimeout(() => setUiSuccess(null), 4000);
    } else {
      setUiError(res.error || 'Erro ao abrir sessão de caixa.');
    }
  };

  // Handler: Sangria / Suprimento
  const handleMovementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUiError(null);
    const amount = Number(movementAmountInput.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      setUiError('O valor deve ser maior que zero.');
      return;
    }

    // Correction 1: Sangria mandatory reason, Suprimento optional
    if (movementType === 'sangria' && !movementReasonInput.trim()) {
      setUiError('A justificativa da sangria é estritamente obrigatória.');
      return;
    }

    if (!movementConfirmedCheck) {
      setUiError(`Você deve confirmar que o valor foi ${movementType === 'sangria' ? 'retirado fisicamente' : 'adicionado fisicamente'} ao caixa.`);
      return;
    }

    setIsSubmitting(true);
    const reasonText = movementReasonInput.trim() || (movementType === 'suprimento' ? 'Suprimento de troco operacional' : '');
    const res = await onAddMovement(movementType, amount, reasonText);
    setIsSubmitting(false);

    if (res.success) {
      setIsMovementModalActive(false);
      setMovementAmountInput('');
      setMovementReasonInput('');
      setMovementConfirmedCheck(false);
      setUiSuccess(`${movementType === 'sangria' ? 'Sangria' : 'Suprimento'} registrado com sucesso.`);
      setTimeout(() => setUiSuccess(null), 3000);
    } else {
      setUiError(res.error || 'Erro ao registrar movimentação.');
    }
  };

  // Handler: Fechamento Final
  const handleCloseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUiError(null);

    if (countedCashInput.trim() === '') {
      setUiError('Informe o valor em dinheiro físico contado na gaveta.');
      return;
    }

    if (Math.abs(cashDiscrepancy) > 0.01 && !divergenceReasonInput.trim()) {
      setUiError('Existe divergência entre o valor esperado e o contado. A justificativa por escrito é obrigatória.');
      return;
    }

    setIsSubmitting(true);
    const res = await onCloseCash({
      countedCash: countedNum,
      retainedFloat: targetNextFloat,
      withdrawnAmount: confirmWithdrawalCheck ? suggestedWithdrawal : 0,
      closingWithdrawalConfirmed: confirmWithdrawalCheck,
      divergenceReason: Math.abs(cashDiscrepancy) > 0.01 ? divergenceReasonInput.trim() : undefined,
      notes: closeNotesInput.trim() || undefined,
    });
    setIsSubmitting(false);

    if (res.success) {
      if (activeCashRegister) {
        setClosedSummaryData({
          terminalName: activeCashRegister.terminalName,
          displayCode: activeCashRegister.displayCode || activeCashRegister.id,
          expectedCash: expectedPhysicalCash,
          countedCash: countedNum,
          discrepancy: cashDiscrepancy,
          closedAt: new Date().toISOString(),
        });
      }
      setIsClosingFlowActive(false);
      setCountedCashInput('');
      setDivergenceReasonInput('');
      setCloseNotesInput('');
      setConfirmWithdrawalCheck(false);
      setJustOpenedInfo(null);
      setUiSuccess('Caixa fechado com sucesso e encaminhado para conciliação.');
      setTimeout(() => setUiSuccess(null), 5000);
    } else {
      setUiError(res.error || 'Erro ao realizar o fechamento do caixa.');
    }
  };

  // Filter user's personal cash history
  const myCashHistory = useMemo(() => {
    return cashHistory.filter((c) => c.openedBy === currentUser.id);
  }, [cashHistory, currentUser.id]);

  // -------------------------------------------------------------
  // RENDER STATE 1: SEM EXPEDIENTE ATIVO
  // -------------------------------------------------------------
  if (!activeShift || activeShift.status === 'encerrado') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
        <div className="bg-white rounded-2xl border border-amber-200 p-8 shadow-xs text-center space-y-4">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-700">
            <Clock className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-neutral-900">Expediente Não Iniciado</h2>
            <p className="text-sm text-neutral-600 max-w-md mx-auto mt-2">
              Você precisa iniciar seu expediente de trabalho no controle de ponto antes de abrir o caixa de atendimento.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={onGoToTurno}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm rounded-lg transition-colors inline-flex items-center gap-2 shadow-xs"
            >
              <span>Ir para Meu Turno & Ponto</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER STATE 4: FECHAMENTO GUIADO
  // -------------------------------------------------------------
  if (isClosingFlowActive && activeCashRegister) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
          <div>
            <h1 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
              <Calculator className="w-6 h-6 text-emerald-700" />
              <span>Conferência & Fechamento de Caixa</span>
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              Terminal: <strong>{activeCashRegister.terminalName}</strong> • Operador: <strong>{currentUser.name}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsClosingFlowActive(false);
              setUiError(null);
            }}
            className="px-3.5 py-1.5 border border-neutral-300 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100"
          >
            Voltar para Operação
          </button>
        </div>

        {uiError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{uiError}</span>
          </div>
        )}

        <form onSubmit={handleCloseSubmit} className="space-y-6">
          {/* Tabela de Comparação por Forma de Pagamento */}
          <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden">
            <div className="p-3.5 bg-neutral-50 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-bold text-xs text-neutral-800 uppercase tracking-wider block">
                  Conferência Transparente por Método de Liquidação
                </span>
                <span className="text-[11px] text-neutral-500">
                  Confira o dinheiro físico na gaveta, os comprovantes das maquininhas de cartão e o extrato Pix.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCountedCashInput(expectedPhysicalCash.toFixed(2));
                  setCountedPixInput(registerSalesMetrics.pixSales.toFixed(2));
                  setCountedDebitInput(registerSalesMetrics.debitSales.toFixed(2));
                  setCountedCreditInput(registerSalesMetrics.creditSales.toFixed(2));
                  setDivergenceReasonInput('');
                  setUiError(null);
                }}
                className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-950 font-bold text-xs rounded-lg border border-emerald-300 transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-2xs"
                title="Preenche todos os métodos como conferidos e exatos caso não haja nenhuma discrepância física"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>Todos os Saldos Batem</span>
              </button>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-100 text-neutral-600 font-semibold border-b border-neutral-200">
                <tr>
                  <th className="py-2.5 px-4">Forma de Pagamento</th>
                  <th className="py-2.5 px-4 text-right">Valor Sistema</th>
                  <th className="py-2.5 px-4 text-right">Valor Conferido</th>
                  <th className="py-2.5 px-4 text-right">Situação / Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-neutral-800">
                {/* Dinheiro */}
                <tr className="bg-emerald-50/30">
                  <td className="py-3 px-4 font-bold flex items-center gap-2 text-emerald-900">
                    <Banknote className="w-5 h-5 text-emerald-700 shrink-0" />
                    <div>
                      <span className="text-sm">Dinheiro em Espécie</span>
                      <span className="block text-[11px] font-normal text-emerald-700">Contagem física na gaveta</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-black text-neutral-900 text-sm">
                    R$ {expectedPhysicalCash.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex flex-col items-end gap-1 py-1">
                      <div className="inline-flex items-center gap-1.5">
                        <span className="text-neutral-500 font-bold text-xs">R$</span>
                        <input
                          id="input-contagem-dinheiro"
                          type="text"
                          required
                          placeholder="0,00"
                          value={countedCashInput}
                          onChange={(e) => setCountedCashInput(e.target.value)}
                          className="w-32 min-h-[38px] px-2.5 py-1 bg-white border-2 border-emerald-400 rounded-lg font-black text-neutral-950 text-right text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-2xs"
                          autoFocus
                        />
                      </div>
                      <button
                        id="btn-saldo-bate-dinheiro"
                        type="button"
                        onClick={() => {
                          setCountedCashInput(expectedPhysicalCash.toFixed(2));
                          setDivergenceReasonInput('');
                          setUiError(null);
                        }}
                        className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-950 text-[10px] font-bold rounded border border-emerald-300 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                        <span>[SALDO BATE]</span>
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-bold">
                    {countedCashInput.trim() === '' ? (
                      <span className="text-neutral-400 text-xs">Aguardando contagem</span>
                    ) : cashDiscrepancy === 0 ? (
                      <span className="text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2.5 py-1 rounded-md text-xs font-black inline-flex items-center gap-1 shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span>✓ CONFERIDO</span>
                      </span>
                    ) : (
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1 ${
                        cashDiscrepancy > 0 ? 'bg-blue-100 text-blue-900 border border-blue-200' : 'bg-red-100 text-red-900 border border-red-200'
                      }`}>
                        {cashDiscrepancy > 0 ? `Sobra (+ R$ ${cashDiscrepancy.toFixed(2)})` : `Falta (- R$ ${Math.abs(cashDiscrepancy).toFixed(2)})`}
                      </span>
                    )}
                  </td>
                </tr>

                {/* Pix */}
                <tr>
                  <td className="py-3 px-4 font-medium flex items-center gap-2 text-neutral-800">
                    <QrCode className="w-5 h-5 text-teal-600 shrink-0" />
                    <div>
                      <span className="font-bold text-sm">Pix Direto</span>
                      <span className="block text-[11px] text-neutral-500">Conferência no extrato bancário/app</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-black text-neutral-900 text-sm">
                    R$ {registerSalesMetrics.pixSales.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex flex-col items-end gap-1 py-1">
                      <div className="inline-flex items-center gap-1.5">
                        <span className="text-neutral-500 font-bold text-xs">R$</span>
                        <input
                          id="input-contagem-pix"
                          type="text"
                          placeholder={registerSalesMetrics.pixSales.toFixed(2)}
                          value={countedPixInput}
                          onChange={(e) => setCountedPixInput(e.target.value)}
                          className="w-32 min-h-[38px] px-2.5 py-1 bg-white border border-neutral-300 rounded-lg font-bold text-neutral-950 text-right text-sm focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <button
                        id="btn-saldo-bate-pix"
                        type="button"
                        onClick={() => setCountedPixInput(registerSalesMetrics.pixSales.toFixed(2))}
                        className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-950 text-[10px] font-bold rounded border border-emerald-300 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                        <span>[SALDO BATE]</span>
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-bold">
                    {countedPixInput.trim() === '' ? (
                      <span className="text-neutral-400 text-xs">Pendente</span>
                    ) : pixDiscrepancy === 0 ? (
                      <span className="text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2.5 py-1 rounded-md text-xs font-black inline-flex items-center gap-1 shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span>✓ CONFERIDO</span>
                      </span>
                    ) : (
                      <span className="bg-amber-100 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-md text-xs font-bold">
                        Dif: R$ {pixDiscrepancy.toFixed(2)}
                      </span>
                    )}
                  </td>
                </tr>

                {/* Débito */}
                <tr>
                  <td className="py-3 px-4 font-medium flex items-center gap-2 text-neutral-800">
                    <CreditCard className="w-5 h-5 text-blue-600 shrink-0" />
                    <div>
                      <span className="font-bold text-sm">Cartão de Débito</span>
                      <span className="block text-[11px] text-neutral-500">Relatório da maquininha (POS)</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-black text-neutral-900 text-sm">
                    R$ {registerSalesMetrics.debitSales.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex flex-col items-end gap-1 py-1">
                      <div className="inline-flex items-center gap-1.5">
                        <span className="text-neutral-500 font-bold text-xs">R$</span>
                        <input
                          id="input-contagem-debito"
                          type="text"
                          placeholder={registerSalesMetrics.debitSales.toFixed(2)}
                          value={countedDebitInput}
                          onChange={(e) => setCountedDebitInput(e.target.value)}
                          className="w-32 min-h-[38px] px-2.5 py-1 bg-white border border-neutral-300 rounded-lg font-bold text-neutral-950 text-right text-sm focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <button
                        id="btn-saldo-bate-debito"
                        type="button"
                        onClick={() => setCountedDebitInput(registerSalesMetrics.debitSales.toFixed(2))}
                        className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-950 text-[10px] font-bold rounded border border-emerald-300 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                        <span>[SALDO BATE]</span>
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-bold">
                    {countedDebitInput.trim() === '' ? (
                      <span className="text-neutral-400 text-xs">Pendente</span>
                    ) : debitDiscrepancy === 0 ? (
                      <span className="text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2.5 py-1 rounded-md text-xs font-black inline-flex items-center gap-1 shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span>✓ CONFERIDO</span>
                      </span>
                    ) : (
                      <span className="bg-amber-100 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-md text-xs font-bold">
                        Dif: R$ {debitDiscrepancy.toFixed(2)}
                      </span>
                    )}
                  </td>
                </tr>

                {/* Crédito */}
                <tr>
                  <td className="py-3 px-4 font-medium flex items-center gap-2 text-neutral-800">
                    <CreditCard className="w-5 h-5 text-purple-600 shrink-0" />
                    <div>
                      <span className="font-bold text-sm">Cartão de Crédito</span>
                      <span className="block text-[11px] text-neutral-500">Relatório da maquininha (POS)</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-black text-neutral-900 text-sm">
                    R$ {registerSalesMetrics.creditSales.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex flex-col items-end gap-1 py-1">
                      <div className="inline-flex items-center gap-1.5">
                        <span className="text-neutral-500 font-bold text-xs">R$</span>
                        <input
                          id="input-contagem-credito"
                          type="text"
                          placeholder={registerSalesMetrics.creditSales.toFixed(2)}
                          value={countedCreditInput}
                          onChange={(e) => setCountedCreditInput(e.target.value)}
                          className="w-32 min-h-[38px] px-2.5 py-1 bg-white border border-neutral-300 rounded-lg font-bold text-neutral-950 text-right text-sm focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <button
                        id="btn-saldo-bate-credito"
                        type="button"
                        onClick={() => setCountedCreditInput(registerSalesMetrics.creditSales.toFixed(2))}
                        className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-950 text-[10px] font-bold rounded border border-emerald-300 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                        <span>[SALDO BATE]</span>
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-bold">
                    {countedCreditInput.trim() === '' ? (
                      <span className="text-neutral-400 text-xs">Pendente</span>
                    ) : creditDiscrepancy === 0 ? (
                      <span className="text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2.5 py-1 rounded-md text-xs font-black inline-flex items-center gap-1 shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span>✓ CONFERIDO</span>
                      </span>
                    ) : (
                      <span className="bg-amber-100 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-md text-xs font-bold">
                        Dif: R$ {creditDiscrepancy.toFixed(2)}
                      </span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Cálculo Aritmético Transparente */}
          <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-4 space-y-2 text-xs">
            <div className="font-semibold text-neutral-700 uppercase tracking-wider text-[11px]">
              Composição Matemática do Dinheiro em Gaveta:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-neutral-700">
              <div className="p-2.5 bg-white rounded border border-neutral-200">
                <span className="text-neutral-500 block">Fundo de Abertura:</span>
                <span className="font-bold text-neutral-900">+ R$ {openingAmount.toFixed(2)}</span>
              </div>
              <div className="p-2.5 bg-white rounded border border-neutral-200">
                <span className="text-neutral-500 block">Vendas em Dinheiro:</span>
                <span className="font-bold text-emerald-800">+ R$ {registerSalesMetrics.cashSales.toFixed(2)}</span>
              </div>
              <div className="p-2.5 bg-white rounded border border-neutral-200">
                <span className="text-neutral-500 block">Suprimentos:</span>
                <span className="font-bold text-blue-800">+ R$ {cashSuprimentos.toFixed(2)}</span>
              </div>
              <div className="p-2.5 bg-white rounded border border-neutral-200">
                <span className="text-neutral-500 block">Sangrias:</span>
                <span className="font-bold text-amber-800">- R$ {cashSangrias.toFixed(2)}</span>
              </div>
              <div className="p-2.5 bg-emerald-100/60 rounded border border-emerald-300">
                <span className="text-emerald-900 block font-medium">Dinheiro Esperado:</span>
                <span className="font-bold text-emerald-950 text-sm">= R$ {expectedPhysicalCash.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Justificativa Obrigatória em caso de Divergência */}
          {countedCashInput.trim() !== '' && Math.abs(cashDiscrepancy) > 0.01 && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Divergência detectada: {cashDiscrepancy > 0 ? `Sobra de R$ ${cashDiscrepancy.toFixed(2)}` : `Falta de R$ ${Math.abs(cashDiscrepancy).toFixed(2)}`}</span>
              </div>
              <p className="text-xs text-amber-800">
                O valor apurado não é cego. Conforme a regra de negócio FarmaVida, reconte o dinheiro. Se a diferença persistir, descreva a justificativa detalhada para conferência da administração.
              </p>
              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  Justificativa Obrigatória da Divergência:
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Ex: Nota de R$ 50 conferida a mais no troco recebido de fornecedor / cliente deixou troco..."
                  value={divergenceReasonInput}
                  onChange={(e) => setDivergenceReasonInput(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-xs text-neutral-900 focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          )}

          {/* Sugestão de Fundo de Troco e Sangria de Fechamento */}
          {countedNum > 0 && (
            <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-4 shadow-xs">
              <div className="font-bold text-sm text-neutral-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Destinação do Dinheiro Físico</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                  <span className="text-neutral-500 block">Fundo de Troco Sugerido para o Próximo Turno:</span>
                  <span className="font-bold text-neutral-900 text-sm">
                    R$ {targetNextFloat.toFixed(2)}
                  </span>
                  <span className="block text-[11px] text-neutral-500 mt-0.5">
                    Permanece fisicamente na gaveta do caixa.
                  </span>
                </div>

                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <span className="text-emerald-800 block">Valor Sugerido para Recolhimento (Cofre):</span>
                  <span className="font-bold text-emerald-950 text-base">
                    R$ {suggestedWithdrawal.toFixed(2)}
                  </span>
                  <span className="block text-[11px] text-emerald-700 mt-0.5">
                    Total apurado menos o fundo de reserva mantido.
                  </span>
                </div>
              </div>

              {suggestedWithdrawal > 0 && (
                <div className="p-3.5 bg-neutral-50 rounded-lg border border-neutral-200 space-y-2">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmWithdrawalCheck}
                      onChange={(e) => setConfirmWithdrawalCheck(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-emerald-700 border-neutral-300 focus:ring-emerald-500"
                    />
                    <div className="text-xs text-neutral-800">
                      <strong className="text-neutral-900">Confirmar Sangria de Fechamento:</strong>
                      <p className="text-neutral-600 text-[11px] mt-0.5">
                        Confirmo que o valor de <strong>R$ {suggestedWithdrawal.toFixed(2)}</strong> foi retirado fisicamente da gaveta para recolhimento ao cofre/tesouraria.
                      </p>
                    </div>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Observações finais */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Observação Adicional de Fechamento (Opcional):
            </label>
            <input
              type="text"
              placeholder="Ex: Turno encerrado sem incidentes operacionais."
              value={closeNotesInput}
              onChange={(e) => setCloseNotesInput(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-xs text-neutral-900"
            />
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
            <button
              type="button"
              onClick={() => setIsClosingFlowActive(false)}
              className="px-4 py-2 border border-neutral-300 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || countedCashInput.trim() === ''}
              className="px-5 py-2.5 bg-neutral-900 hover:bg-black text-white font-bold text-xs rounded-lg transition-colors shadow-xs flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Lock className="w-4 h-4" />
              <span>{isSubmitting ? 'Processando Fechamento...' : 'Fechar Meu Caixa'}</span>
            </button>
          </div>
        </form>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER STATE 2: EXPEDIENTE ATIVO + CAIXA FECHADO
  // -------------------------------------------------------------
  if (!activeCashRegister) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {uiSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{uiSuccess}</span>
          </div>
        )}

        {/* UX-01: Post-Closing Summary Banner */}
        {closedSummaryData ? (
          <div id="card-resumo-fechamento-sucesso" className="bg-white rounded-2xl border-2 border-emerald-400 p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-7 h-7 text-emerald-700" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  Fechamento Concluído com Sucesso
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-neutral-900 mt-0.5">
                  Terminal {closedSummaryData.terminalName} Fechado
                </h2>
                <p className="text-xs text-neutral-500">
                  Sessão {closedSummaryData.displayCode} • Encerrada às {new Date(closedSummaryData.closedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-neutral-50 rounded-xl border border-neutral-200 text-xs">
              <div>
                <span className="text-neutral-500 block">Dinheiro Esperado:</span>
                <span className="text-sm font-black text-neutral-900">R$ {closedSummaryData.expectedCash.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">Dinheiro Contado:</span>
                <span className="text-sm font-black text-neutral-900">R$ {closedSummaryData.countedCash.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">Diferença Final:</span>
                <span className={`text-sm font-black ${closedSummaryData.discrepancy === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {closedSummaryData.discrepancy === 0 ? 'Exato (R$ 0,00)' : closedSummaryData.discrepancy > 0 ? `+ R$ ${closedSummaryData.discrepancy.toFixed(2)}` : `- R$ ${Math.abs(closedSummaryData.discrepancy).toFixed(2)}`}
                </span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                id="btn-pos-fechamento-ir-turno"
                onClick={() => {
                  setClosedSummaryData(null);
                  onGoToTurno();
                }}
                className="min-h-[48px] px-6 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Clock className="w-4 h-4" />
                <span>Ir para Meu Turno para Encerrar Expediente</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                id="btn-pos-fechamento-abrir-novo-caixa"
                onClick={() => {
                  setClosedSummaryData(null);
                  setIsOpenModalActive(true);
                }}
                className="min-h-[48px] px-5 border border-neutral-300 hover:bg-neutral-100 text-neutral-800 font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Unlock className="w-4 h-4" />
                <span>Abrir Novo Caixa</span>
              </button>
            </div>
          </div>
        ) : (
          /* Normal State: Caixa Fechado -> Próxima Ação: Abrir Meu Caixa */
          <div className="bg-white rounded-2xl border-2 border-emerald-500/20 p-8 shadow-xs text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-700">
              <Unlock className="w-8 h-8" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-800 text-xs font-semibold mb-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Expediente Ativo ({currentUser.name})</span>
              </div>
              <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Seu Caixa Está Fechado</h2>
              <p className="text-sm text-neutral-500 max-w-md mx-auto mt-1.5 leading-relaxed">
                Para registrar vendas no balcão e emitir recibos com fundo de troco, abra seu terminal de atendimento.
              </p>
            </div>
            <div className="pt-2">
              <button
                id="btn-abrir-meu-caixa-hero"
                onClick={() => {
                  setUiError(null);
                  setIsOpenModalActive(true);
                }}
                className="min-h-[50px] px-8 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-base rounded-xl transition-all inline-flex items-center gap-2.5 shadow-md hover:shadow-lg cursor-pointer"
              >
                <Unlock className="w-5 h-5" />
                <span>ABRIR MEU CAIXA</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal: Abertura */}
        {isOpenModalActive && (
          <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-neutral-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                <div className="flex items-center gap-2 font-bold text-base text-neutral-900">
                  <Unlock className="w-5 h-5 text-emerald-700" />
                  <span>Abertura de Caixa Operacional</span>
                </div>
                <button
                  onClick={() => setIsOpenModalActive(false)}
                  className="text-neutral-400 hover:text-neutral-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {uiError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
                  {uiError}
                </div>
              )}

              <form onSubmit={handleOpenSubmit} className="space-y-3.5 text-xs">
                <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 space-y-1">
                  <div className="flex justify-between text-neutral-600">
                    <span>Operador Responsável:</span>
                    <strong className="text-neutral-900">{currentUser.name}</strong>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>Data / Hora:</span>
                    <span>{new Date().toLocaleDateString()} às {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>Fundo Sugerido (Loja):</span>
                    <span className="font-semibold text-emerald-800">R$ {suggestedFloat.toFixed(2)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">
                    Nome do Terminal / Ponto:
                  </label>
                  <input
                    type="text"
                    required
                    value={terminalNameInput}
                    onChange={(e) => setTerminalNameInput(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-neutral-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-neutral-800 font-bold mb-0.5 text-sm">
                    Fundo de Troco Inicial:
                  </label>
                  <p className="text-xs text-neutral-600 mb-2 font-medium">
                    Informe quanto dinheiro existe fisicamente na gaveta agora.
                  </p>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 font-black text-lg">
                      R$
                    </span>
                    <input
                      id="input-fundo-inicial-abertura"
                      type="text"
                      required
                      placeholder="0,00"
                      value={openingAmountInput}
                      onChange={(e) => setOpeningAmountInput(e.target.value)}
                      className="w-full pl-11 pr-4 py-2.5 bg-white border-2 border-emerald-400 focus:border-emerald-600 rounded-xl text-neutral-950 font-black text-xl sm:text-2xl shadow-2xs focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                      autoFocus
                    />
                  </div>
                  <span className="text-[11px] text-neutral-500 block mt-1">
                    Confira as cédulas e moedas físicas na gaveta antes de confirmar a abertura.
                  </span>
                </div>

                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">
                    Observação (Opcional):
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Cédulas miúdas e moedas conferidas"
                    value={openNotesInput}
                    onChange={(e) => setOpenNotesInput(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-neutral-900"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200">
                  <button
                    type="button"
                    onClick={() => setIsOpenModalActive(false)}
                    className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700 font-medium hover:bg-neutral-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Abrindo...' : 'Confirmar Abertura'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Histórico pessoal de fechamentos */}
        {myCashHistory.length > 0 && (
          <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-neutral-200 bg-neutral-50">
              <h3 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
                <History className="w-4 h-4 text-neutral-600" />
                <span>Meus Fechamentos Anteriores</span>
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-100 text-neutral-600 font-semibold border-b border-neutral-200">
                  <tr>
                    <th className="py-2 px-4">Terminal</th>
                    <th className="py-2 px-4">Abertura</th>
                    <th className="py-2 px-4">Fechamento</th>
                    <th className="py-2 px-4 text-right">Fundo Inicial</th>
                    <th className="py-2 px-4 text-right">Esperado</th>
                    <th className="py-2 px-4 text-right">Contado</th>
                    <th className="py-2 px-4 text-right">Diferença</th>
                    <th className="py-2 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-neutral-800">
                  {myCashHistory.slice(0, 5).map((reg) => (
                    <tr key={reg.id} className="hover:bg-neutral-50">
                      <td className="py-2.5 px-4 font-bold">{reg.terminalName}</td>
                      <td className="py-2.5 px-4">{new Date(reg.openedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                      <td className="py-2.5 px-4">
                        {reg.closedAt ? new Date(reg.closedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Em Aberto'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium">R$ {reg.openingAmount.toFixed(2)}</td>
                      <td className="py-2.5 px-4 text-right">R$ {(reg.expectedCash || 0).toFixed(2)}</td>
                      <td className="py-2.5 px-4 text-right font-bold">
                        {reg.countedCash !== undefined ? `R$ ${reg.countedCash.toFixed(2)}` : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {reg.difference !== undefined ? (
                          <span className={reg.difference === 0 ? 'text-emerald-700 font-bold' : reg.difference > 0 ? 'text-blue-700 font-bold' : 'text-red-700 font-bold'}>
                            {reg.difference === 0 ? 'Exato' : `R$ ${reg.difference.toFixed(2)}`}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-neutral-100 text-neutral-700">
                          {reg.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER STATE 3: CAIXA ABERTO (Estado Operacional Principal)
  // -------------------------------------------------------------
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Toast notifications */}
      {uiSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{uiSuccess}</span>
        </div>
      )}
      {uiError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{uiError}</span>
        </div>
      )}

      {/* Header: Status, Operador e Ações Principais */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
              <Banknote className="w-6 h-6 text-emerald-700" />
              <span>Meu Caixa Operacional</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-emerald-100 text-emerald-800 flex items-center gap-1.5 border border-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span>Aberto</span>
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Terminal: <strong>{activeCashRegister.terminalName}</strong> ({activeCashRegister.displayCode || activeCashRegister.id}) • Operador: <strong>{currentUser.name}</strong> • Aberto às {new Date(activeCashRegister.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Primary Operational Actions */}
        <div className="flex items-center gap-2">
          {onGoToBalcao && (
            <button
              id="btn-header-ir-balcao"
              type="button"
              onClick={onGoToBalcao}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>Ir para o Balcão</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setMovementType('suprimento');
              setMovementAmountInput('');
              setMovementReasonInput('');
              setMovementConfirmedCheck(false);
              setUiError(null);
              setIsMovementModalActive(true);
            }}
            className="px-3.5 py-2 border border-emerald-300 bg-emerald-50 text-emerald-800 font-semibold text-xs rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowDownCircle className="w-4 h-4 text-emerald-700" />
            <span>Suprimento (Entrada)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMovementType('sangria');
              setMovementAmountInput('');
              setMovementReasonInput('');
              setMovementConfirmedCheck(false);
              setUiError(null);
              setIsMovementModalActive(true);
            }}
            className="px-3.5 py-2 border border-amber-300 bg-amber-50 text-amber-900 font-semibold text-xs rounded-lg hover:bg-amber-100 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowUpCircle className="w-4 h-4 text-amber-700" />
            <span>Sangria (Retirada)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCountedCashInput('');
              setDivergenceReasonInput('');
              setCloseNotesInput('');
              setConfirmWithdrawalCheck(false);
              setUiError(null);
              setIsClosingFlowActive(true);
            }}
            className="px-4 py-2 bg-neutral-900 hover:bg-black text-white font-bold text-xs rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span>Conferir / Fechar Caixa</span>
          </button>
        </div>
      </div>

      {/* UX-01: Just Opened Next Action Banner */}
      {justOpenedInfo && (
        <div id="banner-caixa-aberto-sucesso" className="bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Caixa Aberto com Sucesso
              </div>
              <div className="text-base sm:text-lg font-black text-emerald-950 mt-0.5">
                Terminal {activeCashRegister.terminalName} • Fundo: R$ {activeCashRegister.openingAmount.toFixed(2)}
              </div>
              <p className="text-xs text-emerald-800 mt-0.5">
                Terminal pronto para atender clientes. Clique abaixo para iniciar suas vendas no balcão.
              </p>
            </div>
          </div>

          {onGoToBalcao && (
            <button
              id="btn-banner-ir-balcao"
              onClick={onGoToBalcao}
              className="min-h-[46px] px-6 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <span>IR PARA O BALCÃO</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Cartão de Destaque: Dinheiro Físico Esperado na Gaveta */}
      <div className="bg-white rounded-xl border border-emerald-300 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-neutral-100">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">
              Dinheiro Físico em Gaveta
            </div>
            <div className="text-2xl font-black text-emerald-950 mt-0.5">
              R$ {expectedPhysicalCash.toFixed(2)}
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Soma estrita do fundo de troco, entradas em espécie e suprimentos, deduzidas as sangrias.
            </p>
          </div>

          <div className="bg-emerald-50 px-3.5 py-2 rounded-lg border border-emerald-200 text-right">
            <div className="text-[10px] uppercase font-semibold text-emerald-800">Total Geral de Vendas no Turno</div>
            <div className="text-lg font-bold text-emerald-900">
              R$ {registerSalesMetrics.totalSalesAmount.toFixed(2)}
            </div>
            <div className="text-[11px] text-emerald-700">
              {registerSalesMetrics.salesCount} venda(s) registrada(s)
            </div>
          </div>
        </div>

        {/* Fórmulas Aritméticas do Dinheiro Físico */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
            <span className="text-neutral-500 block">Fundo de Abertura:</span>
            <span className="font-bold text-neutral-800 text-sm">+ R$ {openingAmount.toFixed(2)}</span>
          </div>

          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
            <span className="text-emerald-800 block">Vendas em Espécie (Dinheiro):</span>
            <span className="font-bold text-emerald-950 text-sm">+ R$ {registerSalesMetrics.cashSales.toFixed(2)}</span>
          </div>

          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <span className="text-blue-800 block">Suprimentos Adicionados:</span>
            <span className="font-bold text-blue-900 text-sm">+ R$ {cashSuprimentos.toFixed(2)}</span>
          </div>

          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
            <span className="text-amber-800 block">Sangrias Efetuadas:</span>
            <span className="font-bold text-amber-900 text-sm">- R$ {cashSangrias.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Cartão de Vendas Eletrônicas & Formas de Pagamento */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-neutral-900 text-xs uppercase tracking-wider">
            Vendas por Meio de Pagamento (Turno Atual)
          </h3>
          <span className="text-[11px] text-neutral-500">
            Pix e Cartões são liquidados eletronicamente e não compõem a gaveta física.
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50">
            <div className="flex items-center gap-1.5 text-emerald-800 font-semibold mb-1">
              <Banknote className="w-3.5 h-3.5" />
              <span>Dinheiro</span>
            </div>
            <div className="text-base font-bold text-emerald-950">
              R$ {registerSalesMetrics.cashSales.toFixed(2)}
            </div>
            <span className="text-[10px] text-emerald-700 block mt-0.5">Entra na gaveta física</span>
          </div>

          <div className="p-3 rounded-lg border border-teal-200 bg-teal-50/50">
            <div className="flex items-center gap-1.5 text-teal-800 font-semibold mb-1">
              <QrCode className="w-3.5 h-3.5" />
              <span>Pix Direto</span>
            </div>
            <div className="text-base font-bold text-teal-950">
              R$ {registerSalesMetrics.pixSales.toFixed(2)}
            </div>
            <span className="text-[10px] text-teal-700 block mt-0.5">Conta bancária</span>
          </div>

          <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/50">
            <div className="flex items-center gap-1.5 text-blue-800 font-semibold mb-1">
              <CreditCard className="w-3.5 h-3.5" />
              <span>Cartão Débito</span>
            </div>
            <div className="text-base font-bold text-blue-950">
              R$ {registerSalesMetrics.debitSales.toFixed(2)}
            </div>
            <span className="text-[10px] text-blue-700 block mt-0.5">Maquininha TEF/POS</span>
          </div>

          <div className="p-3 rounded-lg border border-purple-200 bg-purple-50/50">
            <div className="flex items-center gap-1.5 text-purple-800 font-semibold mb-1">
              <CreditCard className="w-3.5 h-3.5" />
              <span>Cartão Crédito</span>
            </div>
            <div className="text-base font-bold text-purple-950">
              R$ {registerSalesMetrics.creditSales.toFixed(2)}
            </div>
            <span className="text-[10px] text-purple-700 block mt-0.5">Maquininha TEF/POS</span>
          </div>
        </div>
      </div>

      {/* Extrato Individual por Operador nesta Gaveta Compartilhada */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-neutral-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-700" />
              <span>Extrato por Atendente / Operador (Gaveta Física Compartilhada)</span>
            </h3>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              A gaveta física é única por terminal, mas cada funcionário mantém sua responsabilidade individual rastreada.
            </p>
          </div>
          {onOpenSwitchOperatorModal && (
            <button
              onClick={onOpenSwitchOperatorModal}
              className="px-3 py-1.5 bg-neutral-900 hover:bg-black text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-2xs cursor-pointer self-start sm:self-auto"
            >
              <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
              <span>Trocar Atendente [PIN]</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-100 text-neutral-600 font-semibold border-b border-neutral-200">
              <tr>
                <th className="py-2.5 px-4">Operador</th>
                <th className="py-2.5 px-4 text-right">Qtd Vendas</th>
                <th className="py-2.5 px-4 text-right">Total Vendido</th>
                <th className="py-2.5 px-4 text-right">Em Dinheiro</th>
                <th className="py-2.5 px-4 text-right">Em Pix</th>
                <th className="py-2.5 px-4 text-right">Em Cartões</th>
                <th className="py-2.5 px-4 text-right">Descontos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-neutral-800">
              {computedOperatorSummaries.map((op) => (
                <tr key={op.operatorId} className={op.operatorId === currentUser.id ? 'bg-emerald-50/50 font-medium' : 'hover:bg-neutral-50'}>
                  <td className="py-2.5 px-4 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${op.operatorId === currentUser.id ? 'bg-emerald-600' : 'bg-neutral-400'}`} />
                    <strong className="text-neutral-900">{op.operatorName}</strong>
                    {op.operatorId === currentUser.id && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">Você</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right font-medium">{op.salesCount}</td>
                  <td className="py-2.5 px-4 text-right font-bold text-neutral-900">R$ {op.totalSold.toFixed(2)}</td>
                  <td className="py-2.5 px-4 text-right text-emerald-800 font-semibold">R$ {op.cashSales.toFixed(2)}</td>
                  <td className="py-2.5 px-4 text-right text-teal-800 font-semibold">R$ {op.pixSales.toFixed(2)}</td>
                  <td className="py-2.5 px-4 text-right text-blue-800 font-semibold">R$ {(op.cardDebitSales + op.cardCreditSales).toFixed(2)}</td>
                  <td className="py-2.5 px-4 text-right text-neutral-600">R$ {op.discountTotal.toFixed(2)}</td>
                </tr>
              ))}
              {computedOperatorSummaries.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-neutral-400">
                    Nenhuma venda registrada nesta sessão até o momento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Histórico de Movimentações (Sangrias e Suprimentos) da Sessão */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
          <h3 className="font-bold text-neutral-900 text-xs uppercase tracking-wider">
            Movimentações da Sessão Atual
          </h3>
          <span className="text-xs text-neutral-500">
            {movements.length} registro(s) efetuado(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-100 text-neutral-600 font-semibold border-b border-neutral-200">
              <tr>
                <th className="py-2.5 px-4">Hora</th>
                <th className="py-2.5 px-4">Tipo</th>
                <th className="py-2.5 px-4">Justificativa / Motivo</th>
                <th className="py-2.5 px-4">Autorizado Por</th>
                <th className="py-2.5 px-4 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-neutral-800">
              {movements.map((m) => (
                <tr key={m.id} className="hover:bg-neutral-50">
                  <td className="py-2.5 px-4 text-neutral-600">
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-2.5 px-4 font-semibold">
                    {m.type === 'suprimento' ? (
                      <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <ArrowDownCircle className="w-3.5 h-3.5" />
                        <span>Suprimento</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <ArrowUpCircle className="w-3.5 h-3.5" />
                        <span>Sangria</span>
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-neutral-800">{m.reason}</td>
                  <td className="py-2.5 px-4 text-neutral-600">{m.authorizedByName || 'Operador'}</td>
                  <td className="py-2.5 px-4 text-right font-bold">
                    <span className={m.type === 'suprimento' ? 'text-emerald-700' : 'text-amber-800'}>
                      {m.type === 'suprimento' ? `+ R$ ${m.amount.toFixed(2)}` : `- R$ ${m.amount.toFixed(2)}`}
                    </span>
                  </td>
                </tr>
              ))}
              {movements.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-neutral-400">
                    Nenhuma sangria ou suprimento registrado nesta sessão até o momento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Sangria ou Suprimento */}
      {isMovementModalActive && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-neutral-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <div className="flex items-center gap-2 font-bold text-base text-neutral-900">
                {movementType === 'sangria' ? (
                  <>
                    <ArrowUpCircle className="w-5 h-5 text-amber-700" />
                    <span>Registrar Sangria (Retirada de Dinheiro)</span>
                  </>
                ) : (
                  <>
                    <ArrowDownCircle className="w-5 h-5 text-emerald-700" />
                    <span>Registrar Suprimento (Entrada de Troco)</span>
                  </>
                )}
              </div>
              <button
                onClick={() => setIsMovementModalActive(false)}
                className="text-neutral-400 hover:text-neutral-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {uiError && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
                {uiError}
              </div>
            )}

            <form onSubmit={handleMovementSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-neutral-700 font-semibold mb-1">
                  Valor da Movimentação (R$):
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={movementAmountInput}
                  onChange={(e) => setMovementAmountInput(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-neutral-900 font-bold text-sm"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">
                  {movementType === 'sangria' ? (
                    <>
                      <span>Justificativa da Sangria (Obrigatória):</span>
                      <span className="text-red-600 ml-1">*</span>
                    </>
                  ) : (
                    <span>Motivo do Suprimento (Opcional):</span>
                  )}
                </label>
                <input
                  type="text"
                  required={movementType === 'sangria'}
                  placeholder={
                    movementType === 'sangria'
                      ? 'Ex: Recolhimento de excesso para cofre / pagamento urgente motoboy'
                      : 'Ex: Suprimento de notas miúdas para troco'
                  }
                  value={movementReasonInput}
                  onChange={(e) => setMovementReasonInput(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-neutral-900"
                />
              </div>

              {/* Checkbox de confirmação física explícita */}
              <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={movementConfirmedCheck}
                    onChange={(e) => setMovementConfirmedCheck(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-emerald-700 border-neutral-300 focus:ring-emerald-500"
                  />
                  <span className="text-xs text-neutral-800 font-medium">
                    {movementType === 'sangria' ? (
                      <span>Confirmo que este valor foi <strong>retirado fisicamente</strong> do caixa.</span>
                    ) : (
                      <span>Confirmo que este valor foi <strong>adicionado fisicamente</strong> ao caixa.</span>
                    )}
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsMovementModalActive(false)}
                  className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700 font-medium hover:bg-neutral-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !movementConfirmedCheck || (movementType === 'sangria' && !movementReasonInput.trim())}
                  className={`px-5 py-2.5 font-bold text-white rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer ${
                    movementType === 'sangria' ? 'bg-amber-700 hover:bg-amber-800' : 'bg-emerald-700 hover:bg-emerald-800'
                  }`}
                >
                  {isSubmitting
                    ? 'Gravando...'
                    : movementType === 'sangria'
                    ? 'CONFIRMAR RETIRADA'
                    : 'CONFIRMAR ENTRADA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
