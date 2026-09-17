import React, { useState } from 'react';
import { User, Store, Terminal, CashRegister } from '../types';
import { 
  Clock, 
  RefreshCw, 
  Menu, 
  PanelLeftClose, 
  PanelLeftOpen, 
  HelpCircle,
  ShieldAlert,
  Wifi,
  WifiOff,
  Monitor,
  ArrowRightLeft,
  Info,
  X,
  Store as StoreIcon,
  CheckCircle2,
  Coffee
} from 'lucide-react';
import { cn } from '../lib/ui';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

export interface NavbarProps {
  currentUser: User;
  currentStore: Store;
  activeTab: string;
  activeModuleTitle: string;
  activeShiftStatus: 'em_andamento' | 'pausado' | 'sem_turno';
  onToggleShift: () => void;
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
  const [showTerminologyModal, setShowTerminologyModal] = useState(false);
  const isAdmin = currentUser.role === 'admin';
  const currentTerminal = terminals.find((t) => t.id === currentTerminalId) || {
    id: currentTerminalId,
    name: currentTerminalId === 'terminal_02' ? 'Terminal Balcão 02' : 'Terminal Balcão 01',
    drawerName: currentTerminalId === 'terminal_02' ? 'Gaveta Balcão 02' : 'Gaveta Balcão 01',
  };

