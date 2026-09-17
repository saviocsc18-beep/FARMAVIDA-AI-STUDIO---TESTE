import React, { useState } from 'react';
import { User, ApprovalRequest, ApprovalType } from '../types';
import { 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  User as UserIcon, 
  DollarSign, 
  Filter, 
  Search, 
  AlertCircle,
  TrendingDown,
  RefreshCw,
  Check,
  X,
  Plus,
  Zap,
  ArrowRight,
  Package,
  Receipt,
  FileCheck2,
  Tag
} from 'lucide-react';

interface AdminApprovalsProps {
  currentUser: User;
  approvals: ApprovalRequest[];
  onRefresh: () => void;
}

const TYPE_LABELS: Record<ApprovalType, { label: string; color: string; description: string }> = {
  desconto_excedente: { 
    label: 'Desconto Acima do Teto', 
    color: 'bg-amber-100 text-amber-800 border-amber-300',
    description: 'Libera concessão de desconto comercial superior ao teto configurado para o PDV.'
  },
  troca_preco: { 
    label: 'Alteração Manual de Preço', 
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'Atualiza o preço de venda do produto no catálogo e registra histórico.'
  },
  venda_cancelamento: { 
    label: 'Cancelamento de Venda', 
    color: 'bg-red-100 text-red-800 border-red-300',
    description: 'Cancela a venda, reverte os saldos financeiros e estorna 100% dos produtos ao estoque.'
  },
  venda_modificacao: { 
    label: 'Modificação de Venda', 
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    description: 'Autoriza retificação nos dados ou parcelas de uma venda realizada.'
  },
  ajuste_estoque: { 
    label: 'Ajuste Manual de Estoque', 
    color: 'bg-orange-100 text-orange-800 border-orange-300',
    description: 'Ajusta a quantidade física do produto e gera movimentação de Kardex.'
  },
  hora_extra: { 
    label: 'Hora Extra Solicitada', 
    color: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    description: 'Homologa prorrogação de jornada ou hora extra para o colaborador.'
  },
  troca_turno: { 
    label: 'Troca de Turno', 
    color: 'bg-teal-100 text-teal-800 border-teal-300',
    description: 'Valida alteração na escala de trabalho entre operadores.'
  },
  sangria_excepcional: { 
    label: 'Sangria Excepcional', 
    color: 'bg-rose-100 text-rose-800 border-rose-300',
    description: 'Autoriza retirada extraordinária de numerário do caixa em operação.'
  },
};

