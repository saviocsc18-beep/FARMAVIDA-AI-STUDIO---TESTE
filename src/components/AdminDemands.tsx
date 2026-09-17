import React, { useState, useMemo } from 'react';
import { UnmetDemand, User, UnmetDemandReason } from '../types';
import { 
  PackageSearch, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ArrowUpRight, 
  Plus, 
  Search, 
  Filter, 
  TrendingUp, 
  ArrowLeft, 
  ShoppingBag,
  FileText,
  UserCheck,
  X
} from 'lucide-react';

export interface AdminDemandsProps {
  unmetDemands: UnmetDemand[];
  currentUser: User;
  onResolveDemand: (demandId: string) => Promise<boolean>;
  onRegisterDemand?: (demandData: {
    productName: string;
    quantityRequested: number;
    reason: UnmetDemandReason;
    attendantId: string;
    attendantName: string;
    notes?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  onNavigateToPurchases?: () => void;
  onNavigateToBalcao?: () => void;
}

export const AdminDemands: React.FC<AdminDemandsProps> = ({
  unmetDemands = [],
  currentUser,
  onResolveDemand,
  onRegisterDemand,
  onNavigateToPurchases,
  onNavigateToBalcao,
}) => {
  const [filter, setFilter] = useState<'todos' | 'pendentes' | 'resolvidos'>('pendentes');
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    productName: '',
    quantityRequested: 1,
    reason: 'falta_estoque' as UnmetDemandReason,
    customerInfo: '',
    notes: '',
  });

  const pendingDemands = useMemo(() => unmetDemands.filter((d) => !d.resolved), [unmetDemands]);
  const resolvedDemands = useMemo(() => unmetDemands.filter((d) => d.resolved), [unmetDemands]);

  // Calculate Top Requested Product
  const topProductStats = useMemo(() => {
    const counts: Record<string, { name: string; count: number; totalQty: number }> = {};
    unmetDemands.forEach((d) => {
      const key = d.productName.trim().toLowerCase();
      if (!counts[key]) {
        counts[key] = { name: d.productName, count: 0, totalQty: 0 };
      }
      counts[key].count += 1;
      counts[key].totalQty += d.quantityRequested || 1;
    });

    const sorted = Object.values(counts).sort((a, b) => b.count - a.count);
    return sorted[0] || null;
  }, [unmetDemands]);

