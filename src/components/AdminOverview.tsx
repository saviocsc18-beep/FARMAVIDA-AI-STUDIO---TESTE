import React from 'react';
import { Product, Sale, CashRegister, UnmetDemand, PurchaseOrder, AIReport } from '../types';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Percent, 
  AlertTriangle, 
  Package, 
  Sparkles, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  FileSpreadsheet, 
  Receipt 
} from 'lucide-react';

interface AdminOverviewProps {
  sales: Sale[];
  products: Product[];
  cashRegisters: CashRegister[];
  unmetDemands: UnmetDemand[];
  purchaseOrders: PurchaseOrder[];
  latestAiReport?: AIReport | null;
  onNavigateTab: (tab: string) => void;
  onRunAiAnalysis: () => void;
  isAnalyzing: boolean;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({
  sales,
  products,
  cashRegisters,
  unmetDemands,
  purchaseOrders,
  latestAiReport,
  onNavigateTab,
  onRunAiAnalysis,
  isAnalyzing,
}) => {
  // Financial metrics
  const totalRevenue = sales.reduce((acc, s) => acc + s.total, 0);
  const totalSubtotal = sales.reduce((acc, s) => acc + s.subtotal, 0);
  const totalDiscount = sales.reduce((acc, s) => acc + s.totalDiscount, 0);
  const salesCount = sales.length;
  const averageTicket = salesCount > 0 ? totalRevenue / salesCount : 0;
  const averageDiscountPercent = totalSubtotal > 0 ? (totalDiscount / totalSubtotal) * 100 : 0;

  // Strict margin & cost coverage calculation
  let revenueWithCost = 0;
  let costOfRevenueWithCost = 0;

  for (const s of sales) {
    for (const it of (s.items || [])) {
      if (it.unitCost !== undefined && it.unitCost > 0) {
        revenueWithCost += it.total;
        costOfRevenueWithCost += it.unitCost * it.quantity;
      }
    }
  }

  const costCoveragePercent = totalRevenue > 0 ? (revenueWithCost / totalRevenue) * 100 : 0;
  const grossMarginPercent = revenueWithCost > 0 ? ((revenueWithCost - costOfRevenueWithCost) / revenueWithCost) * 100 : null;

  // Critical stock products
  const criticalProducts = products.filter((p) => p.currentStock <= p.minStock);
  const pendingDemands = unmetDemands.filter((d) => !d.resolved);
  const pendingFiscalSales = sales.filter((s) => s.fiscalStatus === 'pendente_conciliacao');
  const openPurchases = purchaseOrders.filter((p) => p.status === 'rascunho' || p.status === 'aprovado' || p.status === 'parcialmente_recebido');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header with Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Painel Administrativo da Farmácia</h1>
          <p className="text-xs text-neutral-500 mt-1">
            Indicadores gerenciais consolidados, cobertura de margem, alertas de reposição e inteligência com IA.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateTab('admin_import')}
            className="px-3.5 py-2 border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Importar CSV / Planilhas</span>
          </button>

          <button
            onClick={onRunAiAnalysis}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-xs"
          >
            <Sparkles className="w-4 h-4 text-emerald-300" />
            <span>{isAnalyzing ? 'Processando IA...' : 'Gerar Análise com IA'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Receita Gerencial */}
        <div 
          onClick={() => onNavigateTab('admin_sales')}
          className="p-5 rounded-xl bg-white border border-neutral-200 shadow-xs hover:border-emerald-300 cursor-pointer transition-all space-y-2"
        >
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Receita Gerencial</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-neutral-900">
            R$ {totalRevenue.toFixed(2)}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-neutral-500">
            <span>Volume:</span>
            <strong className="text-neutral-800">{salesCount} vendas realizadas</strong>
          </div>
        </div>

        {/* Ticket Médio */}
        <div 
          onClick={() => onNavigateTab('admin_sales')}
          className="p-5 rounded-xl bg-white border border-neutral-200 shadow-xs hover:border-emerald-300 cursor-pointer transition-all space-y-2"
        >
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Ticket Médio</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-neutral-900">
            R$ {averageTicket.toFixed(2)}
          </div>
          <div className="text-[11px] text-neutral-500">
            Média de valor por cupom de atendimento
          </div>
        </div>

        {/* Descontos Concedidos */}
        <div 
          onClick={() => onNavigateTab('admin_staff')}
          className="p-5 rounded-xl bg-white border border-neutral-200 shadow-xs hover:border-emerald-300 cursor-pointer transition-all space-y-2"
        >
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Descontos Concedidos</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-900">
            R$ {totalDiscount.toFixed(2)}
          </div>
          <div className="text-[11px] text-neutral-500">
            Taxa média: <strong className="text-neutral-800">{averageDiscountPercent.toFixed(1)}% do subtotal</strong>
          </div>
        </div>

