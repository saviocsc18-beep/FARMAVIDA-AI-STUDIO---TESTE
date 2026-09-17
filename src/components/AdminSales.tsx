import React, { useState } from 'react';
import { Sale, User } from '../types';
import { Search, Receipt, CheckCircle2, Clock, AlertTriangle, ArrowUpRight, Filter, Download, Ban, ShieldAlert, X } from 'lucide-react';

interface AdminSalesProps {
  sales: Sale[];
  users: User[];
  currentUser?: User;
  onReconcileFiscal: (saleId: string, fiscalRef: string, notes?: string) => Promise<boolean>;
  onCancelSale?: (saleId: string, reason: string, adminPin?: string) => Promise<{ success: boolean; message?: string; approvalRequired?: boolean; error?: string }>;
}

export const AdminSales: React.FC<AdminSalesProps> = ({
  sales,
  users,
  currentUser,
  onReconcileFiscal,
  onCancelSale,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [fiscalFilter, setFiscalFilter] = useState<'todos' | 'pendente' | 'vinculado'>('todos');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'concluida' | 'cancelada'>('todos');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // Reconciliation modal state
  const [reconcilingSale, setReconcilingSale] = useState<Sale | null>(null);
  const [fiscalReferenceInput, setFiscalReferenceInput] = useState('');
  const [fiscalNotesInput, setFiscalNotesInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cancellation modal state
  const [cancelingSale, setCancelingSale] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelPin, setCancelPin] = useState('');
  const [cancelMsg, setCancelMsg] = useState<{ text: string; isError: boolean } | null>(null);

  const filteredSales = sales.filter((s) => {
    const query = searchTerm.toLowerCase();
    const matchesQuery =
      s.code.toLowerCase().includes(query) ||
      s.sellerName.toLowerCase().includes(query) ||
      (s.customerName && s.customerName.toLowerCase().includes(query)) ||
      (s.fiscalReference && s.fiscalReference.toLowerCase().includes(query));

    const matchesFiscal =
      fiscalFilter === 'todos' ||
      (fiscalFilter === 'pendente' && s.fiscalStatus === 'pendente_conciliacao') ||
      (fiscalFilter === 'vinculado' && s.fiscalStatus === 'vinculado');

    const matchesStatus =
      statusFilter === 'todos' ||
      s.status === statusFilter ||
      (!s.status && statusFilter === 'concluida');

    return matchesQuery && matchesFiscal && matchesStatus;
  });

  const handleOpenReconcile = (sale: Sale) => {
    setReconcilingSale(sale);
    setFiscalReferenceInput(sale.fiscalReference || '');
    setFiscalNotesInput(sale.fiscalNotes || '');
  };

  const handleSubmitReconciliation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconcilingSale || !fiscalReferenceInput.trim()) return;

    setIsSubmitting(true);
    const success = await onReconcileFiscal(reconcilingSale.id, fiscalReferenceInput.trim(), fiscalNotesInput.trim());
    setIsSubmitting(false);

    if (success) {
      setReconcilingSale(null);
    }
  };

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelingSale || !cancelReason.trim()) return;

    setIsSubmitting(true);
    setCancelMsg(null);

    if (onCancelSale) {
      const res = await onCancelSale(cancelingSale.id, cancelReason.trim(), cancelPin.trim() || undefined);
      setIsSubmitting(false);

      if (res.success) {
        alert(res.message || 'Venda cancelada com sucesso!');
        setCancelingSale(null);
        setSelectedSale(null);
        setCancelReason('');
        setCancelPin('');
      } else {
        setCancelMsg({ text: res.error || 'Erro ao cancelar.', isError: true });
      }
    } else {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-emerald-700" />
            <span>Vendas Operacionais & Conciliação Fiscal</span>
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Registro detalhado de atendimentos, formas de pagamento divididas e vínculo com o emissor fiscal satélite.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-neutral-600">Total de Vendas:</span>
          <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full">
            {sales.length} registros
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por código, atendente, cliente ou nota..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto text-xs">
          <span className="text-neutral-500 font-medium">Status da Venda:</span>
          <div className="flex rounded-lg border border-neutral-200 p-0.5 bg-neutral-50">
            <button
              onClick={() => setStatusFilter('todos')}
              className={`px-3 py-1 rounded-md transition-colors ${
                statusFilter === 'todos' ? 'bg-white font-bold text-neutral-900 shadow-xs' : 'text-neutral-600'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setStatusFilter('concluida')}
              className={`px-3 py-1 rounded-md transition-colors ${
                statusFilter === 'concluida' ? 'bg-white font-bold text-emerald-800 shadow-xs' : 'text-neutral-600'
              }`}
            >
              Concluídas
            </button>
            <button
              onClick={() => setStatusFilter('cancelada')}
              className={`px-3 py-1 rounded-md transition-colors ${
                statusFilter === 'cancelada' ? 'bg-white font-bold text-red-700 shadow-xs' : 'text-neutral-600'
              }`}
            >
              Canceladas
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto text-xs">
          <span className="text-neutral-500 font-medium">Status Fiscal:</span>
          <div className="flex rounded-lg border border-neutral-200 p-0.5 bg-neutral-50">
            <button
              onClick={() => setFiscalFilter('todos')}
              className={`px-3 py-1 rounded-md transition-colors ${
                fiscalFilter === 'todos' ? 'bg-white font-bold text-neutral-900 shadow-xs' : 'text-neutral-600'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFiscalFilter('pendente')}
              className={`px-3 py-1 rounded-md transition-colors ${
                fiscalFilter === 'pendente' ? 'bg-white font-bold text-amber-800 shadow-xs' : 'text-neutral-600'
              }`}
            >
              Pendentes
            </button>
            <button
              onClick={() => setFiscalFilter('vinculado')}
              className={`px-3 py-1 rounded-md transition-colors ${
                fiscalFilter === 'vinculado' ? 'bg-white font-bold text-emerald-800 shadow-xs' : 'text-neutral-600'
              }`}
            >
              Vinculados
            </button>
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-100/60 text-neutral-600 font-semibold border-b border-neutral-200">
              <tr>
                <th className="py-3 px-4">Código / Data</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Vendedor & Operador</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Itens</th>
                <th className="py-3 px-4">Total & Pagamentos</th>
                <th className="py-3 px-4">Conciliação Fiscal</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-neutral-800">
              {filteredSales.map((sale) => {
                const isCanceled = sale.status === 'cancelada';

                return (
                  <tr key={sale.id} className={`hover:bg-neutral-50/80 transition-colors ${isCanceled ? 'bg-red-50/30' : ''}`}>
                    <td className="py-3 px-4">
                      <div className="font-bold text-neutral-900">{sale.code}</div>
                      <div className="text-[11px] text-neutral-500">
                        {new Date(sale.timestamp).toLocaleString([], {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {isCanceled ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded border border-red-200">
                          <Ban className="w-3 h-3" />
                          Cancelada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          Concluída
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-neutral-900">{sale.sellerName}</div>
                      <div className="text-[11px] text-neutral-500">Reg: {sale.operatorName}</div>
                    </td>

                    <td className="py-3 px-4">
                      {sale.customerName ? (
                        <span className="font-medium text-neutral-800">{sale.customerName}</span>
                      ) : (
                        <span className="text-neutral-400 italic">Consumidor Geral</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium">{(sale.items || []).length} produto(s)</div>
                      <div className="text-[11px] text-neutral-500 line-clamp-1">
                        {(sale.items || []).map((it) => `${it.quantity}x ${it.productName}`).join(', ')}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className={`font-bold text-sm ${isCanceled ? 'text-red-700 line-through' : 'text-emerald-800'}`}>
                        R$ {sale.total.toFixed(2)}
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        {(sale.payments || []).map((p) => p.method.replace('_', ' ')).join(' + ')}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {isCanceled ? (
                        <span className="text-[11px] text-neutral-400 italic">Venda Estornada</span>
                      ) : sale.fiscalStatus === 'vinculado' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Cupom: {sale.fiscalReference}</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleOpenReconcile(sale)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 hover:bg-amber-100"
                        >
                          <Clock className="w-3 h-3" />
                          <span>Pendente • Vincular</span>
                        </button>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedSale(sale)}
                          className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded transition-colors"
                        >
                          Detalhes
                        </button>
                        {!isCanceled && onCancelSale && (
                          <button
                            onClick={() => {
                              setCancelingSale(sale);
                              setCancelReason('');
                              setCancelPin('');
                              setCancelMsg(null);
                            }}
                            className="px-2 py-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded transition-colors flex items-center gap-1"
                            title="Cancelar venda e estornar estoque/caixa"
                          >
                            <Ban className="w-3 h-3" />
                            <span>Cancelar</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-neutral-400">
                    Nenhuma venda encontrada para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sale Details Modal */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-xl border border-neutral-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-neutral-900">
                  Venda {selectedSale.code}
                </h3>
                {selectedSale.status === 'cancelada' && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 uppercase">
                    Cancelada
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedSale(null)}
                className="text-neutral-400 hover:text-neutral-700 text-sm"
              >
                ✕
              </button>
            </div>

            {/* General info */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-neutral-50 p-3 rounded-lg border border-neutral-200">
              <div>
                <span className="text-neutral-500 block">Vendedor do Balcão:</span>
                <span className="font-semibold text-neutral-800">{selectedSale.sellerName}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">Operador do Registro:</span>
                <span className="font-semibold text-neutral-800">{selectedSale.operatorName}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">Cliente:</span>
                <span className="font-semibold text-neutral-800">{selectedSale.customerName || 'Consumidor Geral'}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">Status Fiscal:</span>
                <span className="font-semibold text-neutral-800">
                  {selectedSale.fiscalStatus === 'vinculado' ? `Vinculado (${selectedSale.fiscalReference})` : 'Pendente de emissão/vinculação'}
                </span>
              </div>
            </div>

            {/* Items table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                Itens da Venda:
              </h4>
              <div className="border border-neutral-200 rounded-lg overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-neutral-100 text-neutral-600 font-semibold">
                    <tr>
                      <th className="py-2 px-3">Item</th>
                      <th className="py-2 px-3 text-center">Qtd</th>
                      <th className="py-2 px-3 text-right">Unitário</th>
                      <th className="py-2 px-3 text-right">Desc</th>
                      <th className="py-2 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 text-neutral-800">
                    {(selectedSale.items || []).map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3">
                          <div className="font-medium">{it.productName}</div>
                          <div className="text-[10px] text-neutral-500">{it.presentation || it.category}</div>
                        </td>
                        <td className="py-2 px-3 text-center">{it.quantity}</td>
                        <td className="py-2 px-3 text-right">R$ {it.unitPrice.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right text-amber-700">
                          {it.discountAmount > 0 ? `-R$ ${it.discountAmount.toFixed(2)}` : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-bold">R$ {it.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payments breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                Pagamentos Realizados:
              </h4>
              <div className="space-y-1.5 text-xs">
                {(selectedSale.payments || []).map((p, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center bg-neutral-50 p-2.5 rounded border border-neutral-200"
                  >
                    <span className="font-semibold capitalize text-neutral-800">
                      {p.method.replace('_', ' ')}
                    </span>
                    <span className="font-bold text-emerald-800">R$ {p.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* History and audit */}
            <div className="pt-2 border-t border-neutral-200 text-[11px] text-neutral-500 space-y-1">
              <span className="font-semibold text-neutral-700">Trilha de Eventos da Venda:</span>
              {(selectedSale.history || []).map((h, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>• {h.action} ({h.userName})</span>
                  <span>{new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-neutral-200">
              {selectedSale.status !== 'cancelada' && onCancelSale && (
                <button
                  onClick={() => {
                    setCancelingSale(selectedSale);
                    setCancelReason('');
                    setCancelPin('');
                    setCancelMsg(null);
                  }}
                  className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-red-200 transition-colors"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Cancelar esta Venda</span>
                </button>
              )}

              <button
                onClick={() => setSelectedSale(null)}
                className="px-4 py-2 bg-neutral-800 text-white text-xs font-semibold rounded-lg hover:bg-neutral-900 ml-auto"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Sale Modal */}
      {cancelingSale && (
        <div className="fixed inset-0 z-50 bg-neutral-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-neutral-900 text-base">
                  Cancelar Venda {cancelingSale.code}
                </h3>
                <p className="text-xs text-neutral-500">
                  Valor total: R$ {cancelingSale.total.toFixed(2)} ({cancelingSale.items?.length || 0} itens)
                </p>
              </div>
            </div>

            <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-xs text-red-800 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                Efeitos Operacionais Imediatos:
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-neutral-700">
                <li>100% dos produtos vendidos serão devolvidos ao estoque.</li>
                <li>Os saldos de caixa correspondentes serão compensados/estornados.</li>
                <li>O log de auditoria registrará o cancelamento com autoria e justificativa.</li>
              </ul>
            </div>

            {cancelMsg && (
              <div className={`p-3 rounded-xl text-xs ${cancelMsg.isError ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'}`}>
                {cancelMsg.text}
              </div>
            )}

            <form onSubmit={handleConfirmCancel} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-700 font-semibold mb-1">
                  Justificativa Obrigatória do Cancelamento *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Ex: Cliente desistiu da compra antes de retirar / Erro no registro de forma de pagamento..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              {currentUser?.role !== 'admin' && (
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">
                    PIN Gerencial para Autorização Imediata (Opcional)
                  </label>
                  <input
                    type="password"
                    placeholder="Se não informado, gerará solicitação na Central de Aprovações"
                    value={cancelPin}
                    onChange={(e) => setCancelPin(e.target.value)}
                    className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setCancelingSale(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-neutral-300 rounded-xl text-neutral-700 font-semibold hover:bg-neutral-100"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-xs"
                >
                  {isSubmitting ? 'Processando...' : 'Confirmar Cancelamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fiscal Reconciliation Modal */}
      {reconcilingSale && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-neutral-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
              <h3 className="font-bold text-neutral-900 text-base">Vincular Documento Fiscal</h3>
              <button
                onClick={() => setReconcilingSale(null)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-neutral-500">
              Informe o número da NFC-e ou SAT emitido no sistema satélite de cupom fiscal para a venda{' '}
              <strong className="text-neutral-800">{reconcilingSale.code}</strong> (Valor R$ {reconcilingSale.total.toFixed(2)}).
            </p>

            <form onSubmit={handleSubmitReconciliation} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-700 font-semibold mb-1">
                  Número do Documento / Cupom Fiscal *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: NFCe-5503 ou 0001248"
                  value={fiscalReferenceInput}
                  onChange={(e) => setFiscalReferenceInput(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-sm text-neutral-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">
                  Observações de Conciliação (Opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ex: Emitido no terminal satélite 02..."
                  value={fiscalNotesInput}
                  onChange={(e) => setFiscalNotesInput(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setReconcilingSale(null)}
                  className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700 font-medium hover:bg-neutral-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-700 text-white font-semibold rounded-lg hover:bg-emerald-800"
                >
                  {isSubmitting ? 'Gravando...' : 'Confirmar Vínculo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
