import React, { useState } from 'react';
import { User, Terminal, WorkShift, CashRegister } from '../types';
import { 
  Users, 
  Monitor, 
  KeyRound, 
  ShieldCheck, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Lock,
  ArrowRightLeft,
  CircleDot
} from 'lucide-react';

interface OperatorSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  terminals?: Terminal[];
  currentTerminalId: string;
  onSelectTerminal: (termId: string) => void;
  currentOperator: User;
  availableUsers?: User[];
  workShifts?: WorkShift[];
  cashRegisters?: CashRegister[];
  onOperatorSwitched: (newUser: User) => void;
  refreshData: () => Promise<void>;
}

export const OperatorSwitchModal: React.FC<OperatorSwitchModalProps> = ({
  isOpen,
  onClose,
  terminals = [],
  currentTerminalId,
  onSelectTerminal,
  currentOperator,
  availableUsers = [],
  workShifts = [],
  cashRegisters = [],
  onOperatorSwitched,
  refreshData,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [autoStartShift, setAutoStartShift] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentTerminal = terminals.find((t) => t.id === currentTerminalId) || {
    id: currentTerminalId,
    name: currentTerminalId === 'terminal_02' ? 'Terminal Balcão 02' : 'Terminal Balcão 01',
    active: true,
  };

  const activeCashRegister = cashRegisters.find(
    (c) => c.status === 'aberto' && (c.terminalId === currentTerminalId || (!c.terminalId && currentTerminalId === 'terminal_01'))
  );

  const selectedUser = availableUsers.find((u) => u.id === selectedUserId);
  const selectedUserShift = selectedUser
    ? workShifts.find((s) => s.userId === selectedUser.id && (s.status === 'em_andamento' || s.status === 'pausado'))
    : null;

  const handleKeypadPress = (digit: string) => {
    if (pin.length < 6) {
      setPin((prev) => prev + digit);
      setErrorMessage(null);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMessage(null);
  };

  const handleClear = () => {
    setPin('');
    setErrorMessage(null);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedUserId) {
      setErrorMessage('Selecione o funcionário que irá assumir o terminal.');
      return;
    }
    if (!pin || pin.length < 4) {
      setErrorMessage('Digite o PIN de 4 dígitos do funcionário.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/switch-operator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          terminalId: currentTerminalId,
          fromUserId: currentOperator.id,
          toUserId: selectedUserId,
          pin,
          autoStartShift: autoStartShift || false,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao autenticar troca de operador.');
      }

      setSuccessMessage(`Terminal assumido com sucesso por ${data.user?.name || selectedUser?.name}!`);
      onOperatorSwitched(data.user || selectedUser!);
      await refreshData();

      setTimeout(() => {
        setSuccessMessage(null);
        setPin('');
        setSelectedUserId('');
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao validar PIN.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl max-w-xl w-full overflow-hidden text-neutral-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-neutral-800/80 border-b border-neutral-700">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white flex items-center gap-2">
                Troca Segura de Operador
                <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-700 text-neutral-300 font-medium">
                  Gaveta Única
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Alterne o atendente autenticado sem fechar o caixa do terminal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-md hover:bg-neutral-700/60 transition-colors"
            title="Fechar [Esc]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current State Info Bar */}
        <div className="grid grid-cols-2 gap-3 px-5 py-3 bg-neutral-950/60 border-b border-neutral-800 text-xs">
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-sky-400 shrink-0" />
            <div>
              <span className="text-neutral-400 block text-[10px] uppercase font-semibold">Terminal Atual</span>
              <select
                value={currentTerminalId}
                onChange={(e) => onSelectTerminal(e.target.value)}
                className="bg-neutral-800 border border-neutral-700 text-white font-medium rounded px-1.5 py-0.5 mt-0.5 focus:outline-none focus:border-sky-500 text-xs"
              >
                {terminals.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${activeCashRegister ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <div>
              <span className="text-neutral-400 block text-[10px] uppercase font-semibold">Gaveta Física</span>
              <span className="font-medium text-neutral-200">
                {activeCashRegister ? `Aberta (${activeCashRegister.displayCode || 'Ativa'})` : 'Fechada (Sem Troco)'}
              </span>
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-4">
          {/* Step 1: Select Collaborator */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              1. Selecione quem está assumindo o terminal:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {availableUsers.map((u) => {
                const isSelected = selectedUserId === u.id;
                const isCurrent = currentOperator.id === u.id;
                const shift = workShifts.find((s) => s.userId === u.id && (s.status === 'em_andamento' || s.status === 'pausado'));

                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setSelectedUserId(u.id);
                      setErrorMessage(null);
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'bg-emerald-950/70 border-emerald-500 ring-1 ring-emerald-500 text-white'
                        : isCurrent
                        ? 'bg-neutral-800/40 border-neutral-700/60 text-neutral-300 hover:border-neutral-600'
                        : 'bg-neutral-800/80 border-neutral-700 text-neutral-200 hover:border-neutral-600 hover:bg-neutral-800'
                    }`}
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${shift ? 'bg-emerald-400' : 'bg-neutral-500'}`} />
                      <div className="truncate">
                        <div className="font-semibold text-xs truncate flex items-center gap-1.5">
                          {u.name}
                          {isCurrent && (
                            <span className="text-[9px] px-1 py-0.2 bg-neutral-700 text-neutral-300 rounded font-normal">
                              Atual
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-neutral-400 truncate">
                          {u.roleTitle || (u.role === 'admin' ? 'Farmacêutico Gestor' : 'Balconista')}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-1">
                      {shift ? (
                        <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-0.5">
                          <CircleDot className="w-2.5 h-2.5" /> Turno Ativo
                        </span>
                      ) : (
                        <span className="text-[10px] text-neutral-400 flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" /> Sem Turno
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: PIN Authentication */}
          {selectedUserId && (
            <div className="bg-neutral-950/80 border border-neutral-800 rounded-lg p-3.5 space-y-3 animate-in fade-in duration-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  2. Digite o PIN de {selectedUser?.name.split(' ')[0]}:
                </label>
                <span className="text-[11px] text-neutral-400">PIN numérico confidencial</span>
              </div>

              {/* Masked PIN Display */}
              <div className="flex items-center justify-center gap-2 py-1">
                {[0, 1, 2, 3].map((idx) => {
                  const hasDigit = pin.length > idx;
                  return (
                    <div
                      key={idx}
                      className={`w-10 h-10 rounded-lg border flex items-center justify-center text-lg font-bold transition-all ${
                        hasDigit
                          ? 'bg-emerald-950 border-emerald-500 text-emerald-400 shadow-xs'
                          : 'bg-neutral-900 border-neutral-700 text-neutral-600'
                      }`}
                    >
                      {hasDigit ? '•' : ''}
                    </div>
                  );
                })}
              </div>

              {/* Shift auto-start option if no shift is active */}
              {!selectedUserShift && (
                <div className="bg-amber-950/30 border border-amber-800/40 rounded-lg p-2 text-xs text-amber-200/90 flex items-start gap-2">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-amber-300">
                      {selectedUser?.name.split(' ')[0]} não possui expediente ativo hoje.
                    </p>
                    <label className="flex items-center gap-2 cursor-pointer pt-0.5">
                      <input
                        type="checkbox"
                        checked={autoStartShift}
                        onChange={(e) => setAutoStartShift(e.target.checked)}
                        className="rounded border-neutral-600 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-neutral-200 font-medium">
                        Iniciar expediente de trabalho automaticamente com este PIN
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Numeric Keypad for Touch / Mouse or Keyboard */}
              <div className="grid grid-cols-3 gap-1.5 max-w-[240px] mx-auto pt-1">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleKeypadPress(num)}
                    className="h-10 rounded bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-sm border border-neutral-700 active:scale-95 transition-all"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleClear}
                  className="h-10 rounded bg-neutral-800/60 hover:bg-neutral-800 text-neutral-400 text-xs border border-neutral-700/60 transition-all font-medium"
                >
                  Limpar
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress('0')}
                  className="h-10 rounded bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-sm border border-neutral-700 active:scale-95 transition-all"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleBackspace}
                  className="h-10 rounded bg-neutral-800/60 hover:bg-neutral-800 text-neutral-400 text-xs border border-neutral-700/60 transition-all font-medium"
                >
                  ⌫
                </button>
              </div>
            </div>
          )}

          {/* Feedback message banners */}
          {errorMessage && (
            <div className="bg-rose-950/60 border border-rose-800 text-rose-200 text-xs p-2.5 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-950/60 border border-emerald-700 text-emerald-200 text-xs p-2.5 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold">{successMessage}</span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-neutral-800/80 border-t border-neutral-700">
          <div className="text-[11px] text-neutral-400 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-neutral-400" />
            <span>Identidade auditada por PIN</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-neutral-700 text-neutral-300 hover:bg-neutral-800 text-xs font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isSubmitting || !selectedUserId || pin.length < 4}
              onClick={() => handleSubmit()}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              {isSubmitting ? 'Validando...' : 'Confirmar Troca'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
