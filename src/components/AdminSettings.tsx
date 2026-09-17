import React, { useState } from 'react';
import { User, Store } from '../types';
import { 
  Settings, 
  Store as StoreIcon, 
  Users as UsersIcon, 
  Clock, 
  Percent, 
  CreditCard, 
  ShieldCheck, 
  Save, 
  KeyRound, 
  Database,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface AdminSettingsProps {
  currentUser: User;
  store: Store;
  users: User[];
  onRefresh: () => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({
  currentUser,
  store,
  users,
  onRefresh,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'empresa' | 'usuarios' | 'jornadas' | 'caixa_descontos' | 'dados'>('empresa');
  
  // Store info form
  const [tradeName, setTradeName] = useState(store.tradeName || 'Drogaria FarmaVida');
  const [legalName, setLegalName] = useState(store.name || 'FarmaVida Drogaria Ltda');
  const [cnpj, setCnpj] = useState(store.cnpj || '12.345.678/0001-90');
  const [phone, setPhone] = useState(store.phone || '(11) 3456-7890');
  const [address, setAddress] = useState(store.address || 'Av. Central da Saúde, 450 - Centro');

  // Rules form
  const [maxDiscountPercent, setMaxDiscountPercent] = useState<number>(store.settings?.maxDiscountWithoutAuthPercent || 12);
  const [enableLotTracking, setEnableLotTracking] = useState<boolean>(store.settings?.enableLotTracking ?? true);
  const [accessToleranceMinutes, setAccessToleranceMinutes] = useState<number>(15);
  const [defaultOpeningAmount, setDefaultOpeningAmount] = useState<number>(150);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      // Send update to server
      const res = await fetch('/api/store/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeName,
          name: legalName,
          cnpj,
          phone,
          address,
          userId: currentUser.id,
          settings: {
            maxDiscountWithoutAuthPercent: Number(maxDiscountPercent),
            enableLotTracking,
            accessToleranceMinutes: Number(accessToleranceMinutes),
            defaultOpeningAmount: Number(defaultOpeningAmount),
          },
        }),
      });

      const responseData = await res.json().catch(() => null);

      if (res.ok && responseData?.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3500);
        onRefresh();
      } else {
        setSaveError(responseData?.error || 'Erro ao salvar configurações no servidor.');
      }
    } catch (err: any) {
      console.error('Falha ao salvar configurações:', err);
      setSaveError('Erro de conexão ao salvar configurações.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-neutral-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-neutral-900">
              Configurações Gerais da Drogaria
            </h2>
            <p className="text-sm text-neutral-600 mt-0.5">
              Parâmetros operacionais centrais (P0): identificação da loja, tolerâncias de ponto, alçadas e segurança.
            </p>
          </div>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
            <CheckCircle2 className="w-4 h-4" />
            <span>Configurações salvas com sucesso!</span>
          </div>
        )}

        {saveError && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-100 text-red-800 text-xs font-bold border border-red-300">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span>{saveError}</span>
          </div>
        )}
      </div>

      {/* Sub tabs navigation */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-neutral-200 pb-2">
        <button
          onClick={() => setActiveSubTab('empresa')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
            activeSubTab === 'empresa'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
          }`}
        >
          <StoreIcon className="w-4 h-4" />
          <span>Empresa & Loja</span>
        </button>

        <button
          onClick={() => setActiveSubTab('usuarios')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
            activeSubTab === 'usuarios'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
          }`}
        >
          <UsersIcon className="w-4 h-4" />
          <span>Usuários & PINs ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('jornadas')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
            activeSubTab === 'jornadas'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Jornadas & Tolerâncias</span>
        </button>

        <button
          onClick={() => setActiveSubTab('caixa_descontos')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
            activeSubTab === 'caixa_descontos'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
          }`}
        >
          <Percent className="w-4 h-4" />
          <span>Caixa & Alçadas de Desconto</span>
        </button>

        <button
          onClick={() => setActiveSubTab('dados')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
            activeSubTab === 'dados'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Dados & Backup</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeSubTab === 'empresa' && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs space-y-5">
          <h3 className="text-base font-bold text-neutral-900 border-b pb-3">
            Identificação do Estabelecimento
          </h3>
          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-neutral-700 block mb-1">Nome Fantasia da Drogaria</label>
              <input
                type="text"
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-emerald-600"
                required
              />
            </div>
            <div>
              <label className="font-semibold text-neutral-700 block mb-1">Razão Social</label>
              <input
                type="text"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-emerald-600"
                required
              />
            </div>
            <div>
              <label className="font-semibold text-neutral-700 block mb-1">CNPJ</label>
              <input
                type="text"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-emerald-600"
                required
              />
            </div>
            <div>
              <label className="font-semibold text-neutral-700 block mb-1">Telefone Principal / WhatsApp</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="font-semibold text-neutral-700 block mb-1">Endereço Completo</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div className="pt-4 border-t flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </form>
      )}

      {activeSubTab === 'usuarios' && (
        <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-base font-bold text-neutral-900">
                Colaboradores & PINs de Balcão
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                PIN de 4 dígitos para identificação rápida no PDV e controle de alçadas.
              </p>
            </div>
          </div>

          <div className="divide-y divide-neutral-100">
            {users.map((u) => (
              <div key={u.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    {u.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral-900">{u.name}</span>
                      <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                        u.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {u.role === 'admin' ? 'Administrador' : 'Colaborador'}
                      </span>
                    </div>
                    <span className="text-neutral-500 text-[11px] block">{u.roleTitle || 'Balconista'} • {u.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 bg-neutral-100 px-3 py-1 rounded-lg border border-neutral-200 text-neutral-700">
                    <KeyRound className="w-3.5 h-3.5 text-neutral-500" />
                    <span className="font-mono font-bold tracking-widest">•••• ({u.pin})</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    u.active ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-600'
                  }`}>
                    {u.active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'jornadas' && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs space-y-5">
          <h3 className="text-base font-bold text-neutral-900 border-b pb-3">
            Tolerâncias de Ponto & Regras de Atraso
          </h3>
          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
              <label className="font-bold text-neutral-900 block">Tolerância de Acesso / Entrada (minutos)</label>
              <input
                type="number"
                value={accessToleranceMinutes}
                onChange={(e) => setAccessToleranceMinutes(Number(e.target.value))}
                min={5}
                max={60}
                className="w-full p-2.5 rounded-xl border border-neutral-300 bg-white"
              />
              <p className="text-[11px] text-neutral-500">
                Tempo antes do início da escala oficial em que o colaborador já pode bater o ponto.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
              <label className="font-bold text-neutral-900 block">Apontamento de Atraso Crítico</label>
              <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>Atrasos superiores a 15 minutos são destacados no painel da gerência com exigência de justificativa.</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Regras de Jornada</span>
            </button>
          </div>
        </form>
      )}

      {activeSubTab === 'caixa_descontos' && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs space-y-5">
          <h3 className="text-base font-bold text-neutral-900 border-b pb-3">
            Alçadas de Desconto & Regras de Caixa
          </h3>
          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
              <label className="font-bold text-neutral-900 block">Teto de Desconto Sem Gerência (%)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={maxDiscountPercent}
                  onChange={(e) => setMaxDiscountPercent(Number(e.target.value))}
                  min={0}
                  max={50}
                  className="w-full p-2.5 rounded-xl border border-neutral-300 bg-white"
                />
                <span className="font-bold text-neutral-700">%</span>
              </div>
              <p className="text-[11px] text-neutral-500">
                Descontos superiores a este valor são enviados automaticamente para a Central de Aprovações.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
              <label className="font-bold text-neutral-900 block">Fundo de Troco Sugerido na Abertura (R$)</label>
              <div className="flex items-center gap-2">
                <span className="font-bold text-neutral-700">R$</span>
                <input
                  type="number"
                  value={defaultOpeningAmount}
                  onChange={(e) => setDefaultOpeningAmount(Number(e.target.value))}
                  min={0}
                  step={10}
                  className="w-full p-2.5 rounded-xl border border-neutral-300 bg-white"
                />
              </div>
              <p className="text-[11px] text-neutral-500">
                Valor pré-preenchido como sugestão ao operador na abertura da gaveta física.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Parâmetros de Caixa</span>
            </button>
          </div>
        </form>
      )}

      {activeSubTab === 'dados' && (
        <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs space-y-5 text-xs">
          <h3 className="text-base font-bold text-neutral-900 border-b pb-3">
            Auditoria, Segurança e Backups
          </h3>
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-700" />
              <div>
                <h4 className="font-bold text-neutral-900">Banco de Dados Local com Backup Automático</h4>
                <p className="text-neutral-600 text-[11px]">
                  O FarmaVida realiza snapshots atômicos a cada modificação com trilha completa em AuditLog.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
