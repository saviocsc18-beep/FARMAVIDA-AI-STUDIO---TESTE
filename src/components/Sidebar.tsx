import React, { useState } from 'react';
import { User, CashRegister } from '../types';
import { 
  ShoppingBag, 
  Target, 
  LayoutDashboard, 
  Receipt, 
  Wallet, 
  Boxes, 
  Truck, 
  Users, 
  Sparkles, 
  FileSpreadsheet, 
  ClipboardCheck, 
  ClipboardList,
  ChevronsLeft, 
  ChevronsRight, 
  Shield, 
  X,
  Store,
  ShieldAlert,
  Settings,
  ChevronDown,
  ChevronRight,
  Workflow,
  Plus,
  ArrowRightLeft,
  UserCircle2
} from 'lucide-react';
import { cn } from '../lib/ui';

export interface SidebarProps {
  currentUser: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  unmetDemandsCount: number;
  pendingOrdersCount: number;
  pendingApprovalsCount: number;
  activeCashRegister: CashRegister | null;
  openInventoriesCount?: number;
  onOpenSwitchOperatorModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  unmetDemandsCount,
  pendingOrdersCount,
  pendingApprovalsCount,
  activeCashRegister,
  openInventoriesCount = 0,
  onOpenSwitchOperatorModal,
}) => {
  const isAdmin = currentUser.role === 'admin';

  // Persistência de recolhimento dos grupos
  const [isOperacaoCollapsed, setIsOperacaoCollapsed] = useState<boolean>(() => {
    return sessionStorage.getItem('sidebar_operacao_collapsed') === 'true';
  });
  const [isGestaoCollapsed, setIsGestaoCollapsed] = useState<boolean>(() => {
    return sessionStorage.getItem('sidebar_gestao_collapsed') === 'true';
  });

  const toggleOperacao = () => {
    setIsOperacaoCollapsed((prev) => {
      const next = !prev;
      sessionStorage.setItem('sidebar_operacao_collapsed', String(next));
      return next;
    });
  };

  const toggleGestao = () => {
    setIsGestaoCollapsed((prev) => {
      const next = !prev;
      sessionStorage.setItem('sidebar_gestao_collapsed', String(next));
      return next;
    });
  };

  // Group 1: Operação & Balcão (5 itens consolidados)
  const operationalItems = [
    {
      id: 'minha_operacao',
      label: 'Minha Operação',
      icon: Workflow,
      badge: activeCashRegister ? 'Aberto' : null,
      badgeVariant: 'ok' as const,
    },
    {
      id: 'balcao',
      label: 'Balcão & PDV',
      icon: ShoppingBag,
      badge: null,
      badgeVariant: 'neutral' as const,
    },
    {
      id: 'estoque_operacional',
      label: 'Estoque Operacional',
      icon: Boxes,
      badge: (pendingOrdersCount + openInventoriesCount) > 0 ? `${pendingOrdersCount + openInventoriesCount}` : null,
      badgeVariant: 'brand' as const,
    },
    {
      id: 'admin_demands',
      label: 'Produtos Procurados',
      icon: ClipboardList,
      badge: unmetDemandsCount > 0 ? `${unmetDemandsCount}` : null,
      badgeVariant: 'warn' as const,
    },
    {
      id: 'colab_metas',
      label: 'Minhas Metas',
      icon: Target,
      badge: null,
      badgeVariant: 'neutral' as const,
    },
  ];

  // Group 2: Gestão & Gerência (Exclusivo Administrador)
  const adminItems = [
    {
      id: 'admin_approvals',
      label: 'Central de Aprovações',
      icon: ShieldAlert,
      badge: pendingApprovalsCount > 0 ? `${pendingApprovalsCount}` : null,
      badgeVariant: 'warn' as const,
    },
    {
      id: 'admin_overview',
      label: 'Painel Executivo',
      icon: LayoutDashboard,
      badge: null,
      badgeVariant: 'neutral' as const,
    },
    {
      id: 'admin_sales',
      label: 'Vendas & Histórico',
      icon: Receipt,
      badge: null,
      badgeVariant: 'neutral' as const,
    },
    {
      id: 'admin_cash',
      label: 'Caixa & Tesouraria',
      icon: Wallet,
      badge: activeCashRegister ? 'Aberto' : 'Fechado',
      badgeVariant: activeCashRegister ? ('ok' as const) : ('neutral' as const),
    },
    {
      id: 'admin_stock',
      label: 'Estoque & Produtos',
      icon: Boxes,
      badge: null,
      badgeVariant: 'neutral' as const,
    },
    {
      id: 'admin_purchases',
      label: 'Compras & Pedidos',
      icon: Truck,
      badge: pendingOrdersCount > 0 ? `${pendingOrdersCount}` : null,
      badgeVariant: 'warn' as const,
    },
    {
      id: 'admin_staff',
      label: 'Equipe & Metas da Loja',
      icon: Users,
      badge: null,
      badgeVariant: 'neutral' as const,
    },
    {
      id: 'admin_ai',
      label: 'Relatórios IA (Gemini)',
      icon: Sparkles,
      badge: 'IA',
      badgeVariant: 'brand' as const,
    },
    {
      id: 'admin_settings',
      label: 'Configurações Gerais',
      icon: Settings,
      badge: null,
      badgeVariant: 'neutral' as const,
    },
    {
      id: 'admin_import',
      label: 'Importar Planilhas',
      icon: FileSpreadsheet,
      badge: null,
      badgeVariant: 'neutral' as const,
    },
    {
      id: 'admin_tasks',
      label: 'Tarefas & Auditoria',
      icon: ClipboardCheck,
      badge: null,
      badgeVariant: 'neutral' as const,
    },
  ];

  const operacaoTotalAlerts = (pendingOrdersCount || 0) + (openInventoriesCount || 0) + (unmetDemandsCount || 0);
  const gestaoTotalAlerts = (pendingApprovalsCount || 0) + (pendingOrdersCount || 0);

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    if (isMobileOpen) {
      onCloseMobile();
    }
  };

  const badgeStyles = {
    brand: 'bg-[#E6F4EC] text-[#0B6445] border-[#C2E4D2]',
    ok: 'bg-[#E6F4EC] text-[#0B6445] border-[#C2E4D2]',
    warn: 'bg-[#FFF4E0] text-[#8A5300] border-[#FFE1A8]',
    danger: 'bg-[#FDEDEB] text-[#A8261B] border-[#F8B5AF]',
    neutral: 'bg-[#F3F7F4] text-[#56675E] border-[#E1E9E4]',
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-[#13231B]/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container Claro (256px de largura e fundo branco) */}
      <aside
        className={cn(
          "fixed lg:static top-0 bottom-0 left-0 z-50 flex flex-col bg-white text-[#13231B] border-r border-[#E1E9E4] transition-all duration-200 ease-in-out select-none shadow-xl lg:shadow-none",
          isMobileOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0",
          isCollapsed ? "lg:w-[72px]" : "lg:w-64"
        )}
      >
        {/* Brand Header */}
        <div className="h-14 flex items-center justify-between px-3.5 border-b border-[#E1E9E4] bg-white shrink-0">
          {!isCollapsed ? (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-[#0E7A53] text-white flex items-center justify-center font-extrabold text-sm shadow-xs shrink-0">
                <Plus className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="font-extrabold text-base tracking-tight text-[#13231B] truncate">
                  FarmaVida
                </span>
                <span className="text-xs text-[#56675E] font-medium truncate">
                  Gestão Farmacêutica
                </span>
              </div>
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <div className="w-8 h-8 rounded-xl bg-[#0E7A53] text-white flex items-center justify-center font-extrabold text-sm shadow-xs">
                <Plus className="w-5 h-5 stroke-[2.5]" />
              </div>
            </div>
          )}

          {/* Close button on mobile */}
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-[#56675E] hover:text-[#13231B] hover:bg-[#F3F7F4] lg:hidden cursor-pointer"
            aria-label="Fechar menu lateral"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Desktop Collapse Toggle in header */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-lg text-[#56675E] hover:text-[#13231B] hover:bg-[#F3F7F4] transition-colors cursor-pointer"
            title={isCollapsed ? "Expandir menu lateral [S]" : "Recolher menu lateral [S]"}
            aria-label={isCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
          >
            {isCollapsed ? (
              <ChevronsRight className="w-4 h-4 text-[#0E7A53]" />
            ) : (
              <ChevronsLeft className="w-4 h-4 text-[#56675E]" />
            )}
          </button>
        </div>

        {/* Navigation Modules List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2.5 space-y-4 no-scrollbar">
          {/* Group 1: Operação & Balcão */}
          <div className="space-y-1">
            {!isCollapsed ? (
              <button
                type="button"
                onClick={toggleOperacao}
                className="w-full px-2 py-1.5 rounded-lg flex items-center justify-between text-[#56675E] hover:text-[#13231B] hover:bg-[#F3F7F4] transition-colors cursor-pointer group"
                title={isOperacaoCollapsed ? 'Expandir Operação & Balcão' : 'Recolher Operação & Balcão'}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B6445] tracking-wider uppercase">
                  {isOperacaoCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5 text-[#0E7A53] shrink-0" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-[#0E7A53] shrink-0" />
                  )}
                  <span>Operação & Balcão</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {isOperacaoCollapsed && operacaoTotalAlerts > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-[#FFF4E0] text-[#8A5300] border border-[#FFE1A8]">
                      {operacaoTotalAlerts}
                    </span>
                  )}
                </div>
              </button>
            ) : (
              <div className="w-full h-px bg-[#E1E9E4] my-1" />
            )}

            {/* List of Operational Items */}
            {(!isOperacaoCollapsed || isCollapsed) && operationalItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={cn(
                    "w-full flex items-center h-[38px] rounded-[10px] transition-all duration-150 cursor-pointer group select-none text-left relative",
                    isCollapsed ? "justify-center px-0" : "gap-2.5 px-3",
                    isActive
                      ? "bg-[#E6F4EC] text-[#0B6445] font-bold"
                      : "text-[#56675E] hover:bg-[#F3F7F4] hover:text-[#13231B] font-semibold"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-4 h-4 shrink-0 transition-colors",
                      isActive ? "text-[#0E7A53]" : "text-[#56675E] group-hover:text-[#13231B]"
                    )}
                  />

                  {!isCollapsed && (
                    <div className="flex-1 overflow-hidden flex items-center justify-between gap-1.5">
                      <span className="text-xs sm:text-sm truncate">{item.label}</span>
                      {item.badge && (
                        <span
                          className={cn(
                            "text-xs px-2 py-0.5 rounded-md border font-bold shrink-0 tabular",
                            badgeStyles[item.badgeVariant]
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}

                  {isCollapsed && item.badge && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#0E7A53]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Group 2: Gestão & Gerência (Exclusivo Administrador) */}
          {isAdmin && (
            <div className="space-y-1 pt-2 border-t border-[#E1E9E4]">
              {!isCollapsed ? (
                <button
                  type="button"
                  onClick={toggleGestao}
                  className="w-full px-2 py-1.5 rounded-lg flex items-center justify-between text-[#56675E] hover:text-[#13231B] hover:bg-[#F3F7F4] transition-colors cursor-pointer group"
                  title={isGestaoCollapsed ? 'Expandir Gestão & Gerência' : 'Recolher Gestão & Gerência'}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#56675E] tracking-wider uppercase">
                    {isGestaoCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 text-[#56675E] shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-[#56675E] shrink-0" />
                    )}
                    <span className="flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-[#0E7A53]" />
                      <span>Gestão & Gerência</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isGestaoCollapsed && gestaoTotalAlerts > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-[#FFF4E0] text-[#8A5300] border border-[#FFE1A8]">
                        {gestaoTotalAlerts}
                      </span>
                    )}
                    <span className="text-xs px-1.5 py-0.2 rounded font-bold bg-[#E6F4EC] text-[#0B6445] border border-[#C2E4D2]">
                      Admin
                    </span>
                  </div>
                </button>
              ) : (
                <div className="w-full h-px bg-[#E1E9E4] my-1" />
              )}

              {/* List of Admin Items */}
              {(!isGestaoCollapsed || isCollapsed) && adminItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    title={isCollapsed ? item.label : undefined}
                    className={cn(
                      "w-full flex items-center h-[38px] rounded-[10px] transition-all duration-150 cursor-pointer group select-none text-left relative",
                      isCollapsed ? "justify-center px-0" : "gap-2.5 px-3",
                      isActive
                        ? "bg-[#E6F4EC] text-[#0B6445] font-bold"
                        : "text-[#56675E] hover:bg-[#F3F7F4] hover:text-[#13231B] font-semibold"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-4 h-4 shrink-0 transition-colors",
                        isActive ? "text-[#0E7A53]" : "text-[#56675E] group-hover:text-[#13231B]"
                      )}
                    />

                    {!isCollapsed && (
                      <div className="flex-1 overflow-hidden flex items-center justify-between gap-1.5">
                        <span className="text-xs sm:text-sm truncate">{item.label}</span>
                        {item.badge && (
                          <span
                            className={cn(
                              "text-xs px-2 py-0.5 rounded-md border font-bold shrink-0 tabular",
                              badgeStyles[item.badgeVariant]
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}

                    {isCollapsed && item.badge && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#0E7A53]" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer in Sidebar com Operador e Troca Rápida */}
        <div className="p-2.5 border-t border-[#E1E9E4] bg-[#F3F7F4]/60 space-y-2 shrink-0">
          {!isCollapsed ? (
            <div className="p-2 rounded-xl bg-white border border-[#E1E9E4] flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[#E6F4EC] text-[#0B6445] flex items-center justify-center shrink-0 font-bold text-xs">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold text-[#13231B] truncate">{currentUser.name.split(' ')[0]}</div>
                  <div className="text-xs text-[#56675E] font-medium">{isAdmin ? 'Gerência' : 'Operador'}</div>
                </div>
              </div>

              {onOpenSwitchOperatorModal && (
                <button
                  type="button"
                  onClick={onOpenSwitchOperatorModal}
                  className="p-1.5 rounded-lg text-[#56675E] hover:text-[#0E7A53] hover:bg-[#E6F4EC] transition-colors cursor-pointer shrink-0"
                  title="Trocar operador do terminal"
                  aria-label="Trocar operador do terminal"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex justify-center">
              <div 
                className="w-8 h-8 rounded-lg bg-[#E6F4EC] text-[#0B6445] flex items-center justify-center font-bold text-xs"
                title={`Operador: ${currentUser.name}`}
              >
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
            </div>
          )}

          {/* Desktop Toggle Button at bottom with S shortcut */}
          <button
            onClick={onToggleCollapse}
            className={cn(
              "w-full hidden lg:flex items-center rounded-lg py-1 px-2 text-[#56675E] hover:text-[#13231B] hover:bg-white transition-colors text-xs font-semibold cursor-pointer",
              isCollapsed ? "justify-center" : "justify-between"
            )}
            title="Pressione 'S' no teclado para alternar"
            aria-label="Alternar menu lateral"
          >
            {!isCollapsed && <span className="text-xs text-[#56675E]">Recolher Menu</span>}
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-xs font-mono bg-white text-[#56675E] rounded border border-[#CFDAD3]">
                S
              </kbd>
              {isCollapsed ? (
                <ChevronsRight className="w-4 h-4 text-[#0E7A53]" />
              ) : (
                <ChevronsLeft className="w-4 h-4 text-[#56675E]" />
              )}
            </div>
          </button>
        </div>
      </aside>
    </>
  );
};
