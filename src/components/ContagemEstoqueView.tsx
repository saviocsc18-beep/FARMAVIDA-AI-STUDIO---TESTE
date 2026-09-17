import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ClipboardCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Save,
  Send,
  Plus,
  Minus,
  Barcode,
  Package,
  ArrowLeft,
  RotateCcw,
  Check,
  Filter,
  Sparkles,
  Info,
  Lock,
} from 'lucide-react';
import { InventoryCount, InventoryItemCount, User } from '../types';

interface ContagemEstoqueViewProps {
  currentUser: User | null;
  inventories: InventoryCount[];
  onSaveCount: (inventoryId: string, items: { productId: string; countedQuantity: number }[], notes?: string) => Promise<boolean | void>;
  onCompleteCount: (inventoryId: string, items: { productId: string; countedQuantity: number }[], notes?: string) => Promise<boolean | void>;
  onGoToBalcao?: () => void;
  onRefreshData?: () => void;
}

export function ContagemEstoqueView({
  currentUser,
  inventories,
  onSaveCount,
  onCompleteCount,
  onGoToBalcao,
  onRefreshData,
}: ContagemEstoqueViewProps) {
  const [selectedInventoryId, setSelectedInventoryId] = useState<string | null>(null);
  const [localCounts, setLocalCounts] = useState<Record<string, { quantity: string; isCounted: boolean }>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'pendentes' | 'contados'>('todos');
  const [isSaving, setIsSaving] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Active inventory currently selected
  const activeInventory = useMemo(() => {
    if (!inventories || inventories.length === 0) return null;
    if (selectedInventoryId) {
      return inventories.find((i) => i.id === selectedInventoryId) || null;
    }
    // Auto select first open/reopened inventory assigned to user or general
    const available = inventories.filter((i) =>
      ['aberto', 'em_contagem', 'reaberto', 'aguardando_revisao'].includes(i.status)
    );
    if (available.length > 0) {
      // Prioritize ones assigned to this user
      const userAssigned = available.find((i) => i.assignedUserIds?.includes(currentUser?.id || ''));
      return userAssigned || available[0];
    }
    return inventories[0] || null;
  }, [inventories, selectedInventoryId, currentUser]);

  // Sync active inventory ID
  useEffect(() => {
    if (activeInventory && activeInventory.id !== selectedInventoryId) {
      setSelectedInventoryId(activeInventory.id);
    }
  }, [activeInventory, selectedInventoryId]);

  // Initialize local counting state when active inventory changes
  useEffect(() => {
    if (!activeInventory) {
      setLocalCounts({});
      return;
    }

    const initial: Record<string, { quantity: string; isCounted: boolean }> = {};
    for (const item of activeInventory.items || []) {
      if (item.isCounted && item.countedQuantity !== null && item.countedQuantity !== undefined) {
        initial[item.productId] = {
          quantity: String(item.countedQuantity),
          isCounted: true,
        };
      } else {
        initial[item.productId] = {
          quantity: '',
          isCounted: false,
        };
      }
    }
    setLocalCounts(initial);
  }, [activeInventory?.id, activeInventory?.status, activeInventory?.reopenedAt]);

  const isLockedForCount = activeInventory
    ? !['aberto', 'em_contagem', 'reaberto'].includes(activeInventory.status)
    : true;

  // Handle count quantity changes
  const handleQuantityChange = (productId: string, value: string) => {
    if (isLockedForCount) return;

    if (value === '') {
      setLocalCounts((prev) => ({
        ...prev,
        [productId]: { quantity: '', isCounted: false },
      }));
      return;
    }

    const num = Number(value);
    if (isNaN(num) || num < 0) return;

    setLocalCounts((prev) => ({
      ...prev,
      [productId]: { quantity: value, isCounted: true },
    }));
  };

  const handleStepQuantity = (productId: string, delta: number) => {
    if (isLockedForCount) return;

    const current = localCounts[productId];
    const currentNum = current?.isCounted && current.quantity !== '' ? Number(current.quantity) : 0;
    const nextVal = Math.max(0, currentNum + delta);

    setLocalCounts((prev) => ({
      ...prev,
      [productId]: { quantity: String(nextVal), isCounted: true },
    }));
  };

  const handleSetZero = (productId: string) => {
    if (isLockedForCount) return;

    setLocalCounts((prev) => ({
      ...prev,
      [productId]: { quantity: '0', isCounted: true },
    }));
  };

  // Filter items based on search and status
  const filteredItems = useMemo(() => {
    if (!activeInventory?.items) return [];

    return activeInventory.items.filter((item) => {
      const state = localCounts[item.productId];
      const isCounted = state?.isCounted ?? false;

      // Status filter
      if (filterStatus === 'pendentes' && isCounted) return false;
      if (filterStatus === 'contados' && !isCounted) return false;

      // Search term (name, code, ean)
      if (searchTerm.trim()) {
        const query = searchTerm.trim().toLowerCase();
        const matchesName = item.productName.toLowerCase().includes(query);
        const matchesCode = item.productCode.toLowerCase().includes(query);
        const matchesEan = item.ean ? item.ean.toLowerCase().includes(query) : false;
        const matchesCategory = item.category ? item.category.toLowerCase().includes(query) : false;
        return matchesName || matchesCode || matchesEan || matchesCategory;
      }

      return true;
    });
  }, [activeInventory?.items, localCounts, filterStatus, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    if (!activeInventory?.items) return { total: 0, counted: 0, percent: 0, pending: 0 };
    const total = activeInventory.items.length;
    let counted = 0;

    for (const item of activeInventory.items) {
      if (localCounts[item.productId]?.isCounted) {
        counted++;
      }
    }

    const percent = total > 0 ? Math.round((counted / total) * 100) : 0;
    const pending = total - counted;

    return { total, counted, percent, pending };
  }, [activeInventory?.items, localCounts]);

  // Save partial progress
  const handleSaveProgress = async () => {
    if (!activeInventory || isLockedForCount) return;

    setIsSaving(true);
    setFeedbackMsg(null);
    try {
      const entries = Object.entries(localCounts) as [string, { quantity: string; isCounted: boolean }][];
      const itemsPayload = entries
        .filter(([_, state]) => state.isCounted && state.quantity !== '')
        .map(([productId, state]) => ({
          productId,
          countedQuantity: Number(state.quantity),
        }));

      await onSaveCount(activeInventory.id, itemsPayload);
      setFeedbackMsg({ type: 'success', text: 'Progresso da contagem física salvo com sucesso!' });
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Erro ao salvar contagem.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Trigger Complete flow
  const handleInitiateCompletion = () => {
    if (!activeInventory || isLockedForCount) return;

    if (stats.pending > 0) {
      setFeedbackMsg({
        type: 'error',
        text: `Atenção: existem ${stats.pending} produto(s) ainda não contados. Todos os itens obrigatórios devem ser contados ou explicitamente marcados como 0 antes de finalizar.`,
      });
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmCompletion = async () => {
    if (!activeInventory) return;

    setIsFinishing(true);
    setFeedbackMsg(null);
    try {
      // First save current values
      const entries = Object.entries(localCounts) as [string, { quantity: string; isCounted: boolean }][];
      const itemsPayload = entries
        .filter(([_, state]) => state.isCounted && state.quantity !== '')
        .map(([productId, state]) => ({
          productId,
          countedQuantity: Number(state.quantity),
        }));

      await onCompleteCount(activeInventory.id, itemsPayload, completionNotes);

      setShowConfirmModal(false);
      setFeedbackMsg({
        type: 'success',
        text: 'Contagem física concluída com sucesso! Os dados foram enviados para conferência e revisão gerencial.',
      });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Erro ao concluir contagem.' });
    } finally {
      setIsFinishing(false);
    }
  };

  // If no inventories are available
  if (!activeInventory) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center" id="contagem-estoque-empty">
        <div className="bg-white rounded-2xl p-12 border border-slate-200 shadow-sm max-w-lg mx-auto">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ClipboardCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Nenhum Inventário em Aberto</h2>
          <p className="text-sm text-slate-500 mb-6">
            Não há inventários físicos ativos atribuídos à sua unidade no momento. Quando a gerência abrir um balanço ou contagem periódica, ele aparecerá automaticamente aqui.
          </p>
          <button
            onClick={onRefreshData}
            id="btn-refresh-empty-inventory"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Atualizar Lista
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6" id="contagem-estoque-view">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6" id="inventory-header-card">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 font-mono text-xs font-bold rounded-lg border border-blue-200">
                {activeInventory.code}
              </span>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                {activeInventory.title}
              </h1>
              {activeInventory.status === 'reaberto' && (
                <span className="px-2.5 py-1 bg-purple-100 text-purple-800 text-xs font-bold rounded-full border border-purple-200 flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" />
                  Reaberto p/ Recontagem ({activeInventory.reopenCount}ª vez)
                </span>
              )}
              {activeInventory.status === 'em_contagem' && (
                <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full border border-amber-200 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Em Contagem
                </span>
              )}
              {activeInventory.status === 'aberto' && (
                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-200">
                  Aberto
                </span>
              )}
              {activeInventory.status === 'aguardando_revisao' && (
                <span className="px-2.5 py-1 bg-teal-100 text-teal-800 text-xs font-bold rounded-full border border-teal-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Aguardando Revisão Gerencial
                </span>
              )}
              {activeInventory.status === 'ajustado' && (
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full border border-emerald-200">
                  Ajuste Concluído
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
              <span>
                <strong className="text-slate-700">Escopo:</strong>{' '}
                {activeInventory.scope === 'geral'
                  ? 'Geral (Todos os Produtos)'
                  : activeInventory.scope === 'categoria'
                  ? `Categoria: ${activeInventory.category}`
                  : 'Seleção Específica'}
              </span>
              <span>•</span>
              <span>
                <strong className="text-slate-700">Responsáveis:</strong>{' '}
                {activeInventory.assignedUserNames?.join(', ') || 'Equipe Geral'}
              </span>
              {activeInventory.dueDate && (
                <>
                  <span>•</span>
                  <span>
                    <strong className="text-slate-700">Prazo:</strong> {activeInventory.dueDate}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Inventories Switcher (if multiple available) */}
          {inventories.length > 1 && (
            <div className="flex items-center gap-2">
              <label htmlFor="select-active-inventory" className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                Trocar Inventário:
              </label>
              <select
                id="select-active-inventory"
                value={activeInventory.id}
                onChange={(e) => setSelectedInventoryId(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {inventories.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.code} - {inv.title} ({inv.status})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Reopen Warning Banner */}
        {activeInventory.status === 'reaberto' && activeInventory.reopenReason && (
          <div className="mt-4 p-3.5 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-purple-950">
                Inventário reaberto pela administração para nova contagem cega:
              </p>
              <p className="italic mt-0.5">"{activeInventory.reopenReason}"</p>
            </div>
          </div>
        )}

        {/* Locked Status Banner */}
        {isLockedForCount && (
          <div className="mt-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold">
                Contagem finalizada e bloqueada para edição operacional.
              </p>
              <p className="text-amber-700 text-xs">
                Este inventário está sob conferência gerencial. Apenas a administração pode aprovar ajustes ou solicitar recontagem.
              </p>
            </div>
          </div>
        )}

        {/* Progress Bar & Actions */}
        <div className="mt-5 pt-5 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <div className="flex justify-between text-xs font-semibold mb-1.5">
              <span className="text-slate-700">Progresso da Contagem Cega</span>
              <span className="text-blue-700 font-bold">
                {stats.counted} de {stats.total} itens ({stats.percent}%)
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${stats.percent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {!isLockedForCount && (
              <>
                <button
                  type="button"
                  id="btn-save-inventory-progress"
                  onClick={handleSaveProgress}
                  disabled={isSaving}
                  className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5 text-slate-500" />
                  {isSaving ? 'Salvando...' : 'Salvar Rascunho'}
                </button>

                <button
                  type="button"
                  id="btn-finish-inventory-count"
                  onClick={handleInitiateCompletion}
                  disabled={isFinishing}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  Finalizar Contagem
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Feedback Messages */}
      {feedbackMsg && (
        <div
          id="inventory-feedback-msg"
          className={`p-4 rounded-xl border text-sm font-medium flex items-center justify-between gap-3 animate-fadeIn ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : feedbackMsg.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-xs font-bold hover:underline opacity-80"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input with barcode reader capability */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              ref={barcodeInputRef}
              type="text"
              id="input-inventory-search"
              placeholder="Buscar produto por nome, código interno ou código de barras (EAN)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 self-start md:self-auto flex-wrap">
            <button
              type="button"
              id="filter-inventory-all"
              onClick={() => setFilterStatus('todos')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                filterStatus === 'todos'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos ({stats.total})
            </button>
            <button
              type="button"
              id="filter-inventory-pending"
              onClick={() => setFilterStatus('pendentes')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 ${
                filterStatus === 'pendentes'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              Pendentes ({stats.pending})
            </button>
            <button
              type="button"
              id="filter-inventory-counted"
              onClick={() => setFilterStatus('contados')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 ${
                filterStatus === 'contados'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              Contados ({stats.counted})
            </button>
          </div>
        </div>
      </div>

      {/* Product Items Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" id="inventory-items-container">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">Nenhum produto encontrado com os filtros atuais.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredItems.map((item, index) => {
              const state = localCounts[item.productId] || { quantity: '', isCounted: false };
              const isItemCounted = state.isCounted;
              const numericQty = state.quantity !== '' ? Number(state.quantity) : null;

              return (
                <div
                  key={item.productId}
                  id={`inventory-item-row-${item.productId}`}
                  className={`p-4 md:p-5 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isItemCounted
                      ? numericQty === 0
                        ? 'bg-amber-50/40 hover:bg-amber-50/70'
                        : 'bg-emerald-50/30 hover:bg-emerald-50/60'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  {/* Product Info */}
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {item.productCode}
                      </span>
                      {item.ean && (
                        <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                          <Barcode className="w-3 h-3" />
                          {item.ean}
                        </span>
                      )}
                      <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {item.category}
                      </span>
                    </div>

                    <h3 className="text-sm md:text-base font-bold text-slate-900 leading-snug">
                      {item.productName}
                    </h3>
                    {item.presentation && (
                      <p className="text-xs text-slate-500">{item.presentation}</p>
                    )}
                  </div>

                  {/* Count Controls */}
                  <div className="flex items-center gap-3 sm:self-center">
                    {/* Status Badge */}
                    <div className="hidden md:block text-right min-w-[110px]">
                      {isItemCounted ? (
                        numericQty === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-lg border border-amber-200">
                            <Check className="w-3 h-3" />
                            0 Unidades
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200">
                            <Check className="w-3 h-3" />
                            {numericQty} un contadas
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-500 text-xs font-semibold rounded-lg">
                          Pendente
                        </span>
                      )}
                    </div>

                    {/* Numeric Stepper and Direct Input */}
                    <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        id={`btn-minus-${item.productId}`}
                        disabled={isLockedForCount}
                        onClick={() => handleStepQuantity(item.productId, -1)}
                        className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold active:scale-95 disabled:opacity-40 transition-transform"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <input
                        type="number"
                        min="0"
                        id={`input-count-${item.productId}`}
                        disabled={isLockedForCount}
                        placeholder="--"
                        value={state.quantity}
                        onChange={(e) => handleQuantityChange(item.productId, e.target.value)}
                        className="w-16 h-8 text-center bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                      />

                      <button
                        type="button"
                        id={`btn-plus-${item.productId}`}
                        disabled={isLockedForCount}
                        onClick={() => handleStepQuantity(item.productId, 1)}
                        className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold active:scale-95 disabled:opacity-40 transition-transform"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Quick 0 button */}
                    {!isLockedForCount && (
                      <button
                        type="button"
                        id={`btn-zero-${item.productId}`}
                        onClick={() => handleSetZero(item.productId)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-amber-100 hover:text-amber-800 text-slate-600 text-xs font-bold rounded-lg border border-slate-200 transition-colors whitespace-nowrap"
                        title="Marcar explicitamente 0 unidades físicas encontradas"
                      >
                        Marcar 0
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Modal for Finalization */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" id="modal-confirm-inventory-completion">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900">
                Confirmar Finalização de Contagem
              </h3>
              <p className="text-xs text-slate-500">
                Você preencheu a contagem física de todos os <strong>{stats.total}</strong> produtos deste inventário.
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl text-xs space-y-2 text-slate-700 border border-slate-200">
              <div className="flex justify-between">
                <span>Total de Itens:</span>
                <span className="font-bold">{stats.total} produtos</span>
              </div>
              <div className="flex justify-between">
                <span>Operador:</span>
                <span className="font-bold">{currentUser?.name || 'Operador'}</span>
              </div>
              <p className="text-slate-500 pt-1 border-t border-slate-200">
                Após a confirmação, os dados serão travados para conferência da gerência. Nenhuma alteração de estoque é feita automaticamente sem aprovação do administrador.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Observações Operacionais (Opcional):
              </label>
              <textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Ex: Contagem realizada nas prateleiras A1 a B4. Nenhum lote danificado encontrado."
                rows={2}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                id="btn-cancel-completion-modal"
                disabled={isFinishing}
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Voltar e Revisar
              </button>
              <button
                type="button"
                id="btn-confirm-completion-modal"
                disabled={isFinishing}
                onClick={handleConfirmCompletion}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow transition-colors flex items-center gap-1.5"
              >
                {isFinishing ? 'Concluindo...' : 'Confirmar e Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