  return (
    <>
      <header className="bg-white text-[#13231B] border-b border-[#E1E9E4] sticky top-0 z-30 h-14 select-none shadow-2xs">
        <div className="h-full px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Sidebar Toggle + Breadcrumb & Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile menu trigger */}
            <button
              type="button"
              onClick={onOpenMobileMenu}
              className="h-10 w-10 flex items-center justify-center rounded-xl text-[#56675E] hover:text-[#13231B] hover:bg-[#F3F7F4] lg:hidden transition-colors shrink-0 cursor-pointer"
              aria-label="Abrir menu lateral"
              title="Abrir menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Desktop collapse toggle */}
            <button
              type="button"
              onClick={onToggleSidebar}
              className="hidden lg:flex h-10 px-2.5 rounded-xl text-[#56675E] hover:text-[#13231B] hover:bg-[#F3F7F4] transition-colors items-center gap-1.5 text-xs font-semibold shrink-0 cursor-pointer"
              title={isSidebarCollapsed ? "Expandir menu lateral [S]" : "Recolher menu lateral [S]"}
              aria-label={isSidebarCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 text-[#0E7A53]" />
              ) : (
                <PanelLeftClose className="w-4 h-4 text-[#56675E]" />
              )}
              <kbd className="hidden xl:inline-block px-1.5 py-0.5 text-xs font-mono bg-[#F3F7F4] text-[#56675E] rounded border border-[#CFDAD3]">
                S
              </kbd>
            </button>

            <div className="h-4 w-px bg-[#E1E9E4] hidden sm:block shrink-0" />

            {/* Contextual Screen Title & Store Unit Tag */}
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 overflow-hidden">
              <h1 className="font-extrabold text-sm sm:text-base text-[#13231B] tracking-tight truncate">
                {activeModuleTitle}
              </h1>
              <span className="text-xs text-[#56675E] hidden md:inline truncate font-medium">
                • {currentStore.tradeName || 'Drogaria FarmaVida'}
              </span>
            </div>
          </div>

          {/* Center: Standardized Operational Sequence: Terminal · Gaveta · Operador · Turno · Caixa */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F3F7F4] border border-[#E1E9E4] text-xs">
            {/* Terminal */}
            <div className="flex items-center gap-1 text-[#56675E]" title="Terminal: computador físico de atendimento">
              <Monitor className="w-3.5 h-3.5 text-[#0E7A53] shrink-0" />
              {onSelectTerminal && terminals.length > 0 ? (
                <select
                  value={currentTerminalId}
                  onChange={(e) => onSelectTerminal(e.target.value)}
                  className="bg-white text-[#13231B] text-xs font-bold rounded-lg px-2 py-0.5 border border-[#CFDAD3] focus:border-[#0E7A53] outline-hidden cursor-pointer"
                  title="Alternar terminal de balcão"
                >
                  {terminals.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="font-bold text-[#13231B]">{currentTerminal.name}</span>
              )}
            </div>

            <span className="text-[#CFDAD3]">•</span>

            {/* Gaveta */}
            <div className="flex items-center gap-1 text-[#56675E]" title="Gaveta física acoplada ao terminal">
              <span className="text-xs">Gaveta:</span>
              <span className="font-bold text-[#13231B]">
                {currentTerminal.drawerName || (currentTerminalId === 'terminal_02' ? 'Gaveta 02' : 'Gaveta 01')}
              </span>
            </div>

            <span className="text-[#CFDAD3]">•</span>

            {/* Operador */}
            <div className="flex items-center gap-1 text-[#56675E]" title="Operador responsável pela sessão">
              <span className="text-xs">Op:</span>
              <span className="font-bold text-[#13231B] max-w-[100px] truncate">
                {currentUser.name.split(' ')[0]}
              </span>
            </div>

            <span className="text-[#CFDAD3]">•</span>

            {/* Status do Turno */}
            <div className="flex items-center gap-1.5" title="Status do Turno: jornada e ponto individual">
              <span className={cn(
                "w-2 h-2 rounded-full",
                activeShiftStatus === 'em_andamento' ? "bg-[#0E7A53] animate-pulse" : activeShiftStatus === 'pausado' ? "bg-[#D98A0B]" : "bg-[#84968D]"
              )} />
              <span className="text-xs font-bold text-[#13231B]">
                {activeShiftStatus === 'em_andamento' ? 'Turno Ativo' : activeShiftStatus === 'pausado' ? 'Em Pausa' : 'Sem Turno'}
              </span>
            </div>

            <span className="text-[#CFDAD3]">•</span>

            {/* Status do Caixa */}
            <div className="flex items-center gap-1.5" title="Status do Caixa: sessão financeira individual">
              <span className={cn(
                "w-2 h-2 rounded-full",
                activeCashRegister ? "bg-[#0E7A53]" : "bg-[#D98A0B]"
              )} />
              <span className={cn(
                "text-xs font-extrabold",
                activeCashRegister ? "text-[#0B6445]" : "text-[#8A5300]"
              )}>
                {activeCashRegister ? `Caixa ${activeCashRegister.displayCode || 'Aberto'}` : 'Caixa Fechado'}
              </span>
            </div>

            {/* Explanation info button */}
            <button
              type="button"
              onClick={() => setShowTerminologyModal(true)}
              className="ml-1 p-1 rounded-md hover:bg-white text-[#56675E] hover:text-[#0E7A53] transition-colors cursor-pointer"
              title="Entenda a diferença entre Terminal, Gaveta e Caixa"
              aria-label="Conceitos operacionais"
            >
              <Info className="w-3.5 h-3.5 text-[#0E7A53]" />
            </button>
          </div>

          {/* Right: Actions, Connectivity, Turno, Approvals, Operator Switcher, Help */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Status de Conectividade */}
            <div 
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs bg-[#F3F7F4] border border-[#E1E9E4] text-[#56675E]"
              title={
                isRefreshing
                  ? 'Sincronizando dados com o servidor...'
                  : isOnline 
                  ? 'Conexão ativa com o servidor' 
                  : 'Sem conexão à internet. Operando em modo offline.'
              }
            >
              {isRefreshing ? (
                <RefreshCw className="w-3.5 h-3.5 text-[#0E7A53] animate-spin" />
              ) : isOnline ? (
                <Wifi className="w-3.5 h-3.5 text-[#0E7A53]" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-[#D98A0B]" />
              )}
              <span className="hidden sm:inline font-bold text-xs">
                {isRefreshing ? 'Sincronizando' : isOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            {/* Pending Approvals Quick Pill (Admin only and > 0) */}
            {isAdmin && pendingApprovalsCount > 0 && (
              <button
                type="button"
                onClick={onNavigateToApprovals}
                className="h-10 px-3 rounded-xl bg-[#FFF4E0] border border-[#FFE1A8] text-[#8A5300] hover:bg-[#FFE1A8] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer animate-pulse"
                title={`${pendingApprovalsCount} aprovações pendentes`}
                aria-label={`${pendingApprovalsCount} aprovações pendentes de revisão`}
              >
                <ShieldAlert className="w-4 h-4 text-[#D98A0B]" />
                <span className="hidden md:inline">Aprovações:</span>
                <span className="tabular">{pendingApprovalsCount}</span>
              </button>
            )}

            {/* Shift Status Button */}
            <button
              type="button"
              onClick={onToggleShift}
              className={cn(
                "h-10 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs",
                activeShiftStatus === 'em_andamento'
                  ? "bg-[#E6F4EC] border-[#C2E4D2] text-[#0B6445] hover:bg-[#C2E4D2]"
                  : activeShiftStatus === 'pausado'
                  ? "bg-[#FFF4E0] border-[#FFE1A8] text-[#8A5300] hover:bg-[#FFE1A8]"
                  : "bg-[#F3F7F4] border-[#E1E9E4] text-[#56675E] hover:bg-[#E1E9E4] hover:text-[#13231B]"
              )}
              title="Gerenciar meu turno de trabalho"
              aria-label="Gerenciar turno de trabalho"
            >
              {activeShiftStatus === 'pausado' ? (
                <Coffee className="w-4 h-4 text-[#D98A0B]" />
              ) : (
                <Clock className="w-4 h-4 text-[#0E7A53]" />
              )}
              <span className="hidden lg:inline">Turno:</span>
              <span>
                {activeShiftStatus === 'em_andamento' && 'Ativo'}
                {activeShiftStatus === 'pausado' && 'Pausa'}
                {activeShiftStatus === 'sem_turno' && 'Iniciar'}
              </span>
            </button>

            {/* Quick Operator Switch Trigger */}
            {onOpenSwitchOperatorModal && (
              <button
                type="button"
                onClick={onOpenSwitchOperatorModal}
                className="h-10 px-3 rounded-xl bg-white hover:bg-[#F3F7F4] border border-[#CFDAD3] text-[#13231B] text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                title="Trocar operador do terminal com PIN"
                aria-label="Trocar operador do terminal"
              >
                <ArrowRightLeft className="w-4 h-4 text-[#0E7A53]" />
                <span className="hidden sm:inline">Trocar Atendente</span>
              </button>
            )}

            {/* Global Contextual Help Button '?' */}
            <button
              type="button"
              onClick={onOpenHelp}
              className="h-10 w-10 rounded-xl bg-white border border-[#E1E9E4] text-[#56675E] hover:text-[#0E7A53] hover:bg-[#F3F7F4] transition-colors flex items-center justify-center cursor-pointer shadow-2xs"
              title="Ajuda operacional para esta tela [?]"
              aria-label="Ajuda contextual desta tela"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Sincronização Manual */}
            <button
              type="button"
              onClick={onRefreshData}
              disabled={isRefreshing}
              className="h-10 w-10 rounded-xl bg-white border border-[#E1E9E4] text-[#56675E] hover:text-[#0E7A53] hover:bg-[#F3F7F4] transition-colors flex items-center justify-center cursor-pointer disabled:opacity-50 shadow-2xs"
              title="Sincronizar dados agora com o servidor"
              aria-label="Sincronizar dados com o servidor"
            >
              <RefreshCw className={cn("w-4 h-4", isRefreshing ? "animate-spin text-[#0E7A53]" : "")} />
            </button>
          </div>
        </div>
      </header>

      {/* Operational Terminology Modal (Migrado para o Modal do kit) */}
      <Modal
        isOpen={showTerminologyModal}
        onClose={() => setShowTerminologyModal(false)}
        title="Estrutura Operacional FarmaVida"
        subtitle="Conceitos essenciais para a equipe de balcão e gerência"
        maxWidth="md"
        footer={
          <Button variant="primary" onClick={() => setShowTerminologyModal(false)}>
            Entendido
          </Button>
        }
      >
        <div className="space-y-3.5 text-xs sm:text-sm text-[#13231B] leading-relaxed">
          <div className="p-4 rounded-[14px] bg-[#F3F7F4] border border-[#E1E9E4]">
            <span className="font-extrabold text-[#13231B] text-sm block mb-1 flex items-center gap-1.5">
              <Monitor className="w-4 h-4 text-[#0E7A53]" />
              Terminal
            </span>
            <p className="text-xs sm:text-sm text-[#56675E]">
              É o <strong>computador físico / estação de atendimento</strong>. Representa a máquina em que você está operando (ex: Terminal Balcão 01).
            </p>
          </div>

          <div className="p-4 rounded-[14px] bg-[#F3F7F4] border border-[#E1E9E4]">
            <span className="font-extrabold text-[#13231B] text-sm block mb-1 flex items-center gap-1.5">
              <StoreIcon className="w-4 h-4 text-[#0E7A53]" />
              Gaveta
            </span>
            <p className="text-xs sm:text-sm text-[#56675E]">
              É a <strong>gaveta física de dinheiro</strong> acoplada ao terminal. É o compartimento físico onde as cédulas e moedas são guardadas.
            </p>
          </div>

          <div className="p-4 rounded-[14px] bg-[#E6F4EC] border border-[#C2E4D2] text-[#0B6445]">
            <span className="font-extrabold text-[#0B6445] text-sm block mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#0E7A53]" />
              Caixa
            </span>
            <p className="text-xs sm:text-sm text-[#0B6445]">
              É a <strong>sessão financeira individual</strong> do colaborador vinculada ao seu turno. O atendente é o único responsável pelo saldo apurado em seu caixa.
            </p>
          </div>

          <div className="text-xs text-[#56675E] italic pt-1">
            Regra de ouro: Um colaborador não pode movimentar ou vender no caixa de outro colega. O encerramento do expediente exige que o caixa do operador esteja fechado.
          </div>
        </div>
      </Modal>
    </>
  );
};