  // Filtered List
  const filteredDemands = useMemo(() => {
    return unmetDemands.filter((d) => {
      // Tab filter
      if (filter === 'pendentes' && d.resolved) return false;
      if (filter === 'resolvidos' && !d.resolved) return false;

      // Search term filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesProduct = d.productName.toLowerCase().includes(term);
        const matchesAttendant = d.attendantName.toLowerCase().includes(term);
        const matchesNotes = (d.notes || '').toLowerCase().includes(term);
        return matchesProduct || matchesAttendant || matchesNotes;
      }

      return true;
    });
  }, [unmetDemands, filter, searchTerm]);

  const handleOpenNewModal = () => {
    setFormData({
      productName: '',
      quantityRequested: 1,
      reason: 'falta_estoque',
      customerInfo: '',
      notes: '',
    });
    setIsNewModalOpen(true);
  };

  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productName.trim() || formData.quantityRequested <= 0) return;

    setIsSubmitting(true);
    try {
      const fullNotes = [
        formData.customerInfo ? `Cliente: ${formData.customerInfo}` : '',
        formData.notes ? formData.notes : '',
      ]
        .filter(Boolean)
        .join(' | ');

      if (onRegisterDemand) {
        await onRegisterDemand({
          productName: formData.productName.trim(),
          quantityRequested: Number(formData.quantityRequested),
          reason: formData.reason,
          attendantId: currentUser.id,
          attendantName: currentUser.name,
          notes: fullNotes,
        });
      } else {
        // Fallback direct API call
        await fetch('/api/demands', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productName: formData.productName.trim(),
            quantityRequested: Number(formData.quantityRequested),
            reason: formData.reason,
            attendantId: currentUser.id,
            attendantName: currentUser.name,
            notes: fullNotes,
          }),
        });
      }
      setIsNewModalOpen(false);
    } catch (err) {
      console.error('Erro ao registrar produto procurado:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 bg-linear-to-r from-emerald-950 via-emerald-900 to-neutral-900 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30 uppercase tracking-wider">
                Produtos Procurados
              </span>
              <span className="text-xs text-emerald-200">
                Inteligência de Demanda & Balcão
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Registro de Produtos Procurados & Faltas
            </h1>
            <p className="text-xs sm:text-sm text-emerald-200 mt-0.5">
              Demanda reprimida de clientes: registre itens solicitados que a farmácia não tinha para guiar o setor de compras.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleOpenNewModal}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Produto Procurado</span>
            </button>

            {onNavigateToPurchases && (
              <button
                onClick={onNavigateToPurchases}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Acessar compras para repor estoque"
              >
                <span>Reposição em Compras</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-300" />
              </button>
            )}

            {onNavigateToBalcao && (
              <button
                onClick={onNavigateToBalcao}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-emerald-300" />
                <span>Balcão</span>
              </button>
            )}
          </div>
        </div>

        {/* Executive Metrics Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-neutral-200 border-b border-neutral-200 bg-neutral-50 text-xs">
          <div className="p-4">
            <span className="text-neutral-500 font-medium block">Total de Buscas</span>
            <div className="text-xl font-bold text-neutral-900 mt-0.5">
              {unmetDemands.length} <span className="text-xs font-normal text-neutral-500">registros</span>
            </div>
          </div>

          <div className="p-4">
            <span className="text-neutral-500 font-medium block">Pendentes de Compra</span>
            <div className="text-xl font-bold text-amber-700 mt-0.5 flex items-center gap-1.5">
              <span>{pendingDemands.length}</span>
              {pendingDemands.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                  Atenção
                </span>
              )}
            </div>
          </div>

          <div className="p-4">
            <span className="text-neutral-500 font-medium block">Resolvidos / Comprados</span>
            <div className="text-xl font-bold text-emerald-700 mt-0.5">
              {resolvedDemands.length} <span className="text-xs font-normal text-emerald-600">atendidos</span>
            </div>
          </div>

          <div className="p-4">
            <span className="text-neutral-500 font-medium block flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
              <span>Mais Procurado</span>
            </span>
            <div className="text-xs font-bold text-neutral-900 mt-1 truncate" title={topProductStats ? `${topProductStats.name} (${topProductStats.count}x)` : 'Nenhum'}>
              {topProductStats ? (
                <span>
                  {topProductStats.name} <strong className="text-emerald-700">({topProductStats.count}x)</strong>
                </span>
              ) : (
                <span className="text-neutral-400 font-normal">Nenhum registro ainda</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action and Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-neutral-200 shadow-xs">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-xl">
          <button
            onClick={() => setFilter('pendentes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filter === 'pendentes'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Pendentes ({pendingDemands.length})
          </button>
          <button
            onClick={() => setFilter('resolvidos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filter === 'resolvidos'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Resolvidos ({resolvedDemands.length})
          </button>
          <button
            onClick={() => setFilter('todos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filter === 'todos'
                ? 'bg-neutral-800 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Todos ({unmetDemands.length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px] sm:w-72">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por produto, atendente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-emerald-600 transition-colors"
          />
        </div>
      </div>

      {/* Demands Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-100 text-neutral-600 font-semibold border-b border-neutral-200">
              <tr>
                <th className="py-3 px-4">Data/Hora</th>
                <th className="py-3 px-4">Produto / Medicamento</th>
                <th className="py-3 px-4 text-center">Qtd Solicitada</th>
                <th className="py-3 px-4">Motivo Informado</th>
                <th className="py-3 px-4">Atendente do Balcão</th>
                <th className="py-3 px-4">Observações / Cliente</th>
                <th className="py-3 px-4 text-right">Situação / Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-neutral-800">
              {filteredDemands.map((demand) => (
                <tr key={demand.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="py-3 px-4 text-neutral-500 whitespace-nowrap">
                    {new Date(demand.timestamp).toLocaleDateString('pt-BR')}{' '}
                    <span className="text-[11px] text-neutral-400">
                      {new Date(demand.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <span className="font-bold text-neutral-900 block text-sm">
                      {demand.productName}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-center">
                    <span className="font-bold text-emerald-800 px-2 py-0.5 bg-emerald-50 rounded-lg border border-emerald-200">
                      {demand.quantityRequested} un
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold inline-block ${
                      demand.reason === 'falta_estoque'
                        ? 'bg-red-100 text-red-800'
                        : demand.reason === 'produto_nao_trabalhado'
                        ? 'bg-purple-100 text-purple-800'
                        : demand.reason === 'preco_alto'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-neutral-100 text-neutral-700'
                    }`}>
                      {demand.reason === 'falta_estoque'
                        ? 'Falta no Estoque'
                        : demand.reason === 'produto_nao_trabalhado'
                        ? 'Não Comercializado'
                        : demand.reason === 'preco_alto'
                        ? 'Preço Alto'
                        : 'Outro'}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-neutral-700 font-medium">
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>{demand.attendantName}</span>
                    </div>
                  </td>

                  <td className="py-3 px-4 text-neutral-600 max-w-xs">
                    {demand.notes ? (
                      <span className="line-clamp-2" title={demand.notes}>
                        {demand.notes}
                      </span>
                    ) : (
                      <span className="text-neutral-400 italic">Sem observações</span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-right">
                    {!demand.resolved ? (
                      <button
                        onClick={() => onResolveDemand(demand.id)}
                        className="px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold rounded-xl text-xs border border-emerald-200 transition-colors cursor-pointer"
                        title="Marcar como atendido ou comprado"
                      >
                        Marcar Atendido
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-bold px-2 py-1 bg-emerald-50 rounded-lg">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Resolvido</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}

              {filteredDemands.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-neutral-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <PackageSearch className="w-8 h-8 text-neutral-300" />
                      <p className="text-xs font-medium text-neutral-600">
                        Nenhum registro de produto procurado encontrado para os filtros ativos.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Registrar Produto Procurado */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-5 bg-neutral-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PackageSearch className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base">Registrar Produto Procurado</h3>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNew} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Nome do Medicamento / Produto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Losartana Potássica 50mg Cimed"
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Quantidade Solicitada *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.quantityRequested}
                    onChange={(e) => setFormData({ ...formData, quantityRequested: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Motivo Apontado
                  </label>
                  <select
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value as UnmetDemandReason })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs focus:outline-none focus:border-emerald-600 cursor-pointer"
                  >
                    <option value="falta_estoque">Falta no Estoque</option>
                    <option value="produto_nao_trabalhado">Não Comercializado</option>
                    <option value="preco_alto">Preço Alto</option>
                    <option value="outro">Outro Motivo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Cliente / Contato (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Dona Maria - (11) 98888-7777"
                  value={formData.customerInfo}
                  onChange={(e) => setFormData({ ...formData, customerInfo: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Observações Adicionais (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Cliente tem receita e precisa de 2 caixas com urgência."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs focus:outline-none focus:border-emerald-600 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 border border-neutral-300 text-neutral-700 font-semibold text-xs rounded-xl hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.productName.trim()}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
