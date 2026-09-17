import React, { useState, useMemo, useEffect } from 'react';
import { WorkShift, User, CashRegister } from '../types';
import {
  Clock,
  Coffee,
  CheckCircle2,
  AlertCircle,
  LogOut,
  ArrowRight,
  ShieldAlert,
  Calendar,
  Timer,
  Store,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';

interface MeuTurnoViewProps {
  currentUser: User;
  activeShift: WorkShift | null;
  activeCashRegister: CashRegister | null;
  cashRegisters?: CashRegister[];
  allShifts: WorkShift[];
  onStartShift: () => Promise<{ success: boolean; error?: string } | void> | void;
  onToggleBreak: () => Promise<{ success: boolean; error?: string } | void> | void;
  onEndShift: (notes?: string) => Promise<{ success: boolean; error?: string } | void> | void;
  onGoToCash: () => void;
  onGoToBalcao?: () => void;
}

export const MeuTurnoView: React.FC<MeuTurnoViewProps> = ({
  currentUser,
  activeShift,
  activeCashRegister,
  cashRegisters = [],
  allShifts,
  onStartShift,
  onToggleBreak,
  onEndShift,
  onGoToCash,
  onGoToBalcao,
}) => {
  const [endNotes, setEndNotes] = useState('');
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // User's own shifts sorted descending
  const myShifts = useMemo(() => {
    return allShifts
      .filter((s) => s.userId === currentUser.id)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }, [allShifts, currentUser.id]);

  // Check if collaborator closed cash in this shift
  const userClosedCashThisShift = useMemo(() => {
    if (!activeShift || !cashRegisters) return false;
    return cashRegisters.some(
      (cr) =>
        (cr.openedBy === currentUser.id || cr.openedById === currentUser.id) &&
        cr.status === 'fechado' &&
        (cr.workShiftId === activeShift.id ||
          (cr.closedAt && new Date(cr.closedAt) >= new Date(activeShift.startedAt)))
    );
  }, [cashRegisters, currentUser.id, activeShift]);

  // Derived cash status for Meu Turno
  const cashStatus: 'aberto' | 'fechado' | 'nao_aberto' = activeCashRegister
    ? 'aberto'
    : userClosedCashThisShift
    ? 'fechado'
    : 'nao_aberto';

  // Live timer for elapsed shift duration
  const [elapsedFormatted, setElapsedFormatted] = useState<string>('');

  useEffect(() => {
    if (!activeShift) {
      setElapsedFormatted('');
      return;
    }

    const updateTimer = () => {
      const start = new Date(activeShift.startedAt).getTime();
      const now = Date.now();
      const diffMs = Math.max(0, now - start);
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      setElapsedFormatted(`${hours}h ${mins.toString().padStart(2, '0')}m`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [activeShift]);

  // Handle clicking "Encerrar Expediente"
  const handleAttemptEndShift = () => {
    setSubmissionError(null);
    if (activeCashRegister) {
      // FRONTEND ENFORCEMENT: Block if cash register is open
      setShowBlockedModal(true);
    } else {
      setShowEndConfirm(true);
    }
  };

  // Submit ending shift
  const handleConfirmEndShift = async () => {
    setIsSubmitting(true);
    setSubmissionError(null);
    try {
      const result = await onEndShift(endNotes);
      if (result && !result.success) {
        setSubmissionError(result.error || 'Erro ao encerrar expediente.');
      } else {
        setShowEndConfirm(false);
        setEndNotes('');
      }
    } catch (err: any) {
      setSubmissionError(err.message || 'Erro inesperado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="meu-turno-container" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-6 h-6 text-emerald-700" />
            <h1 className="text-xl font-bold text-neutral-900">Meu Turno & Ponto</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200">
              {currentUser.roleTitle || (currentUser.role === 'admin' ? 'Gerência' : 'Balconista')}
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Registro de jornada de trabalho, controle de pausas e integração direta com o Meu Caixa.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!activeShift ? (
            <button
              id="btn-iniciar-expediente"
              onClick={async () => {
                setSubmissionError(null);
                await onStartShift();
              }}
              className="px-4 py-2.5 bg-emerald-700 text-white font-bold text-sm rounded-lg hover:bg-emerald-800 transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Clock className="w-4 h-4" />
              <span>Iniciar Expediente de Hoje</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                id="btn-toggle-intervalo"
                onClick={async () => {
                  setSubmissionError(null);
                  await onToggleBreak();
                }}
                className={`px-3.5 py-2 border font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeShift.status === 'pausado'
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    : 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                }`}
              >
                <Coffee className="w-4 h-4 text-amber-700" />
                <span>{activeShift.status === 'pausado' ? 'Retomar do Intervalo' : 'Iniciar Intervalo'}</span>
              </button>

              <button
                id="btn-encerrar-expediente"
                onClick={handleAttemptEndShift}
                className="px-3.5 py-2 bg-neutral-800 text-white font-semibold text-xs rounded-lg hover:bg-neutral-900 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-neutral-300" />
                <span>Encerrar Expediente</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Submission Error Banner */}
      {submissionError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span className="font-medium">{submissionError}</span>
        </div>
      )}

      {/* UX-01: GUIDED OPERATIONAL JOURNEY HERO (NEXT ACTION) */}
      {!activeShift ? (
        /* State 1: Colaborador sem expediente ativo */
        <div id="hero-expediente-iniciar" className="bg-white rounded-2xl border-2 border-emerald-500/30 p-6 sm:p-8 shadow-xs flex flex-col items-start gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 shadow-xs">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
                Olá, {currentUser.name}
              </h2>
              <div className="text-sm font-semibold text-amber-700 mt-0.5 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Seu expediente ainda não foi iniciado.</span>
              </div>
            </div>
          </div>

          <p className="text-sm text-neutral-600 max-w-2xl leading-relaxed">
            Para registrar seu ponto diário e liberar o terminal de caixa e as operações de venda no balcão, inicie sua jornada de trabalho.
          </p>

          <div className="pt-2 w-full sm:w-auto">
            <button
              id="btn-hero-iniciar-expediente"
              disabled={isSubmitting}
              onClick={async () => {
                setSubmissionError(null);
                setIsSubmitting(true);
                try {
                  await onStartShift();
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="w-full sm:w-auto min-h-[52px] px-8 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-base rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
            >
              <Clock className="w-5 h-5" />
              <span>{isSubmitting ? 'Registrando Ponto...' : 'INICIAR EXPEDIENTE'}</span>
            </button>
          </div>
        </div>
      ) : cashStatus === 'nao_aberto' ? (
        /* State 2: Expediente iniciado com sucesso -> Próxima Ação: ABRIR MEU CAIXA */
        <div id="hero-expediente-abrir-caixa" className="bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Ponto Registrado com Sucesso
              </div>
              <div className="text-lg sm:text-xl font-black text-emerald-950 mt-0.5">
                Entrada registrada às {new Date(activeShift.startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.
              </div>
              <p className="text-xs sm:text-sm text-emerald-800 mt-1">
                Próxima ação recomendada: abra seu terminal de caixa informando o troco inicial para liberar o balcão.
              </p>
            </div>
          </div>

          <button
            id="btn-hero-abrir-caixa"
            onClick={onGoToCash}
            className="min-h-[50px] px-7 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm sm:text-base rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <span>ABRIR MEU CAIXA</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : cashStatus === 'aberto' ? (
        /* State 3: Expediente e Caixa Ativos */
        <div id="hero-operacao-ativa" className="bg-white border border-emerald-300 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">Operação em Andamento</div>
              <div className="text-base font-bold text-neutral-900">
                Expediente ativo • Terminal <strong>{activeCashRegister?.terminalName}</strong>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">Você está liberado para registrar vendas no balcão e gerenciar seu caixa.</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {onGoToBalcao && (
              <button
                id="btn-hero-ir-balcao"
                onClick={onGoToBalcao}
                className="min-h-[44px] px-5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-xl transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <span>Ir para Balcão & PDV</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            <button
              id="btn-hero-ir-caixa"
              onClick={onGoToCash}
              className="min-h-[44px] px-4 border border-neutral-300 hover:bg-neutral-50 text-neutral-800 font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>Gerenciar Caixa</span>
            </button>
          </div>
        </div>
      ) : (
        /* State 4: Caixa Fechado -> Pronto para Encerrar Expediente */
        <div id="hero-caixa-fechado" className="bg-neutral-50 border border-neutral-300 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-200 text-neutral-800 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-neutral-600">Caixa Fechado e Conferido</div>
              <div className="text-base font-bold text-neutral-900">
                Conferência de caixa finalizada com sucesso.
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">Nenhuma pendência financeira em aberto. Seu turno está pronto para encerramento.</p>
            </div>
          </div>

          <button
            id="btn-hero-encerrar-expediente"
            onClick={handleAttemptEndShift}
            className="min-h-[46px] px-6 bg-neutral-900 hover:bg-black text-white font-bold text-xs sm:text-sm rounded-xl transition-colors flex items-center gap-2 shadow-xs cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span>Encerrar Expediente</span>
          </button>
        </div>
      )}

      {/* Blocking Alert Banner when cash is open */}
      {activeShift && activeCashRegister && (
        <div id="banner-caixa-aberto-aviso" className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900">
          <div className="flex items-start sm:items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Caixa Operacional Aberto
              </div>
              <div className="text-xs text-amber-900 mt-0.5">
                Você possui o terminal <strong>{activeCashRegister.terminalName}</strong> aberto. Antes de encerrar o expediente, você deverá realizar a conferência física e o fechamento do caixa.
              </div>
            </div>
          </div>
          <button
            id="btn-banner-ir-caixa"
            onClick={onGoToCash}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shrink-0 self-start sm:self-center cursor-pointer shadow-xs"
          >
            <span>Ir para Meu Caixa</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4 Core Questions Grid: Section 12 Requirement */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Question 1: Estou com expediente iniciado? */}
        <div id="card-status-expediente" className="bg-white rounded-xl border border-neutral-200 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider flex items-center justify-between">
              <span>1. Expediente</span>
              <span className="text-[10px] text-neutral-400">Ponto</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full shrink-0 ${
                  !activeShift
                    ? 'bg-neutral-300'
                    : activeShift.status === 'em_andamento'
                    ? 'bg-emerald-500 animate-pulse'
                    : 'bg-amber-500'
                }`}
              />
              <span className="font-bold text-sm text-neutral-900">
                {!activeShift
                  ? 'Fora de Turno'
                  : activeShift.status === 'em_andamento'
                  ? 'Expediente Iniciado'
                  : 'Em Intervalo'}
              </span>
            </div>
            <div className="text-xs text-neutral-500 mt-1">
              Colaborador: <strong>{currentUser.name}</strong>
            </div>
            <div className="text-[11px] text-neutral-400 mt-0.5">
              Escala: 08:00 às 17:00 • Balcão Farmácia
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px]">
            <span className="text-neutral-500">Status da Jornada</span>
            <span
              className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                !activeShift
                  ? 'bg-neutral-100 text-neutral-600'
                  : activeShift.status === 'em_andamento'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {!activeShift ? 'INATIVO' : activeShift.status === 'em_andamento' ? 'ATIVO' : 'PAUSADO'}
            </span>
          </div>
        </div>

        {/* Question 2: Que horas entrei? */}
        <div id="card-horario-entrada" className="bg-white rounded-xl border border-neutral-200 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider flex items-center justify-between">
              <span>2. Horário de Entrada</span>
              <Clock className="w-3.5 h-3.5 text-neutral-400" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black tracking-tight text-neutral-900">
                {activeShift
                  ? new Date(activeShift.startedAt).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—'}
              </div>
              <div className="text-xs text-neutral-500 mt-0.5">
                {activeShift ? (
                  <span className="text-emerald-700 font-medium">Entrada registrada pontualmente</span>
                ) : (
                  <span>Aguardando registro de ponto</span>
                )}
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px]">
            <span className="text-neutral-500">Duração Hoje</span>
            <span className="font-semibold text-neutral-800">{elapsedFormatted || '0h 00m'}</span>
          </div>
        </div>

        {/* Question 3: Meu caixa está aberto ou fechado? */}
        <div id="card-status-caixa" className="bg-white rounded-xl border border-neutral-200 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider flex items-center justify-between">
              <span>3. Situação do Caixa</span>
              <DollarSign className="w-3.5 h-3.5 text-neutral-400" />
            </div>
            <div className="mt-2">
              {cashStatus === 'aberto' ? (
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                    <span>CAIXA ABERTO</span>
                  </div>
                  <div className="text-xs text-neutral-700 font-medium mt-1 truncate">
                    {activeCashRegister?.terminalName}
                  </div>
                </div>
              ) : cashStatus === 'fechado' ? (
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-100 text-neutral-800 text-xs font-bold border border-neutral-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>CAIXA FECHADO</span>
                  </div>
                  <div className="text-xs text-neutral-500 mt-1">Conferência concluída</div>
                </div>
              ) : (
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-200">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>CAIXA NÃO ABERTO</span>
                  </div>
                  <div className="text-xs text-neutral-500 mt-1">Nenhuma sessão ativa</div>
                </div>
              )}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-neutral-100 flex items-center justify-between">
            {cashStatus === 'aberto' ? (
              <button
                id="btn-card-ir-caixa"
                onClick={onGoToCash}
                className="w-full py-1 text-center font-bold text-xs text-emerald-700 hover:text-emerald-800 flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>Ir para Meu Caixa</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            ) : activeShift && cashStatus === 'nao_aberto' ? (
              <button
                id="btn-card-abrir-caixa"
                onClick={onGoToCash}
                className="w-full py-1 text-center font-bold text-xs text-emerald-700 hover:text-emerald-800 flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>Abrir Meu Caixa</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            ) : (
              <span className="text-[11px] text-neutral-400">Sem pendências financeiras</span>
            )}
          </div>
        </div>

        {/* Question 4: Qual é minha próxima ação? */}
        <div id="card-proxima-acao" className="bg-white rounded-xl border border-neutral-200 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider flex items-center justify-between">
              <span>4. Próxima Ação</span>
              <Timer className="w-3.5 h-3.5 text-neutral-400" />
            </div>
            <div className="mt-2 text-xs text-neutral-700">
              {!activeShift ? (
                <p>Inicie seu expediente de trabalho para registrar seu ponto e liberar o atendimento.</p>
              ) : cashStatus === 'nao_aberto' ? (
                <p>Abra seu caixa informando o valor de troco inicial para realizar vendas no balcão.</p>
              ) : cashStatus === 'aberto' ? (
                <p>Operação ativa no balcão. No término da jornada, feche o caixa antes de encerrar o expediente.</p>
              ) : (
                <p>Caixa devidamente conferido e fechado. Seu expediente está pronto para encerramento.</p>
              )}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-neutral-100">
            {!activeShift ? (
              <button
                onClick={async () => {
                  setSubmissionError(null);
                  await onStartShift();
                }}
                className="w-full py-1.5 bg-emerald-700 text-white font-bold text-xs rounded hover:bg-emerald-800 transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>Iniciar Expediente</span>
              </button>
            ) : cashStatus === 'nao_aberto' ? (
              <button
                onClick={onGoToCash}
                className="w-full py-1.5 bg-emerald-700 text-white font-bold text-xs rounded hover:bg-emerald-800 transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>Abrir Meu Caixa</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            ) : cashStatus === 'aberto' ? (
              <button
                onClick={onGoToCash}
                className="w-full py-1.5 bg-neutral-800 text-white font-bold text-xs rounded hover:bg-neutral-900 transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>Ir para Meu Caixa</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            ) : (
              <button
                onClick={handleAttemptEndShift}
                className="w-full py-1.5 bg-neutral-900 text-white font-bold text-xs rounded hover:bg-black transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>Encerrar Expediente</span>
                <LogOut className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Active Shift Details & Breaks (if shift active) */}
      {activeShift && (
        <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <h3 className="font-bold text-sm text-neutral-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-700" />
              <span>Detalhes do Expediente em Andamento</span>
            </h3>
            <span className="text-xs text-neutral-500">
              Data: <strong>{activeShift.date}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-100">
              <span className="text-neutral-500 block mb-1">Horário de Início</span>
              <span className="font-bold text-neutral-900 text-sm">
                {new Date(activeShift.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-100">
              <span className="text-neutral-500 block mb-1">Intervalos Cumpridos</span>
              <span className="font-bold text-neutral-900 text-sm">
                {activeShift.breaks?.length || 0} pausa(s)
              </span>
            </div>
            <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-100">
              <span className="text-neutral-500 block mb-1">Status de Operação</span>
              <span className="font-bold text-neutral-900 text-sm">
                {activeShift.status === 'em_andamento' ? 'Balcão / Atendimento' : 'Em Intervalo'}
              </span>
            </div>
          </div>

          {/* Breaks history */}
          <div className="pt-2">
            <h4 className="text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-2">
              Registro de Pausas e Intervalos:
            </h4>
            {(!activeShift.breaks || activeShift.breaks.length === 0) ? (
              <p className="text-xs text-neutral-400 italic">Nenhum intervalo registrado hoje.</p>
            ) : (
              <div className="space-y-2">
                {(activeShift.breaks || []).map((b, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-neutral-50 px-3 py-2 rounded-lg border border-neutral-100 text-xs">
                    <span className="text-neutral-700 font-medium flex items-center gap-1.5">
                      <Coffee className="w-3.5 h-3.5 text-amber-600" />
                      <span>{b.reason}</span>
                    </span>
                    <span className="text-neutral-500">
                      Início: {new Date(b.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {b.endedAt ? (
                        <span> • Retorno: {new Date(b.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      ) : (
                        <span className="text-amber-700 font-bold"> (Em andamento)</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* BLOCKING MODAL: When attempting to end shift with open cash register */}
      {showBlockedModal && (
        <div
          id="modal-encerramento-bloqueado"
          className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-neutral-900 text-base">Encerramento Bloqueado</h3>
                <span className="text-xs font-semibold text-amber-700">Sessão de Caixa em Aberto</span>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-950 font-medium leading-relaxed">
              Você ainda possui um caixa aberto. Faça a conferência e o fechamento do seu caixa antes de encerrar o expediente.
            </div>

            {activeCashRegister && (
              <div className="text-xs text-neutral-600 bg-neutral-50 p-3 rounded-lg border border-neutral-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Terminal Aberto:</span>
                  <span className="font-bold text-neutral-900">{activeCashRegister.terminalName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Aberto às:</span>
                  <span className="font-medium text-neutral-800">
                    {new Date(activeCashRegister.openedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            )}

            <p className="text-xs text-neutral-500 leading-relaxed">
              Para preservar a segurança contábil e a auditoria física da farmácia, é necessário conferir as cédulas e registrar o fechamento do caixa no módulo <strong>Meu Caixa</strong> antes de bater a saída no ponto.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                id="btn-voltar-bloqueio"
                onClick={() => setShowBlockedModal(false)}
                className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg text-xs font-medium hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                id="btn-bloqueio-ir-caixa"
                onClick={() => {
                  setShowBlockedModal(false);
                  onGoToCash();
                }}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Ir para Meu Caixa</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: When ending shift is permitted (no open cash register) */}
      {showEndConfirm && (
        <div
          id="modal-confirmar-encerramento"
          className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5 text-neutral-800" />
              </div>
              <div>
                <h3 className="font-bold text-neutral-900 text-base">Confirmar Encerramento de Expediente</h3>
                <span className="text-xs text-neutral-500">Registro de saída e ponto de trabalho</span>
              </div>
            </div>

            {submissionError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{submissionError}</span>
              </div>
            )}

            {userClosedCashThisShift && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Seu caixa foi conferido e fechado. Liberação para encerramento concedida.</span>
              </div>
            )}

            <p className="text-xs text-neutral-600">
              Deseja registrar o encerramento da sua jornada de trabalho hoje? Os apontamentos serão gravados na trilha de auditoria.
            </p>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Observações do Turno (Opcional):
              </label>
              <textarea
                rows={3}
                placeholder="Ex: Todas as pendências de balcão foram repassadas ao próximo turno..."
                value={endNotes}
                onChange={(e) => setEndNotes(e.target.value)}
                className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-lg text-xs text-neutral-900 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-700"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowEndConfirm(false)}
                className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg text-xs font-medium hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                id="btn-confirmar-fim-turno"
                disabled={isSubmitting}
                onClick={handleConfirmEndShift}
                className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-xs font-bold hover:bg-black transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? <span>Encerrando...</span> : <span>Confirmar Encerramento</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shift History Table */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
          <h3 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-700" />
            <span>Histórico dos Meus Expedientes</span>
          </h3>
          <span className="text-xs text-neutral-500">{myShifts.length} registro(s)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-100/70 text-neutral-600 font-semibold border-b border-neutral-200">
              <tr>
                <th className="py-2.5 px-4">Data</th>
                <th className="py-2.5 px-4">Entrada</th>
                <th className="py-2.5 px-4">Saída</th>
                <th className="py-2.5 px-4">Intervalos</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Observações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-neutral-800">
              {myShifts.map((s) => (
                <tr key={s.id} className="hover:bg-neutral-50">
                  <td className="py-2.5 px-4 font-medium">{s.date}</td>
                  <td className="py-2.5 px-4 font-mono">
                    {new Date(s.startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-2.5 px-4 font-mono">
                    {s.endedAt ? (
                      new Date(s.endedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                    ) : (
                      <span className="text-emerald-700 font-semibold">Em andamento</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4">{s.breaks?.length || 0} intervalo(s)</td>
                  <td className="py-2.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        s.status === 'em_andamento'
                          ? 'bg-emerald-100 text-emerald-800'
                          : s.status === 'pausado'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      {s.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-neutral-500 max-w-xs truncate">
                    {s.notes || '—'}
                  </td>
                </tr>
              ))}
              {myShifts.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-neutral-400">
                    Nenhum histórico de expediente anterior registrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