        {/* Margem Bruta Conhecida com Cobertura Transparente */}
        <div 
          onClick={() => onNavigateTab('admin_stock')}
          className="p-5 rounded-xl bg-white border border-neutral-200 shadow-xs hover:border-emerald-300 cursor-pointer transition-all space-y-2"
        >
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Margem Bruta Conhecida</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-teal-900">
            {grossMarginPercent !== null ? `${grossMarginPercent.toFixed(1)}%` : 'Indisponível'}
          </div>
          <div className="text-[11px] text-neutral-500 leading-tight">
            Cobertura de custo: <strong className="text-neutral-800">{costCoveragePercent.toFixed(1)}%</strong> da receita
            {costCoveragePercent < 100 && (
              <span className="block text-[10px] text-amber-700">Alguns itens sem custo de aquisição</span>
            )}
          </div>
        </div>
      </div>

      {/* Operacional Alerts & Statuses */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Estoque Crítico */}
        <div 
          onClick={() => onNavigateTab('admin_stock')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            criticalProducts.length > 0 
              ? 'bg-amber-50/70 border-amber-200 hover:bg-amber-50' 
              : 'bg-white border-neutral-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-4 h-4 ${criticalProducts.length > 0 ? 'text-amber-700' : 'text-neutral-400'}`} />
              <h3 className="font-bold text-sm text-neutral-900">Estoque Crítico (Abaixo do Mínimo)</h3>
            </div>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              criticalProducts.length > 0 ? 'bg-amber-200 text-amber-900' : 'bg-neutral-100 text-neutral-600'
            }`}>
              {criticalProducts.length} itens
            </span>
          </div>
          <p className="text-xs text-neutral-600 mt-2">
            {criticalProducts.length > 0 
              ? `${criticalProducts.map(p => p.name).slice(0, 2).join(', ')}${criticalProducts.length > 2 ? '...' : ''}` 
              : 'Todos os produtos acima do saldo mínimo de segurança.'}
          </p>
        </div>

        {/* Faltas no Balcão (Demanda Reprimida) */}
        <div 
          onClick={() => onNavigateTab('admin_demands')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            pendingDemands.length > 0 
              ? 'bg-red-50/70 border-red-200 hover:bg-red-50' 
              : 'bg-white border-neutral-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className={`w-4 h-4 ${pendingDemands.length > 0 ? 'text-red-700' : 'text-neutral-400'}`} />
              <h3 className="font-bold text-sm text-neutral-900">Demanda Não Atendida no Balcão</h3>
            </div>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              pendingDemands.length > 0 ? 'bg-red-200 text-red-900' : 'bg-neutral-100 text-neutral-600'
            }`}>
              {pendingDemands.length} procuras
            </span>
          </div>
          <p className="text-xs text-neutral-600 mt-2">
            {pendingDemands.length > 0 
              ? `Clientes procuraram itens sem estoque recentemente. Clique para gerar compra.` 
              : 'Nenhuma falta pendente de reposição.'}
          </p>
        </div>

        {/* Conciliação Fiscal com Emissor Externo */}
        <div 
          onClick={() => onNavigateTab('admin_sales')}
          className="p-4 rounded-xl border border-neutral-200 bg-white hover:border-emerald-300 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-700" />
              <h3 className="font-bold text-sm text-neutral-900">Conciliação Fiscal Satélite</h3>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
              {pendingFiscalSales.length} pendentes
            </span>
          </div>
          <p className="text-xs text-neutral-600 mt-2">
            {pendingFiscalSales.length > 0 
              ? `${pendingFiscalSales.length} vendas registradas aguardando vincular o número de cupom fiscal.` 
              : 'Todas as vendas com documento fiscal externo vinculado.'}
          </p>
        </div>
      </div>

      {/* Latest AI Executive Summary Preview */}
      {latestAiReport && (
        <div className="bg-linear-to-br from-emerald-900 to-teal-950 rounded-xl text-white p-6 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-emerald-800">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-300" />
              <h3 className="font-bold text-base text-white">Último Diagnóstico da Inteligência Artificial</h3>
            </div>
            <span className="text-xs text-emerald-300">
              Gerado em: {new Date(latestAiReport.timestamp).toLocaleString()}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            <div className="space-y-2">
              <h4 className="font-bold text-emerald-200 uppercase tracking-wider text-[11px]">
                Fatos Comprovados pelos Dados:
              </h4>
              <ul className="space-y-1 text-emerald-100 list-disc list-inside">
                {(latestAiReport.facts || []).slice(0, 3).map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-amber-300 uppercase tracking-wider text-[11px]">
                Hipóteses & Pontos de Atenção:
              </h4>
              <ul className="space-y-1 text-amber-100 list-disc list-inside">
                {(latestAiReport.hypotheses || []).slice(0, 2).map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-teal-200 uppercase tracking-wider text-[11px]">
                Recomendações Práticas Sugeridas:
              </h4>
              <ul className="space-y-1 text-emerald-100">
                {(latestAiReport.recommendations || []).slice(0, 2).map((r, i) => (
                  <li key={i} className="bg-emerald-800/60 p-2 rounded border border-emerald-700">
                    <strong className="block text-white font-semibold">{r.title}</strong>
                    <span className="text-emerald-200 text-[11px]">{r.suggestedAction}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => onNavigateTab('admin_ai')}
              className="text-xs font-semibold text-emerald-300 hover:text-white hover:underline flex items-center gap-1"
            >
              <span>Ver relatório completo com evidências e criar tarefas</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
