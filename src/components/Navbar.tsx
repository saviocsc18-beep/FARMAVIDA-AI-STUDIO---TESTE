import React from 'react';
import { User, Store, Terminal, CashRegister } from '../types';
import { 
  Clock, 
  RefreshCw, 
  Menu, 
  PanelLeftClose, 
  PanelLeftOpen, 
  UserCircle2, 
  Coffee,
  HelpCircle,
  ShieldAlert,
  Wifi,
  WifiOff,
  Monitor,
  ArrowRightLeft
} from 'lucide-react';

export interface NavbarProps {
  currentUser: User;
  currentStore: Store;
  activeTab: string;
  activeModuleTitle: string;
  activeShiftStatus: 'em_andamento' | 'pausado' | 'sem_turno';
  onToggleShift: () => void;
  onSwitchUser: (user: User) => void;
  availableUsers: User[];
  isOnline: boolean;
  onRefreshData: () => void;
  isRefreshing: boolean;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onOpenMobileMenu: () => void;
  onOpenHelp: () => void;
  pendingApprovalsCount: number;
  onNavigateToApprovals: () => void;
  terminals?: Terminal[];
  currentTerminalId?: string;
  onSelectTerminal?: (termId: string) => void;
  onOpenSwitchOperatorModal?: () => void;
  activeCashRegister?: CashRegister | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  currentStore,
  activeModuleTitle,
  activeShiftStatus,
  onToggleShift,
  onSwitchUser,
  availableUsers,
  isOnline,
  onRefreshData,
  isRefreshing,
  isSidebarCollapsed,
  onToggleSidebar,
  onOpenMobileMenu,
  onOpenHelp,
  pendingApprovalsCount,
  onNavigateToApprovals,
  terminals = [],
  currentTerminalId = 'terminal_01',
  onSelectTerminal,
  onOpenSwitchOperatorModal,
  activeCashRegister,
}) => {
  const isAdmin = currentUser.role === 'admin';
  const currentTerminal = terminals.find((t) => t.id === currentTerminalId) || {
    id: currentTerminalId,
    name: currentTerminalId === 'terminal_02' ? 'Terminal Balcão 02' : 'Terminal Balcão 01',
  };

  return (
    <header className="bg-emerald-950 text-white shadow-xs border-b border-emerald-900 sticky top-0 z-30 h-14 select-none">
      <div className="h-full px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Sidebar Toggle + Current View Breadcrumb */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile menu trigger */}
          <button
            onClick={onOpenMobileMenu}
            className="p-1.5 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-900/80 lg:hidden transition-colors shrink-0"
            aria-label="Abrir menu lateral"
            title="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Desktop collapse toggle */}
          <button
            onClick={onToggleSidebar}
            className="hidden lg:flex p-1.5 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-900/80 transition-colors items-center gap-1.5 text-xs shrink-0"
            title={isSidebarCollapsed ? "Expandir menu lateral [S]" : "Recolher menu lateral [S]"}
            aria-label={isSidebarCollapsed ? "Expandir menu" : "Recolher menu"}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-emerald-300" />
            ) : (
              <PanelLeftClose className="w-4 h-4 text-emerald-400" />
            )}
            <kbd className="hidden xl:inline-block px-1 py-0.2 text-[9px] font-mono bg-emerald-900/80 text-emerald-200 rounded border border-emerald-800">
              S
            </kbd>
          </button>

          <div className="h-4 w-px bg-emerald-800/80 hidden sm:block shrink-0" />

          {/* Contextual Screen Title & Store Unit Tag */}
          <div className="flex items-baseline gap-2 overflow-hidden">
            <h1 className="font-bold text-sm sm:text-base text-white tracking-wide truncate">
              {activeModuleTitle}
            </h1>
            <span className="text-[11px] text-emerald-300/80 hidden md:inline truncate">
              • {currentStore.tradeName || 'Drogaria FarmaVida'}
            </span>
          </div>
        </div>

        {/* Center/Right: Terminal Badge + Shared Drawer Status */}
        <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-900/40 border border-emerald-800/60 text-xs">
          <Monitor className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="text-emerald-300/80 font-medium">Terminal:</span>
          {onSelectTerminal && terminals.length > 0 ? (
            <select
              value={currentTerminalId}
              onChange={(e) => onSelectTerminal(e.target.value)}
              className="bg-emerald-950 text-white text-xs font-semibold rounded px-1.5 py-0.5 border border-emerald-700/80 focus:outline-none focus:border-sky-400 cursor-pointer"
              title="Alternar terminal de balcão deste computador"
            >
              {terminals.map((t) => (
                <option key={t.id} value={t.id} className="bg-neutral-900 text-white">
                  {t.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="font-semibold text-white">{currentTerminal.name}</span>
          )}

          <div className="h-3 w-px bg-emerald-800 mx-0.5" />

          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${activeCashRegister ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span className="text-[11px] text-emerald-200">
              {activeCashRegister ? `Gaveta ${activeCashRegister.displayCode || 'Aberta'}` : 'Gaveta Fechada'}
            </span>
          </div>
        </div>

        {/* Right: Actions, Connectivity, Turno, Approvals, Operator Switcher, Profile */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Real Connectivity Indicator */}
          <div 
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] bg-emerald-900/50 border border-emerald-800/60"
            title={
              isRefreshing
                ? 'Sincronizando dados com o servidor...'
                : isOnline 
                ? 'Conexão ativa com o servidor' 
                : 'Sem conexão à internet. Operando em modo offline.'
            }
          >
            {isRefreshing ? (
              <RefreshCw className="w-3 h-3 text-emerald-300 animate-spin" />
            ) : isOnline ? (
              <Wifi className="w-3 h-3 text-emerald-400" />
            ) : (
              <WifiOff className="w-3 h-3 text-amber-400" />
            )}
            <span className="hidden sm:inline text-[10px] text-emerald-200">
              {isRefreshing ? 'Sincronizando' : isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          {/* Pending Approvals Quick Pill (Admin only and > 0) */}
          {isAdmin && pendingApprovalsCount > 0 && (
            <button
              onClick={onNavigateToApprovals}
              className="px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-300 hover:bg-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors animate-pulse"
              title={`${pendingApprovalsCount} aprovações pendentes de revisão`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden md:inline">Aprovações:</span>
              <span>{pendingApprovalsCount}</span>
            </button>
          )}

          {/* Shift Status Button */}
          <button
            onClick={onToggleShift}
            className={`px-2 sm:px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all ${
              activeShiftStatus === 'em_andamento'
                ? 'bg-emerald-900/90 border-emerald-700/80 text-emerald-200 hover:bg-emerald-800'
                : activeShiftStatus === 'pausado'
                ? 'bg-amber-950/80 border-amber-800 text-amber-300 hover:bg-amber-900'
                : 'bg-emerald-950 border-emerald-800/60 text-emerald-300/80 hover:bg-emerald-900/60'
            }`}
            title="Gerenciar meu turno de trabalho"
          >
            {activeShiftStatus === 'pausado' ? (
              <Coffee className="w-3.5 h-3.5 text-amber-300" />
            ) : (
              <Clock className="w-3.5 h-3.5 text-emerald-300" />
            )}
            <span className="hidden lg:inline">Turno:</span>
            <span className="font-semibold text-[11px] sm:text-xs">
              {activeShiftStatus === 'em_andamento' && 'Ativo'}
              {activeShiftStatus === 'pausado' && 'Pausa'}
              {activeShiftStatus === 'sem_turno' && 'Iniciar'}
            </span>
          </button>

          {/* Quick PIN-based Operator Switch Trigger */}
          {onOpenSwitchOperatorModal && (
            <button
              onClick={onOpenSwitchOperatorModal}
              className="px-2.5 py-1 rounded-lg bg-emerald-800/90 hover:bg-emerald-700 border border-emerald-600/70 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              title="Trocar operador do terminal com PIN seguro"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-300" />
              <span className="hidden sm:inline">Trocar Atendente</span>
            </button>
          )}

          {/* Global Contextual Help Button '?' */}
          <button
            onClick={onOpenHelp}
            className="p-1.5 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-900/80 transition-colors relative flex items-center justify-center"
            title="Ajuda operacional para esta tela [?]"
            aria-label="Ajuda contextual desta tela"
          >
            <HelpCircle className="w-4 h-4 text-emerald-300" />
          </button>

          {/* User Profile & Quick Switcher */}
          <div className="flex items-center gap-1.5 bg-emerald-900/80 pl-2 pr-1 py-1 rounded-lg border border-emerald-800/80 text-xs">
            <UserCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            <span className="font-semibold text-white max-w-[80px] sm:max-w-[110px] truncate">
              {currentUser.name.split(' ')[0]}
            </span>

            <span className={`px-1.5 py-0.2 text-[9px] rounded font-bold uppercase tracking-wider hidden md:inline-block ${
              isAdmin 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}>
              {isAdmin ? 'Admin' : 'Balcão'}
            </span>

            <select
              value={currentUser.id}
              onChange={(e) => {
                const found = availableUsers.find((u) => u.id === e.target.value);
                if (found) onSwitchUser(found);
              }}
              className="bg-emerald-950 text-emerald-100 text-[11px] rounded px-1 py-0.5 border border-emerald-700/60 focus:outline-none focus:border-emerald-400 cursor-pointer"
              aria-label="Alternar perfil de usuário"
              title="Trocar usuário ativo"
            >
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id} className="bg-neutral-900 text-white">
                  {u.name.split(' ')[0]} ({u.role === 'admin' ? 'Admin' : 'Balcão'})
                </option>
              ))}
            </select>
          </div>

          {/* Real Refresh/Sync Button */}
          <button
            onClick={onRefreshData}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-900 transition-colors"
            title="Sincronizar dados agora com o servidor"
            aria-label="Sincronizar dados"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-200' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
};

