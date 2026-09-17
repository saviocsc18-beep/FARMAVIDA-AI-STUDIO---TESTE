import React, { useState } from 'react';
import { Product, StockMovement, User, InventoryCount } from '../types';
import { 
  Package, 
  Search, 
  Plus, 
  SlidersHorizontal, 
  History, 
  AlertTriangle, 
  TrendingUp, 
  CheckCircle2, 
  Layers,
  ClipboardCheck,
  AlertCircle
} from 'lucide-react';
import { AdminInventariosTab } from './AdminInventariosTab';

interface AdminStockProps {
  products: Product[];
  stockMovements: StockMovement[];
  inventories?: InventoryCount[];
  users?: User[];
  currentUser: User;
  onSaveProduct: (productData: any) => Promise<boolean>;
  onAdjustStock: (productId: string, newStock: number, reason: string) => Promise<boolean>;
  onCreateInventory?: (inventoryData: any) => Promise<boolean>;
  onApproveInventory?: (inventoryId: string, reviewNotes?: string) => Promise<boolean>;
  onRejectInventory?: (inventoryId: string, reviewNotes?: string) => Promise<boolean>;
  onReopenInventory?: (inventoryId: string, reason: string) => Promise<boolean>;
  onCancelInventory?: (inventoryId: string) => Promise<boolean>;
  onRefreshData?: () => void;
}

