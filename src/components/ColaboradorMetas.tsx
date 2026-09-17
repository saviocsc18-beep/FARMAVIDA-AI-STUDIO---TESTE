import React from 'react';
import { User, Sale, SalesGoal } from '../types';
import { Target, TrendingUp, Award, DollarSign, ShoppingBag, Percent, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatCurrencyBRL } from '../lib/format';

interface ColaboradorMetasProps {
  currentUser: User;
  sales: Sale[];
  salesGoals: SalesGoal[];
  onNavigateToBalcao: () => void;
}

export const ColaboradorMetas: React.FC<ColaboradorMetasProps> = ({
  currentUser,
  sales,
  salesGoals,
  onNavigateToBalcao,
}) => {
  // Filter sales for the current user
  const mySales = sales.filter((s) => s.sellerId === currentUser.id);

  // Find goal for the current user or general store goal
  const myGoal = salesGoals.find((g) => g.userId === currentUser.id) || null;
  const storeGoal = salesGoals.find((g) => !g.userId) || salesGoals[0] || null;

  // Personal metrics
  const totalRevenue = mySales.reduce((acc, s) => acc + s.total, 0);
  const salesCount = mySales.length;
  const avgTicket = salesCount > 0 ? totalRevenue / salesCount : 0;
  const totalDiscounts = mySales.reduce((acc, s) => acc + (s.totalDiscount || 0), 0);
  const discountRate = totalRevenue > 0 ? (totalDiscounts / (totalRevenue + totalDiscounts)) * 100 : 0;

  // Target progress
  const targetAmount = myGoal ? myGoal.targetAmount : 15000;
  const currentAmount = totalRevenue;
  const percentAchieved = targetAmount > 0 ? Math.min(100, (currentAmount / targetAmount) * 100) : 0;
  const remainingAmount = Math.max(0, targetAmount - currentAmount);

  const getTier = (pct: number) => {
    if (pct >= 100) return { label: 'Meta Superada!', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    if (pct >= 75) return { label: 'Reta Final', color: 'bg-blue-100 text-blue-800 border-blue-300' };
    if (pct >= 50) return { label: 'Em Ritmo Firme', color: 'bg-amber-100 text-amber-800 border-amber-300' };
    return { label: 'Início de Ciclo', color: 'bg-neutral-100 text-neutral-800 border-neutral-300' };
  };

  const tier = getTier(percentAchieved);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-800 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-200 text-xs font-semibold uppercase tracking-wider mb-1">
            <Award className="w-4 h-4 text-emerald-300" />
            <span>Painel do Colaborador • FarmaVida</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Minhas Metas & Produtividade: {currentUser.name}
          </h1>
          <p className="text-xs text-emerald-100/90 mt-1 max-w-xl">
            Acompanhe seu desempenho de vendas no balcão, ticket médio pessoal e comissão do ciclo vigente.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateToBalcao}
            className="px-4 py-2.5 bg-white text-emerald-900 font-bold text-xs rounded-xl shadow-xs hover:bg-emerald-50 transition-all flex items-center gap-2"
          >
            <ShoppingBag className="w-4 h-4 text-emerald-700" />
            <span>Ir para Balcão / PDV</span>
          </button>
        </div>
      </div>

      {/* Main Goal Progress Card */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">
                Meta Individual de Vendas do Mês
              </h2>
              <p className="text-xs text-neutral-500">
                Ciclo Atual • Referência: {myGoal ? myGoal.month : 'Mês Atual'}
              </p>
            </div>
          </div>

          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${tier.color}`}>
            {tier.label} ({percentAchieved.toFixed(1)}%)
          </span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-neutral-600">Progresso de Faturamento:</span>
            <span className="text-emerald-800 font-bold">{percentAchieved.toFixed(1)}%</span>
          </div>
          <div className="w-full h-4 bg-neutral-100 rounded-full overflow-hidden p-0.5 border border-neutral-200">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full transition-all duration-500 shadow-xs"
              style={{ width: `${percentAchieved}%` }}
            />
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="bg-neutral-50 rounded-xl p-3.5 border border-neutral-200">
            <span className="text-xs text-neutral-500 block">Realizado até o momento</span>
            <strong className="text-xl font-bold text-emerald-900 block mt-0.5">
              {formatCurrencyBRL(currentAmount)}
            </strong>
            <span className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> {salesCount} vendas efetuadas
            </span>
          </div>

          <div className="bg-neutral-50 rounded-xl p-3.5 border border-neutral-200">
            <span className="text-xs text-neutral-500 block">Meta Estipulada</span>
            <strong className="text-xl font-bold text-neutral-900 block mt-0.5">
              {formatCurrencyBRL(targetAmount)}
            </strong>
            <span className="text-[11px] text-neutral-500 mt-1 block">
              Definida pela gerência da loja
            </span>
          </div>

          <div className="bg-neutral-50 rounded-xl p-3.5 border border-neutral-200">
            <span className="text-xs text-neutral-500 block">Faltando para a Meta</span>
            <strong className="text-xl font-bold text-amber-900 block mt-0.5">
              {remainingAmount > 0 ? formatCurrencyBRL(remainingAmount) : 'Meta Atingida! 🎉'}
            </strong>
            <span className="text-[11px] text-neutral-500 mt-1 block">
              {remainingAmount > 0 ? 'Continue com foco no balcão' : 'Parabéns pela dedicação'}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-1">
            <span>Ticket Médio Pessoal</span>
            <DollarSign className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-bold text-neutral-900">
            {formatCurrencyBRL(avgTicket)}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">
            Valor médio por cliente atendido
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-1">
            <span>Descontos Concedidos</span>
            <Percent className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-2xl font-bold text-neutral-900">
            {formatCurrencyBRL(totalDiscounts)}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">
            Taxa média: <strong className="text-neutral-700">{discountRate.toFixed(1)}%</strong>
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-1">
            <span>Atendimentos Concluídos</span>
            <ShoppingBag className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-bold text-neutral-900">
            {salesCount}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">
            Cupons emitidos no caixa
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-1">
            <span>Meta da Drogaria (Geral)</span>
            <Target className="w-4 h-4 text-teal-700" />
          </div>
          <div className="text-2xl font-bold text-neutral-900">
            R$ {storeGoal ? storeGoal.targetAmount.toFixed(0) : '35.000'}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">
            Objetivo coletivo da matriz
          </p>
        </div>
      </div>

      {/* Recent sales history table for this seller */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-neutral-900">Minhas Vendas Recentes</h3>
            <p className="text-xs text-neutral-500">Histórico dos últimos atendimentos registrados pelo seu usuário</p>
          </div>
          <span className="text-xs font-semibold text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded-lg">
            {mySales.length} registro(s)
          </span>
        </div>

        {mySales.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-neutral-200 rounded-xl space-y-2">
            <ShoppingBag className="w-8 h-8 text-neutral-400 mx-auto" />
            <p className="text-sm font-medium text-neutral-700">Nenhuma venda registrada por você ainda</p>
            <p className="text-xs text-neutral-500">Ao finalizar vendas no PDV, seus lançamentos aparecerão aqui em tempo real.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500 uppercase tracking-wider font-semibold bg-neutral-50/50">
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3">Horário</th>
                  <th className="py-2.5 px-3">Produtos</th>
                  <th className="py-2.5 px-3">Pagamento</th>
                  <th className="py-2.5 px-3 text-right">Desconto</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-neutral-800">
                {mySales.slice(0, 8).map((sale) => (
                  <tr key={sale.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-emerald-900">{sale.code}</td>
                    <td className="py-2.5 px-3 text-neutral-500">
                      {new Date(sale.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-3">
                      {(sale.items || []).length} item(ns)
                    </td>
                    <td className="py-2.5 px-3 capitalize">
                      {(sale.payments || []).map((p) => p.method.replace('_', ' ')).join(' + ')}
                    </td>
                    <td className="py-2.5 px-3 text-right text-amber-900">
                      {sale.totalDiscount > 0 ? formatCurrencyBRL(sale.totalDiscount) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-800">
                      {formatCurrencyBRL(sale.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
