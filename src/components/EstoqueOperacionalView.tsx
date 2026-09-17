import React, { useState } from 'react';
import { PurchaseOrder, Product, User, InventoryCount } from '../types';
import { RecebimentoMercadoriaView } from './RecebimentoMercadoriaView';
import { ContagemEstoqueView } from './ContagemEstoqueView';
import { 
  Boxes, 
  Truck, 
  ClipboardCheck, 
  PackageCheck, 
  AlertCircle, 
  Clock, 
  ArrowLeft,
  CalendarDays,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { cn } from '../lib/ui';

export interface EstoqueOperacionalViewProps {
  purchaseOrders: PurchaseOrder[];
  products: Product[];
  currentUser: User;
  inventories: InventoryCount[];
  defaultTab?: 'receber' | 'contagens';
  onReceiveOrder: (
    orderId: string, 
    receivedItems: { productId: string; receivedQuantity: number; damagedQuantity: number }[],
    invoiceNumber?: string,
    notes?: string
  ) => Promise<boolean>;
  onSaveInventoryCount: (inventoryId: string, items: { productId: string; countedQuantity: number }[], notes?: string) => Promise<boolean | void>;
  onCompleteInventoryCount: (inventoryId: string, items: { productId: string; countedQuantity: number }[], notes?: string) => Promise<boolean | void>;
  onGoToBalcao: () => void;
  onRefreshData?: () => void;
}

export const EstoqueOperacionalView: React.FC<EstoqueOperacionalViewProps> = ({
  purchaseOrders,
  products,
  currentUser,
  inventories,
  defaultTab = 'receber',
  onReceiveOrder,
  onSaveInventoryCount,
  onCompleteInventoryCount,
  onGoToBalcao,
  onRefreshData,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'receber' | 'contagens'>(defaultTab);

  // Counters for badges and summary
  const pendingOrders = purchaseOrders.filter(
    (po) => po.status === 'aprovado' || po.status === 'parcialmente_recebido'
  );
  const pendingOrdersCount = pendingOrders.length;

  const openInventories = inventories.filter(
    (i) => i.status === 'aberto' || i.status === 'em_contagem' || i.status === 'reaberto'
  );
  const openInventoriesCount = openInventories.length;

  const lowStockCount = products.filter((p) => p.active && p.currentStock <= p.minStock && p.currentStock > 0).length;
  const outOfStockCount = products.filter((p) => p.active && p.currentStock <= 0).length;

  return (
    <div id="estoque-operacional-view" className="max-w-7xl mx-auto space-y-5 pb-12">
      {/* Module Navigation Header (FarmaVida Style) */}
      <div className="bg-white rounded-2xl border border-[#E1E9E4] shadow-2xs overflow-hidden">
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#13231B] via-[#0E7A53] to-[#0B6445] text-white flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-[#E6F4EC] text-xs font-bold border border-white/20 uppercase tracking-wider">
                Estoque Operacional
              </span>
              <span className="text-xs text-[#E6F4EC]/90 font-medium">
                Conferência Física & Gestão de Loja
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Gestão Operacional de Estoque
            </h1>
            <p className="text-xs sm:text-sm text-[#E6F4EC]/80 mt-0.5 max-w-2xl">
              Conferência física de notas fiscais de fornecedores, recebimento cego auditado e inventários rotativos periódicos da FarmaVida.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="secondary"
              size="md"
              onClick={onGoToBalcao}
              icon={ArrowLeft}
              className="bg-white/10 hover:bg-white/20 border-white/20 text-white"
            >
              Voltar ao Balcão
            </Button>
          </div>
        </div>

        {/* Quick Metric Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#E1E9E4] bg-[#F3F7F4]/60 border-b border-[#E1E9E4]">
          <div className="p-3.5 sm:p-4 text-center">
            <span className="text-xs font-semibold text-[#56675E] block">Pedidos para Receber</span>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <Truck className="w-4 h-4 text-[#0E7A53]" />
              <strong className="text-lg sm:text-xl font-black text-[#13231B]">{pendingOrdersCount}</strong>
            </div>
          </div>
          <div className="p-3.5 sm:p-4 text-center">
            <span className="text-xs font-semibold text-[#56675E] block">Contagens em Aberto</span>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <ClipboardCheck className="w-4 h-4 text-[#0E7A53]" />
              <strong className="text-lg sm:text-xl font-black text-[#13231B]">{openInventoriesCount}</strong>
            </div>
          </div>
          <div className="p-3.5 sm:p-4 text-center">
            <span className="text-xs font-semibold text-[#56675E] block">Itens com Estoque Baixo</span>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <AlertCircle className="w-4 h-4 text-[#D98A0B]" />
              <strong className="text-lg sm:text-xl font-black text-[#8A5300]">{lowStockCount}</strong>
            </div>
          </div>
          <div className="p-3.5 sm:p-4 text-center">
            <span className="text-xs font-semibold text-[#56675E] block">Itens Esgotados (Zero)</span>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <Boxes className="w-4 h-4 text-[#A8261B]" />
              <strong className="text-lg sm:text-xl font-black text-[#A8261B]">{outOfStockCount}</strong>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="bg-white px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              id="tab-receber-mercadoria"
              type="button"
              onClick={() => setActiveSubTab('receber')}
              className={cn(
                "px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer",
                activeSubTab === 'receber'
                  ? "bg-[#0E7A53] text-white shadow-2xs"
                  : "bg-[#F3F7F4] text-[#56675E] hover:bg-[#E1E9E4] hover:text-[#13231B]"
              )}
            >
              <Truck className={cn("w-4 h-4", activeSubTab === 'receber' ? "text-white" : "text-[#0E7A53]")} />
              <span>Receber Mercadoria (Fornecedores)</span>
              {pendingOrdersCount > 0 && (
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-black",
                  activeSubTab === 'receber' ? "bg-white/20 text-white" : "bg-[#0E7A53] text-white"
                )}>
                  {pendingOrdersCount}
                </span>
              )}
            </button>

            <button
              id="tab-contagens-inventario"
              type="button"
              onClick={() => setActiveSubTab('contagens')}
              className={cn(
                "px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer",
                activeSubTab === 'contagens'
                  ? "bg-[#0E7A53] text-white shadow-2xs"
                  : "bg-[#F3F7F4] text-[#56675E] hover:bg-[#E1E9E4] hover:text-[#13231B]"
              )}
            >
              <ClipboardCheck className={cn("w-4 h-4", activeSubTab === 'contagens' ? "text-white" : "text-[#0E7A53]")} />
              <span>Contagens Programadas (Inventário Cego)</span>
              {openInventoriesCount > 0 && (
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-black",
                  activeSubTab === 'contagens' ? "bg-white/20 text-white" : "bg-[#0E7A53] text-white"
                )}>
                  {openInventoriesCount}
                </span>
              )}
            </button>
          </div>

          <div className="text-xs text-[#56675E] hidden md:block font-medium">
            {activeSubTab === 'receber' 
              ? 'Conferência física de notas fiscais autorizadas' 
              : 'Conferência cega para controle e auditoria periódica'}
          </div>
        </div>
      </div>

      {/* Embedded Sub-module */}
      {activeSubTab === 'receber' ? (
        <RecebimentoMercadoriaView
          purchaseOrders={purchaseOrders}
          products={products}
          currentUser={currentUser}
          onReceiveOrder={onReceiveOrder}
          onGoToBalcao={onGoToBalcao}
        />
      ) : (
        <ContagemEstoqueView
          inventories={inventories}
          currentUser={currentUser}
          onSaveCount={onSaveInventoryCount}
          onCompleteCount={onCompleteInventoryCount}
          onGoToBalcao={onGoToBalcao}
          onRefreshData={onRefreshData}
        />
      )}
    </div>
  );
};

