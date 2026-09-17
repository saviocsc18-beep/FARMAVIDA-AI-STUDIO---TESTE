import React, { useState } from 'react';
import { User, WorkShift, CashRegister, Sale, Store, Terminal } from '../types';
import { MeuTurnoView } from './MeuTurnoView';
import { MeuCaixaView } from './MeuCaixaView';
import { formatCurrencyBRL } from '../lib/format';
import { 
  Clock, 
  Banknote, 
  ShoppingBag, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Lock, 
  ShieldCheck, 
  Monitor, 
  HelpCircle, 
  Info, 
  UserCheck, 
  ChevronRight, 
  LogOut, 
  PlusCircle, 
  KeyRound 
} from 'lucide-react';

export interface MinhaOperacaoViewProps {
  currentUser: User;
  activeShift: WorkShift | null;
  activeCashRegister: CashRegister | null;
  allShifts?: WorkShift[];
  workShifts?: WorkShift[];
  cashRegisters?: CashRegister[];
  cashHistory?: CashRegister[];
  sales?: Sale[];
  store: Store;
  terminalId?: string;
  terminals?: Terminal[];
  defaultSubTab?: 'jornada' | 'turno' | 'caixa';
  onStartShift: () => Promise<{ success: boolean; error?: string } | void> | void;
  onToggleBreak: () => Promise<{ success: boolean; error?: string } | void> | void;
  onEndShift: (notes?: string) => Promise<{ success: boolean; error?: string } | void> | void;
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
  onGoToBalcao?: () => void;
  onNavigateToBalcao?: () => void;
  onOpenSwitchOperatorModal?: () => void;
}

