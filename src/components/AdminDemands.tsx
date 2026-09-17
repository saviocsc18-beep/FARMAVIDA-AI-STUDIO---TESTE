import React, { useState } from 'react';
import { UnmetDemand, User } from '../types';
import { Sparkles, CheckCircle2, Clock, Package, AlertCircle, ArrowUpRight } from 'lucide-react';

interface AdminDemandsProps {
  unmetDemands: UnmetDemand[];
  currentUser: User;
  onResolveDemand: (demandId: string) => Promise<boolean>;
  onNavigateToPurchases: () => void;
}

export const AdminDemands: React.FC<AdminDemandsProps> = ({
  unmetDemands,
  currentUser,
  onResolveDemand,
  onNavigateToPurchases,
}) => {
  const [filter, setFilter] = useState<'todos' | 'pendentes' | 'resolvidos'>('pendentes');

  const filteredDemands = unmetDemands.filter((d) => {
    if (filter === 'pendentes') return !d.resolved;
    if (filter === 'resolvidos') return d.resolved;
    return true;
  });

  const pendingCount = unmetDemands.filter((d) => !d.resolved).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-emerald-700" />
            <span>Produtos Procurados & Faltas de Balcão</span>
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Registro em tempo real da demanda reprimida: o que os clientes solicitaram que a farmácia não tinha.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateToPurchases}
            className="px-4 py-2 bg-emerald-800 text-white font-bold text-xs rounded-lg hover:bg-emerald-900 transition-colors shadow-xs flex items-center gap-1.5"
          >
            <span>Gerar Reposição em Compras</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-neutral-500 font-medium">Visualizar:</span>
        <div className="flex rounded-lg border border-neutral-200 p-0.5 bg-neutral-50">
          <button
            onClick={() => setFilter('pendentes')}
            className={`px-3 py-1 rounded-md transition-colors ${
              filter === 'pendentes' ? 'bg-white font-bold text-red-800 shadow-xs' : 'text-neutral-600'
            }`}
          >
            Pendentes ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('resolvidos')}
            className={`px-3 py-1 rounded-md transition-colors ${
              filter === 'resolvidos' ? 'bg-white font-bold text-emerald-800 shadow-xs' : 'text-neutral-600'
            }`}
          >
            Resolvidos / Comprados
          </button>
          <button
            onClick={() => setFilter('todos')}
            className={`px-3 py-1 rounded-md transition-colors ${
              filter === 'todos' ? 'bg-white font-bold text-neutral-900 shadow-xs' : 'text-neutral-600'
            }`}
          >
            Todos ({unmetDemands.length})
          </button>
        </div>
      </div>

      {/* Demands Table */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-100 text-neutral-600 font-semibold border-b border-neutral-200">
              <tr>
                <th className="py-3 px-4">Data/Hora</th>
                <th className="py-3 px-4">Produto / Medicamento</th>
                <th className="py-3 px-4 text-center">Qtd Solicitada</th>
                <th className="py-3 px-4">Motivo Apontado</th>
                <th className="py-3 px-4">Atendente do Balcão</th>
                <th className="py-3 px-4">Observações</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-neutral-800">
              {filteredDemands.map((demand) => (
                <tr key={demand.id} className="hover:bg-neutral-50">
                  <td className="py-3 px-4 text-neutral-500 whitespace-nowrap">
                    {new Date(demand.timestamp).toLocaleDateString()}{' '}
                    {new Date(demand.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>

                  <td className="py-3 px-4 font-bold text-neutral-900">
                    {demand.productName}
                  </td>

                  <td className="py-3 px-4 text-center font-semibold text-emerald-800">
                    {demand.quantityRequested} un
                  </td>

                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      demand.reason === 'falta_estoque'
                        ? 'bg-red-50 text-red-800 border border-red-200'
                        : demand.reason === 'produto_nao_trabalhado'
                        ? 'bg-purple-50 text-purple-800 border border-purple-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {demand.reason === 'falta_estoque'
                        ? 'Falta de Estoque'
                        : demand.reason === 'produto_nao_trabalhado'
                        ? 'Não Trabalhado'
                        : demand.reason === 'preco_alto'
                        ? 'Preço Alto'
                        : 'Outro'}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-neutral-700">
                    {demand.attendantName}
                  </td>

                  <td className="py-3 px-4 text-neutral-500 max-w-xs truncate">
                    {demand.notes || '-'}
                  </td>

                  <td className="py-3 px-4 text-right">
                    {!demand.resolved ? (
                      <button
                        onClick={() => onResolveDemand(demand.id)}
                        className="px-2.5 py-1 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-semibold rounded text-[11px] border border-emerald-200 transition-colors"
                      >
                        Marcar Atendido
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Resolvido</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}

              {filteredDemands.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-neutral-400">
                    Nenhum registro de falta encontrado para o filtro selecionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
