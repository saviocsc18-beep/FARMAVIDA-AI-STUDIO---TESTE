import React, { useState, useEffect } from 'react';
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
  Plus,
  Sparkles,
  Layers,
  ArrowLeft
} from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Input } from './ui/Field';
import { Card, SectionTitle, Callout } from './ui/Layout';
import { notify } from './ui/feedback';
import { cn } from '../lib/ui';

interface RecebimentoMercadoriaViewProps {
  purchaseOrders: PurchaseOrder[];
  products: Product[];
  currentUser: User;
  onReceiveOrder: (
    orderId: string, 
    receivedItems: { productId: string; receivedQuantity: number; damagedQuantity: number }[],
    invoiceNumber?: string,
    notes?: string
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
  useEffect(() => {
    if (selectedOrder) {
      const inputs: Record<string, { received: number; damaged: number }> = {};
      selectedOrder.items.forEach((item) => {
        const pending = Math.max(0, item.quantityOrdered - (item.quantityReceived || 0));
        inputs[item.productId] = {
          received: pending, // Sugere quantidade pendente como default para conferência ágil
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
    notify.info('Quantidades preenchidas conforme saldo pendente da ordem.');
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
      const msg = 'Informe a quantidade recebida de pelo menos um produto para confirmar a entrada física.';
      setErrorMsg(msg);
      notify.erro(msg);
      return;
    }

    const payload = Object.keys(itemsInputs).map((productId) => ({
      productId,
      receivedQuantity: itemsInputs[productId]?.received || 0,
      damagedQuantity: itemsInputs[productId]?.damaged || 0,
    }));

    setIsSubmitting(true);
    try {
      const success = await onReceiveOrder(
        selectedOrder.id, 
        payload, 
        invoiceNumber.trim() || undefined,
        deliveryNotes.trim() || undefined
      );
      if (success) {
        const msg = `Recebimento do pedido ${selectedOrder.code} registrado com sucesso! Saldo creditado no estoque.`;
        setSuccessMsg(msg);
        notify.sucesso(msg);
        // Limpa seleção se não houver mais pedidos
        const remaining = eligibleOrders.filter((o) => o.id !== selectedOrder.id);
        if (remaining.length > 0) {
          setSelectedOrderId(remaining[0].id);
        } else {
          setSelectedOrderId('');
        }
      } else {
        const err = 'Não foi possível registrar o recebimento. Verifique os dados e tente novamente.';
        setErrorMsg(err);
        notify.erro(err);
      }
    } catch (err: any) {
      const errTxt = err.message || 'Erro inesperado ao registrar recebimento.';
      setErrorMsg(errTxt);
      notify.erro(errTxt);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="receber-mercadoria-container" className="space-y-5">
      {/* Alertas de Notificação */}
      {successMsg && (
        <Callout
          variant="ok"
          title="Recebimento Concluído com Sucesso"
          action={
            <Button
              size="sm"
              variant="primary"
              onClick={onGoToBalcao}
              icon={ArrowRight}
            >
              Ir ao Balcão
            </Button>
          }
        >
          {successMsg}
        </Callout>
      )}

      {errorMsg && (
        <Callout variant="danger" title="Erro no Recebimento">
          {errorMsg}
        </Callout>
      )}

      {/* Conteúdo Principal */}
      {eligibleOrders.length === 0 ? (
        <Card className="p-8 text-center space-y-3 bg-white border-[#E1E9E4]">
          <div className="w-12 h-12 rounded-2xl bg-[#E6F4EC] text-[#0E7A53] flex items-center justify-center mx-auto">
            <PackageCheck className="w-6 h-6" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-[#13231B]">
            Nenhum Pedido de Compra Pendente de Entrega
          </h2>
          <p className="text-xs sm:text-sm text-[#56675E] max-w-md mx-auto">
            Todos os pedidos autorizados pela gerência já foram recebidos e conferidos fisicamente no estoque.
          </p>
          <div className="pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={onGoToBalcao}
              icon={ArrowRight}
            >
              Retornar ao Balcão de Vendas
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-5">
          {/* Seletor de Pedido Autorizado */}
          <Card className="p-5 bg-white border-[#E1E9E4] space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#13231B] mb-2">
                  Selecione o Pedido de Compra Entregue:
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {eligibleOrders.map((po) => {
                    const isSelected = po.id === selectedOrderId;
                    return (
                      <button
                        key={po.id}
                        type="button"
                        onClick={() => setSelectedOrderId(po.id)}
                        className={cn(
                          "min-h-[46px] px-4 py-2.5 rounded-xl text-left border transition-all cursor-pointer",
                          isSelected
                            ? "bg-[#E6F4EC] border-[#0E7A53] text-[#0B6445] font-bold ring-2 ring-[#0E7A53]/20"
                            : "bg-[#F3F7F4] border-[#E1E9E4] text-[#13231B] hover:bg-[#E1E9E4]/60"
                        )}
                      >
                        <div className="text-xs font-extrabold flex items-center gap-1.5">
                          <span>{po.code}</span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#0E7A53]" />}
                        </div>
                        <div className="text-[11px] text-[#56675E] mt-0.5">
                          {po.supplierName} • {po.items.length} item(ns)
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedOrder && (
                <div className="bg-[#F3F7F4] border border-[#E1E9E4] p-3.5 rounded-xl text-xs space-y-1 sm:text-right shrink-0">
                  <div className="font-bold text-[#13231B]">
                    Fornecedor: <span className="text-[#0E7A53]">{selectedOrder.supplierName}</span>
                  </div>
                  <div className="text-[#56675E]">
                    Status: <Badge variant="ok">{selectedOrder.status.replace('_', ' ')}</Badge>
                  </div>
                  <div className="text-[11px] text-[#56675E]">
                    Autorizado em: {selectedOrder.approvedAt ? new Date(selectedOrder.approvedAt).toLocaleDateString('pt-BR') : 'Sim'}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Formulário de Conferência Física de Itens */}
          {selectedOrder && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="bg-white rounded-2xl border border-[#E1E9E4] shadow-2xs overflow-hidden">
                <div className="p-4 sm:p-5 bg-[#F3F7F4]/60 border-b border-[#E1E9E4] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-tight text-[#13231B] flex items-center gap-2">
                      <Truck className="w-4 h-4 text-[#0E7A53]" />
                      Conferência de Produtos ({selectedOrder.code})
                    </h2>
                    <p className="text-xs text-[#56675E] mt-0.5">
                      Confira fisicamente cada caixa. Registre avarias para emissão de nota de devolução/recusa.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="soft"
                    size="sm"
                    onClick={handleFillAllExact}
                    icon={CheckCircle2}
                  >
                    Preencher Tudo Conforme
                  </Button>
                </div>

                {/* Tabela Operacional de Itens */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F3F7F4] text-[#56675E] font-bold border-b border-[#E1E9E4] uppercase tracking-wider text-[11px]">
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
                    <tbody className="divide-y divide-[#E1E9E4] text-[#13231B]">
                      {selectedOrder.items.map((it) => {
                        const product = products.find((p) => p.id === it.productId);
                        const pendingQty = Math.max(0, it.quantityOrdered - (it.quantityReceived || 0));
                        const currentInput = itemsInputs[it.productId] || { received: 0, damaged: 0 };
                        const receivedNow = currentInput.received || 0;
                        const damagedNow = currentInput.damaged || 0;
                        const totalDelivered = receivedNow + damagedNow;
                        const diff = totalDelivered - pendingQty;

                        return (
                          <tr key={it.productId} className="hover:bg-[#F3F7F4]/40 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-[#13231B] text-sm">{it.productName}</div>
                              <div className="text-[11px] text-[#56675E] font-mono mt-0.5">
                                EAN/Código: {it.productCode || product?.code || '-'}
                              </div>
                            </td>

                            <td className="py-3.5 px-3 text-center font-bold text-[#56675E] text-sm">
                              {it.quantityOrdered}
                            </td>

                            <td className="py-3.5 px-3 text-center text-[#56675E] font-semibold">
                              {it.quantityReceived || 0}
                            </td>

                            <td className="py-3.5 px-3 text-center font-bold text-[#0B6445] bg-[#E6F4EC]/40">
                              {pendingQty}
                            </td>

                            {/* Campo de Entrada Física com Controles Táteis */}
                            <td className="py-3.5 px-4 text-center">
                              <div className="inline-flex items-center border border-[#E1E9E4] rounded-xl bg-white overflow-hidden shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateReceived(it.productId, receivedNow - 1)}
                                  className="w-8 h-8 flex items-center justify-center font-bold text-[#13231B] hover:bg-[#F3F7F4] transition-colors cursor-pointer"
                                  aria-label="Diminuir"
                                >
                                  <Minus className="w-3.5 h-3.5 text-[#56675E]" />
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  value={receivedNow}
                                  onChange={(e) => handleUpdateReceived(it.productId, Number(e.target.value))}
                                  className="w-14 text-center font-black text-[#13231B] text-sm py-1 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateReceived(it.productId, receivedNow + 1)}
                                  className="w-8 h-8 flex items-center justify-center font-bold text-[#13231B] hover:bg-[#F3F7F4] transition-colors cursor-pointer"
                                  aria-label="Aumentar"
                                >
                                  <Plus className="w-3.5 h-3.5 text-[#56675E]" />
                                </button>
                              </div>
                            </td>

                            {/* Campo de Avaria */}
                            <td className="py-3.5 px-3 text-center">
                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={damagedNow > 0 ? damagedNow : ''}
                                onChange={(e) => handleUpdateDamaged(it.productId, Number(e.target.value))}
                                className="w-14 px-2 py-1.5 bg-white border border-[#E1E9E4] rounded-lg text-center font-bold text-[#A8261B] text-xs focus:ring-2 focus:ring-[#A8261B]/20 focus:border-[#A8261B] outline-none"
                              />
                            </td>

                            {/* Diferença */}
                            <td className="py-3.5 px-4 text-right font-bold">
                              {diff === 0 ? (
                                <Badge variant="ok" icon={CheckCircle2}>
                                  Exato
                                </Badge>
                              ) : diff < 0 ? (
                                <Badge variant="warn" icon={AlertTriangle}>
                                  Falta ({Math.abs(diff)})
                                </Badge>
                              ) : (
                                <Badge variant="info">
                                  Excesso (+{diff})
                                </Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Dados da Nota Fiscal e Conclusão */}
                <div className="p-5 bg-[#F3F7F4]/60 border-t border-[#E1E9E4] grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#13231B] mb-1.5">
                      Número da Nota Fiscal (DANFE) / Canhoto:
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: NF-e 104592"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      className="w-full h-10 px-3.5 bg-white border border-[#E1E9E4] rounded-xl text-xs font-bold text-[#13231B] focus:ring-2 focus:ring-[#0E7A53]/20 focus:border-[#0E7A53] outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#13231B] mb-1.5">
                      Observação Operacional do Recebimento:
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Entregador João da Distribuidora Santa Cruz. Lote conferido."
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      className="w-full h-10 px-3.5 bg-white border border-[#E1E9E4] rounded-xl text-xs text-[#13231B] focus:ring-2 focus:ring-[#0E7A53]/20 focus:border-[#0E7A53] outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Botão de Confirmação */}
                <div className="p-4 sm:p-5 bg-white border-t border-[#E1E9E4] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-[#56675E]">
                    Operador responsável: <strong className="text-[#13231B]">{currentUser.name}</strong>. A entrada física será creditada imediatamente no estoque da loja.
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={isSubmitting}
                    icon={PackageCheck}
                    className="min-h-[48px] px-8"
                  >
                    Confirmar Entrada no Estoque
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