export const AdminStock: React.FC<AdminStockProps> = ({
  products,
  stockMovements,
  inventories = [],
  users = [],
  currentUser,
  onSaveProduct,
  onAdjustStock,
  onCreateInventory,
  onApproveInventory,
  onRejectInventory,
  onReopenInventory,
  onCancelInventory,
  onRefreshData,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'catalogo' | 'kardex' | 'inventarios'>('catalogo');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [onlyCritical, setOnlyCritical] = useState(false);

  // Pending review count for badge
  const pendingReviewCount = inventories.filter((i) => i.status === 'aguardando_revisao').length;

  // New product modal
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [code, setCode] = useState('');
  const [ean, setEan] = useState('');
  const [name, setName] = useState('');
  const [presentation, setPresentation] = useState('');
  const [category, setCategory] = useState('Medicamentos');
  const [costPrice, setCostPrice] = useState('0.00');
  const [salePrice, setSalePrice] = useState('0.00');
  const [currentStock, setCurrentStock] = useState('0');
  const [minStock, setMinStock] = useState('5');
  const [maxStock, setMaxStock] = useState('30');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Adjust stock modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [newStockInput, setNewStockInput] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  const categories = ['Todas', ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products.filter((p) => {
    const query = searchTerm.toLowerCase();
    const matchesQuery =
      p.name.toLowerCase().includes(query) ||
      p.code.toLowerCase().includes(query) ||
      (p.ean && p.ean.includes(query)) ||
      (p.presentation && p.presentation.toLowerCase().includes(query));

    const matchesCat = categoryFilter === 'Todas' || p.category === categoryFilter;
    const matchesCritical = !onlyCritical || p.currentStock <= p.minStock;

    return matchesQuery && matchesCat && matchesCritical;
  });

  const handleOpenNewProduct = () => {
    setEditingProduct(null);
    setCode(`MED-${Math.floor(1000 + Math.random() * 9000)}`);
    setEan('');
    setName('');
    setPresentation('');
    setCategory('Medicamentos');
    setCostPrice('0.00');
    setSalePrice('0.00');
    setCurrentStock('0');
    setMinStock('5');
    setMaxStock('30');
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (p: Product) => {
    setEditingProduct(p);
    setCode(p.code);
    setEan(p.ean || '');
    setName(p.name);
    setPresentation(p.presentation || '');
    setCategory(p.category);
    setCostPrice(p.costPrice ? p.costPrice.toFixed(2) : '0.00');
    setSalePrice(p.salePrice ? p.salePrice.toFixed(2) : '0.00');
    setCurrentStock((p.currentStock ?? 0).toString());
    setMinStock(p.minStock.toString());
    setMaxStock((p.maxStock || 30).toString());
    setIsProductModalOpen(true);
  };

  const handleSaveProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      id: editingProduct ? editingProduct.id : undefined,
      code: code.trim(),
      ean: ean.trim() || undefined,
      name: name.trim(),
      presentation: presentation.trim() || undefined,
      category,
      unit: 'cx',
      costPrice: Number(costPrice) || 0,
      salePrice: Number(salePrice) || 0,
      currentStock: Number(currentStock) || 0,
      minStock: Number(minStock) || 5,
      maxStock: Number(maxStock) || 30,
      active: true,
    };

    const success = await onSaveProduct(payload);
    setIsSubmitting(false);

    if (success) {
      setIsProductModalOpen(false);
    }
  };

  const handleOpenAdjust = (p: Product) => {
    setAdjustProduct(p);
    setNewStockInput(p.currentStock.toString());
    setAdjustReason('Recontagem de inventário / Balanço');
    setIsAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustProduct || !adjustReason.trim()) return;

    setIsSubmitting(true);
    const success = await onAdjustStock(adjustProduct.id, Number(newStockInput) || 0, adjustReason.trim());
    setIsSubmitting(false);

    if (success) {
      setIsAdjustModalOpen(false);
      setAdjustProduct(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-emerald-700" />
            <span>Gestão de Estoque & Kardex</span>
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Controle de saldo, custos de aquisição, margem unitária e histórico rastreável de movimentações.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Subtabs */}
          <div className="flex bg-neutral-100 p-0.5 rounded-lg border border-neutral-200 text-xs">
            <button
              id="subtab-catalogo"
              onClick={() => setActiveSubTab('catalogo')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
                activeSubTab === 'catalogo' ? 'bg-white text-emerald-900 shadow-xs' : 'text-neutral-600'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Catálogo & Saldos</span>
            </button>
            <button
              id="subtab-kardex"
              onClick={() => setActiveSubTab('kardex')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
                activeSubTab === 'kardex' ? 'bg-white text-emerald-900 shadow-xs' : 'text-neutral-600'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Histórico Kardex</span>
            </button>
            <button
              id="subtab-inventarios"
              onClick={() => setActiveSubTab('inventarios')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 relative ${
                activeSubTab === 'inventarios' ? 'bg-white text-blue-900 shadow-xs font-bold' : 'text-neutral-600'
              }`}
            >
              <ClipboardCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Inventários de Estoque</span>
              {pendingReviewCount > 0 && (
                <span className="px-1.5 py-0.2 bg-teal-600 text-white font-bold rounded-full text-[10px]">
                  {pendingReviewCount}
                </span>
              )}
            </button>
          </div>

          {activeSubTab === 'catalogo' && (
            <button
              onClick={handleOpenNewProduct}
              className="px-3.5 py-2 bg-emerald-700 text-white text-xs font-bold rounded-lg hover:bg-emerald-800 transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Produto</span>
            </button>
          )}
        </div>
      </div>

      {activeSubTab === 'catalogo' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por código, nome, EAN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-neutral-500 font-medium">Categoria:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="py-1 px-2.5 bg-neutral-50 border border-neutral-200 rounded text-neutral-800 text-xs"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-1.5 cursor-pointer text-amber-900 font-medium bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                <input
                  type="checkbox"
                  checked={onlyCritical}
                  onChange={(e) => setOnlyCritical(e.target.checked)}
                  className="rounded text-amber-700"
                />
                <span>Apenas Estoque Crítico</span>
              </label>
            </div>
          </div>

          {/* Catalog Table */}
          <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-100 text-neutral-600 font-semibold border-b border-neutral-200">
                  <tr>
                    <th className="py-3 px-4">Código / EAN</th>
                    <th className="py-3 px-4">Produto & Apresentação</th>
                    <th className="py-3 px-4">Categoria</th>
                    <th className="py-3 px-4 text-right">Custo Aquisição</th>
                    <th className="py-3 px-4 text-right">Preço Venda</th>
                    <th className="py-3 px-4 text-right">Margem Unit.</th>
                    <th className="py-3 px-4 text-center">Saldo Atual</th>
                    <th className="py-3 px-4 text-center">Mínimo / Máx</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-neutral-800">
                  {filteredProducts.map((p) => {
                    const isCritical = p.currentStock <= p.minStock;
                    const margin = p.costPrice && p.salePrice > 0 ? ((p.salePrice - p.costPrice) / p.salePrice) * 100 : null;

                    return (
                      <tr key={p.id} className="hover:bg-neutral-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-bold text-neutral-900">{p.code}</span>
                          {p.ean && <span className="block text-[10px] text-neutral-400">{p.ean}</span>}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-neutral-900">{p.name}</div>
                          <div className="text-[11px] text-neutral-500">{p.presentation || '-'}</div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded text-[11px]">
                            {p.category}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          {p.costPrice !== undefined && p.costPrice > 0 ? (
                            `R$ ${p.costPrice.toFixed(2)}`
                          ) : (
                            <span className="text-amber-700 italic text-[11px]">Sem custo</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right font-bold text-emerald-800">
                          R$ {(p.salePrice || 0).toFixed(2)}
                        </td>

                        <td className="py-3 px-4 text-right font-medium">
                          {margin !== null ? (
                            <span className={margin > 35 ? 'text-emerald-700' : 'text-neutral-700'}>
                              {(margin || 0).toFixed(1)}%
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded text-xs ${
                            p.currentStock <= 0 
                              ? 'bg-red-100 text-red-800' 
                              : isCritical 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {isCritical && <AlertTriangle className="w-3 h-3" />}
                            <span>{p.currentStock} {p.unit}</span>
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center text-neutral-500">
                          {p.minStock} / {p.maxStock || 30}
                        </td>

                        <td className="py-3 px-4 text-right space-x-1">
                          <button
                            onClick={() => handleOpenAdjust(p)}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold rounded text-[11px] transition-colors"
                            title="Ajustar saldo e inventário"
                          >
                            Ajustar
                          </button>
                          <button
                            onClick={() => handleOpenEditProduct(p)}
                            className="px-2 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold rounded text-[11px] transition-colors"
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-neutral-400">
                        Nenhum produto encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'kardex' && (
        /* Kardex History Subtab */
        <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
            <h3 className="font-bold text-neutral-900 text-sm">
              Trilha de Auditoria Kardex (Todas as Movimentações de Estoque)
            </h3>
            <span className="text-xs text-neutral-500">{stockMovements.length} eventos registrados</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-100 text-neutral-600 font-semibold border-b border-neutral-200">
                <tr>
                  <th className="py-2.5 px-4">Data/Hora</th>
                  <th className="py-2.5 px-4">Produto</th>
                  <th className="py-2.5 px-4">Tipo</th>
                  <th className="py-2.5 px-4 text-center">Quantidade</th>
                  <th className="py-2.5 px-4 text-center">Antes / Depois</th>
                  <th className="py-2.5 px-4">Motivo / Documento</th>
                  <th className="py-2.5 px-4">Responsável</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-neutral-800">
                {stockMovements.map((mov) => {
                  const prevStock = mov.previousStock ?? mov.balanceBefore ?? 0;
                  const newStock = mov.newStock ?? mov.balanceAfter ?? 0;
                  const author = mov.authorName ?? mov.userName ?? 'Sistema';
                  const isInvAdjust = mov.type === 'ajuste_inventario' || mov.type === 'ajuste';

                  return (
                    <tr key={mov.id} className="hover:bg-neutral-50">
                      <td className="py-2.5 px-4 text-neutral-500">
                        {new Date(mov.timestamp).toLocaleDateString()}{' '}
                        {new Date(mov.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>

                      <td className="py-2.5 px-4 font-semibold text-neutral-900">
                        {mov.productName}
                      </td>

                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          mov.type === 'compra' || mov.type === 'compra_entrada'
                            ? 'bg-emerald-100 text-emerald-800' 
                            : mov.type === 'venda' 
                            ? 'bg-blue-100 text-blue-800' 
                            : isInvAdjust
                            ? 'bg-purple-100 text-purple-900 border border-purple-200' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {mov.type === 'ajuste_inventario' ? 'Ajuste Inventário' : mov.type}
                        </span>
                      </td>

                      <td className="py-2.5 px-4 text-center font-bold font-mono">
                        {mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity}
                      </td>

                      <td className="py-2.5 px-4 text-center text-neutral-500 font-mono">
                        {prevStock} → <strong className="text-neutral-900">{newStock}</strong>
                      </td>

                      <td className="py-2.5 px-4 text-neutral-600">
                        {mov.reason || '-'} {mov.referenceId ? `(Ref: ${mov.referenceId})` : ''}
                      </td>

                      <td className="py-2.5 px-4 text-neutral-700">
                        {author}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'inventarios' && (
        <AdminInventariosTab
          inventories={inventories}
          products={products}
          users={users}
          currentUser={currentUser}
          onCreateInventory={onCreateInventory}
          onApproveInventory={onApproveInventory}
          onRejectInventory={onRejectInventory}
          onReopenInventory={onReopenInventory}
          onCancelInventory={onCancelInventory}
          onRefreshData={onRefreshData}
        />
      )}

      {/* Modal: Cadastro / Edição de Produto */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-neutral-200 space-y-4">
            <h3 className="font-bold text-neutral-900 text-base">
              {editingProduct ? 'Editar Produto' : 'Cadastrar Novo Medicamento / Produto'}
            </h3>

            <form onSubmit={handleSaveProductSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">Código Interno *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">Código de Barras / EAN</label>
                  <input
                    type="text"
                    placeholder="789..."
                    value={ean}
                    onChange={(e) => setEan(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">Nome Comercial *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Dipirona Sódica, Amoxicilina..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-sm text-neutral-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">Apresentação / Dosagem</label>
                  <input
                    type="text"
                    placeholder="Ex: 500mg c/ 20 comprimidos"
                    value={presentation}
                    onChange={(e) => setPresentation(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">Categoria *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900"
                  >
                    <option value="Medicamentos">Medicamentos</option>
                    <option value="Genéricos">Genéricos</option>
                    <option value="Similar">Similar</option>
                    <option value="Perfumaria">Perfumaria</option>
                    <option value="Higiene">Higiene</option>
                    <option value="Correlatos">Correlatos & Curativos</option>
                    <option value="Suplementos">Suplementos & Vitaminas</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">Custo de Aquisição (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">Preço de Venda ao Consumidor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900 font-bold text-emerald-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">Saldo Atual</label>
                  <input
                    type="number"
                    value={currentStock}
                    onChange={(e) => setCurrentStock(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">Estoque Mínimo</label>
                  <input
                    type="number"
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">Estoque Máximo</label>
                  <input
                    type="number"
                    value={maxStock}
                    onChange={(e) => setMaxStock(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700 font-medium hover:bg-neutral-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-700 text-white font-semibold rounded-lg hover:bg-emerald-800"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ajuste de Estoque com Justificativa */}
      {isAdjustModalOpen && adjustProduct && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-neutral-200 space-y-4">
            <h3 className="font-bold text-neutral-900 text-base">Ajuste de Inventário / Saldo</h3>
            <p className="text-xs text-neutral-500">
              Alteração de saldo para <strong className="text-neutral-800">{adjustProduct.name}</strong>. Saldo atual:{' '}
              <strong>{adjustProduct.currentStock} {adjustProduct.unit}</strong>.
            </p>

            <form onSubmit={handleAdjustSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-700 font-semibold mb-1">Novo Saldo Real Contado:</label>
                <input
                  type="number"
                  required
                  value={newStockInput}
                  onChange={(e) => setNewStockInput(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900 font-bold"
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">Motivo / Justificativa *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Recontagem de inventário, quebra de frasco, lote vencido..."
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700 font-medium hover:bg-neutral-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-700 text-white font-semibold rounded-lg hover:bg-amber-800"
                >
                  {isSubmitting ? 'Gravando...' : 'Confirmar Ajuste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
