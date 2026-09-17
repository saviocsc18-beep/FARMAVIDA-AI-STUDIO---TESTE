import React, { useState } from 'react';
import { PurchaseOrder, Product, User } from '../types';
import { 
  Truck, 
  PackageCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Building2, 
  FileText, 
  ArrowRight,
  ShieldCheck,
  Search,
  Minus,
  Plus
} from 'lucide-react';

interface RecebimentoMercadoriaViewProps {
  purchaseOrders: PurchaseOrder[];
  products: Product[];
  currentUser: User;
  onReceiveOrder: (
    orderId: string, 
    receivedItems: { productId: string; receivedQuantity: number; damagedQuantity: number }[],
    invoiceNumber?: string
  ) => Promise<boolean>;
  onGoToBalcao: () => void;
}

export const RecebimentoMercadoriaView: React.FC<RecebimentoMercadoriaViewProps> = ({
  purchaseOrders,
  products,
  currentUser,
  onReceiveOrder,
  onGoToBalcao,
}) => {
  // Apenas pedidos autorizados pela administração prontos para recebimento físico
  const eligibleOrders = purchaseOrders.filter(
    (po) => po.status === 'aprovado' || po.status === 'parcialmente_recebido'
  );

  const [selectedOrderId, setSelectedOrderId] = useState<string>(
    eligibleOrders[0]?.id || ''
  );
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [deliveryNotes, setDeliveryNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Mapa de quantidades recebidas: { [productId]: { received: number, damaged: number } }
  const [itemsInputs, setItemsInputs] = useState<Record<string, { received: number; damaged: number }>>({});

  const selectedOrder = eligibleOrders.find((po) => po.id === selectedOrderId);

  // Inicializa inputs quando seleciona um pedido
  React.useEffect(() => {
    if (selectedOrder) {
      const inputs: Record<string, { received: number; damaged: number }> = {};
      selectedOrder.items.forEach((item) => {
        const pending = Math.max(0, item.quantityOrdered - (item.quantityReceived || 0));
        inputs[item.productId] = {
          received: pending, // Sugere quantidade pendente como default para facilitar conferência
          damaged: 0,
        };
      });
      setItemsInputs(inputs);
      setInvoiceNumber(selectedOrder.invoiceNumber || '');
      setSuccessMsg(null);
      setErrorMsg(null);
    }
  }, [selectedOrderId, selectedOrder]);

  const handleUpdateReceived = (productId: string, val: number) => {
    const safeVal = Math.max(0, val);
    setItemsInputs((prev) => ({
      ...prev,
      [productId]: {
        received: safeVal,
        damaged: prev[productId]?.damaged || 0,
      },
    }));
  };

  const handleUpdateDamaged = (productId: string, val: number) => {
    const safeVal = Math.max(0, val);
    setItemsInputs((prev) => ({
      ...prev,
      [productId]: {
        received: prev[productId]?.received || 0,
        damaged: safeVal,
      },
    }));
  };

  const handleFillAllExact = () => {
    if (!selectedOrder) return;
    const inputs: Record<string, { received: number; damaged: number }> = {};
    selectedOrder.items.forEach((item) => {
      const pending = Math.max(0, item.quantityOrdered - (item.quantityReceived || 0));
      inputs[item.productId] = {
        received: pending,
        damaged: 0,
      };
    });
    setItemsInputs(inputs);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    // Valida que ao menos um item possui quantidade recebida ou avariada
    const hasAnyQuantity = (Object.values(itemsInputs) as Array<{ received: number; damaged: number }>).some(
      (v) => (v.received || 0) > 0 || (v.damaged || 0) > 0
    );

    if (!hasAnyQuantity) {
      setErrorMsg('Informe a quantidade recebida de pelo menos um produto para confirmar a entrada física.');
      return;
    }

    const payload = Object.keys(itemsInputs).map((productId) => ({
      productId,
      receivedQuantity: itemsInputs[productId]?.received || 0,
      damagedQuantity: itemsInputs[productId]?.damaged || 0,
    }));

    setIsSubmitting(true);
    try {
      const success = await onReceiveOrder(selectedOrder.id, payload, invoiceNumber.trim() || undefined);
      if (success) {
        setSuccessMsg(`Recebimento do pedido ${selectedOrder.code} confirmado com sucesso! O saldo foi creditado no estoque.`);
        // Limpa seleção se não houver mais pedidos
        const remaining = eligibleOrders.filter((o) => o.id !== selectedOrder.id);
        if (remaining.length > 0) {
          setSelectedOrderId(remaining[0].id);
        } else {
          setSelectedOrderId('');
        }
      } else {
        setErrorMsg('Não foi possível registrar o recebimento. Verifique os dados e tente novamente.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro inesperado ao registrar recebimento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="receber-mercadoria-container" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Operacional */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2.5">
            <Truck className="w-6 h-6 text-emerald-700" />
            <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
              Receber Mercadoria
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
              Conferência Física
            </span>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Conferência cega proibida. Registre os produtos entregues pela distribuidora com base no pedido autorizado pela gerência.
          </p>
        </div>

        <button
          type="button"
          onClick={onGoToBalcao}
          className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <span>Voltar ao Balcão</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Alertas de Notificação */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-400 rounded-2xl text-emerald-900 text-sm font-semibold flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={onGoToBalcao}
            className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            Ir para o Balcão
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-300 rounded-2xl text-red-800 text-sm font-semibold flex items-center gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Conteúdo Principal */}
      {eligibleOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
            <PackageCheck className="w-6 h-6" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-neutral-900">
            Nenhum Pedido de Compra Pendente de Entrega
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 max-w-md mx-auto">
            Todos os pedidos autorizados pela gerência já foram recebidos e conferidos fisicamente no estoque.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={onGoToBalcao}
              className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-xl transition-all shadow-xs cursor-pointer"
            >
              Retornar ao Balcão de Vendas
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Seletor de Pedido Autorizado */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Selecione o Pedido de Compra que Chegou:
                </label>
                <div className="flex flex-wrap gap-2">
                  {eligibleOrders.map((po) => {
                    const isSelected = po.id === selectedOrderId;
                    return (
                      <button
                        key={po.id}
                        type="button"
                        onClick={() => setSelectedOrderId(po.id)}
                        className={`min-h-[46px] px-4 py-2 rounded-xl text-left border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 border-2 border-emerald-600 text-emerald-950 font-bold shadow-xs'
                            : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                        }`}
                      >
                        <div className="text-xs font-black">{po.code}</div>
                        <div className="text-[11px] text-neutral-500">
                          {po.supplierName} • {po.items.length} item(ns)
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedOrder && (
                <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-xl text-xs space-y-1 sm:text-right shrink-0">
                  <div className="font-bold text-emerald-950">
                    Fornecedor: {selectedOrder.supplierName}
                  </div>
                  <div className="text-emerald-800">
                    Status: <span className="font-semibold uppercase">{selectedOrder.status.replace('_', ' ')}</span>
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    Autorizado em: {selectedOrder.approvedAt ? new Date(selectedOrder.approvedAt).toLocaleDateString() : 'Sim'}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Formulário de Conferência Física de Itens */}
          {selectedOrder && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
                <div className="p-4 bg-neutral-50 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
                      Conferência de Produtos do Pedido ({selectedOrder.code})
                    </h2>
                    <p className="text-xs text-neutral-500">
                      Confira cada caixa entregue fisicamente. Diferenças serão auditadas pela administração.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleFillAllExact}
                    className="px-3.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-950 text-xs font-bold rounded-lg border border-emerald-300 transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Conferir Tudo Conforme (Saldo Exato)</span>
                  </button>
                </div>

                {/* Tabela Operacional de Itens */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-100 text-neutral-700 font-bold border-b border-neutral-200 uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Medicamento / Apresentação</th>
                        <th className="py-3 px-3 text-center">Qtd Pedida</th>
                        <th className="py-3 px-3 text-center">Já Recebida</th>
                        <th className="py-3 px-3 text-center">Saldo Esperado</th>
                        <th className="py-3 px-4 text-center">Qtd Entregue Agora (Apta)</th>
                        <th className="py-3 px-3 text-center">Avariada (Recusada)</th>
                        <th className="py-3 px-4 text-right">Situação / Diferença</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 text-neutral-800">
                      {selectedOrder.items.map((it) => {
                        const product = products.find((p) => p.id === it.productId);
                        const pendingQty = Math.max(0, it.quantityOrdered - (it.quantityReceived || 0));
                        const currentInput = itemsInputs[it.productId] || { received: 0, damaged: 0 };
                        const receivedNow = currentInput.received || 0;
                        const damagedNow = currentInput.damaged || 0;
                        const totalDelivered = receivedNow + damagedNow;
                        const diff = totalDelivered - pendingQty;

                        return (
                          <tr key={it.productId} className="hover:bg-neutral-50 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-bold text-neutral-900 text-sm">{it.productName}</div>
                              <div className="text-[11px] text-neutral-500">
                                Código: {it.productCode || product?.code || '-'}
                              </div>
                            </td>

                            <td className="py-3 px-3 text-center font-bold text-neutral-700 text-sm">
                              {it.quantityOrdered}
                            </td>

                            <td className="py-3 px-3 text-center text-neutral-500 font-semibold">
                              {it.quantityReceived || 0}
                            </td>

                            <td className="py-3 px-3 text-center font-bold text-emerald-900 bg-emerald-50/50">
                              {pendingQty}
                            </td>

                            {/* Campo de Entrada Física com Controles Táteis */}
                            <td className="py-3 px-4 text-center">
                              <div className="inline-flex items-center border border-neutral-300 rounded-xl bg-white overflow-hidden shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateReceived(it.productId, receivedNow - 1)}
                                  className="w-8 h-8 flex items-center justify-center font-bold text-neutral-700 hover:bg-neutral-100 cursor-pointer"
                                  aria-label="Diminuir"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  value={receivedNow}
                                  onChange={(e) => handleUpdateReceived(it.productId, Number(e.target.value))}
                                  className="w-14 text-center font-black text-neutral-900 text-sm py-1 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateReceived(it.productId, receivedNow + 1)}
                                  className="w-8 h-8 flex items-center justify-center font-bold text-neutral-700 hover:bg-neutral-100 cursor-pointer"
                                  aria-label="Aumentar"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>

                            {/* Campo de Avaria */}
                            <td className="py-3 px-3 text-center">
                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={damagedNow > 0 ? damagedNow : ''}
                                onChange={(e) => handleUpdateDamaged(it.productId, Number(e.target.value))}
                                className="w-14 px-2 py-1 bg-white border border-neutral-300 rounded-lg text-center font-semibold text-red-700 text-xs focus:ring-1 focus:ring-red-500"
                              />
                            </td>

                            {/* Diferença */}
                            <td className="py-3 px-4 text-right font-bold">
                              {diff === 0 ? (
                                <span className="text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-md text-[11px] inline-flex items-center gap-1 font-bold">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                                  <span>Exato</span>
                                </span>
                              ) : diff < 0 ? (
                                <span className="text-amber-800 bg-amber-100/80 px-2.5 py-1 rounded-md text-[11px] inline-flex items-center gap-1 font-bold">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                                  <span>Falta ({Math.abs(diff)})</span>
                                </span>
                              ) : (
                                <span className="text-blue-800 bg-blue-100/80 px-2.5 py-1 rounded-md text-[11px] inline-flex items-center gap-1 font-bold">
                                  <span>Excesso (+{diff})</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Dados da Nota Fiscal e Conclusão */}
                <div className="p-5 bg-neutral-50/70 border-t border-neutral-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Número da Nota Fiscal (DANFE) / Canhoto (Opcional):
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: NF-e 104592"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs font-bold text-neutral-900 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Observação Operacional do Recebimento (Opcional):
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Entregador João da Distribuidora Santa Cruz. Lote conferido."
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Botão de Confirmação */}
                <div className="p-4 bg-white border-t border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-neutral-500">
                    Operador responsável pelo recebimento: <strong>{currentUser.name}</strong>. A entrada será registrada imediatamente no estoque vendável.
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="min-h-[48px] px-8 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <PackageCheck className="w-5 h-5" />
                    <span>{isSubmitting ? 'Gravando Entrada...' : 'CONFIRMAR ENTRADA NO ESTOQUE'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