export const AdminApprovals: React.FC<AdminApprovalsProps> = ({
  currentUser,
  approvals,
  onRefresh,
}) => {
  const [filterStatus, setFilterStatus] = useState<'todos' | 'pendente' | 'aprovado' | 'rejeitado'>('pendente');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionType, setActionType] = useState<'aprovado' | 'rejeitado' | null>(null);

  // New Request Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newType, setNewType] = useState<ApprovalType>('ajuste_estoque');
  const [newTitle, setNewTitle] = useState('');
  const [newReason, setNewReason] = useState('');
  const [newPrevValue, setNewPrevValue] = useState('');
  const [newNextValue, setNewNextValue] = useState('');
  const [newFinancialImpact, setNewFinancialImpact] = useState('');
  const [newRelatedId, setNewRelatedId] = useState('');
  const [createError, setCreateError] = useState('');

  const filteredApprovals = approvals.filter((appr) => {
    if (filterStatus !== 'todos' && appr.status !== filterStatus) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchTitle = appr.title.toLowerCase().includes(term);
      const matchUser = appr.requestedByUserName.toLowerCase().includes(term);
      const matchReason = appr.reason.toLowerCase().includes(term);
      const matchDetails = (appr.effectDetails || '').toLowerCase().includes(term);
      if (!matchTitle && !matchUser && !matchReason && !matchDetails) return false;
    }
    return true;
  });

  const pendingCount = approvals.filter((a) => a.status === 'pendente').length;

  const handleReview = async (id: string, status: 'aprovado' | 'rejeitado') => {
    if (status === 'rejeitado' && !reviewNotes.trim()) {
      alert('Por favor, informe a justificativa da rejeição para registro no log de auditoria.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/approvals/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          reviewedByUserId: currentUser.id,
          reviewedByUserName: currentUser.name,
          reviewNotes: reviewNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao processar aprovação.');
      }

      setSelectedApproval(null);
      setActionType(null);
      setReviewNotes('');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro de comunicação ao salvar revisão.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    if (!newTitle.trim()) {
      setCreateError('Título da solicitação é obrigatório.');
      return;
    }
    if (!newReason.trim()) {
      setCreateError('Justificativa por escrito é obrigatória.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: newType,
          title: newTitle.trim(),
          reason: newReason.trim(),
          requestedByUserId: currentUser.id,
          requestedByUserName: currentUser.name,
          previousValue: newPrevValue.trim() || undefined,
          newValue: newNextValue.trim() || undefined,
          financialImpact: Number(newFinancialImpact) || 0,
          relatedEntityId: newRelatedId.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao criar solicitação.');
      }

      setIsCreateModalOpen(false);
      setNewTitle('');
      setNewReason('');
      setNewPrevValue('');
      setNewNextValue('');
      setNewFinancialImpact('');
      setNewRelatedId('');
      onRefresh();
    } catch (err: any) {
      setCreateError(err.message || 'Erro ao salvar solicitação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-neutral-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-neutral-900">
                Central de Aprovações & Alçadas
              </h2>
              {pendingCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white animate-pulse">
                  {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-sm text-neutral-600 mt-1">
              Governança gerencial com efeitos operacionais atômicos: descontos extraordinários, cancelamentos de venda, ajustes de estoque e trocas de preço.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Solicitação</span>
          </button>
          <button
            onClick={onRefresh}
            className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-neutral-600" />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-xl border border-neutral-200 shadow-xs">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterStatus('pendente')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterStatus === 'pendente'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            Pendentes ({pendingCount})
          </button>
          <button
            onClick={() => setFilterStatus('aprovado')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterStatus === 'aprovado'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            Aprovadas
          </button>
          <button
            onClick={() => setFilterStatus('rejeitado')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterStatus === 'rejeitado'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            Rejeitadas
          </button>
          <button
            onClick={() => setFilterStatus('todos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterStatus === 'todos'
                ? 'bg-neutral-800 text-white shadow-xs'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            Todas ({approvals.length})
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por colaborador ou motivo..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
          />
        </div>
      </div>

      {/* Approvals Grid / Cards */}
      {filteredApprovals.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-neutral-200">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-neutral-800">
            Nenhuma solicitação encontrada
          </h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
            {filterStatus === 'pendente'
              ? 'Excelente! Não há solicitações pendentes de revisão gerencial no momento.'
              : 'Nenhum registro corresponde aos filtros selecionados.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredApprovals.map((appr) => {
            const typeConfig = TYPE_LABELS[appr.type] || {
              label: appr.type,
              color: 'bg-neutral-100 text-neutral-800 border-neutral-300',
              description: 'Solicitação operacional.',
            };

            const isPending = appr.status === 'pendente';
            const isApproved = appr.status === 'aprovado';
            const isRejected = appr.status === 'rejeitado';

            return (
              <div
                key={appr.id}
                className={`bg-white rounded-2xl border p-5 transition-all shadow-xs ${
                  isPending
                    ? 'border-amber-300/80 hover:border-amber-400'
                    : 'border-neutral-200'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${typeConfig.color}`}>
                        {typeConfig.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isPending
                          ? 'bg-amber-100 text-amber-800'
                          : isApproved
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {appr.status}
                      </span>

                      {/* Operational Effect Badge */}
                      {isApproved && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                          appr.effectStatus === 'APPLIED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : appr.effectStatus === 'FAILED'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-neutral-100 text-neutral-600'
                        }`}>
                          <Zap className="w-3 h-3" />
                          {appr.effectStatus === 'APPLIED' ? 'Efeito Aplicado no Sistema' : appr.effectStatus === 'FAILED' ? 'Falha no Efeito' : 'Efeito Pendente'}
                        </span>
                      )}

                      <span className="text-xs text-neutral-400">
                        • {new Date(appr.createdAt).toLocaleString('pt-BR')}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-neutral-900">
                      {appr.title}
                    </h3>
                  </div>

                  {/* Financial Impact Tag */}
                  {appr.financialImpact !== undefined && (
                    <div className="flex items-center gap-2 bg-neutral-50 px-3 py-1.5 rounded-xl border border-neutral-200/80 self-start lg:self-center">
                      <DollarSign className="w-4 h-4 text-emerald-700" />
                      <div className="text-left">
                        <span className="text-[10px] text-neutral-500 block uppercase">Impacto Financeiro</span>
                        <span className="text-xs font-bold text-neutral-900">
                          R$ {appr.financialImpact.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Body Details */}
                <div className="py-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs text-neutral-700">
                  {/* Requester */}
                  <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200/60">
                    <span className="text-[10px] text-neutral-500 font-semibold block uppercase mb-1 flex items-center gap-1">
                      <UserIcon className="w-3 h-3 text-neutral-400" />
                      Solicitado por
                    </span>
                    <p className="font-bold text-neutral-900">
                      {appr.requestedByUserName}
                    </p>
                  </div>

                  {/* Values comparison */}
                  <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200/60">
                    <span className="text-[10px] text-neutral-500 font-semibold block uppercase mb-1">
                      Alteração Proposta
                    </span>
                    <div className="flex items-center gap-2 font-medium">
                      <span className="text-neutral-500 line-through">
                        {appr.previousValue !== undefined ? String(appr.previousValue) : 'Atual'}
                      </span>
                      <span className="text-neutral-400">➔</span>
                      <span className="font-bold text-emerald-800">
                        {appr.newValue !== undefined ? String(appr.newValue) : 'Solicitado'}
                      </span>
                    </div>
                  </div>

                  {/* Reason / Justification */}
                  <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200/60 sm:col-span-2 lg:col-span-1">
                    <span className="text-[10px] text-neutral-500 font-semibold block uppercase mb-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-amber-500" />
                      Justificativa do Solicitante
                    </span>
                    <p className="text-neutral-800 italic">
                      "{appr.reason}"
                    </p>
                  </div>
                </div>

                {/* Operational Effect Details / Audit Resolution */}
                {(appr.effectDetails || appr.reviewedAt) && (
                  <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200/80 text-xs mb-3 space-y-1">
                    <div className="flex items-center gap-2 text-emerald-900 font-semibold">
                      <FileCheck2 className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>
                        Revisado por {appr.reviewedByUserName} em {new Date(appr.reviewedAt || appr.createdAt).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    {appr.effectDetails && (
                      <p className="text-emerald-800 font-medium pl-6">
                        {appr.effectDetails}
                      </p>
                    )}
                    {appr.reviewNotes && (
                      <p className="text-neutral-600 pl-6 italic">
                        Observação da gerência: {appr.reviewNotes}
                      </p>
                    )}
                  </div>
                )}

                {/* Actions Footer (for pending items) */}
                {isPending && (
                  <div className="pt-3 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-[11px] text-neutral-500 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-600" />
                      <span>{typeConfig.description}</span>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={() => {
                          setSelectedApproval(appr);
                          setActionType('rejeitado');
                          setReviewNotes('');
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-red-600 hover:bg-red-50 border border-red-200 transition-colors flex items-center gap-1.5"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Rejeitar</span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedApproval(appr);
                          setActionType('aprovado');
                          setReviewNotes('');
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition-colors flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Aprovar & Aplicar Efeito</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      {selectedApproval && actionType && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setSelectedApproval(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-md overflow-hidden p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                actionType === 'aprovado' 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'bg-red-100 text-red-600'
              }`}>
                {actionType === 'aprovado' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  {actionType === 'aprovado' ? 'Aprovar e Executar Efeito' : 'Rejeitar Solicitação'}
                </h3>
                <p className="text-xs text-neutral-500">
                  {selectedApproval.title}
                </p>
              </div>
            </div>

            {actionType === 'aprovado' && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                <Zap className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Aviso Operacional:</strong> A aprovação acionará a transação atômica em tempo real (estorno de estoque, atualização de preço ou liquidação financeira).
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-700 block">
                {actionType === 'rejeitado' ? 'Motivo da Rejeição (Obrigatório)' : 'Observação da Gerência (Opcional)'}
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder={
                  actionType === 'rejeitado'
                    ? 'Descreva a razão da recusa para o colaborador...'
                    : 'Observações que ficarão gravadas no log de auditoria...'
                }
                rows={3}
                className="w-full p-2.5 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedApproval(null)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleReview(selectedApproval.id, actionType)}
                disabled={isSubmitting}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-colors shadow-xs ${
                  actionType === 'aprovado'
                    ? 'bg-emerald-700 hover:bg-emerald-800'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isSubmitting ? 'Salvando...' : actionType === 'aprovado' ? 'Confirmar Aprovação' : 'Confirmar Rejeição'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Request Modal */}
      {isCreateModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-lg overflow-hidden p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900">
                    Nova Solicitação de Alçada
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Submeta uma requisição para validação administrativa
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateRequest} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Tipo de Alçada / Exceção
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as ApprovalType)}
                  className="w-full p-2.5 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                >
                  <option value="ajuste_estoque">Ajuste Manual de Estoque</option>
                  <option value="troca_preco">Alteração Manual de Preço</option>
                  <option value="desconto_excedente">Desconto Comercial Acima do Teto</option>
                  <option value="venda_cancelamento">Cancelamento de Venda</option>
                  <option value="sangria_excepcional">Sangria Excepcional de Caixa</option>
                  <option value="hora_extra">Hora Extra / Prorrogação de Turno</option>
                  <option value="troca_turno">Troca de Turno</option>
                  <option value="venda_modificacao">Modificação de Venda</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Título da Solicitação *
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Ajuste de estoque do Dipirona 500mg por quebra"
                  className="w-full p-2.5 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Valor / Saldo Anterior
                  </label>
                  <input
                    type="text"
                    value={newPrevValue}
                    onChange={(e) => setNewPrevValue(e.target.value)}
                    placeholder="Ex: 10 ou R$ 15,90"
                    className="w-full p-2.5 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Novo Valor / Saldo Proposto
                  </label>
                  <input
                    type="text"
                    value={newNextValue}
                    onChange={(e) => setNewNextValue(e.target.value)}
                    placeholder="Ex: 8 ou R$ 13,50"
                    className="w-full p-2.5 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Impacto Financeiro Estimado (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newFinancialImpact}
                    onChange={(e) => setNewFinancialImpact(e.target.value)}
                    placeholder="0.00"
                    className="w-full p-2.5 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    ID / Código de Referência (Opcional)
                  </label>
                  <input
                    type="text"
                    value={newRelatedId}
                    onChange={(e) => setNewRelatedId(e.target.value)}
                    placeholder="Ex: prod_001 ou VDA-2026-0001"
                    className="w-full p-2.5 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Justificativa Operacional por Escrito *
                </label>
                <textarea
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  placeholder="Explique com detalhes a motivação da solicitação para apreciação da gerência..."
                  rows={3}
                  className="w-full p-2.5 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition-colors shadow-xs"
                >
                  {isSubmitting ? 'Enviando...' : 'Submeter Solicitação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
