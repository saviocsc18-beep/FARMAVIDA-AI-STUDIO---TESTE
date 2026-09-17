import React from 'react';
import { User, CashRegister } from '../types';
import { 
  ShoppingBag, 
  Banknote,
  Clock, 
  Target, 
  AlertTriangle, 
  LayoutDashboard, 
  Receipt, 
  Wallet, 
  Boxes, 
  Truck, 
  Users, 
  Sparkles, 
  FileSpreadsheet, 
  ClipboardCheck, 
  ChevronsLeft, 
  ChevronsRight, 
  Shield, 
  Lock, 
  X,
  Store,
  ShieldAlert,
  Settings
} from 'lucide-react';

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
}) => {
  const isAdmin = currentUser.role === 'admin';

  // Group 1: Operação & Balcão (Acesso livre para todos os colaboradores e administradores)
  const operationalItems = [
    {
      id: 'balcao',
      label: 'Balcão & PDV',
      shortLabel: 'PDV',
      icon: ShoppingBag,
      description: 'Caixa de vendas e carrinho',
      badge: null,
    },
    {
      id: 'meu_caixa',
      label: 'Meu Caixa',
      shortLabel: 'Meu Caixa',
      icon: Banknote,
      description: 'Abertura, sangrias e fechamento',
      badge: activeCashRegister ? 'Aberto' : null,
      badgeColor: activeCashRegister ? 'bg-emerald-600 text-white' : undefined,
    },
    {
      id: 'meu_turno',
      label: 'Meu Turno & Ponto',
      shortLabel: 'Turno',
      icon: Clock,
      description: 'Jornada, pausas e ponto',
      badge: null,
    },
    {
      id: 'receber_mercadoria',
      label: 'Receber Mercadoria',
      shortLabel: 'Receber',
      icon: Truck,
      description: 'Conferência física e entrada de compras',
      badge: pendingOrdersCount > 0 ? `${pendingOrdersCount}` : null,
      badgeColor: 'bg-emerald-600 text-white',
    },
    {
      id: 'contagem_estoque',
      label: 'Contagem de Estoque',
      shortLabel: 'Inventário',
      icon: ClipboardCheck,
      description: 'Contagem física cega e conferência',
      badge: openInventoriesCount > 0 ? `${openInventoriesCount}` : null,
      badgeColor: 'bg-blue-600 text-white font-bold',
    },
    {
      id: 'colab_metas',
      label: 'Minhas Metas',
      shortLabel: 'Metas',
      icon: Target,
      description: 'Produtividade individual',
      badge: null,
    },
    {
      id: 'admin_demands',
      label: 'Falta de Remédios',
      shortLabel: 'Faltas',
      icon: AlertTriangle,
      description: 'Demanda reprimida de balcão',
      badge: unmetDemandsCount > 0 ? `${unmetDemandsCount}` : null,
      badgeColor: 'bg-red-500 text-white',
    },
  ];

  // Group 2: Gestão & Gerência (Exclusivo Administrador com barreiras claras)
  const adminItems = [
    {
      id: 'admin_approvals',
      label: 'Central de Aprovações',
      shortLabel: 'Aprovações',
      icon: ShieldAlert,
      description: 'Cancelamentos, preços e descontos',
      badge: pendingApprovalsCount > 0 ? `${pendingApprovalsCount} pendente(s)` : null,
      badgeColor: 'bg-amber-500 text-white font-bold animate-pulse',
    },
    {
      id: 'admin_overview',
      label: 'Painel Executivo',
      shortLabel: 'Painel',
      icon: LayoutDashboard,
      description: 'DRE, faturamento e saúde da loja',
      badge: null,
    },
    {
      id: 'admin_sales',
      label: 'Vendas & Histórico',
      shortLabel: 'Vendas',
      icon: Receipt,
      description: 'Histórico auditado e estornos',
      badge: null,
    },
    {
      id: 'admin_cash',
      label: 'Caixa & Tesouraria',
      shortLabel: 'Caixa',
      icon: Wallet,
      description: 'Abertura, sangrias e fechamento',
      badge: activeCashRegister ? 'Aberto' : 'Fechado',
      badgeColor: activeCashRegister ? 'bg-emerald-600 text-white' : 'bg-neutral-600 text-neutral-200',
    },
    {
      id: 'admin_stock',
      label: 'Estoque & Produtos',
      shortLabel: 'Estoque',
      icon: Boxes,
      description: 'Saldos, inventário e ajustes',
      badge: null,
    },
    {
      id: 'admin_purchases',
      label: 'Compras & Pedidos',
      shortLabel: 'Compras',
      icon: Truck,
      description: 'Cotações e conferência física',
      badge: pendingOrdersCount > 0 ? `${pendingOrdersCount}` : null,
      badgeColor: 'bg-amber-500 text-white',
    },
    {
      id: 'admin_staff',
      label: 'Equipe & Metas da Loja',
      shortLabel: 'Equipe',
      icon: Users,
      description: 'Produtividade e metas mensais',
      badge: null,
    },
    {
      id: 'admin_ai',
      label: 'Relatórios IA (Gemini)',
      shortLabel: 'IA Gemini',
      icon: Sparkles,
      description: 'Diagnóstico inteligente sob demanda',
      badge: 'IA',
      badgeColor: 'bg-emerald-600 text-white',
    },
    {
      id: 'admin_settings',
      label: 'Configurações Gerais',
      shortLabel: 'Config',
      icon: Settings,
      description: 'Empresa, usuários, jornadas e caixa',
      badge: null,
    },
    {
      id: 'admin_import',
      label: 'Importar Planilhas',
      shortLabel: 'Importar',
      icon: FileSpreadsheet,
      description: 'Carga de produtos CSV/XLS',
      badge: null,
    },
    {
      id: 'admin_tasks',
      label: 'Tarefas & Auditoria',
      shortLabel: 'Auditoria',
      icon: ClipboardCheck,
      description: 'Checklists e trilha de logs',
      badge: null,
    },
  ];

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    if (isMobileOpen) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-neutral-950/70 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 flex flex-col bg-neutral-900 text-neutral-100 border-r border-neutral-800 transition-all duration-300 ease-in-out select-none shadow-xl lg:shadow-none ${
          isMobileOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'
        } ${
          isCollapsed ? 'lg:w-[72px]' : 'lg:w-64'
        }`}
      >
        {/* Brand Header */}
        <div className="h-14 flex items-center justify-between px-3 border-b border-neutral-800 bg-neutral-950/80">
          {!isCollapsed ? (
            <div className="flex items-center gap-2.5 overflow-hidden pl-1">
              <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                FV
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="font-bold text-sm tracking-wide text-white truncate">
                  FarmaVida
                </span>
                <span className="text-[10px] text-emerald-400 font-medium truncate">
                  Sistema Operacional & Gestão
                </span>
              </div>
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                FV
              </div>
            </div>
          )}

          {/* Close button on mobile */}
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 lg:hidden"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Desktop Collapse Toggle in header */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            title={isCollapsed ? "Expandir menu lateral [S]" : "Recolher menu lateral [S]"}
            aria-label={isCollapsed ? "Expandir menu" : "Recolher menu"}
          >
            {isCollapsed ? (
              <ChevronsRight className="w-4 h-4 text-emerald-400" />
            ) : (
              <ChevronsLeft className="w-4 h-4 text-neutral-400" />
            )}
          </button>
        </div>

        {/* Navigation Modules List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-4 no-scrollbar">
          {/* Group 1: Operação & Balcão */}
          <div className="space-y-1">
            {!isCollapsed ? (
              <div className="px-2.5 py-1 text-[10px] font-bold text-emerald-400/90 tracking-wider uppercase flex items-center justify-between">
                <span>Operação & Balcão</span>
                <span className="text-[9px] text-emerald-300/60 font-normal">Balconista</span>
              </div>
            ) : (
              <div className="w-full h-px bg-neutral-800 my-1" />
            )}

            {operationalItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center rounded-xl transition-all group ${
                    isCollapsed 
                      ? 'justify-center p-2.5' 
                      : 'gap-3 px-3 py-2 text-left'
                  } ${
                    isActive
                      ? 'bg-emerald-700 text-white font-semibold shadow-xs ring-1 ring-emerald-500/40'
                      : 'text-neutral-300 hover:bg-neutral-800/80 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${
                    isActive ? 'text-white' : 'text-emerald-400'
                  }`} />

                  {!isCollapsed && (
                    <div className="flex-1 overflow-hidden flex items-center justify-between gap-1">
                      <div className="truncate">
                        <span className="text-xs block truncate">{item.label}</span>
                        <span className={`text-[10px] block truncate ${isActive ? 'text-emerald-100' : 'text-neutral-500'}`}>
                          {item.description}
                        </span>
                      </div>
                      {item.badge && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold shrink-0 ${item.badgeColor || 'bg-neutral-700 text-neutral-200'}`}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}

                  {isCollapsed && item.badge && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Group 2: Gestão & Gerência (Exclusivo Administrador) */}
          {isAdmin && (
            <div className="space-y-1 pt-1">
              {!isCollapsed ? (
                <div className="px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase flex items-center justify-between text-neutral-400 border-t border-neutral-800 pt-3">
                  <span className="flex items-center gap-1.5">
                    <Shield className="w-3 h-3 text-emerald-400" />
                    <span>Gestão & Gerência</span>
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-emerald-500/20 text-emerald-300">
                    Admin
                  </span>
                </div>
              ) : (
                <div className="w-full h-px bg-neutral-800 my-2" />
              )}

              {adminItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center rounded-xl transition-all group relative ${
                      isCollapsed 
                        ? 'justify-center p-2.5' 
                        : 'gap-3 px-3 py-2 text-left'
                    } ${
                      isActive
                        ? 'bg-emerald-700 text-white font-semibold shadow-xs ring-1 ring-emerald-500/40'
                        : 'text-neutral-300 hover:bg-neutral-800/80 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${
                      isActive ? 'text-white' : 'text-emerald-400'
                    }`} />

                    {!isCollapsed && (
                      <div className="flex-1 overflow-hidden flex items-center justify-between gap-1">
                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs truncate">{item.label}</span>
                          </div>
                          <span className={`text-[10px] block truncate ${isActive ? 'text-emerald-100' : 'text-neutral-500'}`}>
                            {item.description}
                          </span>
                        </div>
                        {item.badge && (
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold shrink-0 ${item.badgeColor || 'bg-neutral-700 text-neutral-200'}`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer in Sidebar */}
        <div className="p-2.5 border-t border-neutral-800 bg-neutral-950/80 space-y-2">
          {/* Quick Cash Register Status */}
          {!isCollapsed ? (
            <div className="px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-neutral-300">
                <Store className="w-3.5 h-3.5 text-emerald-400" />
                <span>Caixa Balcão:</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                activeCashRegister ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-neutral-700 text-neutral-300'
              }`}>
                {activeCashRegister ? 'Aberto' : 'Fechado'}
              </span>
            </div>
          ) : (
            <div 
              className={`w-3 h-3 mx-auto rounded-full ${activeCashRegister ? 'bg-emerald-500' : 'bg-neutral-600'}`} 
              title={activeCashRegister ? 'Caixa Balcão Aberto' : 'Caixa Balcão Fechado'}
            />
          )}

          {/* Desktop Toggle Button at bottom with S shortcut */}
          <button
            onClick={onToggleCollapse}
            className={`w-full hidden lg:flex items-center rounded-lg py-1.5 px-2 text-neutral-400 hover:text-white hover:bg-neutral-800/80 transition-colors text-xs ${
              isCollapsed ? 'justify-center' : 'justify-between'
            }`}
            title="Pressione 'S' no teclado para alternar"
          >
            {!isCollapsed && (
              <span className="text-[11px] text-neutral-400">Recolher Menu</span>
            )}
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-neutral-800 text-neutral-400 rounded border border-neutral-700">
                S
              </kbd>
              {isCollapsed ? (
                <ChevronsRight className="w-4 h-4 text-emerald-400" />
              ) : (
                <ChevronsLeft className="w-4 h-4 text-neutral-400" />
              )}
            </div>
          </button>
        </div>
      </aside>
    </>
  );
};
