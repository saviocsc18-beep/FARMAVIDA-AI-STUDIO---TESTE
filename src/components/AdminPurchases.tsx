import React, { useState } from 'react';
import { PurchaseOrder, PurchaseOrderItem, Supplier, Product, UnmetDemand, User } from '../types';
import { formatCurrencyBRL } from '../lib/format';
import { 
  Truck, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  PackageCheck, 
  Clock, 
  Layers, 
  FileText,
  Building2,
  Trash2
} from 'lucide-react';

interface AdminPurchasesProps {
  purchaseOrders: PurchaseOrder[];
  suppliers: Supplier[];
  products: Product[];
  unmetDemands: UnmetDemand[];
  currentUser: User;
  onCreatePurchaseOrder: (orderData: any) => Promise<boolean>;
  onApproveOrder: (orderId: string) => Promise<boolean>;
  onReceiveOrder: (orderId: string, receivedItems: { productId: string; receivedQuantity: number; damagedQuantity: number }[], invoiceNumber?: string) => Promise<boolean>;
}

export const AdminPurchases: React.FC<AdminPurchasesProps> = ({
  purchaseOrders,
  suppliers,
  products,
  unmetDemands,
  currentUser,
  onCreatePurchaseOrder,
  onApproveOrder,
  onReceiveOrder,
}) => {
  const [activeTab, setActiveTab] = useState<'pedidos' | 'sugestao' | 'fornecedores'>('pedidos');

  // Create Order Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState(suppliers[0]?.id || '');
  const [orderItems, setOrderItems] = useState<Array<{ productId: string; quantityOrdered: number; unitCost: number }>>([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Receiving Modal
  const [receivingOrder, setReceivingOrder] = useState<PurchaseOrder | null>(null);
  const [receiveInputs, setReceiveInputs] = useState<Record<string, { received: number; damaged: number }>>({});
  const [invoiceNumberInput, setInvoiceNumberInput] = useState('');

  // Intelligent Suggestions calculation
  const replenishmentSuggestions = products
    .filter((p) => {
      const isLowStock = p.currentStock <= p.minStock;
      const hasUnmetDemands = unmetDemands.some((d) => !d.resolved && d.productName.toLowerCase().includes(p.name.toLowerCase()));
      return isLowStock || hasUnmetDemands;
    })
    .map((p) => {
      const relatedDemands = unmetDemands.filter((d) => !d.resolved && d.productName.toLowerCase().includes(p.name.toLowerCase()));
      const demandCount = relatedDemands.reduce((acc, d) => acc + d.quantityRequested, 0);
      const suggestedQuantity = Math.max(1, (p.maxStock || 30) - p.currentStock + demandCount);

      return {
        product: p,
        currentStock: p.currentStock,
        minStock: p.minStock,
        maxStock: p.maxStock || 30,
        demandCount,
        suggestedQuantity,
        reason: p.currentStock <= p.minStock 
          ? 'Estoque abaixo do ponto de ressuprimento' 
          : 'Demanda reprimida / procura frequente no balcão',
      };
    });

  const handleOpenCreateFromSuggestions = () => {
    const items = replenishmentSuggestions.map((s) => ({
      productId: s.product.id,
      quantityOrdered: s.suggestedQuantity,
      unitCost: s.product.costPrice || 0,
    }));
    setOrderItems(items);
    setSelectedSupplierId(suppliers[0]?.id || '');
    setOrderNotes('Pedido gerado automaticamente com base em estoque crítico e faltas de balcão.');
    setIsCreateModalOpen(true);
  };

  const getOrderTotal = (order: PurchaseOrder): number => {
    if (typeof order.totalCost === 'number' && !isNaN(order.totalCost)) {
      return order.totalCost;
    }
    if (typeof order.totalEstimated === 'number' && !isNaN(order.totalEstimated)) {
      return order.totalEstimated;
    }
    return (order.items || []).reduce((acc, it) => {
      const cost = it.totalCost ?? it.totalEstimated ?? ((it.quantityOrdered || 0) * (it.unitCost ?? it.unitCostEstimated ?? 0));
      return acc + (Number(cost) || 0);
    }, 0);
  };

  const handleOpenReceiving = (order: PurchaseOrder) => {
    setReceivingOrder(order);
    const initialInputs: Record<string, { received: number; damaged: number }> = {};
    for (const it of (order.items || [])) {
      initialInputs[it.productId] = {
        received: it.quantityOrdered - (it.quantityReceived || 0),
        damaged: 0,
      };
    }
    setReceiveInputs(initialInputs);
    setInvoiceNumberInput(order.invoiceNumber || '');
  };

  const handleSubmitReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivingOrder) return;

    const payload = Object.keys(receiveInputs).map((productId) => ({
      productId,
      receivedQuantity: receiveInputs[productId].received || 0,
      damagedQuantity: receiveInputs[productId].damaged || 0,
    }));

    setIsSubmitting(true);
    const success = await onReceiveOrder(receivingOrder.id, payload, invoiceNumberInput.trim() || undefined);
    setIsSubmitting(false);

    if (success) {
      setReceivingOrder(null);
    }
  };

  const handleAddItemToOrder = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    if (orderItems.some((it) => it.productId === productId)) return;

    setOrderItems((prev) => [
      ...prev,
      {
        productId,
        quantityOrdered: 10,
        unitCost: prod.costPrice || 0,
      },
    ]);
  };

  const handleCreateOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (orderItems.length === 0) return;

    const supp = suppliers.find((s) => s.id === selectedSupplierId);

    const itemsPayload: PurchaseOrderItem[] = orderItems.map((it) => {
      const prod = products.find((p) => p.id === it.productId);
      return {
        productId: it.productId,
        productCode: prod?.code || '',
        productName: prod?.name || '',
        quantityOrdered: it.quantityOrdered,
        quantityReceived: 0,
        unitCost: it.unitCost,
        totalCost: it.quantityOrdered * it.unitCost,
        totalEstimated: it.quantityOrdered * it.unitCost,
      };
    });

    const totalCost = itemsPayload.reduce((acc, it) => acc + (it.totalCost || 0), 0);

    setIsSubmitting(true);
    const success = await onCreatePurchaseOrder({
      supplierId: supp?.id,
      supplierName: supp?.name || 'Distribuidora Padrão',
      items: itemsPayload,
      totalCost,
      notes: orderNotes.trim() || undefined,
    });
    setIsSubmitting(false);

    if (success) {
      setIsCreateModalOpen(false);
      setOrderItems([]);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
            <Truck className="w-6 h-6 text-emerald-700" />
            <span>Gestão de Compras & Fornecedores</span>
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Sugestão inteligente de compras, cotações com distribuidoras e recebimento com separação de avarias.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tabs */}
          <div className="flex bg-neutral-100 p-0.5 rounded-lg border border-neutral-200 text-xs">
            <button
              onClick={() => setActiveTab('pedidos')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'pedidos' ? 'bg-white text-emerald-900 shadow-xs' : 'text-neutral-600'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Pedidos de Compra</span>
            </button>
            <button
              onClick={() => setActiveTab('sugestao')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'sugestao' ? 'bg-white text-emerald-900 shadow-xs' : 'text-neutral-600'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Sugestões Inteligentes ({replenishmentSuggestions.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('fornecedores')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'fornecedores' ? 'bg-white text-emerald-900 shadow-xs' : 'text-neutral-600'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Fornecedores</span>
            </button>
          </div>

          <button
            onClick={() => {
              setOrderItems([]);
              setIsCreateModalOpen(true);
            }}
            className="px-3.5 py-2 bg-emerald-700 text-white text-xs font-bold rounded-lg hover:bg-emerald-800 transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Pedido</span>
          </button>
        </div>
      </div>

      {activeTab === 'pedidos' && (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-100 text-neutral-600 font-semibold border-b border-neutral-200">
                <tr>
                  <th className="py-3 px-4">Código / Data</th>
                  <th className="py-3 px-4">Fornecedor</th>
                  <th className="py-3 px-4">Itens</th>
                  <th className="py-3 px-4 text-right">Custo Total</th>
                  <th className="py-3 px-4">NF Recebida</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-neutral-800">
                {purchaseOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-neutral-50/80">
                    <td className="py-3 px-4 font-bold text-neutral-900">
                      <div>{order.code}</div>
                      <div className="text-[10px] text-neutral-500 font-normal">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </div>
                    </td>

                    <td className="py-3 px-4 font-semibold text-neutral-800">
                      {order.supplierName}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-medium">{(order.items || []).length} item(ns)</span>
                      <div className="text-[10px] text-neutral-500 line-clamp-1">
                        {(order.items || []).map((i) => `${i.quantityOrdered}x ${i.productName}`).join(', ')}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-emerald-800">
                      {formatCurrencyBRL(getOrderTotal(order))}
                    </td>

                    <td className="py-3 px-4 text-neutral-600">
                      {order.invoiceNumber ? (
                        <span className="font-semibold text-neutral-800">{order.invoiceNumber}</span>
                      ) : (
                        <span className="text-neutral-400 italic">Não faturado</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        order.status === 'recebido' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : order.status === 'aprovado' 
                          ? 'bg-blue-100 text-blue-800' 
                          : order.status === 'parcialmente_recebido' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right space-x-1">
                      {order.status === 'rascunho' && (
                        <button
                          onClick={() => onApproveOrder(order.id)}
                          className="px-2.5 py-1 bg-blue-50 text-blue-800 hover:bg-blue-100 font-semibold rounded text-[11px]"
                        >
                          Aprovar Pedido
                        </button>
                      )}

                      {(order.status === 'aprovado' || order.status === 'parcialmente_recebido') && (
                        <button
                          onClick={() => handleOpenReceiving(order)}
                          className="px-2.5 py-1 bg-emerald-700 text-white hover:bg-emerald-800 font-semibold rounded text-[11px]"
                        >
                          Conferir & Receber
                        </button>
                      )}

                      {order.status === 'recebido' && (
                        <span className="text-[11px] text-emerald-700 font-medium inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Estoque Atualizado</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}

                {purchaseOrders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-neutral-400">
                      Nenhum pedido de compra registrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'sugestao' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-emerald-900 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-700" />
                <span>Motor de Sugestão de Reposição</span>
              </h3>
              <p className="text-xs text-emerald-800 mt-0.5">
                Cálculo baseado em saldo abaixo do mínimo e produtos procurados sem estoque no balcão.
              </p>
            </div>

            {replenishmentSuggestions.length > 0 && (
              <button
                onClick={handleOpenCreateFromSuggestions}
                className="px-4 py-2 bg-emerald-800 text-white font-bold text-xs rounded-lg hover:bg-emerald-900 shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Gerar Pedido com Todos os Sugeridos</span>
              </button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-100 text-neutral-600 font-semibold border-b border-neutral-200">
                  <tr>
                    <th className="py-3 px-4">Medicamento / Produto</th>
                    <th className="py-3 px-4 text-center">Saldo Atual</th>
                    <th className="py-3 px-4 text-center">Ponto Reposição</th>
                    <th className="py-3 px-4 text-center">Faltas no Balcão</th>
                    <th className="py-3 px-4 text-center">Sugestão Compra</th>
                    <th className="py-3 px-4">Motivo Diagnóstico</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-neutral-800">
                  {replenishmentSuggestions.map((s, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50">
                      <td className="py-3 px-4">
                        <div className="font-bold text-neutral-900">{s.product.name}</div>
                        <div className="text-[11px] text-neutral-500">{s.product.presentation || s.product.category}</div>
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-red-700">
                        {s.currentStock} {s.product.unit}
                      </td>

                      <td className="py-3 px-4 text-center text-neutral-600">
                        {s.minStock} {s.product.unit}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {s.demandCount > 0 ? (
                          <span className="font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                            {s.demandCount} pedido(s)
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-emerald-800 text-sm">
                        +{s.suggestedQuantity} {s.product.unit}
                      </td>

                      <td className="py-3 px-4 text-neutral-600">
                        {s.reason}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setOrderItems([
                              {
                                productId: s.product.id,
                                quantityOrdered: s.suggestedQuantity,
                                unitCost: s.product.costPrice || 0,
                              },
                            ]);
                            setIsCreateModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-emerald-700 text-white font-semibold rounded hover:bg-emerald-800 text-[11px]"
                        >
                          Comprar Item
                        </button>
                      </td>
                    </tr>
                  ))}

                  {replenishmentSuggestions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-neutral-400">
                        Nenhum produto precisando de reposição no momento. Estoques equilibrados!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'fornecedores' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((supp) => (
            <div key={supp.id} className="p-4 rounded-xl bg-white border border-neutral-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-neutral-900 text-sm">{supp.name}</h4>
                <span className="text-[10px] bg-emerald-50 text-emerald-800 font-semibold px-2 py-0.5 rounded">
                  {supp.category}
                </span>
              </div>
              <div className="text-xs text-neutral-500 space-y-1">
                <div>CNPJ: <strong className="text-neutral-700">{supp.cnpj}</strong></div>
                <div>Contato: {supp.contactName} ({supp.phone})</div>
                <div>Prazo Médio Entrega: <strong className="text-neutral-700">{supp.leadTimeDays} dias</strong></div>
                <div>Condição de Pagamento: {supp.paymentTerms}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Criar Pedido de Compra */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl border border-neutral-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-neutral-900 text-base">Novo Pedido de Compra</h3>

            <form onSubmit={handleCreateOrderSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">Distribuidor / Fornecedor *</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.paymentTerms})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">Adicionar Produto ao Pedido:</label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddItemToOrder(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900"
                  >
                    <option value="">Selecione para incluir...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Saldo: {p.currentStock})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items in order */}
              <div>
                <h4 className="font-bold text-neutral-800 uppercase tracking-wider mb-2 text-[11px]">
                  Itens do Pedido ({orderItems.length}):
                </h4>
                <div className="border border-neutral-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-neutral-100 text-neutral-600 font-semibold">
                      <tr>
                        <th className="py-2 px-3">Item</th>
                        <th className="py-2 px-3 text-center">Qtd Pedida</th>
                        <th className="py-2 px-3 text-right">Custo Unit. (R$)</th>
                        <th className="py-2 px-3 text-right">Subtotal</th>
                        <th className="py-2 px-3 text-center">Remover</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 text-neutral-800">
                      {orderItems.map((item, idx) => {
                        const prod = products.find((p) => p.id === item.productId);
                        return (
                          <tr key={idx}>
                            <td className="py-2 px-3 font-medium">
                              {prod?.name || item.productId}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <input
                                type="number"
                                min="1"
                                value={item.quantityOrdered}
                                onChange={(e) => {
                                  const val = Math.max(1, Number(e.target.value));
                                  setOrderItems((prev) =>
                                    prev.map((it, i) => (i === idx ? { ...it, quantityOrdered: val } : it))
                                  );
                                }}
                                className="w-16 px-1.5 py-0.5 bg-white border border-neutral-300 rounded text-center"
                              />
                            </td>
                            <td className="py-2 px-3 text-right">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.unitCost}
                                onChange={(e) => {
                                  const val = Math.max(0, Number(e.target.value));
                                  setOrderItems((prev) =>
                                    prev.map((it, i) => (i === idx ? { ...it, unitCost: val } : it))
                                  );
                                }}
                                className="w-20 px-1.5 py-0.5 bg-white border border-neutral-300 rounded text-right"
                              />
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-emerald-800">
                              {formatCurrencyBRL(item.quantityOrdered * item.unitCost)}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => setOrderItems((prev) => prev.filter((_, i) => i !== idx))}
                                className="text-neutral-400 hover:text-red-600"
                              >
                                <Trash2 className="w-3.5 h-3.5 mx-auto" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {orderItems.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center py-6 text-neutral-400">
                            Nenhum item adicionado ainda. Selecione um produto acima.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">Observações do Pedido:</label>
                <input
                  type="text"
                  placeholder="Ex: Entrega urgente para reposição de balcão..."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900"
                />
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-neutral-200">
                <div className="text-sm font-bold text-neutral-900">
                  Total Estimado:{' '}
                  <span className="text-emerald-800">
                    {formatCurrencyBRL(
                      orderItems.reduce((acc, it) => acc + it.quantityOrdered * it.unitCost, 0)
                    )}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700 font-medium hover:bg-neutral-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || orderItems.length === 0}
                    className="px-4 py-2 bg-emerald-700 text-white font-semibold rounded-lg hover:bg-emerald-800 disabled:bg-neutral-300"
                  >
                    {isSubmitting ? 'Gravando...' : 'Salvar Pedido'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Recebimento com Separação Rigorosa de Avarias */}
      {receivingOrder && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl border border-neutral-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-neutral-900 text-base">
              Conferência & Recebimento: {receivingOrder.code}
            </h3>
            <p className="text-xs text-neutral-500">
              Fornecedor: <strong className="text-neutral-800">{receivingOrder.supplierName}</strong>. Apenas itens aptos e íntegros são incorporados ao saldo vendável de estoque. Itens com avaria são segregados para devolução/estorno.
            </p>

            <form onSubmit={handleSubmitReceive} className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-700 font-semibold mb-1">
                  Número da Nota Fiscal do Distribuidor (Opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ex: NF-e 449201"
                  value={invoiceNumberInput}
                  onChange={(e) => setInvoiceNumberInput(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900"
                />
              </div>

              <div className="border border-neutral-200 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-neutral-100 text-neutral-600 font-semibold">
                    <tr>
                      <th className="py-2 px-3">Item</th>
                      <th className="py-2 px-3 text-center">Pedido</th>
                      <th className="py-2 px-3 text-center bg-emerald-50 text-emerald-900">Qtd Apta (Entra Estoque)</th>
                      <th className="py-2 px-3 text-center bg-red-50 text-red-900">Qtd Avaria / Devolução</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 text-neutral-800">
                    {(receivingOrder.items || []).map((it) => {
                      const inp = receiveInputs[it.productId] || { received: 0, damaged: 0 };
                      return (
                        <tr key={it.productId}>
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-neutral-900">{it.productName}</div>
                            <div className="text-[10px] text-neutral-400">{it.productCode}</div>
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold">
                            {it.quantityOrdered}
                          </td>
                          <td className="py-2.5 px-3 text-center bg-emerald-50/40">
                            <input
                              type="number"
                              min="0"
                              value={inp.received}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                setReceiveInputs((prev) => ({
                                  ...prev,
                                  [it.productId]: { ...prev[it.productId], received: val },
                                }));
                              }}
                              className="w-20 px-2 py-1 bg-white border border-emerald-300 rounded font-bold text-center text-emerald-900"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-center bg-red-50/40">
                            <input
                              type="number"
                              min="0"
                              value={inp.damaged}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                setReceiveInputs((prev) => ({
                                  ...prev,
                                  [it.productId]: { ...prev[it.productId], damaged: val },
                                }));
                              }}
                              className="w-20 px-2 py-1 bg-white border border-red-300 rounded font-bold text-center text-red-900"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setReceivingOrder(null)}
                  className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700 font-medium hover:bg-neutral-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-700 text-white font-bold rounded-lg hover:bg-emerald-800"
                >
                  {isSubmitting ? 'Confirmando...' : 'Efetivar Entrada no Estoque'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
