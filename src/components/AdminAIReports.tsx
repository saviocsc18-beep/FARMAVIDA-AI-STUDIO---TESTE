import React, { useState } from 'react';
import { AIReport, User } from '../types';
import { 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  ListChecks, 
  Plus, 
  ArrowRight, 
  Clock, 
  Calendar 
} from 'lucide-react';

interface AdminAIReportsProps {
  reports: AIReport[];
  currentUser: User;
  isAnalyzing: boolean;
  onRunAiAnalysis: () => Promise<void>;
  onCreateTaskFromRecommendation: (title: string, description: string, priority: 'alta' | 'media' | 'baixa') => Promise<boolean>;
}

export const AdminAIReports: React.FC<AdminAIReportsProps> = ({
  reports,
  currentUser,
  isAnalyzing,
  onRunAiAnalysis,
  onCreateTaskFromRecommendation,
}) => {
  const [selectedReportId, setSelectedReportId] = useState<string>(reports[0]?.id || '');
  const [convertedTasks, setConvertedTasks] = useState<Record<string, boolean>>({});

  const activeReport = reports.find((r) => r.id === selectedReportId) || reports[0];

  const handleConvert = async (title: string, action: string, priority: 'alta' | 'media' | 'baixa', key: string) => {
    const success = await onCreateTaskFromRecommendation(
      `[IA FarmaVida] ${title}`,
      `Ação sugerida pelo relatório: ${action}`,
      priority
    );
    if (success) {
      setConvertedTasks((prev) => ({ ...prev, [key]: true }));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-emerald-700" />
            <span>Diagnósticos com Inteligência Artificial</span>
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Análises estruturadas com separação formal entre fatos comprovados, hipóteses, limitações e recomendações práticas.
          </p>
        </div>

        <button
          onClick={onRunAiAnalysis}
          disabled={isAnalyzing}
          className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-xs disabled:bg-neutral-400"
        >
          <Sparkles className={`w-4 h-4 text-emerald-300 ${isAnalyzing ? 'animate-spin' : ''}`} />
          <span>{isAnalyzing ? 'Gerando Análise com Gemini...' : 'Gerar Novo Diagnóstico'}</span>
        </button>
      </div>

      {activeReport ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Report Details */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-neutral-200">
                <div>
                  <h2 className="text-lg font-bold text-neutral-900">{activeReport.title}</h2>
                  <span className="text-xs text-neutral-500">
                    Gerado em: {new Date(activeReport.timestamp).toLocaleString()} • Escopo: {activeReport.period}
                  </span>
                </div>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-semibold text-xs rounded-full">
                  FarmaVida AI Diagnostic
                </span>
              </div>

              {/* 1. FATOS (Evidências Inegáveis) */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <h3>1. Fatos Comprovados pelos Dados da Farmácia</h3>
                </div>
                <p className="text-xs text-neutral-500">
                  Valores matemáticos e registros inquestionáveis extraídos do banco de dados:
                </p>
                <div className="space-y-2">
                  {(activeReport.facts || []).map((fact, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs text-emerald-950 flex items-start gap-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                      <span>{fact}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. HIPÓTESES (Possíveis Causas) */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                  <HelpCircle className="w-4 h-4 text-amber-600" />
                  <h3>2. Hipóteses & Interpretações Operacionais</h3>
                </div>
                <p className="text-xs text-neutral-500">
                  Possíveis causas operacionais e de mercado para o comportamento observado:
                </p>
                <div className="space-y-2">
                  {(activeReport.hypotheses || []).map((hyp, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg text-xs text-amber-950 flex items-start gap-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-1.5 shrink-0" />
                      <span>{hyp}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. LIMITAÇÕES DOS DADOS */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-neutral-800 font-bold text-sm">
                  <AlertCircle className="w-4 h-4 text-neutral-500" />
                  <h3>3. Limitações de Dados & Riscos de Interpretação</h3>
                </div>
                <p className="text-xs text-neutral-500">
                  Informações incompletas ou premissas que requerem atenção:
                </p>
                <div className="space-y-2">
                  {(activeReport.dataLimitations || activeReport.limitations || []).map((lim, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-neutral-100 border border-neutral-200 rounded-lg text-xs text-neutral-800 flex items-start gap-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-neutral-500 mt-1.5 shrink-0" />
                      <span>{lim}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. RECOMENDAÇÕES PRÁTICAS */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-teal-900 font-bold text-sm">
                  <ListChecks className="w-4 h-4 text-teal-700" />
                  <h3>4. Recomendações Práticas e Ações Propostas</h3>
                </div>
                <p className="text-xs text-neutral-500">
                  Providências sugeridas pela IA com botão direto para converter em tarefa da equipe:
                </p>
                <div className="space-y-3">
                  {(activeReport.recommendations || []).map((rec, idx) => {
                    const recKey = `${activeReport.id}_rec_${idx}`;
                    const isConverted = convertedTasks[recKey];

                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-neutral-200 bg-white shadow-xs space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-bold text-neutral-900 text-sm">{rec.title}</div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            rec.priority === 'alta' 
                              ? 'bg-red-100 text-red-800' 
                              : rec.priority === 'media' 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            Prioridade {rec.priority}
                          </span>
                        </div>

                        <p className="text-xs text-neutral-600">
                          {rec.suggestedAction}
                        </p>

                        <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-xs">
                          <span className="text-[11px] text-neutral-500">
                            Impacto Esperado: <strong className="text-neutral-700">{rec.expectedImpact}</strong>
                          </span>

                          <button
                            onClick={() => handleConvert(rec.title, rec.suggestedAction, rec.priority, recKey)}
                            disabled={isConverted}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                              isConverted
                                ? 'bg-emerald-100 text-emerald-800 cursor-default'
                                : 'bg-emerald-700 text-white hover:bg-emerald-800 shadow-xs'
                            }`}
                          >
                            {isConverted ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Tarefa Criada!</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                <span>Transformar em Tarefa</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Right sidebar: Report History */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-xs space-y-3">
              <h3 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-700" />
                <span>Histórico de Relatórios Gerados</span>
              </h3>
              <p className="text-xs text-neutral-500">
                Selecione relatórios anteriores para comparar diagnósticos.
              </p>

              <div className="space-y-2">
                {reports.map((rep) => (
                  <button
                    key={rep.id}
                    onClick={() => setSelectedReportId(rep.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedReportId === rep.id
                        ? 'bg-emerald-50 border-emerald-400 shadow-xs'
                        : 'bg-neutral-50 border-neutral-200 hover:bg-white'
                    }`}
                  >
                    <div className="font-semibold text-neutral-900 text-xs line-clamp-1">
                      {rep.title}
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">
                      {new Date(rep.timestamp).toLocaleDateString()} às{' '}
                      {new Date(rep.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-xl border border-neutral-200 shadow-xs space-y-3">
          <Sparkles className="w-10 h-10 text-emerald-600 mx-auto" />
          <h3 className="text-base font-bold text-neutral-900">Nenhum Relatório Gerado Ainda</h3>
          <p className="text-xs text-neutral-500 max-w-md mx-auto">
            Clique no botão acima para acionar a inteligência artificial Gemini e processar os dados de vendas, estoque e equipe da sua farmácia.
          </p>
        </div>
      )}
    </div>
  );
};
