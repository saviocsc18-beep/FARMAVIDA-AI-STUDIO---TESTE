import React from 'react';
import { ShieldAlert, ArrowLeft, Store, Clock, UserCheck, Shield } from 'lucide-react';
import { User } from '../types';

interface RestrictedAccessViewProps {
  currentUser: User;
  moduleName: string;
  onNavigateToBalcao: () => void;
  onNavigateToTurno: () => void;
  /** Mantido apenas para compatibilidade temporária com os chamadores antigos. */
  onSwitchToAdmin?: () => void;
}

export const RestrictedAccessView: React.FC<RestrictedAccessViewProps> = ({
  currentUser,
  moduleName,
  onNavigateToBalcao,
  onNavigateToTurno,
}) => {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center mx-auto shadow-xs">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
          <Shield className="w-3.5 h-3.5" />
          <span>Acesso Restrito à Administração</span>
        </div>
        <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">
          Módulo de Gestão: {moduleName}
        </h2>
        <p className="text-sm text-neutral-600 max-w-lg mx-auto leading-relaxed">
          Este módulo exige privilégios de <strong>Administrador / Gerente Farmacêutico</strong>.
          Seu perfil atual está configurado como <strong className="text-emerald-800">{currentUser.name}</strong> ({currentUser.roleTitle || 'Colaborador de Balcão'}),
          com permissões focadas no atendimento e operação de vendas.
        </p>
      </div>

      <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200 text-xs text-neutral-600 max-w-md mx-auto space-y-2 text-left">
        <div className="font-semibold text-neutral-800 flex items-center gap-1.5">
          <UserCheck className="w-4 h-4 text-emerald-700" />
          <span>Módulos autorizados para seu perfil:</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-neutral-600 pl-1">
          <li><strong>Balcão & PDV</strong>: Registro de vendas, clientes e emissão de cupons</li>
          <li><strong>Meu Turno & Ponto</strong>: Registro de entrada, pausas e expediente</li>
          <li><strong>Minhas Metas</strong>: Acompanhamento de vendas e comissão individual</li>
          <li><strong>Falta de Medicamentos</strong>: Registro de remédios procurados por clientes</li>
        </ul>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          onClick={onNavigateToBalcao}
          className="px-5 py-2.5 bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-emerald-900 transition-colors flex items-center gap-2"
        >
          <Store className="w-4 h-4" />
          <span>Voltar para Balcão & PDV</span>
        </button>

        <button
          onClick={onNavigateToTurno}
          className="px-4 py-2.5 bg-white text-neutral-800 border border-neutral-300 font-semibold text-xs rounded-xl hover:bg-neutral-50 transition-colors flex items-center gap-1.5"
        >
          <Clock className="w-4 h-4 text-neutral-600" />
          <span>Ver Meu Turno</span>
        </button>

      </div>

      <p className="text-xs text-neutral-500">
        Para acessar a gestão, encerre esta sessão e entre com o usuário administrador e o PIN correspondente.
      </p>
    </div>
  );
};
