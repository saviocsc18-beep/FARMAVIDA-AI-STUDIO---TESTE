import React, { useState, useMemo } from 'react';
import {
  ClipboardCheck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCcw,
  XCircle,
  Eye,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  History,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Package,
  Layers,
  Calendar,
  User as UserIcon,
  Check,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { InventoryCount, InventoryItemCount, Product, User } from '../types';
import { formatCurrencyBRL } from '../lib/format';

interface AdminInventariosTabProps {
  inventories: InventoryCount[];
  products: Product[];
  users: User[];
  currentUser: User;
  onCreateInventory?: (payload: any) => Promise<boolean>;
  onApproveInventory?: (inventoryId: string, reviewNotes?: string) => Promise<boolean>;
  onRejectInventory?: (inventoryId: string, reviewNotes?: string) => Promise<boolean>;
  onReopenInventory?: (inventoryId: string, reason: string) => Promise<boolean>;
  onCancelInventory?: (inventoryId: string) => Promise<boolean>;
  onRefreshData?: () => void;
}

export function AdminInventariosTab({
  inventories,
  products,
  users,
  currentUser,
  onCreateInventory,
  onApproveInventory,
  onRejectInventory,
  onReopenInventory,
  onCancelInventory,
  onRefreshData,
}: AdminInventariosTabProps) {
  // Navigation & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [reviewingInventory, setReviewingInventory] = useState<InventoryCount | null>(null);
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isApproveConfirmModalOpen, setIsApproveConfirmModalOpen] = useState(false);

  // Create Form State
  const [newTitle, setNewTitle] = useState('');
  const [newScope, setNewScope] = useState<'geral' | 'categoria' | 'selecao'>('geral');
  const [newCategory, setNewCategory] = useState('Medicamentos');
  const [newDueDate, setNewDueDate] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productSearchInModal, setProductSearchInModal] = useState('');

  // Review & Reopen Form State
  const [reopenReasonInput, setReopenReasonInput] = useState('');
  const [reviewNotesInput, setReviewNotesInput] = useState('');
  const [showHistoryAccordion, setShowHistoryAccordion] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Available categories from product list
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Filtered Inventories List
  const filteredInventories = useMemo(() => {
    return (inventories || []).filter((inv) => {
      const query = searchTerm.toLowerCase();
      const matchesSearch =
        inv.title.toLowerCase().includes(query) ||
        inv.code.toLowerCase().includes(query) ||
        (inv.category && inv.category.toLowerCase().includes(query)) ||
        (inv.assignedUserNames && inv.assignedUserNames.some((n) => n.toLowerCase().includes(query)));

      if (!matchesSearch) return false;

      if (statusFilter === 'todos') return true;
      if (statusFilter === 'em_andamento') return ['aberto', 'em_contagem', 'reaberto'].includes(inv.status);
      if (statusFilter === 'revisao') return inv.status === 'aguardando_revisao';
      if (statusFilter === 'ajustado') return inv.status === 'ajustado';
      if (statusFilter === 'rejeitado') return inv.status === 'rejeitado';
      if (statusFilter === 'cancelado') return inv.status === 'cancelado';

      return inv.status === statusFilter;
    });
  }, [inventories, searchTerm, statusFilter]);

  // Overall Statistics
  const overallStats = useMemo(() => {
    const list = inventories || [];
    const total = list.length;
    const inProgress = list.filter((i) => ['aberto', 'em_contagem', 'reaberto'].includes(i.status)).length;
    const awaitingReview = list.filter((i) => i.status === 'aguardando_revisao').length;
    const adjusted = list.filter((i) => i.status === 'ajustado').length;

    return { total, inProgress, awaitingReview, adjusted };
  }, [inventories]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    const now = new Date();
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    setNewTitle(`Inventário Geral - ${monthNames[now.getMonth()]} ${now.getFullYear()}`);
    setNewScope('geral');
    setNewCategory(availableCategories[0] || 'Medicamentos');
    setNewDueDate(new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setNewNotes('');
    // Auto select non-admin collaborators as default assignees
    const collaborators = users.filter((u) => u.role === 'colaborador' && u.active);
    setSelectedUserIds(collaborators.map((c) => c.id));
    setSelectedProductIds([]);
    setFeedback(null);
    setIsCreateModalOpen(true);
  };

  // Submit Create Inventory
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setFeedback({ type: 'error', message: 'Título do inventário é obrigatório.' });
      return;
    }

    if (newScope === 'categoria' && !newCategory) {
      setFeedback({ type: 'error', message: 'Selecione uma categoria para o inventário.' });
      return;
    }

    if (newScope === 'selecao' && selectedProductIds.length === 0) {
      setFeedback({ type: 'error', message: 'Selecione ao menos 1 produto para inventário por seleção.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      if (onCreateInventory) {
        const success = await onCreateInventory({
          title: newTitle.trim(),
          scope: newScope,
          category: newScope === 'categoria' ? newCategory : undefined,
          assignedUserIds: selectedUserIds,
          dueDate: newDueDate || undefined,
          notes: newNotes.trim() || undefined,
          creatorId: currentUser.id,
          creatorName: currentUser.name,
          specificProductIds: newScope === 'selecao' ? selectedProductIds : undefined,
        });
        if (success) {
          setIsCreateModalOpen(false);
          setFeedback({ type: 'success', message: 'Inventário criado com sucesso e aberto para contagem cega!' });
        }
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro ao criar inventário.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Review modal for specific inventory
  const handleOpenReview = (inv: InventoryCount) => {
    setReviewingInventory(inv);
    setReviewNotesInput(inv.reviewNotes || '');
    setReopenReasonInput('');
    setShowHistoryAccordion(false);
    setFeedback(null);
  };

  // Submit Reopen for recount
  const handleConfirmReopen = async () => {
    if (!reviewingInventory) return;
    if (!reopenReasonInput.trim()) {
      setFeedback({ type: 'error', message: 'A justificativa de reabertura é obrigatória para registrar a auditoria.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      if (onReopenInventory) {
        const success = await onReopenInventory(reviewingInventory.id, reopenReasonInput.trim());
        if (success) {
          setIsReopenModalOpen(false);
          setReviewingInventory(null);
          setFeedback({ type: 'success', message: `Inventário ${reviewingInventory.code} reaberto com sucesso para nova contagem!` });
        }
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro ao reabrir inventário.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Reject
  const handleConfirmReject = async () => {
    if (!reviewingInventory) return;

    setIsSubmitting(true);
    setFeedback(null);
    try {
      if (onRejectInventory) {
        const success = await onRejectInventory(reviewingInventory.id, reviewNotesInput.trim());
        if (success) {
          setIsRejectModalOpen(false);
          setReviewingInventory(null);
          setFeedback({ type: 'success', message: `Inventário ${reviewingInventory.code} rejeitado sem ajustes de estoque.` });
        }
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro ao rejeitar inventário.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Approval & Stock Adjustments
  const handleConfirmApprove = async () => {
    if (!reviewingInventory) return;

    setIsSubmitting(true);
    setFeedback(null);
    try {
      if (onApproveInventory) {
        const success = await onApproveInventory(reviewingInventory.id, reviewNotesInput.trim());
        if (success) {
          setIsApproveConfirmModalOpen(false);
          setReviewingInventory(null);
          setFeedback({ type: 'success', message: `Ajustes de estoque do inventário ${reviewingInventory.code} foram aplicados com sucesso!` });
        }
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro ao aprovar inventário.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter products in create modal when selecting specific products
  const modalEligibleProducts = useMemo(() => {
    if (!productSearchInModal.trim()) return products.slice(0, 20);
    const q = productSearchInModal.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.ean && p.ean.includes(q))
    );
  }, [products, productSearchInModal]);

  return (
    <div className="space-y-6" id="admin-inventarios-tab">
      {/* Metric Cards Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>Total Inventários</span>
            <ClipboardCheck className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900">{overallStats.total}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs bg-amber-50/20">
          <div className="flex items-center justify-between text-amber-700 text-xs font-semibold mb-1">
            <span>Em Andamento</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-900">{overallStats.inProgress}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-teal-200 shadow-xs bg-teal-50/20">
          <div className="flex items-center justify-between text-teal-700 text-xs font-semibold mb-1">
            <span>Aguardando Revisão</span>
            <AlertCircle className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl font-black text-teal-900">{overallStats.awaitingReview}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs bg-emerald-50/20">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold mb-1">
            <span>Ajustados / Concluídos</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-900">{overallStats.adjusted}</p>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          id="admin-inventory-feedback-banner"
          className={`p-4 rounded-xl border text-sm font-medium flex items-center justify-between gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-bold hover:underline opacity-80"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Header & Filter Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="input-search-admin-inventories"
              placeholder="Buscar por código (INV-...), título, responsável..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                id="filter-inv-all"
                onClick={() => setStatusFilter('todos')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  statusFilter === 'todos'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                id="filter-inv-progress"
                onClick={() => setStatusFilter('em_andamento')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  statusFilter === 'em_andamento'
                    ? 'bg-white text-amber-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Em Contagem
              </button>
              <button
                type="button"
                id="filter-inv-review"
                onClick={() => setStatusFilter('revisao')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  statusFilter === 'revisao'
                    ? 'bg-white text-teal-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Aguardando Revisão
              </button>
              <button
                type="button"
                id="filter-inv-adjusted"
                onClick={() => setStatusFilter('ajustado')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  statusFilter === 'ajustado'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ajustados
              </button>
            </div>

            {/* Create New Inventory Button */}
            <button
              type="button"
              id="btn-open-create-inventory"
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Novo Inventário
            </button>
          </div>
        </div>
      </div>

      {/* Inventories Table / List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden" id="admin-inventories-table-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Código / Data</th>
                <th className="py-3 px-4">Título & Escopo</th>
                <th className="py-3 px-4">Responsáveis</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Progresso Físico</th>
                <th className="py-3 px-4 text-right">Impacto Financeiro</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {filteredInventories.map((inv) => {
                const percent = inv.totalProducts > 0 ? Math.round((inv.countedProducts / inv.totalProducts) * 100) : 0;
                const isAwaitingReview = inv.status === 'aguardando_revisao';
                const isAdjusted = inv.status === 'ajustado';
                const isReopened = inv.status === 'reaberto';

                return (
                  <tr
                    key={inv.id}
                    id={`inventory-row-${inv.id}`}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isAwaitingReview ? 'bg-teal-50/30 font-semibold' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-blue-700">{inv.code}</span>
                      <p className="text-[11px] text-slate-400">
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </p>
                    </td>

                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{inv.title}</p>
                      <p className="text-[11px] text-slate-500">
                        {inv.scope === 'geral'
                          ? 'Geral (Todos os Produtos)'
                          : inv.scope === 'categoria'
                          ? `Categoria: ${inv.category}`
                          : 'Seleção Específica'}
                      </p>
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      <div className="flex items-center gap-1">
                        <UserIcon className="w-3 h-3 text-slate-400" />
                        <span className="truncate max-w-[150px]">
                          {inv.assignedUserNames?.join(', ') || 'Equipe'}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      {inv.status === 'rascunho' && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-full">
                          Rascunho
                        </span>
                      )}
                      {inv.status === 'aberto' && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-full">
                          Aberto
                        </span>
                      )}
                      {inv.status === 'em_contagem' && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full flex items-center justify-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          Em Contagem
                        </span>
                      )}
                      {isReopened && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-bold rounded-full flex items-center justify-center gap-1">
                          <RotateCcw className="w-2.5 h-2.5" />
                          Reaberto ({inv.reopenCount || 1}ª)
                        </span>
                      )}
                      {isAwaitingReview && (
                        <span className="px-2.5 py-0.5 bg-teal-100 text-teal-900 border border-teal-200 text-[10px] font-bold rounded-full flex items-center justify-center gap-1">
                          <AlertCircle className="w-2.5 h-2.5 text-teal-700" />
                          Aguardando Revisão
                        </span>
                      )}
                      {isAdjusted && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Ajustado
                        </span>
                      )}
                      {inv.status === 'rejeitado' && (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-full">
                          Rejeitado
                        </span>
                      )}
                      {inv.status === 'cancelado' && (
                        <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-bold rounded-full">
                          Cancelado
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-slate-700">
                          {inv.countedProducts} / {inv.totalProducts} ({percent}%)
                        </span>
                        <div className="w-20 bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${
                              percent === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      {inv.totalFinancialImpact !== undefined ? (
                        <span
                          className={`font-mono font-bold ${
                            inv.totalFinancialImpact > 0
                              ? 'text-emerald-700'
                              : inv.totalFinancialImpact < 0
                              ? 'text-rose-700'
                              : 'text-slate-600'
                          }`}
                        >
                          {inv.totalFinancialImpact >= 0 ? '+' : ''}
                          {formatCurrencyBRL(inv.totalFinancialImpact)}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Sob contagem</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isAwaitingReview && (
                          <button
                            type="button"
                            id={`btn-review-inventory-${inv.id}`}
                            onClick={() => handleOpenReview(inv)}
                            className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 shadow-xs transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            Revisar Divergências
                          </button>
                        )}

                        {!isAwaitingReview && (
                          <button
                            type="button"
                            id={`btn-view-inventory-${inv.id}`}
                            onClick={() => handleOpenReview(inv)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-[11px] transition-colors"
                          >
                            Ver Detalhes
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredInventories.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    <ClipboardCheck className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    Nenhum inventário de estoque encontrado com os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Criar Novo Inventário */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4" id="modal-create-inventory">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <ClipboardCheck className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Criar Novo Inventário Físico</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Título / Identificação do Inventário *</label>
                <input
                  type="text"
                  required
                  id="input-inventory-title"
                  placeholder="Ex: Balanço Geral - Setembro 2026"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Escopo */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Escopo de Contagem *</label>
                <div className="grid grid-cols-3 gap-2">
                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs font-semibold ${
                      newScope === 'geral'
                        ? 'border-blue-500 bg-blue-50/50 text-blue-900'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="scope"
                      value="geral"
                      checked={newScope === 'geral'}
                      onChange={() => setNewScope('geral')}
                      className="hidden"
                    />
                    <Package className="w-4 h-4 text-blue-600" />
                    <span>Geral (Todos)</span>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs font-semibold ${
                      newScope === 'categoria'
                        ? 'border-blue-500 bg-blue-50/50 text-blue-900'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="scope"
                      value="categoria"
                      checked={newScope === 'categoria'}
                      onChange={() => setNewScope('categoria')}
                      className="hidden"
                    />
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span>Por Categoria</span>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs font-semibold ${
                      newScope === 'selecao'
                        ? 'border-blue-500 bg-blue-50/50 text-blue-900'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="scope"
                      value="selecao"
                      checked={newScope === 'selecao'}
                      onChange={() => setNewScope('selecao')}
                      className="hidden"
                    />
                    <Filter className="w-4 h-4 text-blue-600" />
                    <span>Itens Específicos</span>
                  </label>
                </div>
              </div>

              {/* Conditional Category Selection */}
              {newScope === 'categoria' && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Selecionar Categoria *</label>
                  <select
                    id="select-inventory-category"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
                  >
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Conditional Specific Products Selection */}
              {newScope === 'selecao' && (
                <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700">
                      Selecionar Produtos ({selectedProductIds.length} selecionados):
                    </label>
                    <input
                      type="text"
                      placeholder="Filtrar por nome ou código..."
                      value={productSearchInModal}
                      onChange={(e) => setProductSearchInModal(e.target.value)}
                      className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>

                  <div className="max-h-36 overflow-y-auto space-y-1 divide-y divide-slate-100">
                    {modalEligibleProducts.map((p) => {
                      const isSelected = selectedProductIds.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className="flex items-center gap-2 p-1.5 hover:bg-white rounded cursor-pointer text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedProductIds((prev) => [...prev, p.id]);
                              } else {
                                setSelectedProductIds((prev) => prev.filter((id) => id !== p.id));
                              }
                            }}
                            className="rounded text-blue-600"
                          />
                          <span className="font-mono text-slate-400 font-bold">{p.code}</span>
                          <span className="font-semibold text-slate-800">{p.name}</span>
                          <span className="text-slate-400 text-[10px]">({p.category})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Assigned Staff */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">
                  Colaboradores Responsáveis pela Contagem Física:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {users
                    .filter((u) => u.active)
                    .map((u) => {
                      const isAssigned = selectedUserIds.includes(u.id);
                      return (
                        <label
                          key={u.id}
                          className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer ${
                            isAssigned ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isAssigned}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUserIds((prev) => [...prev, u.id]);
                              } else {
                                setSelectedUserIds((prev) => prev.filter((id) => id !== u.id));
                              }
                            }}
                            className="rounded text-blue-600"
                          />
                          <span>{u.name}</span>
                          <span className="text-[10px] text-slate-400 font-normal">({u.role})</span>
                        </label>
                      );
                    })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Prazo / Data Limite (Opcional)</label>
                  <input
                    type="date"
                    id="input-inventory-due-date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Observações Internas</label>
                  <input
                    type="text"
                    id="input-inventory-notes"
                    placeholder="Instruções para a equipe..."
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  id="btn-submit-create-inventory"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  {isSubmitting ? 'Criando...' : 'Iniciar Inventário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Revisão & Conciliação de Divergências */}
      {reviewingInventory && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6" id="modal-review-inventory">
          <div className="bg-white rounded-2xl max-w-5xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 font-mono text-xs font-bold rounded-md">
                    {reviewingInventory.code}
                  </span>
                  <h3 className="font-bold text-slate-900 text-lg">
                    Revisão & Conciliação: {reviewingInventory.title}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Conferência física finalizada por{' '}
                  <strong className="text-slate-700">{reviewingInventory.countCompletedByName || reviewingInventory.assignedUserNames?.join(', ')}</strong>{' '}
                  {reviewingInventory.countCompletedAt && (
                    <>em {new Date(reviewingInventory.countCompletedAt).toLocaleString()}</>
                  )}
                </p>
              </div>

              <button
                onClick={() => setReviewingInventory(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500">Itens Contados</span>
                <p className="text-lg font-black text-slate-900">
                  {reviewingInventory.countedProducts} / {reviewingInventory.totalProducts}
                </p>
              </div>

              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                <span className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Sobras (Físico &gt; Sistema)
                </span>
                <p className="text-lg font-black text-emerald-900">
                  {reviewingInventory.items.filter((it) => (it.difference || 0) > 0.0001).length} itens
                </p>
              </div>

              <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200">
                <span className="text-[11px] font-semibold text-rose-800 flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" /> Faltas (Físico &lt; Sistema)
                </span>
                <p className="text-lg font-black text-rose-900">
                  {reviewingInventory.items.filter((it) => (it.difference || 0) < -0.0001).length} itens
                </p>
              </div>

              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200">
                <span className="text-[11px] font-semibold text-blue-800 flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> Impacto Financeiro Total
                </span>
                <p
                  className={`text-lg font-black font-mono ${
                    (reviewingInventory.totalFinancialImpact || 0) >= 0
                      ? 'text-emerald-700'
                      : 'text-rose-700'
                  }`}
                >
                  {(reviewingInventory.totalFinancialImpact || 0) >= 0 ? '+' : ''}
                  {formatCurrencyBRL(reviewingInventory.totalFinancialImpact || 0)}
                </p>
              </div>
            </div>

            {/* Comparison Table */}
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200 shadow-xs">
                  <tr>
                    <th className="py-2.5 px-3">Código</th>
                    <th className="py-2.5 px-3">Produto</th>
                    <th className="py-2.5 px-3 text-center" title="Saldo no momento da abertura do inventário">
                      Snapshot Abertura
                    </th>
                    <th className="py-2.5 px-3 text-center" title="Vendas ou Entradas intermediárias ocorridas após a abertura">
                      Mov. Intermediárias
                    </th>
                    <th className="py-2.5 px-3 text-center" title="Saldo esperado considerando operações em andamento">
                      Esperado Ajustado
                    </th>
                    <th className="py-2.5 px-3 text-center font-black text-blue-900">
                      Contado Físico
                    </th>
                    <th className="py-2.5 px-3 text-center">Divergência</th>
                    <th className="py-2.5 px-3 text-right">Custo Unit.</th>
                    <th className="py-2.5 px-3 text-right">Impacto Financeiro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {reviewingInventory.items.map((item) => {
                    const diff = item.difference ?? 0;
                    const isDivergent = Math.abs(diff) > 0.0001;

                    return (
                      <tr
                        key={item.productId}
                        className={`hover:bg-slate-50 transition-colors ${
                          isDivergent
                            ? diff > 0
                              ? 'bg-emerald-50/30'
                              : 'bg-rose-50/30'
                            : ''
                        }`}
                      >
                        <td className="py-2 px-3 font-mono text-slate-500">{item.productCode}</td>
                        <td className="py-2 px-3 font-bold text-slate-900">
                          {item.productName}
                          {item.presentation && (
                            <span className="block text-[10px] text-slate-400 font-normal">
                              {item.presentation}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-slate-600">
                          {item.expectedQuantitySnapshot ?? '-'}
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-slate-500">
                          {item.intermediateMovementsQuantity && item.intermediateMovementsQuantity !== 0
                            ? (item.intermediateMovementsQuantity > 0 ? `+${item.intermediateMovementsQuantity}` : item.intermediateMovementsQuantity)
                            : '0'}
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-slate-800">
                          {item.expectedQuantityAdjusted ?? item.expectedQuantitySnapshot ?? '-'}
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-black text-blue-800 bg-blue-50/40">
                          {item.isCounted ? item.countedQuantity : <span className="text-slate-400">Não contado</span>}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {item.isCounted ? (
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                                diff > 0
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : diff < 0
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {diff > 0 ? `+${diff}` : diff}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600">
                          {formatCurrencyBRL(item.unitCost || 0)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold">
                          {item.financialImpact !== undefined ? (
                            <span
                              className={
                                item.financialImpact > 0
                                  ? 'text-emerald-700'
                                  : item.financialImpact < 0
                                  ? 'text-rose-700'
                                  : 'text-slate-500'
                              }
                            >
                              {item.financialImpact >= 0 ? '+' : ''}
                              {formatCurrencyBRL(item.financialImpact)}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Version History Accordion if Reopened before */}
            {reviewingInventory.previousVersions && reviewingInventory.previousVersions.length > 0 && (
              <div className="border border-purple-200 bg-purple-50/40 rounded-xl p-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowHistoryAccordion(!showHistoryAccordion)}
                  className="w-full flex items-center justify-between text-xs font-bold text-purple-900"
                >
                  <span className="flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-purple-600" />
                    Histórico de Reaberturas & Versões Anteriores ({reviewingInventory.previousVersions.length})
                  </span>
                  {showHistoryAccordion ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showHistoryAccordion && (
                  <div className="mt-3 pt-3 border-t border-purple-200 space-y-2 text-xs">
                    {reviewingInventory.previousVersions.map((v) => (
                      <div key={v.version} className="bg-white p-2.5 rounded-lg border border-purple-100 space-y-1">
                        <div className="flex justify-between font-bold text-purple-950">
                          <span>Versão {v.version} (Contado por {v.countedByName})</span>
                          <span className="text-slate-500">{new Date(v.completedAt).toLocaleString()}</span>
                        </div>
                        {v.reopenReason && (
                          <p className="text-[11px] text-slate-600 italic">
                            Motivo da reabertura por {v.reopenedByName}: "{v.reopenReason}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons Footer */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                {!reviewingInventory.adjustmentApplied && reviewingInventory.status !== 'cancelado' && (
                  <>
                    <button
                      type="button"
                      id="btn-trigger-reopen-modal"
                      onClick={() => setIsReopenModalOpen(true)}
                      className="px-3.5 py-2 bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reabrir para Recontagem
                    </button>

                    <button
                      type="button"
                      id="btn-trigger-reject-modal"
                      onClick={() => setIsRejectModalOpen(true)}
                      className="px-3.5 py-2 bg-rose-100 hover:bg-rose-200 text-rose-900 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Rejeitar / Não Ajustar
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReviewingInventory(null)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
                >
                  Fechar
                </button>

                {!reviewingInventory.adjustmentApplied && reviewingInventory.status !== 'cancelado' && (
                  <button
                    type="button"
                    id="btn-trigger-approve-modal"
                    onClick={() => setIsApproveConfirmModalOpen(true)}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    Aprovar & Ajustar Estoque
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Confirmação de Reabertura */}
      {isReopenModalOpen && reviewingInventory && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" id="modal-confirm-reopen">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Reabrir Inventário para Recontagem
              </h3>
              <p className="text-xs text-slate-500">
                A contagem anterior será arquivada no histórico de versões e a equipe poderá refazer a contagem física cega.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Justificativa Obrigatória da Gerência *
              </label>
              <textarea
                id="input-reopen-reason"
                required
                rows={3}
                placeholder="Ex: Identificada inconsistência acentuada no lote de Antibióticos; solicitada nova checagem física da prateleira B."
                value={reopenReasonInput}
                onChange={(e) => setReopenReasonInput(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsReopenModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Voltar
              </button>
              <button
                type="button"
                id="btn-confirm-reopen"
                disabled={isSubmitting || !reopenReasonInput.trim()}
                onClick={handleConfirmReopen}
                className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Reabrindo...' : 'Confirmar Reabertura'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Confirmação de Aprovação & Aplicação de Ajuste */}
      {isApproveConfirmModalOpen && reviewingInventory && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" id="modal-confirm-approve">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Confirmar Ajuste Oficial de Estoque
              </h3>
              <p className="text-xs text-slate-500">
                Esta ação atualizará os saldos em estoque de <strong>{reviewingInventory.totalProducts} produtos</strong> e gerará registros de movimentação Kardex tipo <code>ajuste_inventario</code>.
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1 text-slate-700">
              <div className="flex justify-between">
                <span>Impacto Financeiro Líquido:</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrencyBRL(reviewingInventory.totalFinancialImpact || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Gestor Responsável:</span>
                <span className="font-bold">{currentUser.name}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Parecer / Observações do Gestor (Opcional)
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Conciliado com relatório de perdas da semana..."
                value={reviewNotesInput}
                onChange={(e) => setReviewNotesInput(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsApproveConfirmModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Voltar
              </button>
              <button
                type="button"
                id="btn-confirm-approve-adjustment"
                disabled={isSubmitting}
                onClick={handleConfirmApprove}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors flex items-center gap-1.5"
              >
                {isSubmitting ? 'Aplicando...' : 'Confirmar & Aplicar no Kardex'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Rejeição de Inventário */}
      {isRejectModalOpen && reviewingInventory && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" id="modal-confirm-reject">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <XCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Rejeitar Inventário de Estoque
              </h3>
              <p className="text-xs text-slate-500">
                O inventário será finalizado com status <strong>Rejeitado</strong> e NENHUM saldo de estoque será alterado.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Motivo da Rejeição:
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Contagem realizada em período de recebimento com inconsistência operacional..."
                value={reviewNotesInput}
                onChange={(e) => setReviewNotesInput(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Voltar
              </button>
              <button
                type="button"
                id="btn-confirm-reject"
                disabled={isSubmitting}
                onClick={handleConfirmReject}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors"
              >
                {isSubmitting ? 'Rejeitando...' : 'Confirmar Rejeição'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
