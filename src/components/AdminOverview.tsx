import React, { useState, useMemo } from 'react';
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
  FileSpreadsheet, 
  Receipt,
  Calendar,
  Filter,
  Check,
  CreditCard,
  Banknote,
  QrCode,
  ArrowRight,
  Clock
} from 'lucide-react';
import { formatCurrencyBRL, formatPercentage } from '../lib/format';

interface AdminOverviewProps {
  sales?: Sale[];
  products?: Product[];
  cashRegisters?: CashRegister[];
  unmetDemands?: UnmetDemand[];
  purchaseOrders?: PurchaseOrder[];
  latestAiReport?: AIReport | null;
  onNavigateTab: (tab: string) => void;
  onRunAiAnalysis: () => void;
  isAnalyzing: boolean;
}

type PeriodOption = 'hoje' | '7dias' | 'mes' | 'personalizado';

export const AdminOverview: React.FC<AdminOverviewProps> = ({
  sales = [],
  products = [],
  cashRegisters = [],
  unmetDemands = [],
  purchaseOrders = [],
  latestAiReport,
  onNavigateTab,
  onRunAiAnalysis,
  isAnalyzing,
}) => {
  const asFiniteNumber = (value: unknown) => {
    const numberValue = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numberValue) ? numberValue : 0;
  };

  // State: Period Filtering
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('mes');
  
  // Format helper for YYYY-MM-DD in local time
  const getLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => getLocalDateString(new Date()), []);
  const firstOfMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  }, []);

  const [customStartDate, setCustomStartDate] = useState<string>(firstOfMonthStr);
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);
  const [appliedCustomRange, setAppliedCustomRange] = useState<{ start: string; end: string }>({
    start: firstOfMonthStr,
    end: todayStr,
  });

  // Calculate Date Bounds for Filtering
  const { startDate, endDate, periodLabel } = useMemo(() => {
    const now = new Date();

    if (selectedPeriod === 'hoje') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return {
        startDate: start,
        endDate: end,
        periodLabel: `Hoje (${now.toLocaleDateString('pt-BR')})`,
      };
    }

    if (selectedPeriod === '7dias') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return {
        startDate: start,
        endDate: end,
        periodLabel: `Últimos 7 dias (${start.toLocaleDateString('pt-BR')} a ${end.toLocaleDateString('pt-BR')})`,
      };
    }

    if (selectedPeriod === 'mes') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      const monthName = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      return {
        startDate: start,
        endDate: end,
        periodLabel: `Mês Atual (${monthName.charAt(0).toUpperCase() + monthName.slice(1)})`,
      };
    }

    // Personalizado
    const [sYear, sMonth, sDay] = appliedCustomRange.start.split('-').map(Number);
    const [eYear, eMonth, eDay] = appliedCustomRange.end.split('-').map(Number);
    const start = new Date(sYear, (sMonth || 1) - 1, sDay || 1, 0, 0, 0, 0);
    const end = new Date(eYear, (eMonth || 1) - 1, eDay || 1, 23, 59, 59, 999);
    return {
      startDate: start,
      endDate: end,
      periodLabel: `Personalizado (${start.toLocaleDateString('pt-BR')} a ${end.toLocaleDateString('pt-BR')})`,
    };
  }, [selectedPeriod, appliedCustomRange]);

  // Filter sales within the active date range
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const saleDate = new Date(s.timestamp);
      return saleDate >= startDate && saleDate <= endDate;
    });
  }, [sales, startDate, endDate]);

  // Period-specific Financial Metrics
  const totalRevenue = useMemo(() => {
    return filteredSales.reduce((acc, s) => acc + asFiniteNumber(s.total), 0);
  }, [filteredSales]);

  const totalSubtotal = useMemo(() => {
    return filteredSales.reduce((acc, s) => acc + asFiniteNumber(s.subtotal), 0);
  }, [filteredSales]);

  const totalDiscount = useMemo(() => {
    return filteredSales.reduce((acc, s) => acc + asFiniteNumber(s.totalDiscount), 0);
  }, [filteredSales]);

  const salesCount = filteredSales.length;
  const averageTicket = salesCount > 0 ? totalRevenue / salesCount : 0;
  const averageDiscountPercent = totalSubtotal > 0 ? (totalDiscount / totalSubtotal) * 100 : 0;

  // Strict margin & cost coverage calculation for the selected period
  const { costCoveragePercent, grossMarginPercent } = useMemo(() => {
    let revenueWithCost = 0;
    let costOfRevenueWithCost = 0;

    for (const s of filteredSales) {
      for (const it of (s.items || [])) {
        const unitCost = asFiniteNumber(it.unitCost);
        if (unitCost > 0) {
          revenueWithCost += asFiniteNumber(it.total);
          costOfRevenueWithCost += unitCost * asFiniteNumber(it.quantity);
        }
      }
    }

    const coverage = totalRevenue > 0 ? (revenueWithCost / totalRevenue) * 100 : 0;
    const margin = revenueWithCost > 0 ? ((revenueWithCost - costOfRevenueWithCost) / revenueWithCost) * 100 : null;

    return {
      costCoveragePercent: coverage,
      grossMarginPercent: margin,
    };
  }, [filteredSales, totalRevenue]);

  // Payment Breakdown in the selected period
  const paymentBreakdown = useMemo(() => {
    let dinheiro = 0;
    let pix = 0;
    let debito = 0;
    let credito = 0;

    for (const s of filteredSales) {
      for (const p of (s.payments || [])) {
        const val = asFiniteNumber(p.amount);
        if (p.method === 'dinheiro') dinheiro += val;
        else if (p.method === 'pix') pix += val;
        else if (p.method === 'cartao_debito') debito += val;
        else if (p.method === 'cartao_credito') credito += val;
      }
    }

    return { dinheiro, pix, debito, credito };
  }, [filteredSales]);

  // Operational statuses
  const criticalProducts = products.filter((p) => p.currentStock <= p.minStock);
  const pendingDemands = unmetDemands.filter((d) => !d.resolved);
  const pendingFiscalSales = filteredSales.filter((s) => s.fiscalStatus === 'pendente_conciliacao');

  const handleApplyCustomPeriod = (e: React.FormEvent) => {
    e.preventDefault();
    if (customStartDate && customEndDate) {
      setAppliedCustomRange({
        start: customStartDate,
        end: customEndDate,
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header with Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Painel Executivo da Farmácia</h1>
          <p className="text-xs text-neutral-500 mt-1">
            Indicadores gerenciais consolidados, cobertura de margem, filtros temporais e inteligência com IA.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-admin-import-csv"
            onClick={() => onNavigateTab('admin_import')}
            className="px-3.5 py-2 border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Importar CSV / Planilhas</span>
          </button>

          <button
            id="btn-admin-run-ai"
            onClick={onRunAiAnalysis}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-emerald-300" />
            <span>{isAnalyzing ? 'Processando IA...' : 'Gerar Análise com IA'}</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros de Período */}
      <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-neutral-700">
            <Filter className="w-4 h-4 text-emerald-700 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-800">
              Filtrar Indicadores por Período:
            </span>
          </div>

          {/* Botões Rápidos de Período */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              id="btn-periodo-hoje"
              type="button"
              onClick={() => setSelectedPeriod('hoje')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                selectedPeriod === 'hoje'
                  ? 'bg-emerald-800 text-white shadow-xs font-bold'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border border-neutral-200'
              }`}
            >
              Hoje
            </button>

            <button
              id="btn-periodo-7dias"
              type="button"
              onClick={() => setSelectedPeriod('7dias')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                selectedPeriod === '7dias'
                  ? 'bg-emerald-800 text-white shadow-xs font-bold'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border border-neutral-200'
              }`}
            >
              Últimos 7 dias
            </button>

            <button
              id="btn-periodo-mes"
              type="button"
              onClick={() => setSelectedPeriod('mes')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                selectedPeriod === 'mes'
                  ? 'bg-emerald-800 text-white shadow-xs font-bold'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border border-neutral-200'
              }`}
            >
              Mês atual
            </button>

            <button
              id="btn-periodo-personalizado"
              type="button"
              onClick={() => setSelectedPeriod('personalizado')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                selectedPeriod === 'personalizado'
                  ? 'bg-emerald-800 text-white shadow-xs font-bold'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border border-neutral-200'
              }`}
            >
              Período personalizado
            </button>
          </div>
        </div>

        {/* Formulário do Período Personalizado */}
        {selectedPeriod === 'personalizado' && (
          <form onSubmit={handleApplyCustomPeriod} className="pt-3 border-t border-neutral-100 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <label htmlFor="custom-start-date" className="font-semibold text-neutral-700">De:</label>
              <input
                id="custom-start-date"
                type="date"
                required
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1.5 bg-neutral-50 border border-neutral-300 rounded-lg text-xs font-medium text-neutral-900 focus:ring-1 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <label htmlFor="custom-end-date" className="font-semibold text-neutral-700">Até:</label>
              <input
                id="custom-end-date"
                type="date"
                required
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1.5 bg-neutral-50 border border-neutral-300 rounded-lg text-xs font-medium text-neutral-900 focus:ring-1 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            <button
              id="btn-aplicar-periodo"
              type="submit"
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Aplicar</span>
            </button>
          </form>
        )}

        {/* Badge do Período Ativo */}
        <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-xs">
          <div className="flex items-center gap-1.5 text-neutral-600">
            <Calendar className="w-3.5 h-3.5 text-emerald-700" />
            <span>Período selecionado:</span>
            <strong className="text-emerald-950 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {periodLabel}
            </strong>
          </div>
          <span className="text-[11px] text-neutral-500">
            {salesCount} venda{salesCount === 1 ? '' : 's'} no período
          </span>
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
          <div className="text-2xl font-bold text-emerald-800 tabular-nums">
            {formatCurrencyBRL(totalRevenue)}
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
          <div className="text-2xl font-bold text-emerald-800 tabular-nums">
            {formatCurrencyBRL(averageTicket)}
          </div>
          <div className="text-[11px] text-neutral-500">
            Média de valor por cupom no período
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
          <div className="text-2xl font-bold text-amber-900 tabular-nums">
            {formatCurrencyBRL(totalDiscount)}
          </div>
          <div className="text-[11px] text-neutral-500">
            Taxa média: <strong className="text-neutral-800">{formatPercentage(averageDiscountPercent)} do subtotal</strong>
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
            {grossMarginPercent !== null ? formatPercentage(grossMarginPercent) : 'Indisponível'}
          </div>
          <div className="text-[11px] text-neutral-500 leading-tight">
            Cobertura de custo: <strong className="text-neutral-800">{formatPercentage(costCoveragePercent)}</strong> da receita
            {costCoveragePercent < 100 && costCoveragePercent > 0 && (
              <span className="block text-[10px] text-amber-700">Alguns itens sem custo de aquisição</span>
            )}
          </div>
        </div>
      </div>

      {/* Meios de Pagamento no Período Selecionado */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-neutral-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-emerald-700" />
            <span>Faturamento por Meio de Pagamento no Período</span>
          </h3>
          <span className="text-[11px] text-neutral-500">
            Total liquidado: <strong className="text-neutral-800">{formatCurrencyBRL(totalRevenue)}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50">
            <div className="flex items-center gap-1.5 text-emerald-800 font-semibold mb-1">
              <Banknote className="w-3.5 h-3.5" />
              <span>Dinheiro</span>
            </div>
            <div className="text-base font-bold text-emerald-950">
              {formatCurrencyBRL(paymentBreakdown.dinheiro)}
            </div>
            <span className="text-[10px] text-emerald-700 block mt-0.5">
              {totalRevenue > 0 ? formatPercentage((paymentBreakdown.dinheiro / totalRevenue) * 100) : '0%'} do total
            </span>
          </div>

          <div className="p-3 rounded-lg border border-teal-200 bg-teal-50/50">
            <div className="flex items-center gap-1.5 text-teal-800 font-semibold mb-1">
              <QrCode className="w-3.5 h-3.5" />
              <span>Pix</span>
            </div>
            <div className="text-base font-bold text-teal-950">
              {formatCurrencyBRL(paymentBreakdown.pix)}
            </div>
            <span className="text-[10px] text-teal-700 block mt-0.5">
              {totalRevenue > 0 ? formatPercentage((paymentBreakdown.pix / totalRevenue) * 100) : '0%'} do total
            </span>
          </div>

          <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/50">
            <div className="flex items-center gap-1.5 text-blue-800 font-semibold mb-1">
              <CreditCard className="w-3.5 h-3.5" />
              <span>Cartão Débito</span>
            </div>
            <div className="text-base font-bold text-blue-950">
              {formatCurrencyBRL(paymentBreakdown.debito)}
            </div>
            <span className="text-[10px] text-blue-700 block mt-0.5">
              {totalRevenue > 0 ? formatPercentage((paymentBreakdown.debito / totalRevenue) * 100) : '0%'} do total
            </span>
          </div>

          <div className="p-3 rounded-lg border border-purple-200 bg-purple-50/50">
            <div className="flex items-center gap-1.5 text-purple-800 font-semibold mb-1">
              <CreditCard className="w-3.5 h-3.5" />
              <span>Cartão Crédito</span>
            </div>
            <div className="text-base font-bold text-purple-950">
              {formatCurrencyBRL(paymentBreakdown.credito)}
            </div>
            <span className="text-[10px] text-purple-700 block mt-0.5">
              {totalRevenue > 0 ? formatPercentage((paymentBreakdown.credito / totalRevenue) * 100) : '0%'} do total
            </span>
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
              <h3 className="font-bold text-sm text-neutral-900">Conciliação Fiscal no Período</h3>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
              {pendingFiscalSales.length} pendentes
            </span>
          </div>
          <p className="text-xs text-neutral-600 mt-2">
            {pendingFiscalSales.length > 0 
              ? `${pendingFiscalSales.length} vendas no período aguardando vincular o número de cupom fiscal.` 
              : 'Todas as vendas do período estão conciliadas.'}
          </p>
        </div>
      </div>

      {/* Vendas Recentes no Período Selecionado */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-neutral-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-700" />
              <span>Vendas Registradas no Período ({filteredSales.length})</span>
            </h3>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Lista de atendimentos realizados dentro do filtro selecionado ({periodLabel}).
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('admin_sales')}
            className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
          >
            <span>Ver Histórico Completo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-100 text-neutral-600 font-semibold border-b border-neutral-200">
              <tr>
                <th className="py-2.5 px-4">Código</th>
                <th className="py-2.5 px-4">Data / Hora</th>
                <th className="py-2.5 px-4">Vendedor / Operador</th>
                <th className="py-2.5 px-4">Cliente</th>
                <th className="py-2.5 px-4 text-right">Itens</th>
                <th className="py-2.5 px-4 text-right">Desconto</th>
                <th className="py-2.5 px-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-neutral-800">
              {filteredSales.slice(0, 8).map((sale) => (
                <tr key={sale.id} className="hover:bg-neutral-50">
                  <td className="py-2.5 px-4 font-bold text-neutral-900">{sale.code || sale.id.slice(0, 8)}</td>
                  <td className="py-2.5 px-4 text-neutral-600">
                    {new Date(sale.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="py-2.5 px-4 font-medium">{sale.sellerName || sale.operatorName || 'Balcão'}</td>
                  <td className="py-2.5 px-4 text-neutral-600">{sale.customerName || 'Consumidor Geral'}</td>
                  <td className="py-2.5 px-4 text-right font-medium">{(sale.items || []).length}</td>
                  <td className="py-2.5 px-4 text-right text-neutral-600">{formatCurrencyBRL(sale.totalDiscount || 0)}</td>
                  <td className="py-2.5 px-4 text-right font-bold text-emerald-950">{formatCurrencyBRL(sale.total)}</td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-neutral-400 space-y-1">
                    <p className="font-semibold text-neutral-600 text-sm">Nenhuma venda registrada no período selecionado.</p>
                    <p className="text-xs text-neutral-400">Altere o filtro de período acima para visualizar outros atendimentos.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
              className="text-xs font-semibold text-emerald-300 hover:text-white hover:underline flex items-center gap-1 cursor-pointer"
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
