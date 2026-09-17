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
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Card, SectionTitle, Callout } from './ui/Layout';
import { notify } from './ui/feedback';
import { cn } from '../lib/ui';

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
      const msg = 'Progresso da contagem física salvo com sucesso!';
      setFeedbackMsg({ type: 'success', text: msg });
      notify.sucesso(msg);
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err: any) {
      const errMsg = err.message || 'Erro ao salvar contagem.';
      setFeedbackMsg({ type: 'error', text: errMsg });
      notify.erro(errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  // Trigger Complete flow
  const handleInitiateCompletion = () => {
    if (!activeInventory || isLockedForCount) return;

    if (stats.pending > 0) {
      const msg = `Atenção: existem ${stats.pending} produto(s) ainda não contados. Preencha todos antes de finalizar.`;
      setFeedbackMsg({
        type: 'error',
        text: msg,
      });
      notify.aviso(msg);
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
      const successText = 'Contagem física concluída com sucesso! Os dados foram enviados para conferência da gerência.';
      setFeedbackMsg({
        type: 'success',
        text: successText,
      });
      notify.sucesso(successText);
    } catch (err: any) {
      const errMsg = err.message || 'Erro ao concluir contagem.';
      setFeedbackMsg({ type: 'error', text: errMsg });
      notify.erro(errMsg);
    } finally {
      setIsFinishing(false);
    }
  };

  // If no inventories are available
  if (!activeInventory) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center" id="contagem-estoque-empty">
        <Card className="p-10 text-center space-y-3 bg-white border-[#E1E9E4]">
          <div className="w-14 h-14 bg-[#E6F4EC] text-[#0E7A53] rounded-2xl flex items-center justify-center mx-auto mb-2">
            <ClipboardCheck className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-[#13231B]">Nenhum Inventário em Aberto</h2>
          <p className="text-xs sm:text-sm text-[#56675E] max-w-sm mx-auto">
            Não há inventários físicos ativos atribuídos à sua unidade no momento. Quando a gerência abrir uma nova contagem periódica, ela aparecerá automaticamente aqui.
          </p>
          {onRefreshData && (
            <div className="pt-3">
              <Button
                variant="soft"
                size="md"
                onClick={onRefreshData}
                icon={RotateCcw}
              >
                Atualizar Lista
              </Button>
            </div>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5" id="contagem-estoque-view">
      {/* Header Banner */}
      <Card className="p-5 md:p-6 bg-white border-[#E1E9E4]" id="inventory-header-card">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2.5 py-1 bg-[#E6F4EC] text-[#0B6445] font-mono text-xs font-bold rounded-lg border border-[#0E7A53]/20">
                {activeInventory.code}
              </span>
              <h2 className="text-lg md:text-xl font-black text-[#13231B] tracking-tight">
                {activeInventory.title}
              </h2>
              {activeInventory.status === 'reaberto' && (
                <Badge variant="warn" icon={RotateCcw}>
                  Reaberto ({activeInventory.reopenCount}ª vez)
                </Badge>
              )}
              {activeInventory.status === 'em_contagem' && (
                <Badge variant="info" icon={Clock}>
                  Em Contagem
                </Badge>
              )}
              {activeInventory.status === 'aberto' && (
                <Badge variant="neutral">
                  Aberto
                </Badge>
              )}
              {activeInventory.status === 'aguardando_revisao' && (
                <Badge variant="ok" icon={CheckCircle2}>
                  Aguardando Revisão
                </Badge>
              )}
              {activeInventory.status === 'ajustado' && (
                <Badge variant="ok">
                  Ajuste Concluído
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#56675E] pt-0.5">
              <span>
                <strong className="text-[#13231B]">Escopo:</strong>{' '}
                {activeInventory.scope === 'geral'
                  ? 'Geral (Todos os Produtos)'
                  : activeInventory.scope === 'categoria'
                  ? `Categoria: ${activeInventory.category}`
                  : 'Seleção Específica'}
              </span>
              <span>•</span>
              <span>
                <strong className="text-[#13231B]">Responsáveis:</strong>{' '}
                {activeInventory.assignedUserNames?.join(', ') || 'Equipe Geral'}
              </span>
              {activeInventory.dueDate && (
                <>
                  <span>•</span>
                  <span>
                    <strong className="text-[#13231B]">Prazo:</strong> {activeInventory.dueDate}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Inventories Switcher (if multiple available) */}
          {inventories.length > 1 && (
            <div className="flex items-center gap-2">
              <label htmlFor="select-active-inventory" className="text-xs font-bold text-[#56675E] whitespace-nowrap">
                Trocar Inventário:
              </label>
              <select
                id="select-active-inventory"
                value={activeInventory.id}
                onChange={(e) => setSelectedInventoryId(e.target.value)}
                className="px-3 py-1.5 bg-[#F3F7F4] border border-[#E1E9E4] rounded-xl text-xs font-semibold text-[#13231B] focus:ring-2 focus:ring-[#0E7A53]/20 focus:border-[#0E7A53] outline-none"
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
          <div className="mt-4 p-3.5 bg-[#F3F7F4] border border-[#E1E9E4] rounded-xl text-xs text-[#13231B] flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#0E7A53] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-[#13231B]">
                Inventário reaberto pela administração para nova contagem:
              </p>
              <p className="italic text-[#56675E] mt-0.5">"{activeInventory.reopenReason}"</p>
            </div>
          </div>
        )}

        {/* Locked Status Banner */}
        {isLockedForCount && (
          <div className="mt-4 p-3.5 bg-[#FEF3EB] border border-[#F4B78A] rounded-xl text-xs text-[#8C3A00] flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-[#C05621] shrink-0" />
            <div>
              <p className="font-bold">
                Contagem bloqueada para edição operacional.
              </p>
              <p className="text-xs text-[#8C3A00]/80">
                Este inventário está sob conferência gerencial. Apenas a administração pode aprovar ajustes ou solicitar recontagem.
              </p>
            </div>
          </div>
        )}

        {/* Progress Bar & Actions */}
        <div className="mt-5 pt-5 border-t border-[#E1E9E4] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <div className="flex justify-between text-xs font-bold mb-1.5">
              <span className="text-[#13231B]">Progresso da Contagem</span>
              <span className="text-[#0E7A53]">
                {stats.counted} de {stats.total} itens ({stats.percent}%)
              </span>
            </div>
            <div className="w-full bg-[#E1E9E4] rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-[#0E7A53] h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${stats.percent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {!isLockedForCount && (
              <>
                <Button
                  type="button"
                  id="btn-save-inventory-progress"
                  variant="secondary"
                  size="sm"
                  onClick={handleSaveProgress}
                  loading={isSaving}
                  icon={Save}
                >
                  Salvar Rascunho
                </Button>

                <Button
                  type="button"
                  id="btn-finish-inventory-count"
                  variant="primary"
                  size="sm"
                  onClick={handleInitiateCompletion}
                  loading={isFinishing}
                  icon={Send}
                >
                  Finalizar Contagem
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Feedback Messages */}
      {feedbackMsg && (
        <Callout
          variant={feedbackMsg.type === 'success' ? 'ok' : feedbackMsg.type === 'error' ? 'danger' : 'info'}
          title={feedbackMsg.type === 'success' ? 'Sucesso' : feedbackMsg.type === 'error' ? 'Atenção' : 'Informação'}
        >
          {feedbackMsg.text}
        </Callout>
      )}

      {/* Search and Filters Bar */}
      <Card className="p-4 bg-white border-[#E1E9E4] space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#56675E] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              ref={barcodeInputRef}
              type="text"
              id="input-inventory-search"
              placeholder="Buscar por nome, código interno ou código de barras (EAN)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-16 h-10 bg-[#F3F7F4] border border-[#E1E9E4] rounded-xl text-xs md:text-sm text-[#13231B] placeholder-[#56675E]/70 focus:bg-white focus:ring-2 focus:ring-[#0E7A53]/20 focus:border-[#0E7A53] outline-none transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#56675E] hover:text-[#13231B] cursor-pointer"
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
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer",
                filterStatus === 'todos'
                  ? "bg-[#13231B] text-white"
                  : "bg-[#F3F7F4] text-[#56675E] hover:bg-[#E1E9E4]"
              )}
            >
              Todos ({stats.total})
            </button>
            <button
              type="button"
              id="filter-inventory-pending"
              onClick={() => setFilterStatus('pendentes')}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1",
                filterStatus === 'pendentes'
                  ? "bg-[#D97706] text-white"
                  : "bg-[#FEF3EB] text-[#8C3A00] hover:bg-[#FDE68A] border border-[#F4B78A]"
              )}
            >
              Pendentes ({stats.pending})
            </button>
            <button
              type="button"
              id="filter-inventory-counted"
              onClick={() => setFilterStatus('contados')}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1",
                filterStatus === 'contados'
                  ? "bg-[#0E7A53] text-white"
                  : "bg-[#E6F4EC] text-[#0B6445] hover:bg-[#C9E7D6] border border-[#0E7A53]/20"
              )}
            >
              Contados ({stats.counted})
            </button>
          </div>
        </div>
      </Card>

      {/* Product Items Table / Cards */}
      <div className="bg-white rounded-2xl border border-[#E1E9E4] shadow-2xs overflow-hidden" id="inventory-items-container">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center text-[#56675E]">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-40 text-[#56675E]" />
            <p className="text-sm font-medium">Nenhum produto encontrado com os filtros atuais.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E1E9E4]">
            {filteredItems.map((item) => {
              const state = localCounts[item.productId] || { quantity: '', isCounted: false };
              const isItemCounted = state.isCounted;
              const numericQty = state.quantity !== '' ? Number(state.quantity) : null;

              return (
                <div
                  key={item.productId}
                  id={`inventory-item-row-${item.productId}`}
                  className={cn(
                    "p-4 md:p-5 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4",
                    isItemCounted
                      ? numericQty === 0
                        ? "bg-[#FEF3EB]/40 hover:bg-[#FEF3EB]/70"
                        : "bg-[#E6F4EC]/30 hover:bg-[#E6F4EC]/60"
                      : "hover:bg-[#F3F7F4]/40"
                  )}
                >
                  {/* Product Info */}
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-[#56675E] bg-[#F3F7F4] border border-[#E1E9E4] px-2 py-0.5 rounded-md">
                        {item.productCode}
                      </span>
                      {item.ean && (
                        <span className="text-xs font-mono text-[#56675E] flex items-center gap-1">
                          <Barcode className="w-3.5 h-3.5" />
                          {item.ean}
                        </span>
                      )}
                      <span className="text-xs font-semibold text-[#56675E] bg-[#F3F7F4] border border-[#E1E9E4] px-2 py-0.5 rounded-md">
                        {item.category}
                      </span>
                    </div>

                    <h3 className="text-sm md:text-base font-bold text-[#13231B] leading-snug">
                      {item.productName}
                    </h3>
                    {item.presentation && (
                      <p className="text-xs text-[#56675E]">{item.presentation}</p>
                    )}
                  </div>

                  {/* Count Controls */}
                  <div className="flex items-center gap-3 sm:self-center">
                    {/* Status Badge */}
                    <div className="hidden md:block text-right min-w-[110px]">
                      {isItemCounted ? (
                        numericQty === 0 ? (
                          <Badge variant="warn" icon={Check}>
                            0 Unidades
                          </Badge>
                        ) : (
                          <Badge variant="ok" icon={Check}>
                            {numericQty} un contadas
                          </Badge>
                        )
                      ) : (
                        <Badge variant="neutral">
                          Pendente
                        </Badge>
                      )}
                    </div>

                    {/* Numeric Stepper and Direct Input */}
                    <div className="flex items-center gap-1.5 bg-[#F3F7F4] p-1.5 rounded-xl border border-[#E1E9E4]">
                      <button
                        type="button"
                        id={`btn-minus-${item.productId}`}
                        disabled={isLockedForCount}
                        onClick={() => handleStepQuantity(item.productId, -1)}
                        className="w-8 h-8 rounded-lg bg-white border border-[#E1E9E4] text-[#13231B] hover:bg-[#E1E9E4]/60 flex items-center justify-center font-bold active:scale-95 disabled:opacity-40 transition-transform cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5 text-[#56675E]" />
                      </button>

                      <input
                        type="number"
                        min="0"
                        id={`input-count-${item.productId}`}
                        disabled={isLockedForCount}
                        placeholder="--"
                        value={state.quantity}
                        onChange={(e) => handleQuantityChange(item.productId, e.target.value)}
                        className="w-16 h-8 text-center bg-white border border-[#E1E9E4] rounded-lg text-sm font-black text-[#13231B] focus:outline-none focus:ring-2 focus:ring-[#0E7A53]/20 focus:border-[#0E7A53] disabled:bg-[#F3F7F4]"
                      />

                      <button
                        type="button"
                        id={`btn-plus-${item.productId}`}
                        disabled={isLockedForCount}
                        onClick={() => handleStepQuantity(item.productId, 1)}
                        className="w-8 h-8 rounded-lg bg-white border border-[#E1E9E4] text-[#13231B] hover:bg-[#E1E9E4]/60 flex items-center justify-center font-bold active:scale-95 disabled:opacity-40 transition-transform cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#56675E]" />
                      </button>
                    </div>

                    {/* Quick 0 button */}
                    {!isLockedForCount && (
                      <button
                        type="button"
                        id={`btn-zero-${item.productId}`}
                        onClick={() => handleSetZero(item.productId)}
                        className="px-2.5 py-1.5 bg-[#F3F7F4] hover:bg-[#FEF3EB] hover:text-[#8C3A00] text-[#56675E] text-xs font-bold rounded-lg border border-[#E1E9E4] transition-colors whitespace-nowrap cursor-pointer"
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
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" id="modal-confirm-inventory-completion">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-[#E1E9E4]">
            <div className="w-12 h-12 rounded-2xl bg-[#E6F4EC] text-[#0E7A53] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-[#13231B]">
                Confirmar Finalização de Contagem
              </h3>
              <p className="text-xs text-[#56675E]">
                Você preencheu a contagem física de todos os <strong>{stats.total}</strong> produtos deste inventário.
              </p>
            </div>

            <div className="bg-[#F3F7F4] p-3.5 rounded-xl text-xs space-y-2 text-[#13231B] border border-[#E1E9E4]">
              <div className="flex justify-between">
                <span>Total de Itens:</span>
                <span className="font-bold">{stats.total} produtos</span>
              </div>
              <div className="flex justify-between">
                <span>Operador:</span>
                <span className="font-bold">{currentUser?.name || 'Operador'}</span>
              </div>
              <p className="text-[#56675E] pt-1.5 border-t border-[#E1E9E4]">
                Após a confirmação, os dados serão travados para conferência da gerência. Nenhuma alteração de estoque é feita automaticamente sem aprovação do administrador.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#13231B] mb-1.5">
                Observações Operacionais:
              </label>
              <textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Ex: Contagem realizada nas prateleiras A1 a B4. Nenhum lote danificado encontrado."
                rows={2}
                className="w-full p-3 text-xs bg-white border border-[#E1E9E4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0E7A53]/20 focus:border-[#0E7A53] outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                id="btn-cancel-completion-modal"
                variant="ghost"
                size="sm"
                disabled={isFinishing}
                onClick={() => setShowConfirmModal(false)}
              >
                Voltar e Revisar
              </Button>
              <Button
                type="button"
                id="btn-confirm-completion-modal"
                variant="primary"
                size="sm"
                disabled={isFinishing}
                loading={isFinishing}
                onClick={handleConfirmCompletion}
                icon={CheckCircle2}
              >
                Confirmar e Enviar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

