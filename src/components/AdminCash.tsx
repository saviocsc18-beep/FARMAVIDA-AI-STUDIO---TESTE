import React, { useState } from 'react';
import { CashRegister, CashMovement, User, Sale } from '../types';
import { formatCurrencyBRL } from '../lib/format';
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
  FileText,
  ShieldCheck
} from 'lucide-react';

interface AdminCashProps {
  currentUser: User;
  activeCashRegister: CashRegister | null;
  cashHistory: CashRegister[];
  sales: Sale[];
  onOpenCash: (terminalName: string, openingAmount: number, notes?: string) => Promise<boolean>;
  onAddCashMovement: (type: 'suprimento' | 'sangria' | 'devolucao', amount: number, reason: string) => Promise<boolean>;
  onCloseCash: (countedAmount: number, notes?: string) => Promise<boolean>;
  onReconcileCashRegister?: (registerId: string, status: 'conferido' | 'resolvido', notes?: string) => Promise<boolean>;
}

export const AdminCash: React.FC<AdminCashProps> = ({
  currentUser,
  activeCashRegister,
  cashHistory,
  sales,
  onOpenCash,
  onAddCashMovement,
  onCloseCash,
  onReconcileCashRegister,
}) => {
  // Detail / Reconcile modal
  const [selectedSessionForDetail, setSelectedSessionForDetail] = useState<CashRegister | null>(null);
  const [reconcileNotesInput, setReconcileNotesInput] = useState('');
  const [isReconciling, setIsReconciling] = useState(false);

  // Open modal
  const [isOpenModalActive, setIsOpenModalActive] = useState(false);
  const [terminalNameInput, setTerminalNameInput] = useState('Caixa Balcão 01');
  const [openingAmountInput, setOpeningAmountInput] = useState('150.00');
  const [openNotesInput, setOpenNotesInput] = useState('');

  // Movement modal (sangria / suprimento)
  const [isMovementModalActive, setIsMovementModalActive] = useState(false);
  const [movementType, setMovementType] = useState<'suprimento' | 'sangria'>('sangria');
  const [movementAmountInput, setMovementAmountInput] = useState('');
  const [movementReasonInput, setMovementReasonInput] = useState('');

  // Close cash modal
  const [isCloseModalActive, setIsCloseModalActive] = useState(false);
  const [countedAmountInput, setCountedAmountInput] = useState('');
  const [closeNotesInput, setCloseNotesInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate current expected cash in active register
  let cashSalesTotal = 0;
  let cashSuprimentos = 0;
  let cashSangrias = 0;

  if (activeCashRegister) {
    // Sales in cash during this register
    for (const s of sales) {
      if (s.cashRegisterId === activeCashRegister.id || (!s.cashRegisterId && new Date(s.timestamp) >= new Date(activeCashRegister.openedAt))) {
        for (const p of (s.payments || [])) {
          if (p.method === 'dinheiro') {
            cashSalesTotal += p.amount;
          }
        }
      }
    }

    const movements = activeCashRegister.movements || [];
    for (const m of movements) {
      if (m.type === 'suprimento') cashSuprimentos += m.amount;
      if (m.type === 'sangria') cashSangrias += m.amount;
    }
  }

  const openingAmount = activeCashRegister ? activeCashRegister.openingAmount : 0;
  const calculatedExpectedCash = openingAmount + cashSalesTotal + cashSuprimentos - cashSangrias;

  // Handle open cash
  const handleOpenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const success = await onOpenCash(terminalNameInput, Number(openingAmountInput) || 0, openNotesInput);
    setIsSubmitting(false);
    if (success) {
      setIsOpenModalActive(false);
      setOpenNotesInput('');
    }
  };

  // Handle movement submit
  const handleMovementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movementAmountInput || !movementReasonInput) return;
    setIsSubmitting(true);
    const success = await onAddCashMovement(movementType, Number(movementAmountInput), movementReasonInput);
    setIsSubmitting(false);
    if (success) {
      setIsMovementModalActive(false);
      setMovementAmountInput('');
      setMovementReasonInput('');
    }
  };

  // Handle close submit
  const handleCloseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const success = await onCloseCash(Number(countedAmountInput) || 0, closeNotesInput);
    setIsSubmitting(false);
    if (success) {
      setIsCloseModalActive(false);
      setCountedAmountInput('');
      setCloseNotesInput('');
    }
  };

  const countedVal = Number(countedAmountInput) || 0;
  const discrepancy = countedVal - calculatedExpectedCash;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
            <Banknote className="w-6 h-6 text-emerald-700" />
            <span>Caixa Gerencial & Encerramento</span>
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Controle de fundo de troco, suprimentos, sangrias de segurança e conferência matemática no fechamento.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!activeCashRegister ? (
            <button
              onClick={() => setIsOpenModalActive(true)}
              className="px-4 py-2 bg-emerald-700 text-white font-bold text-xs rounded-lg hover:bg-emerald-800 transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Unlock className="w-4 h-4" />
              <span>Abrir Caixa do Dia</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setMovementType('suprimento');
                  setIsMovementModalActive(true);
                }}
                className="px-3 py-2 border border-emerald-300 bg-emerald-50 text-emerald-800 font-semibold text-xs rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1.5"
              >
                <ArrowDownCircle className="w-4 h-4 text-emerald-700" />
                <span>Suprimento (Entrada)</span>
              </button>

              <button
                onClick={() => {
                  setMovementType('sangria');
                  setIsMovementModalActive(true);
                }}
                className="px-3 py-2 border border-amber-300 bg-amber-50 text-amber-900 font-semibold text-xs rounded-lg hover:bg-amber-100 transition-colors flex items-center gap-1.5"
              >
                <ArrowUpCircle className="w-4 h-4 text-amber-700" />
                <span>Sangria (Retirada)</span>
              </button>

              <button
                onClick={() => setIsCloseModalActive(true)}
                className="px-4 py-2 bg-neutral-900 text-white font-bold text-xs rounded-lg hover:bg-black transition-colors shadow-xs flex items-center gap-1.5"
              >
                <Lock className="w-4 h-4" />
                <span>Fechar Caixa</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Active Register Summary Cards */}
      {activeCashRegister ? (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-emerald-300 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-neutral-200">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                <div>
                  <h3 className="font-bold text-base text-neutral-900">
                    {activeCashRegister.terminalName} (Ativo)
                  </h3>
                  <div className="text-xs text-neutral-500">
                    Aberto por <strong className="text-neutral-700">{activeCashRegister.openedByName}</strong> às{' '}
                    {new Date(activeCashRegister.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50 px-3.5 py-1.5 rounded-lg border border-emerald-200 text-right">
                <div className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider">
                  Dinheiro Físico Esperado no Caixa
                </div>
                <div className="text-xl font-bold text-emerald-900">
                  {formatCurrencyBRL(calculatedExpectedCash)}
                </div>
              </div>
            </div>

            {/* Arithmetic Breakdown Formula */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                <span className="text-neutral-500 block">Fundo de Abertura:</span>
                <span className="font-bold text-neutral-800 text-sm">
                  + {formatCurrencyBRL(openingAmount)}
                </span>
              </div>

              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <span className="text-emerald-800 block">Vendas em Espécie:</span>
                <span className="font-bold text-emerald-900 text-sm">
                  + {formatCurrencyBRL(cashSalesTotal)}
                </span>
              </div>

              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <span className="text-blue-800 block">Suprimentos de Troco:</span>
                <span className="font-bold text-blue-900 text-sm">
                  + {formatCurrencyBRL(cashSuprimentos)}
                </span>
              </div>

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <span className="text-amber-800 block">Sangrias de Caixa:</span>
                <span className="font-bold text-amber-900 text-sm">
                  - {formatCurrencyBRL(cashSangrias)}
                </span>
              </div>
            </div>
          </div>

          {/* Movements list of this register */}
          <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
              <h4 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-700" />
                <span>Movimentações de Suprimento e Sangria Registradas Hoje</span>
              </h4>
              <span className="text-xs text-neutral-500">
                {(activeCashRegister.movements || []).length} movimentação(ões)
              </span>
            </div>

            <div className="divide-y divide-neutral-200 text-xs">
              {(activeCashRegister.movements || []).map((mov) => (
                <div key={mov.id} className="p-3.5 flex items-center justify-between hover:bg-neutral-50">
                  <div className="flex items-center gap-3">
                    {mov.type === 'suprimento' ? (
                      <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <ArrowDownCircle className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                        <ArrowUpCircle className="w-4 h-4" />
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-neutral-900">
                        {mov.type === 'suprimento' ? 'Suprimento de Caixa' : 'Sangria de Segurança'}
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        Motivo: <strong className="text-neutral-700">{mov.reason}</strong> • Autor: {mov.authorizedByName}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`font-bold text-sm ${mov.type === 'suprimento' ? 'text-emerald-800' : 'text-amber-800'}`}>
                      {mov.type === 'suprimento' ? '+' : '-'} {formatCurrencyBRL(mov.amount)}
                    </div>
                    <div className="text-[10px] text-neutral-400">
                      {new Date(mov.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}

              {(!activeCashRegister.movements || activeCashRegister.movements.length === 0) && (
                <div className="p-6 text-center text-neutral-400">
                  Nenhuma sangria ou suprimento lançado neste expediente até o momento.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-white rounded-xl border border-neutral-200 shadow-xs space-y-3">
          <Banknote className="w-12 h-12 text-neutral-300 mx-auto" />
          <h3 className="text-base font-bold text-neutral-900">Nenhum Caixa Ativo Aberto</h3>
          <p className="text-xs text-neutral-500 max-w-md mx-auto">
            Para receber pagamentos em dinheiro no balcão e registrar movimentações de sangria, abra o caixa com o valor do fundo de troco inicial.
          </p>
          <button
            onClick={() => setIsOpenModalActive(true)}
            className="px-4 py-2 bg-emerald-700 text-white font-semibold text-xs rounded-lg hover:bg-emerald-800 transition-colors"
          >
            Abrir Caixa Agora
          </button>
        </div>
      )}

      {/* Historical Closed Registers */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-neutral-900 text-sm">Histórico e Conciliação de Sessões de Caixa</h3>
            <p className="text-[11px] text-neutral-500">Conferência física pela tesouraria, apuração de diferenças e trilha de auditoria.</p>
          </div>
          <span className="text-xs font-semibold text-neutral-500 bg-neutral-200 px-2.5 py-0.5 rounded-full">
            {cashHistory.length} registros
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-100 text-neutral-600 font-semibold border-b border-neutral-200">
              <tr>
                <th className="py-2.5 px-4">Sessão / Terminal</th>
                <th className="py-2.5 px-4">Operador</th>
                <th className="py-2.5 px-4">Abertura</th>
                <th className="py-2.5 px-4">Encerramento</th>
                <th className="py-2.5 px-4 text-right">Fundo Inicial</th>
                <th className="py-2.5 px-4 text-right">Esperado</th>
                <th className="py-2.5 px-4 text-right">Contado</th>
                <th className="py-2.5 px-4 text-right">Diferença</th>
                <th className="py-2.5 px-4">Conciliação</th>
                <th className="py-2.5 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-neutral-800">
              {cashHistory.map((reg) => {
                const expCash = reg.expectedCash !== undefined ? reg.expectedCash : (reg as any).expectedAmount;
                const countCash = reg.countedCash !== undefined ? reg.countedCash : (reg as any).closingAmount;
                const reconStatus = reg.reconciliationStatus || (reg.status === 'aberto' ? 'aberto' : Math.abs(reg.difference || 0) > 0.01 ? 'divergencia' : 'aguardando_conferencia');

                return (
                  <tr key={reg.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="py-2.5 px-4">
                      <div className="font-bold text-neutral-900">{reg.displayCode || reg.terminalName}</div>
                      {reg.displayCode && <div className="text-[10px] text-neutral-400">{reg.terminalName}</div>}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="font-medium text-neutral-800">{reg.openedByName}</span>
                      {reg.closedByName && reg.closedByName !== reg.openedByName && (
                        <span className="text-[10px] text-neutral-400 block">Fechou: {reg.closedByName}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      {new Date(reg.openedAt).toLocaleDateString()} {new Date(reg.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-4">
                      {reg.closedAt ? (
                        `${new Date(reg.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      ) : (
                        <span className="text-emerald-700 font-semibold">Em Aberto</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right">{formatCurrencyBRL(reg.openingAmount)}</td>
                    <td className="py-2.5 px-4 text-right font-medium">
                      {expCash !== undefined ? formatCurrencyBRL(Number(expCash)) : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-medium">
                      {countCash !== undefined ? formatCurrencyBRL(Number(countCash)) : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      {reg.difference !== undefined ? (
                        <span className={`font-semibold ${
                          Math.abs(reg.difference) < 0.01 
                            ? 'text-emerald-700' 
                            : reg.difference > 0 
                            ? 'text-blue-700' 
                            : 'text-red-700'
                        }`}>
                          {Math.abs(reg.difference) < 0.01 ? 'Exato (R$ 0,00)' : formatCurrencyBRL(reg.difference)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      {reg.status === 'aberto' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Em Aberto
                        </span>
                      ) : reconStatus === 'conferido' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" />
                          Conferido
                        </span>
                      ) : reconStatus === 'resolvido' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" />
                          Resolvido
                        </span>
                      ) : reconStatus === 'divergencia' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-800 border border-red-300 flex items-center gap-1 w-fit">
                          <AlertCircle className="w-3 h-3" />
                          Divergência
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 w-fit">
                          <History className="w-3 h-3" />
                          Aguardando
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <button
                        onClick={() => {
                          setSelectedSessionForDetail(reg);
                          setReconcileNotesInput(reg.reconciliationNotes || '');
                        }}
                        className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold rounded-lg text-[11px] border border-neutral-300 transition-colors"
                      >
                        {currentUser.role === 'admin' && reg.status === 'fechado' && reconStatus !== 'conferido' && reconStatus !== 'resolvido'
                          ? 'Conferir'
                          : 'Detalhes'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Detalhes e Conciliação da Sessão */}
      {selectedSessionForDetail && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-neutral-200 space-y-5 my-8">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-neutral-900 text-base flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-emerald-700" />
                  <span>Auditoria & Conciliação: {selectedSessionForDetail.displayCode || selectedSessionForDetail.terminalName}</span>
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Operador: <strong className="text-neutral-700">{selectedSessionForDetail.openedByName}</strong> • Terminal: {selectedSessionForDetail.terminalName}
                </p>
              </div>
              <button
                onClick={() => setSelectedSessionForDetail(null)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Demonstrativo Físico Completo */}
            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 space-y-2 text-xs">
              <div className="font-bold text-neutral-900 text-xs uppercase tracking-wider pb-1 border-b">
                Composição do Dinheiro Físico em Caixa
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 pt-1 text-neutral-600">
                <div className="flex justify-between">
                  <span>(+) Fundo de Troco Inicial:</span>
                  <span className="font-semibold text-neutral-900">{formatCurrencyBRL(selectedSessionForDetail.openingAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>(+) Vendas em Dinheiro:</span>
                  <span className="font-semibold text-emerald-800">+ {formatCurrencyBRL(selectedSessionForDetail.cashSales || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>(+) Suprimentos de Caixa:</span>
                  <span className="font-semibold text-blue-800">+ {formatCurrencyBRL(selectedSessionForDetail.suppliesTotal || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>(-) Sangrias Operacionais:</span>
                  <span className="font-semibold text-amber-800">- {formatCurrencyBRL(selectedSessionForDetail.bleedingsTotal || 0)}</span>
                </div>
                {selectedSessionForDetail.cashReturnsTotal ? (
                  <div className="flex justify-between">
                    <span>(-) Devoluções em Dinheiro:</span>
                    <span className="font-semibold text-red-800">- {formatCurrencyBRL(selectedSessionForDetail.cashReturnsTotal)}</span>
                  </div>
                ) : null}
                {selectedSessionForDetail.withdrawnAmount ? (
                  <div className="flex justify-between">
                    <span>(-) Sangria de Fechamento (Cofre):</span>
                    <span className="font-semibold text-neutral-800">- {formatCurrencyBRL(selectedSessionForDetail.withdrawnAmount)}</span>
                  </div>
                ) : null}
              </div>

              <div className="pt-2 border-t flex items-center justify-between font-bold text-neutral-900">
                <span>Saldo Físico Esperado:</span>
                <span className="text-emerald-800 text-sm">
                  {formatCurrencyBRL(selectedSessionForDetail.expectedCash !== undefined ? selectedSessionForDetail.expectedCash : (selectedSessionForDetail as any).expectedAmount || 0)}
                </span>
              </div>

              <div className="flex items-center justify-between font-bold text-neutral-900">
                <span>Saldo Físico Contado pelo Operador:</span>
                <span className="text-neutral-900 text-sm">
                  {formatCurrencyBRL(selectedSessionForDetail.countedCash !== undefined ? selectedSessionForDetail.countedCash : (selectedSessionForDetail as any).closingAmount || 0)}
                </span>
              </div>

              {selectedSessionForDetail.difference !== undefined && (
                <div className={`p-2.5 rounded-lg border text-xs flex items-center justify-between font-bold ${
                  Math.abs(selectedSessionForDetail.difference) < 0.01
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : selectedSessionForDetail.difference > 0
                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  <span>
                    {Math.abs(selectedSessionForDetail.difference) < 0.01
                      ? 'Caixa 100% Batido (Sem Sobra ou Falta)'
                      : selectedSessionForDetail.difference > 0
                      ? 'Sobra Apurada no Fechamento:'
                      : 'Falta Apurada no Fechamento:'}
                  </span>
                  <span className="text-sm">
                    {formatCurrencyBRL(Math.abs(selectedSessionForDetail.difference))}
                  </span>
                </div>
              )}
            </div>

            {/* Justificativa do Operador */}
            {selectedSessionForDetail.divergenceReason && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1">
                <span className="font-bold text-amber-900 block">Justificativa Apresentada pelo Colaborador:</span>
                <p className="text-amber-800 italic">"{selectedSessionForDetail.divergenceReason}"</p>
              </div>
            )}

            {/* Operadores Atuantes na Gaveta Física Compartilhada */}
            {selectedSessionForDetail.operatorSummaries && selectedSessionForDetail.operatorSummaries.length > 0 && (
              <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
                <div className="p-3 bg-neutral-50 border-b border-neutral-200">
                  <span className="font-bold text-xs text-neutral-800 uppercase tracking-wider block">
                    Extrato de Operadores na Gaveta (Terminal Compartilhado)
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    A gaveta física foi compartilhada, discriminando a responsabilidade de cada atendente.
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-100 text-neutral-600 font-semibold border-b border-neutral-200">
                      <tr>
                        <th className="py-2 px-3">Atendente</th>
                        <th className="py-2 px-3 text-right">Qtd</th>
                        <th className="py-2 px-3 text-right">Total Vendido</th>
                        <th className="py-2 px-3 text-right">Dinheiro</th>
                        <th className="py-2 px-3 text-right">Pix/Cartão</th>
                        <th className="py-2 px-3 text-right">Descontos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 text-neutral-800">
                      {selectedSessionForDetail.operatorSummaries.map((op) => (
                        <tr key={op.operatorId} className="hover:bg-neutral-50">
                          <td className="py-2 px-3 font-semibold text-neutral-900">{op.operatorName}</td>
                          <td className="py-2 px-3 text-right">{op.salesCount}</td>
                          <td className="py-2 px-3 text-right font-bold text-neutral-900">{formatCurrencyBRL(op.totalSold)}</td>
                          <td className="py-2 px-3 text-right text-emerald-800">{formatCurrencyBRL(op.cashSales)}</td>
                          <td className="py-2 px-3 text-right text-blue-800">{formatCurrencyBRL(op.pixSales + op.cardDebitSales + op.cardCreditSales)}</td>
                          <td className="py-2 px-3 text-right text-neutral-500">{formatCurrencyBRL(op.discountTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Vendas por Outros Meios */}
            <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 text-xs space-y-2">
              <span className="font-bold text-neutral-700 block">Outros Meios de Recebimento Registrados na Sessão (Informativo)</span>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 bg-white rounded-lg border border-neutral-200">
                  <span className="text-neutral-500 block text-[11px]">Pix:</span>
                  <span className="font-bold text-neutral-800">{formatCurrencyBRL(selectedSessionForDetail.pixSales || 0)}</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-neutral-200">
                  <span className="text-neutral-500 block text-[11px]">Cartão Débito:</span>
                  <span className="font-bold text-neutral-800">{formatCurrencyBRL(selectedSessionForDetail.cardDebitSales || 0)}</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-neutral-200">
                  <span className="text-neutral-500 block text-[11px]">Cartão Crédito:</span>
                  <span className="font-bold text-neutral-800">{formatCurrencyBRL(selectedSessionForDetail.cardCreditSales || 0)}</span>
                </div>
              </div>
            </div>

            {/* Trilha de Auditoria da Conciliação */}
            {selectedSessionForDetail.reconciledByName && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-2 font-bold text-emerald-900">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>Sessão Reconciliada por {selectedSessionForDetail.reconciledByName}</span>
                </div>
                <div className="text-neutral-600 text-[11px]">
                  Data/Hora: {new Date(selectedSessionForDetail.reconciledAt!).toLocaleString()}
                </div>
                {selectedSessionForDetail.reconciliationNotes && (
                  <div className="text-emerald-800 pt-1 border-t border-emerald-200">
                    <strong>Parecer:</strong> {selectedSessionForDetail.reconciliationNotes}
                  </div>
                )}
              </div>
            )}

            {/* Ações da Tesouraria / Gerência */}
            {currentUser.role === 'admin' && selectedSessionForDetail.status === 'fechado' && (
              <div className="space-y-3 pt-2 border-t">
                <label className="block text-xs font-bold text-neutral-800">
                  Parecer da Tesouraria / Observações de Conciliação:
                </label>
                <textarea
                  rows={2}
                  value={reconcileNotesInput}
                  onChange={(e) => setReconcileNotesInput(e.target.value)}
                  placeholder="Ex: Conferência física de numerário e envelopes de sangria validados no cofre..."
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs text-neutral-900"
                />

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSessionForDetail(null)}
                    className="px-4 py-2 border border-neutral-300 rounded-xl text-xs text-neutral-700 font-semibold hover:bg-neutral-100"
                  >
                    Fechar
                  </button>

                  {Math.abs(selectedSessionForDetail.difference || 0) > 0.01 && (
                    <button
                      type="button"
                      disabled={isReconciling}
                      onClick={async () => {
                        if (!onReconcileCashRegister) return;
                        setIsReconciling(true);
                        const ok = await onReconcileCashRegister(
                          selectedSessionForDetail.id,
                          'resolvido',
                          reconcileNotesInput || 'Divergência tratada e ajustada pela gerência.'
                        );
                        setIsReconciling(false);
                        if (ok) setSelectedSessionForDetail(null);
                      }}
                      className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-colors"
                    >
                      {isReconciling ? 'Gravando...' : 'Resolver Divergência'}
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={isReconciling}
                    onClick={async () => {
                      if (!onReconcileCashRegister) return;
                      setIsReconciling(true);
                      const ok = await onReconcileCashRegister(
                        selectedSessionForDetail.id,
                        'conferido',
                        reconcileNotesInput || 'Conferência física confirmada pela tesouraria.'
                      );
                      setIsReconciling(false);
                      if (ok) setSelectedSessionForDetail(null);
                    }}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    {isReconciling ? 'Gravando...' : 'Aprovar / Confirmar Caixa'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Abertura de Caixa */}
      {isOpenModalActive && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-neutral-200 space-y-4">
            <h3 className="font-bold text-neutral-900 text-base">Abertura de Caixa do Dia</h3>
            <p className="text-xs text-neutral-500">
              Defina o nome do terminal e o valor de fundo de troco em espécie colocado na gaveta.
            </p>

            <form onSubmit={handleOpenSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-700 font-semibold mb-1">Nome do Terminal:</label>
                <input
                  type="text"
                  required
                  value={terminalNameInput}
                  onChange={(e) => setTerminalNameInput(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900"
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">Fundo de Troco Inicial (R$):</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={openingAmountInput}
                  onChange={(e) => setOpeningAmountInput(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900 font-bold"
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">Observação (Opcional):</label>
                <input
                  type="text"
                  placeholder="Ex: Notas miúdas e moedas conferidas..."
                  value={openNotesInput}
                  onChange={(e) => setOpenNotesInput(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900"
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
                  className="px-4 py-2 bg-emerald-700 text-white font-semibold rounded-lg hover:bg-emerald-800"
                >
                  {isSubmitting ? 'Abrindo...' : 'Confirmar Abertura'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Sangria ou Suprimento */}
      {isMovementModalActive && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-neutral-200 space-y-4">
            <h3 className="font-bold text-neutral-900 text-base">
              Lançar {movementType === 'suprimento' ? 'Suprimento (Entrada de Troco)' : 'Sangria (Retirada de Dinheiro)'}
            </h3>

            <form onSubmit={handleMovementSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-700 font-semibold mb-1">Valor em Dinheiro (R$):</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={movementAmountInput}
                  onChange={(e) => setMovementAmountInput(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900 font-bold"
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">Motivo / Justificativa *</label>
                <input
                  type="text"
                  required
                  placeholder={movementType === 'suprimento' ? 'Ex: Troca de moedas no banco' : 'Ex: Depósito em cofre de segurança'}
                  value={movementReasonInput}
                  onChange={(e) => setMovementReasonInput(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900"
                />
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
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-700 text-white font-semibold rounded-lg hover:bg-emerald-800"
                >
                  {isSubmitting ? 'Lançando...' : 'Confirmar Lançamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Fechamento de Caixa com Conferência Matemática */}
      {isCloseModalActive && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-neutral-200 space-y-4">
            <h3 className="font-bold text-neutral-900 text-base">Encerramento & Conferência de Caixa</h3>

            <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200 space-y-1 text-xs">
              <div className="flex justify-between text-neutral-600">
                <span>Fundo Inicial:</span>
                <span>{formatCurrencyBRL(openingAmount)}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Vendas em Espécie:</span>
                <span>+ {formatCurrencyBRL(cashSalesTotal)}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Suprimentos:</span>
                <span>+ {formatCurrencyBRL(cashSuprimentos)}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Sangrias:</span>
                <span>- {formatCurrencyBRL(cashSangrias)}</span>
              </div>
              <div className="flex justify-between font-bold text-neutral-900 pt-1 border-t border-neutral-200 text-sm">
                <span>Saldo Teórico Esperado:</span>
                <span className="text-emerald-800">{formatCurrencyBRL(calculatedExpectedCash)}</span>
              </div>
            </div>

            <form onSubmit={handleCloseSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-700 font-semibold mb-1">
                  Valor Contado Físico na Gaveta (R$):
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={countedAmountInput}
                  onChange={(e) => setCountedAmountInput(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-sm text-neutral-900 font-bold"
                />
              </div>

              {countedAmountInput && (
                <div className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                  Math.abs(discrepancy) < 0.01 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                    : discrepancy > 0 
                    ? 'bg-blue-50 border-blue-200 text-blue-800' 
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  <span className="font-semibold">
                    {Math.abs(discrepancy) < 0.01 
                      ? 'Caixa 100% Batido (Sem Sobra ou Falta)' 
                      : discrepancy > 0 
                      ? 'Sobra de Caixa Identificada:' 
                      : 'Falta de Caixa Identificada:'}
                  </span>
                  <strong className="text-sm">
                    {formatCurrencyBRL(Math.abs(discrepancy))}
                  </strong>
                </div>
              )}

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">
                  Observações / Justificativa {Math.abs(discrepancy) >= 0.01 ? '(Obrigatório se houver diferença)' : '(Opcional)'}:
                </label>
                <textarea
                  rows={2}
                  required={Math.abs(discrepancy) >= 0.01}
                  placeholder={Math.abs(discrepancy) >= 0.01 ? 'Justifique a sobra ou falta apurada...' : 'Observações gerais do dia...'}
                  value={closeNotesInput}
                  onChange={(e) => setCloseNotesInput(e.target.value)}
                  className="w-full p-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsCloseModalActive(false)}
                  className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700 font-medium hover:bg-neutral-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-neutral-900 text-white font-bold rounded-lg hover:bg-black"
                >
                  {isSubmitting ? 'Fechando...' : 'Confirmar Fechamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