export const MinhaOperacaoView: React.FC<MinhaOperacaoViewProps> = ({
  currentUser,
  activeShift,
  activeCashRegister,
  allShifts = [],
  workShifts = [],
  cashRegisters = [],
  cashHistory = [],
  sales = [],
  store,
  terminalId,
  terminals = [],
  defaultSubTab = 'jornada',
  onStartShift,
  onToggleBreak,
  onEndShift,
  onOpenCash,
  onAddMovement,
  onCloseCash,
  onGoToBalcao,
  onNavigateToBalcao,
  onOpenSwitchOperatorModal,
}) => {
  const [subTab, setSubTab] = useState<'jornada' | 'turno' | 'caixa'>(defaultSubTab);
  const [showTermExplanation, setShowTermExplanation] = useState(false);

  React.useEffect(() => {
    if (defaultSubTab) {
      setSubTab(defaultSubTab);
    }
  }, [defaultSubTab]);

  const effectiveCashList = cashRegisters.length > 0 ? cashRegisters : cashHistory;
  const effectiveShiftsList = allShifts.length > 0 ? allShifts : workShifts;
  const handleGoToBalcao = onGoToBalcao || onNavigateToBalcao || (() => {});

  const currentTerminal = terminals.find((t) => t.id === terminalId) || {
    id: terminalId || 'terminal_01',
    name: terminalId === 'terminal_02' ? 'Terminal Balcão 02' : 'Terminal Balcão 01',
    drawerId: terminalId === 'terminal_02' ? 'gaveta_02' : 'gaveta_01',
    drawerName: terminalId === 'terminal_02' ? 'Gaveta Balcão 02' : 'Gaveta Balcão 01',
  };

  // Determine stage states
  const hasShift = Boolean(activeShift && (activeShift.status === 'em_andamento' || activeShift.status === 'pausado'));
  const hasCash = Boolean(activeCashRegister && activeCashRegister.status === 'aberto');
  const canSell = hasShift && hasCash;

  // Check if collaborator already closed cash in this shift
  const hasClosedCashThisShift = React.useMemo(() => {
    if (!activeShift || !effectiveCashList) return false;
    return effectiveCashList.some(
      (cr) => cr.status === 'fechado' && (cr.openedBy === currentUser.id || (cr as any).openedById === currentUser.id) && cr.workShiftId === activeShift.id
    );
  }, [activeShift, effectiveCashList, currentUser.id]);

  const stages = [
    {
      step: 1,
      id: 'step_shift',
      title: 'Iniciar expediente',
      description: 'Registro de ponto eletrônico individual',
      status: hasShift ? 'completed' : 'active',
      icon: Clock,
      badge: hasShift ? 'Expediente Ativo' : 'Pendente',
      badgeColor: hasShift ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800',
      actionLabel: hasShift ? 'Gerenciar Ponto' : 'Bater Ponto de Entrada',
      onClick: hasShift ? () => setSubTab('turno') : onStartShift,
    },
    {
      step: 2,
      id: 'step_cash_open',
      title: 'Abrir caixa',
      description: 'Vínculo do operador, terminal, gaveta e troco',
      status: hasCash ? 'completed' : hasShift ? 'active' : 'locked',
      icon: Banknote,
      badge: hasCash ? `Caixa ${activeCashRegister?.displayCode || 'Aberto'}` : hasShift ? 'Aguardando Abertura' : 'Bloqueado',
      badgeColor: hasCash ? 'bg-emerald-100 text-emerald-800' : hasShift ? 'bg-blue-100 text-blue-800' : 'bg-neutral-100 text-neutral-500',
      actionLabel: hasCash ? 'Ver Caixa Aberto' : 'Abrir Caixa Individual',
      onClick: () => setSubTab('caixa'),
    },
    {
      step: 3,
      id: 'step_sell',
      title: 'Vender no Balcão & PDV',
      description: 'Atendimento a clientes, carrinho e pagamentos',
      status: canSell ? 'active' : 'locked',
      icon: ShoppingBag,
      badge: canSell ? 'Pronto para Vender' : 'Exige Turno e Caixa',
      badgeColor: canSell ? 'bg-emerald-600 text-white font-bold' : 'bg-neutral-100 text-neutral-500',
      actionLabel: 'Acessar Balcão & PDV',
      onClick: handleGoToBalcao,
    },
    {
      step: 4,
      id: 'step_cash_close',
      title: 'Fechar caixa',
      description: 'Conferência de espécie e apuração de divergência',
      status: hasCash ? 'pending_action' : hasClosedCashThisShift ? 'completed' : 'locked',
      icon: Lock,
      badge: hasClosedCashThisShift ? 'Caixa Conferido' : hasCash ? 'Pendente ao Final' : 'Não Iniciado',
      badgeColor: hasClosedCashThisShift ? 'bg-emerald-100 text-emerald-800' : hasCash ? 'bg-amber-100 text-amber-800' : 'bg-neutral-100 text-neutral-500',
      actionLabel: 'Conferir e Fechar Caixa',
      onClick: () => setSubTab('caixa'),
    },
    {
      step: 5,
      id: 'step_shift_end',
      title: 'Encerrar expediente',
      description: 'Registro de saída e fechamento da jornada',
      status: !hasShift ? 'completed' : hasCash ? 'locked' : 'active',
      icon: LogOut,
      badge: !hasShift ? 'Turno Encerrado' : hasCash ? 'Bloqueado (Caixa Aberto)' : 'Pronto para Saída',
      badgeColor: !hasShift ? 'bg-neutral-200 text-neutral-700' : hasCash ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800',
      actionLabel: 'Encerrar Expediente',
      onClick: () => setSubTab('turno'),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header & Sub-Navigation */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 bg-linear-to-r from-emerald-950 via-emerald-900 to-neutral-900 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 uppercase tracking-wider">
                Minha Operação
              </span>
              <span className="text-xs text-emerald-200">
                {store.name}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Central Operacional do Colaborador
            </h1>
            <p className="text-xs sm:text-sm text-emerald-200 mt-0.5">
              Jornada sequencial obrigatória: Expediente · Caixa Individual · Vendas · Fechamento
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowTermExplanation(!showTermExplanation)}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Entenda a diferença entre Terminal, Gaveta e Caixa"
            >
              <HelpCircle className="w-3.5 h-3.5 text-emerald-300" />
              <span>O que é Terminal, Gaveta e Caixa?</span>
            </button>

            {onOpenSwitchOperatorModal && (
              <button
                onClick={onOpenSwitchOperatorModal}
                className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <KeyRound className="w-3.5 h-3.5 text-emerald-200" />
                <span>Trocar Operador [PIN]</span>
              </button>
            )}
          </div>
        </div>

        {/* Informative Explanation Banner on Terminal/Gaveta/Caixa */}
        {showTermExplanation && (
          <div className="bg-sky-50 border-b border-sky-100 p-4 text-xs text-sky-950 flex items-start gap-3 transition-all">
            <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
            <div className="space-y-1.5 leading-relaxed">
              <div className="font-bold text-sky-900 text-sm">
                Conceitos Operacionais da Drogaria FarmaVida:
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                <div className="bg-white p-2.5 rounded-lg border border-sky-200">
                  <span className="font-bold text-sky-800 block mb-0.5">🖥️ Terminal</span>
                  É o <strong>computador físico / estação de trabalho</strong> onde o atendente está logado.
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-sky-200">
                  <span className="font-bold text-sky-800 block mb-0.5">📥 Gaveta</span>
                  É o <strong>compartimento físico de dinheiro</strong> conectado ao terminal para guarda de cédulas e moedas.
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-sky-200">
                  <span className="font-bold text-sky-800 block mb-0.5">💼 Caixa</span>
                  É a <strong>sessão financeira individual</strong> do colaborador vinculada ao seu turno. O colaborador é responsável pelo saldo apurado nesta sessão.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Operational Context Bar */}
        <div className="bg-neutral-50 px-5 py-3 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-700" />
              <span className="text-neutral-500">Operador:</span>
              <strong className="text-neutral-900">{currentUser.name}</strong>
            </div>

            <div className="h-4 w-px bg-neutral-300 hidden sm:block" />

            <div className="flex items-center gap-1.5">
              <Monitor className="w-4 h-4 text-sky-600" />
              <span className="text-neutral-500">Terminal:</span>
              <strong className="text-neutral-900">{currentTerminal.name}</strong>
            </div>

            <div className="h-4 w-px bg-neutral-300 hidden sm:block" />

            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-700" />
              <span className="text-neutral-500">Turno:</span>
              <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                hasShift ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-700'
              }`}>
                {hasShift ? (activeShift?.status === 'pausado' ? 'Em Pausa' : 'Em Andamento') : 'Não Iniciado'}
              </span>
            </div>

            <div className="h-4 w-px bg-neutral-300 hidden sm:block" />

            <div className="flex items-center gap-1.5">
              <Banknote className="w-4 h-4 text-emerald-700" />
              <span className="text-neutral-500">Caixa Individual:</span>
              <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                hasCash ? 'bg-emerald-600 text-white' : 'bg-neutral-200 text-neutral-700'
              }`}>
                {hasCash ? `Aberto (${activeCashRegister?.displayCode || 'CX'})` : 'Fechado'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setSubTab('jornada')}
              className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors cursor-pointer ${
                subTab === 'jornada' ? 'bg-emerald-700 text-white shadow-xs' : 'text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              Jornada Operacional
            </button>
            <button
              onClick={() => setSubTab('turno')}
              className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors cursor-pointer ${
                subTab === 'turno' ? 'bg-emerald-700 text-white shadow-xs' : 'text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              Meu Turno & Ponto
            </button>
            <button
              onClick={() => setSubTab('caixa')}
              className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors cursor-pointer ${
                subTab === 'caixa' ? 'bg-emerald-700 text-white shadow-xs' : 'text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              Meu Caixa
            </button>
          </div>
        </div>
      </div>

      {/* View Content depending on active sub-tab */}
      {subTab === 'jornada' && (
        <div className="space-y-6">
          {/* Visual 5-Stage Stepper */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs">
            <h2 className="text-base font-bold text-neutral-900 mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
              <span>Etapas Obrigatórias da Operação Diária</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {stages.map((stage) => {
                const Icon = stage.icon;
                const isCompleted = stage.status === 'completed';
                const isActive = stage.status === 'active';
                const isLocked = stage.status === 'locked';

                return (
                  <div
                    key={stage.id}
                    className={`rounded-xl p-4 border flex flex-col justify-between transition-all ${
                      isCompleted
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                        : isActive
                        ? 'bg-white border-emerald-600 shadow-sm ring-1 ring-emerald-500/20'
                        : 'bg-neutral-50/70 border-neutral-200 text-neutral-400'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                          isCompleted ? 'bg-emerald-600 text-white' : isActive ? 'bg-emerald-700 text-white' : 'bg-neutral-300 text-neutral-600'
                        }`}>
                          {isCompleted ? '✓' : stage.step}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${stage.badgeColor}`}>
                          {stage.badge}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`w-4 h-4 ${isCompleted || isActive ? 'text-emerald-700' : 'text-neutral-400'}`} />
                        <h3 className="font-bold text-xs text-neutral-900 leading-tight">
                          {stage.title}
                        </h3>
                      </div>

                      <p className="text-[11px] text-neutral-500 line-clamp-2 mb-3">
                        {stage.description}
                      </p>
                    </div>

                    <button
                      onClick={stage.onClick}
                      disabled={isLocked}
                      className={`w-full py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs'
                          : isCompleted
                          ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                          : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                      }`}
                    >
                      <span>{stage.actionLabel}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Action Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quick Shift Summary Card */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-emerald-700" />
                    <h3 className="font-bold text-neutral-900 text-sm">Meu Expediente & Ponto</h3>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    hasShift ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-700'
                  }`}>
                    {hasShift ? 'Ponto Aberto' : 'Fora de Turno'}
                  </span>
                </div>

                {hasShift ? (
                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 space-y-1">
                      <div className="text-neutral-600 flex justify-between">
                        <span>Horário de Entrada:</span>
                        <strong className="text-neutral-900">
                          {new Date(activeShift!.startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </strong>
                      </div>
                      <div className="text-neutral-600 flex justify-between">
                        <span>Pausas Registradas:</span>
                        <strong className="text-neutral-900">{activeShift?.breaks?.length || 0}</strong>
                      </div>
                    </div>
                    {hasCash && (
                      <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Atenção: Para encerrar o expediente, você deverá fechar seu caixa primeiro.</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500 mb-4 leading-relaxed">
                    Você ainda não iniciou seu expediente hoje. Para abrir o caixa e realizar vendas no Balcão & PDV, primeiro registre seu ponto de entrada.
                  </p>
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-neutral-100 flex items-center gap-2">
                {!hasShift ? (
                  <button
                    onClick={onStartShift}
                    className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-2"
                  >
                    <Clock className="w-4 h-4" />
                    <span>Iniciar Expediente Agora</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setSubTab('turno')}
                    className="w-full py-2.5 px-4 bg-neutral-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-2"
                  >
                    <span>Abrir Controle de Turno & Ponto</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Cash Summary Card */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-5 h-5 text-emerald-700" />
                    <h3 className="font-bold text-neutral-900 text-sm">Meu Caixa Individual</h3>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    hasCash ? 'bg-emerald-600 text-white' : 'bg-neutral-100 text-neutral-700'
                  }`}>
                    {hasCash ? 'Sessão Ativa' : 'Caixa Fechado'}
                  </span>
                </div>

                {hasCash ? (
                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1.5">
                      <div className="flex justify-between text-neutral-600">
                        <span>Código do Caixa:</span>
                        <strong className="text-neutral-900 font-mono">{activeCashRegister?.displayCode}</strong>
                      </div>
                      <div className="flex justify-between text-neutral-600">
                        <span>Fundo de Troco Inicial:</span>
                        <strong className="text-neutral-900">{formatCurrencyBRL(activeCashRegister?.openingAmount)}</strong>
                      </div>
                      <div className="flex justify-between text-neutral-600">
                        <span>Saldo Esperado em Espécie:</span>
                        <strong className="text-emerald-700 font-bold">{formatCurrencyBRL(activeCashRegister?.expectedCash)}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={onGoToBalcao}
                        className="flex-1 py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span>Ir para Balcão & PDV</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500 mb-4 leading-relaxed">
                    Nenhum caixa aberto para o seu operador neste terminal. Abra o caixa com o fundo de troco inicial para habilitar as vendas no Balcão & PDV.
                  </p>
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-neutral-100 flex items-center gap-2">
                <button
                  onClick={() => setSubTab('caixa')}
                  className="w-full py-2.5 px-4 bg-neutral-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-2"
                >
                  <span>{hasCash ? 'Conferência e Movimentações do Caixa' : 'Abrir Caixa Individual'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {subTab === 'turno' && (
        <MeuTurnoView
          currentUser={currentUser}
          activeShift={activeShift}
          activeCashRegister={activeCashRegister}
          cashRegisters={effectiveCashList}
          allShifts={effectiveShiftsList}
          onStartShift={onStartShift}
          onToggleBreak={onToggleBreak}
          onEndShift={onEndShift}
          onGoToCash={() => setSubTab('caixa')}
          onGoToBalcao={handleGoToBalcao}
        />
      )}

      {subTab === 'caixa' && (
        <MeuCaixaView
          currentUser={currentUser}
          activeShift={activeShift}
          activeCashRegister={activeCashRegister}
          cashHistory={effectiveCashList}
          sales={sales}
          store={store}
          terminalId={terminalId}
          terminals={terminals}
          onOpenSwitchOperatorModal={onOpenSwitchOperatorModal}
          onOpenCash={onOpenCash}
          onAddMovement={onAddMovement}
          onCloseCash={onCloseCash}
          onGoToTurno={() => setSubTab('turno')}
          onGoToBalcao={handleGoToBalcao}
        />
      )}
    </div>
  );
};
