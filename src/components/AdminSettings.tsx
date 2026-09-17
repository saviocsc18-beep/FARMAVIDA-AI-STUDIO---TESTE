import React, { useState, useEffect } from 'react';
import { User, Store, Terminal, CategoryCommercialPolicy } from '../types';
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
  AlertTriangle,
  Monitor,
  Printer,
  Plus,
  Edit2,
  Trash2,
  UserPlus,
  Eye,
  EyeOff,
  QrCode,
  DollarSign,
  Boxes,
  Sparkles,
  Download,
  X,
  FileText
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
  const [activeSubTab, setActiveSubTab] = useState<
    'empresa' | 'usuarios' | 'terminais' | 'pagamentos' | 'caixa_descontos' | 'jornadas' | 'estoque_ia' | 'dados'
  >('empresa');

  // Terminals local state
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [loadingTerminals, setLoadingTerminals] = useState(false);

  // Store identification form
  const [tradeName, setTradeName] = useState(store.tradeName || 'Drogaria FarmaVida');
  const [legalName, setLegalName] = useState(store.name || 'FarmaVida Drogaria Ltda');
  const [cnpj, setCnpj] = useState(store.cnpj || '12.345.678/0001-90');
  const [phone, setPhone] = useState(store.phone || '(11) 3456-7890');
  const [address, setAddress] = useState(store.address || 'Av. Central da Saúde, 450 - Centro');

  // Cash & Discount rules form
  const [maxDiscountPercent, setMaxDiscountPercent] = useState<number>(store.settings?.maxDiscountWithoutAuthPercent || 12);
  const [enableLotTracking, setEnableLotTracking] = useState<boolean>(store.settings?.enableLotTracking ?? true);
  const [accessToleranceMinutes, setAccessToleranceMinutes] = useState<number>(store.settings?.accessToleranceMinutes || 15);
  const [defaultOpeningAmount, setDefaultOpeningAmount] = useState<number>(store.settings?.defaultOpeningAmount || 150);
  const [maxCashInDrawerAlert, setMaxCashInDrawerAlert] = useState<number>(store.settings?.cashSecurity?.maxCashInDrawerAlert || 800);
  const [maxRegisterDiscrepancyTolerance, setMaxRegisterDiscrepancyTolerance] = useState<number>(store.settings?.cashSecurity?.maxRegisterDiscrepancyTolerance || 2);

  // Pix config
  const [pixType, setPixType] = useState<'cnpj' | 'email' | 'telefone' | 'aleatoria'>(store.settings?.pixConfig?.type || 'cnpj');
  const [pixKey, setPixKey] = useState<string>(store.settings?.pixConfig?.key || store.cnpj || '12.345.678/0001-90');
  const [pixRecipient, setPixRecipient] = useState<string>(store.settings?.pixConfig?.recipientName || store.tradeName || 'Drogaria FarmaVida');
  const [pixBank, setPixBank] = useState<string>(store.settings?.pixConfig?.bankName || 'Banco do Brasil');

  // Card rates config
  const [cardDebitPercent, setCardDebitPercent] = useState<number>(store.settings?.cardRates?.debitPercent ?? 1.19);
  const [cardCreditSightPercent, setCardCreditSightPercent] = useState<number>(store.settings?.cardRates?.creditSightPercent ?? 2.89);
  const [cardCredit2to6Percent, setCardCredit2to6Percent] = useState<number>(store.settings?.cardRates?.creditInstallments2to6Percent ?? 4.49);
  const [cardCredit7to12Percent, setCardCredit7to12Percent] = useState<number>(store.settings?.cardRates?.creditInstallments7to12Percent ?? 6.99);

  // Print receipt config
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm' | 'A4'>(store.settings?.printConfig?.paperWidth || '80mm');
  const [footerMessage, setFooterMessage] = useState<string>(store.settings?.printConfig?.footerMessage || 'Agradecemos a sua preferência! FarmaVida cuidando da sua saúde.');
  const [autoPrintOnSale, setAutoPrintOnSale] = useState<boolean>(store.settings?.printConfig?.autoPrintOnSale ?? true);

  // Category Policies
  const defaultCategoryPolicies: CategoryCommercialPolicy[] = [
    { category: 'Medicamentos Éticos', targetMarginPercent: 22, maxDiscountPercent: 8 },
    { category: 'Genéricos', targetMarginPercent: 48, maxDiscountPercent: 25 },
    { category: 'Similares', targetMarginPercent: 42, maxDiscountPercent: 20 },
    { category: 'MIPs / Isentos', targetMarginPercent: 35, maxDiscountPercent: 12 },
    { category: 'Perfumaria & Higiene', targetMarginPercent: 38, maxDiscountPercent: 15 },
    { category: 'Dermocosméticos & Suplementos', targetMarginPercent: 32, maxDiscountPercent: 10 },
  ];
  const [categoryPolicies, setCategoryPolicies] = useState<CategoryCommercialPolicy[]>(
    store.settings?.categoryPolicies && store.settings.categoryPolicies.length > 0
      ? store.settings.categoryPolicies
      : defaultCategoryPolicies
  );

  // Inventory & AI config
  const [criticalExpiryDays, setCriticalExpiryDays] = useState<number>(store.settings?.inventoryAiConfig?.criticalExpiryDays || 60);
  const [minSafetyCoverageDays, setMinSafetyCoverageDays] = useState<number>(store.settings?.inventoryAiConfig?.minSafetyCoverageDays || 15);
  const [aiAnalysisFrequency, setAiAnalysisFrequency] = useState<'daily' | 'weekly' | 'manual'>(store.settings?.inventoryAiConfig?.aiAnalysisFrequency || 'daily');

  // Saving states
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // User CRUD Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormName, setUserFormName] = useState('');
  const [userFormEmail, setUserFormEmail] = useState('');
  const [userFormRole, setUserFormRole] = useState<'admin' | 'colaborador'>('colaborador');
  const [userFormRoleTitle, setUserFormRoleTitle] = useState('Balconista');
  const [userFormPhone, setUserFormPhone] = useState('');
  const [userFormPin, setUserFormPin] = useState('');
  const [userFormActive, setUserFormActive] = useState(true);
  const [userModalError, setUserModalError] = useState<string | null>(null);
  const [userModalLoading, setUserModalLoading] = useState(false);
  const [visiblePins, setVisiblePins] = useState<{ [key: string]: boolean }>({});

  // Terminal Modal State
  const [isTerminalModalOpen, setIsTerminalModalOpen] = useState(false);
  const [editingTerminal, setEditingTerminal] = useState<Terminal | null>(null);
  const [terminalFormName, setTerminalFormName] = useState('');
  const [terminalFormDrawer, setTerminalFormDrawer] = useState('');
  const [terminalFormNotes, setTerminalFormNotes] = useState('');
  const [terminalFormActive, setTerminalFormActive] = useState(true);
  const [terminalModalError, setTerminalModalError] = useState<string | null>(null);
  const [terminalModalLoading, setTerminalModalLoading] = useState(false);

  // Fetch terminals on mount
  const fetchTerminals = async () => {
    setLoadingTerminals(true);
    try {
      const res = await fetch('/api/terminals');
      if (res.ok) {
        const data = await res.json();
        setTerminals(data);
      }
    } catch (err) {
      console.error('Erro ao carregar terminais:', err);
    } finally {
      setLoadingTerminals(false);
    }
  };

  useEffect(() => {
    fetchTerminals();
  }, []);

  // Synchronize store props when store changes
  useEffect(() => {
    if (store) {
      setTradeName(store.tradeName || 'Drogaria FarmaVida');
      setLegalName(store.name || 'FarmaVida Drogaria Ltda');
      setCnpj(store.cnpj || '12.345.678/0001-90');
      setPhone(store.phone || '(11) 3456-7890');
      setAddress(store.address || 'Av. Central da Saúde, 450 - Centro');
      setMaxDiscountPercent(store.settings?.maxDiscountWithoutAuthPercent || 12);
      setEnableLotTracking(store.settings?.enableLotTracking ?? true);
      setAccessToleranceMinutes(store.settings?.accessToleranceMinutes || 15);
      setDefaultOpeningAmount(store.settings?.defaultOpeningAmount || 150);
      setMaxCashInDrawerAlert(store.settings?.cashSecurity?.maxCashInDrawerAlert || 800);
      setMaxRegisterDiscrepancyTolerance(store.settings?.cashSecurity?.maxRegisterDiscrepancyTolerance || 2);
      
      if (store.settings?.pixConfig) {
        setPixType(store.settings.pixConfig.type || 'cnpj');
        setPixKey(store.settings.pixConfig.key || '');
        setPixRecipient(store.settings.pixConfig.recipientName || '');
        setPixBank(store.settings.pixConfig.bankName || '');
      }

      if (store.settings?.cardRates) {
        setCardDebitPercent(store.settings.cardRates.debitPercent ?? 1.19);
        setCardCreditSightPercent(store.settings.cardRates.creditSightPercent ?? 2.89);
        setCardCredit2to6Percent(store.settings.cardRates.creditInstallments2to6Percent ?? 4.49);
        setCardCredit7to12Percent(store.settings.cardRates.creditInstallments7to12Percent ?? 6.99);
      }

      if (store.settings?.printConfig) {
        setPaperWidth(store.settings.printConfig.paperWidth || '80mm');
        setFooterMessage(store.settings.printConfig.footerMessage || '');
        setAutoPrintOnSale(store.settings.printConfig.autoPrintOnSale ?? true);
      }

      if (store.settings?.categoryPolicies && store.settings.categoryPolicies.length > 0) {
        setCategoryPolicies(store.settings.categoryPolicies);
      }

      if (store.settings?.inventoryAiConfig) {
        setCriticalExpiryDays(store.settings.inventoryAiConfig.criticalExpiryDays || 60);
        setMinSafetyCoverageDays(store.settings.inventoryAiConfig.minSafetyCoverageDays || 15);
        setAiAnalysisFrequency(store.settings.inventoryAiConfig.aiAnalysisFrequency || 'daily');
      }
    }
  }, [store]);

  const togglePinVisibility = (userId: string) => {
    setVisiblePins((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  const handleSaveAllSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const payload = {
        tradeName: tradeName.trim(),
        name: legalName.trim(),
        cnpj: cnpj.trim(),
        phone: phone.trim(),
        address: address.trim(),
        userId: currentUser.id,
        settings: {
          maxDiscountWithoutAuthPercent: Number(maxDiscountPercent),
          enableLotTracking,
          accessToleranceMinutes: Number(accessToleranceMinutes),
          defaultOpeningAmount: Number(defaultOpeningAmount),
          defaultPaymentMethods: ['dinheiro', 'pix', 'cartao_debito', 'cartao_credito'],
          pixConfig: {
            type: pixType,
            key: pixKey.trim(),
            recipientName: pixRecipient.trim(),
            bankName: pixBank.trim(),
          },
          cardRates: {
            debitPercent: Number(cardDebitPercent),
            creditSightPercent: Number(cardCreditSightPercent),
            creditInstallments2to6Percent: Number(cardCredit2to6Percent),
            creditInstallments7to12Percent: Number(cardCredit7to12Percent),
          },
          cashSecurity: {
            maxCashInDrawerAlert: Number(maxCashInDrawerAlert),
            maxRegisterDiscrepancyTolerance: Number(maxRegisterDiscrepancyTolerance),
          },
          printConfig: {
            paperWidth,
            footerMessage: footerMessage.trim(),
            autoPrintOnSale,
          },
          categoryPolicies,
          inventoryAiConfig: {
            criticalExpiryDays: Number(criticalExpiryDays),
            minSafetyCoverageDays: Number(minSafetyCoverageDays),
            aiAnalysisFrequency,
          },
        },
      };

      const res = await fetch('/api/store/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseData = await res.json().catch(() => null);

      if (res.ok && responseData?.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
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

  // Open modal to add user
  const handleOpenAddUser = () => {
    setEditingUser(null);
    setUserFormName('');
    setUserFormEmail('');
    setUserFormRole('colaborador');
    setUserFormRoleTitle('Balconista');
    setUserFormPhone('');
    setUserFormPin('');
    setUserFormActive(true);
    setUserModalError(null);
    setIsUserModalOpen(true);
  };

  // Open modal to edit user
  const handleOpenEditUser = (user: User) => {
    setEditingUser(user);
    setUserFormName(user.name);
    setUserFormEmail(user.email);
    setUserFormRole(user.role);
    setUserFormRoleTitle(user.roleTitle || (user.role === 'admin' ? 'Gerente' : 'Balconista'));
    setUserFormPhone(user.phone || '');
    setUserFormPin(user.pin);
    setUserFormActive(user.active);
    setUserModalError(null);
    setIsUserModalOpen(true);
  };

  // Submit User (create or edit)
  const handleSaveUserModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserModalError(null);
    setUserModalLoading(true);

    try {
      if (editingUser) {
        // PUT
        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: userFormName,
            email: userFormEmail,
            role: userFormRole,
            roleTitle: userFormRoleTitle,
            phone: userFormPhone,
            pin: userFormPin,
            active: userFormActive,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Erro ao atualizar colaborador.');
        }
      } else {
        // POST
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: userFormName,
            email: userFormEmail,
            role: userFormRole,
            roleTitle: userFormRoleTitle,
            phone: userFormPhone,
            pin: userFormPin,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Erro ao cadastrar novo colaborador.');
        }
      }

      setIsUserModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setUserModalError(err.message || 'Falha ao salvar colaborador.');
    } finally {
      setUserModalLoading(false);
    }
  };

  // Inactivate user
  const handleToggleUserStatus = async (user: User) => {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !user.active }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Erro ao alterar status do colaborador:', err);
    }
  };

  // Terminal Modal handlers
  const handleOpenAddTerminal = () => {
    setEditingTerminal(null);
    setTerminalFormName(`Terminal Balcão 0${terminals.length + 1}`);
    setTerminalFormDrawer(`Gaveta Balcão 0${terminals.length + 1}`);
    setTerminalFormNotes('');
    setTerminalFormActive(true);
    setTerminalModalError(null);
    setIsTerminalModalOpen(true);
  };

  const handleOpenEditTerminal = (terminal: Terminal) => {
    setEditingTerminal(terminal);
    setTerminalFormName(terminal.name);
    setTerminalFormDrawer(terminal.drawerName || '');
    setTerminalFormNotes(terminal.notes || '');
    setTerminalFormActive(terminal.active);
    setTerminalModalError(null);
    setIsTerminalModalOpen(true);
  };

  const handleSaveTerminalModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setTerminalModalError(null);
    setTerminalModalLoading(true);

    try {
      if (editingTerminal) {
        const res = await fetch(`/api/terminals/${editingTerminal.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: terminalFormName,
            drawerName: terminalFormDrawer,
            notes: terminalFormNotes,
            active: terminalFormActive,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Erro ao atualizar terminal.');
        }
      } else {
        const res = await fetch('/api/terminals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: terminalFormName,
            drawerName: terminalFormDrawer,
            notes: terminalFormNotes,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Erro ao cadastrar terminal.');
        }
      }

      setIsTerminalModalOpen(false);
      fetchTerminals();
    } catch (err: any) {
      setTerminalModalError(err.message || 'Falha ao salvar terminal.');
    } finally {
      setTerminalModalLoading(false);
    }
  };

  const handleDeleteTerminal = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover este terminal de atendimento?')) return;
    try {
      const res = await fetch(`/api/terminals/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Não foi possível remover o terminal.');
        return;
      }
      fetchTerminals();
    } catch (err) {
      alert('Erro de conexão ao remover terminal.');
    }
  };

  // Update a single category policy
  const handleUpdateCategoryPolicy = (index: number, field: keyof CategoryCommercialPolicy, value: any) => {
    const updated = [...categoryPolicies];
    updated[index] = { ...updated[index], [field]: Number(value) };
    setCategoryPolicies(updated);
  };

  // Export full backup JSON
  const handleExportBackup = () => {
    const backupData = {
      exportedAt: new Date().toISOString(),
      store,
      users: users.map(u => ({ ...u, pin: '••••' })),
      terminals,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `farmavida_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
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
            <p className="text-xs sm:text-sm text-neutral-600 mt-0.5">
              Centro de controle e parametrização: usuários, terminais PDV, taxas, regras de caixa, impressão e estoque.
            </p>
          </div>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span>Configurações salvas com sucesso!</span>
          </div>
        )}

        {saveError && (
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-100 text-red-800 text-xs font-bold border border-red-300">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-neutral-200 pb-2 no-scrollbar">
        <button
          onClick={() => setActiveSubTab('empresa')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
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
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
            activeSubTab === 'usuarios'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
          }`}
        >
          <UsersIcon className="w-4 h-4" />
          <span>Usuários & Acessos ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('terminais')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
            activeSubTab === 'terminais'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
          }`}
        >
          <Monitor className="w-4 h-4" />
          <span>Terminais & Impressão</span>
        </button>

        <button
          onClick={() => setActiveSubTab('pagamentos')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
            activeSubTab === 'pagamentos'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Pix & Taxas de Cartão</span>
        </button>

        <button
          onClick={() => setActiveSubTab('caixa_descontos')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
            activeSubTab === 'caixa_descontos'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
          }`}
        >
          <Percent className="w-4 h-4" />
          <span>Caixa, Sangria & Alçadas</span>
        </button>

        <button
          onClick={() => setActiveSubTab('jornadas')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
            activeSubTab === 'jornadas'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Jornadas & Ponto</span>
        </button>

        <button
          onClick={() => setActiveSubTab('estoque_ia')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
            activeSubTab === 'estoque_ia'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Estoque, Margens & IA</span>
        </button>

        <button
          onClick={() => setActiveSubTab('dados')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
            activeSubTab === 'dados'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Auditoria & Backup</span>
        </button>
      </div>

      {/* 1. EMPRESA & LOJA */}
      {activeSubTab === 'empresa' && (
        <form onSubmit={handleSaveAllSettings} className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-neutral-900">
                Identificação do Estabelecimento
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Dados cadastrais que aparecem nos cupons de venda, relatórios e cabeçalhos do sistema.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200">
              Loja Matriz Ativa
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-neutral-700 block mb-1">Nome Fantasia da Drogaria</label>
              <input
                type="text"
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-emerald-600 text-neutral-900"
                required
              />
            </div>
            <div>
              <label className="font-semibold text-neutral-700 block mb-1">Razão Social</label>
              <input
                type="text"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-emerald-600 text-neutral-900"
                required
              />
            </div>
            <div>
              <label className="font-semibold text-neutral-700 block mb-1">CNPJ</label>
              <input
                type="text"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-emerald-600 text-neutral-900 font-mono"
                required
              />
            </div>
            <div>
              <label className="font-semibold text-neutral-700 block mb-1">Telefone Principal / WhatsApp</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-emerald-600 text-neutral-900"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="font-semibold text-neutral-700 block mb-1">Endereço Completo</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-emerald-600 text-neutral-900"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-100 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Salvando...' : 'Salvar Dados da Drogaria'}</span>
            </button>
          </div>
        </form>
      )}

      {/* 2. USUÁRIOS & ACESSOS (CRUD COMPLETO) */}
      {activeSubTab === 'usuarios' && (
        <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-neutral-900">
                Colaboradores & Acessos ao Sistema
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Cadastre balconistas, farmacêuticos e gerentes com controle de PIN rápido de 4 dígitos para o PDV.
              </p>
            </div>
            <button
              onClick={handleOpenAddUser}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Novo Colaborador</span>
            </button>
          </div>

          <div className="divide-y divide-neutral-100">
            {users.map((u) => {
              const isPinVisible = visiblePins[u.id];
              return (
                <div key={u.id} className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm shrink-0">
                      {u.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-neutral-900 text-sm">{u.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.role === 'admin' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          {u.role === 'admin' ? 'Administrador' : 'Colaborador'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.active ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'
                        }`}>
                          {u.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      <div className="text-neutral-500 text-[11px] mt-0.5 flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-neutral-700">{u.roleTitle || 'Balconista'}</span>
                        <span>•</span>
                        <span>{u.email}</span>
                        {u.phone && (
                          <>
                            <span>•</span>
                            <span>{u.phone}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
                    <div className="flex items-center gap-2 bg-neutral-100 px-3 py-1.5 rounded-xl border border-neutral-200 text-neutral-700">
                      <KeyRound className="w-3.5 h-3.5 text-neutral-500" />
                      <span className="font-mono font-bold tracking-widest text-xs">
                        {isPinVisible ? u.pin : '••••'}
                      </span>
                      <button
                        type="button"
                        onClick={() => togglePinVisibility(u.id)}
                        className="text-neutral-400 hover:text-neutral-700 transition-colors ml-1"
                        title={isPinVisible ? 'Ocultar PIN' : 'Visualizar PIN'}
                      >
                        {isPinVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <button
                      onClick={() => handleOpenEditUser(u)}
                      className="px-3 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-bold flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
                      title="Editar Colaborador"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-neutral-500" />
                      <span>Editar</span>
                    </button>

                    <button
                      onClick={() => handleToggleUserStatus(u)}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                        u.active 
                          ? 'border border-red-200 text-red-600 hover:bg-red-50' 
                          : 'border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                      }`}
                      title={u.active ? 'Inativar Colaborador' : 'Ativar Colaborador'}
                    >
                      {u.active ? 'Inativar' : 'Ativar'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. TERMINAIS & IMPRESSÃO */}
      {activeSubTab === 'terminais' && (
        <div className="space-y-6">
          {/* Terminals list */}
          <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  Pontos de Atendimento (Terminais PDV)
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Gerencie os terminais de balcão e caixas rápidos vinculados às gavetas físicas da loja.
                </p>
              </div>
              <button
                onClick={handleOpenAddTerminal}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Terminal</span>
              </button>
            </div>

            {loadingTerminals ? (
              <div className="py-8 text-center text-xs text-neutral-500">Carregando terminais...</div>
            ) : terminals.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-500">Nenhum terminal cadastrado.</div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {terminals.map((term) => {
                  const hasActiveCash = Boolean((term as any).activeCashRegister);
                  return (
                    <div key={term.id} className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-white transition-all space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                            <Monitor className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-neutral-900 text-sm">{term.name}</h4>
                            <span className="text-[11px] text-neutral-500 font-mono">{term.id}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            hasActiveCash ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-neutral-200 text-neutral-700'
                          }`}>
                            {hasActiveCash ? 'Caixa Aberto' : 'Caixa Fechado'}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-neutral-600 bg-white p-2.5 rounded-lg border border-neutral-100 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Gaveta Física:</span>
                          <span className="font-semibold text-neutral-800">{term.drawerName || 'Gaveta Padrão'}</span>
                        </div>
                        {term.notes && (
                          <div className="flex justify-between">
                            <span className="text-neutral-500">Observações:</span>
                            <span className="text-neutral-700">{term.notes}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => handleOpenEditTerminal(term)}
                          className="px-2.5 py-1 text-[11px] font-bold text-neutral-700 hover:bg-neutral-200 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3 text-neutral-500" />
                          <span>Editar</span>
                        </button>
                        <button
                          onClick={() => handleDeleteTerminal(term.id)}
                          className="px-2.5 py-1 text-[11px] font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                          <span>Excluir</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Receipt Print Config Form */}
          <form onSubmit={handleSaveAllSettings} className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs space-y-6">
            <div className="border-b border-neutral-100 pb-3">
              <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-700" />
                <span>Configuração de Impressão de Cupom do Balcão</span>
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Formato do papel para impressoras térmicas e mensagens personalizadas de rodapé.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Formato / Largura do Papel</label>
                <select
                  value={paperWidth}
                  onChange={(e) => setPaperWidth(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-emerald-600 bg-white"
                >
                  <option value="80mm">Bobina Térmica 80mm (Padrão de Balcão)</option>
                  <option value="58mm">Bobina Térmica 58mm (Compacta)</option>
                  <option value="A4">Folha Sulfite A4 (Comprovante Extenso)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Impressão Automática no PDV</label>
                <select
                  value={autoPrintOnSale ? 'true' : 'false'}
                  onChange={(e) => setAutoPrintOnSale(e.target.value === 'true')}
                  className="w-full p-2.5 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-emerald-600 bg-white"
                >
                  <option value="true">Sim (Abrir diálogo de impressão automaticamente ao concluir venda)</option>
                  <option value="false">Não (Emitir cupom somente sob demanda do cliente)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="font-semibold text-neutral-700 block mb-1">Mensagem de Rodapé do Cupom</label>
                <textarea
                  value={footerMessage}
                  onChange={(e) => setFooterMessage(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-emerald-600 text-neutral-900"
                  placeholder="Ex: Agradecemos a preferência! Disk Farmácia: (11) 3456-7890"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-100 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Configuração de Impressão</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. PIX & TAXAS DE CARTÃO */}
      {activeSubTab === 'pagamentos' && (
        <form onSubmit={handleSaveAllSettings} className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs space-y-6">
          <div className="border-b border-neutral-100 pb-3">
            <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-emerald-700" />
              <span>Chave Pix Oficial da Loja & Taxas de Maquininha</span>
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Parametrize os dados do Pix para conferência no caixa e as taxas de adquirentes para apuração de receita líquida.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-neutral-800 text-xs uppercase tracking-wider text-emerald-800">
              1. Chave Pix para Recebimento em Balcão
            </h4>
            <div className="grid sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Tipo de Chave</label>
                <select
                  value={pixType}
                  onChange={(e) => setPixType(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-neutral-300 bg-white"
                >
                  <option value="cnpj">CNPJ da Empresa</option>
                  <option value="email">E-mail Comercial</option>
                  <option value="telefone">Celular / WhatsApp</option>
                  <option value="aleatoria">Chave Aleatória (EVP)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Chave Pix Oficial</label>
                <input
                  type="text"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-neutral-300 font-mono text-neutral-900"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Nome do Titular da Conta</label>
                <input
                  type="text"
                  value={pixRecipient}
                  onChange={(e) => setPixRecipient(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-neutral-300 text-neutral-900"
                  required
                />
              </div>

              <div className="sm:col-span-3">
                <label className="font-semibold text-neutral-700 block mb-1">Instituição Financeira / Banco</label>
                <input
                  type="text"
                  value={pixBank}
                  onChange={(e) => setPixBank(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-neutral-300 text-neutral-900"
                  placeholder="Ex: Banco Itaú / Nubank / Banco do Brasil"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-neutral-100">
            <h4 className="font-bold text-neutral-800 text-xs uppercase tracking-wider text-emerald-800 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-700" />
              <span>2. Taxas de Adquirentes (Maquininhas de Cartão)</span>
            </h4>
            <p className="text-[11px] text-neutral-500">
              As taxas são deduzidas no DRE gerencial para fornecer o faturamento líquido real da drogaria.
            </p>

            <div className="grid sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
                <label className="font-bold text-neutral-800 block mb-1">Cartão Débito (%)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    max={20}
                    value={cardDebitPercent}
                    onChange={(e) => setCardDebitPercent(Number(e.target.value))}
                    className="w-full p-2 rounded-lg border border-neutral-300 bg-white font-mono"
                  />
                  <span className="font-bold text-neutral-600">%</span>
                </div>
              </div>

              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
                <label className="font-bold text-neutral-800 block mb-1">Crédito à Vista (%)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    max={20}
                    value={cardCreditSightPercent}
                    onChange={(e) => setCardCreditSightPercent(Number(e.target.value))}
                    className="w-full p-2 rounded-lg border border-neutral-300 bg-white font-mono"
                  />
                  <span className="font-bold text-neutral-600">%</span>
                </div>
              </div>

              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
                <label className="font-bold text-neutral-800 block mb-1">Crédito 2x a 6x (%)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    max={30}
                    value={cardCredit2to6Percent}
                    onChange={(e) => setCardCredit2to6Percent(Number(e.target.value))}
                    className="w-full p-2 rounded-lg border border-neutral-300 bg-white font-mono"
                  />
                  <span className="font-bold text-neutral-600">%</span>
                </div>
              </div>

              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
                <label className="font-bold text-neutral-800 block mb-1">Crédito 7x a 12x (%)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    max={40}
                    value={cardCredit7to12Percent}
                    onChange={(e) => setCardCredit7to12Percent(Number(e.target.value))}
                    className="w-full p-2 rounded-lg border border-neutral-300 bg-white font-mono"
                  />
                  <span className="font-bold text-neutral-600">%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-100 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Parâmetros Financeiros</span>
            </button>
          </div>
        </form>
      )}

      {/* 5. CAIXA, SANGRIA & ALÇADAS */}
      {activeSubTab === 'caixa_descontos' && (
        <form onSubmit={handleSaveAllSettings} className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs space-y-6">
          <div className="border-b border-neutral-100 pb-3">
            <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
              <Percent className="w-5 h-5 text-emerald-700" />
              <span>Políticas de Caixa, Alçadas de Desconto & Sangrias</span>
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Proteja o fluxo de caixa físico da drogaria com tetos de desconto e alertas automáticos de segurança.
            </p>
          </div>

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
                  className="w-full p-2.5 rounded-xl border border-neutral-300 bg-white text-neutral-900"
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
                  className="w-full p-2.5 rounded-xl border border-neutral-300 bg-white text-neutral-900"
                />
              </div>
              <p className="text-[11px] text-neutral-500">
                Valor pré-preenchido como sugestão ao operador na abertura da gaveta física.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
              <label className="font-bold text-neutral-900 block flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Alerta de Sangria de Segurança na Gaveta (R$)</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="font-bold text-neutral-700">R$</span>
                <input
                  type="number"
                  value={maxCashInDrawerAlert}
                  onChange={(e) => setMaxCashInDrawerAlert(Number(e.target.value))}
                  min={100}
                  step={50}
                  className="w-full p-2.5 rounded-xl border border-neutral-300 bg-white text-neutral-900"
                />
              </div>
              <p className="text-[11px] text-neutral-500">
                Quando o dinheiro físico em gaveta atingir este montante, o PDV avisa o operador para efetuar sangria.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
              <label className="font-bold text-neutral-900 block">Tolerância de Divergência de Fechamento (R$)</label>
              <div className="flex items-center gap-2">
                <span className="font-bold text-neutral-700">R$</span>
                <input
                  type="number"
                  value={maxRegisterDiscrepancyTolerance}
                  onChange={(e) => setMaxRegisterDiscrepancyTolerance(Number(e.target.value))}
                  min={0}
                  step={0.5}
                  className="w-full p-2.5 rounded-xl border border-neutral-300 bg-white text-neutral-900"
                />
              </div>
              <p className="text-[11px] text-neutral-500">
                Divergências de quebra de caixa até este valor são aceitas sem bloqueio na conferência da tesouraria.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-100 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Parâmetros de Caixa</span>
            </button>
          </div>
        </form>
      )}

      {/* 6. JORNADAS & PONTO */}
      {activeSubTab === 'jornadas' && (
        <form onSubmit={handleSaveAllSettings} className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs space-y-6">
          <div className="border-b border-neutral-100 pb-3">
            <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-700" />
              <span>Tolerâncias de Ponto & Regras de Atraso</span>
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Parâmetros para validação de entrada, tolerância de escala e alertas de atrasos.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
              <label className="font-bold text-neutral-900 block">Tolerância de Acesso / Entrada (minutos)</label>
              <input
                type="number"
                value={accessToleranceMinutes}
                onChange={(e) => setAccessToleranceMinutes(Number(e.target.value))}
                min={5}
                max={60}
                className="w-full p-2.5 rounded-xl border border-neutral-300 bg-white text-neutral-900"
              />
              <p className="text-[11px] text-neutral-500">
                Tempo antes do início da escala oficial em que o colaborador já pode bater o ponto.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
              <label className="font-bold text-neutral-900 block">Apontamento de Atraso Crítico</label>
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>Atrasos superiores a 15 minutos são destacados no painel da gerência com exigência de justificativa.</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-100 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Regras de Jornada</span>
            </button>
          </div>
        </form>
      )}

      {/* 7. ESTOQUE, MARGENS & IA */}
      {activeSubTab === 'estoque_ia' && (
        <form onSubmit={handleSaveAllSettings} className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs space-y-6">
          <div className="border-b border-neutral-100 pb-3">
            <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
              <Boxes className="w-5 h-5 text-emerald-700" />
              <span>Políticas de Margem por Categoria & Parâmetros de IA</span>
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Margens alvo, tetos de desconto por linha de produto e sensibilidade dos diagnósticos automáticos.
            </p>
          </div>

          {/* Margins Table */}
          <div className="space-y-3">
            <h4 className="font-bold text-neutral-800 text-xs uppercase tracking-wider text-emerald-800">
              1. Margem Alvo & Teto de Desconto por Categoria
            </h4>

            <div className="overflow-x-auto border border-neutral-200 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-100 text-neutral-700 font-bold border-b border-neutral-200">
                  <tr>
                    <th className="p-3">Categoria de Produto</th>
                    <th className="p-3">Margem Alvo Bruta (%)</th>
                    <th className="p-3">Teto Máx. de Desconto (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 bg-white">
                  {categoryPolicies.map((cat, idx) => (
                    <tr key={cat.category} className="hover:bg-neutral-50">
                      <td className="p-3 font-semibold text-neutral-800">{cat.category}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 w-32">
                          <input
                            type="number"
                            value={cat.targetMarginPercent}
                            onChange={(e) => handleUpdateCategoryPolicy(idx, 'targetMarginPercent', e.target.value)}
                            min={5}
                            max={90}
                            className="w-full p-1.5 rounded-lg border border-neutral-300 text-neutral-900"
                          />
                          <span className="font-bold text-neutral-500">%</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 w-32">
                          <input
                            type="number"
                            value={cat.maxDiscountPercent}
                            onChange={(e) => handleUpdateCategoryPolicy(idx, 'maxDiscountPercent', e.target.value)}
                            min={0}
                            max={60}
                            className="w-full p-1.5 rounded-lg border border-neutral-300 text-neutral-900"
                          />
                          <span className="font-bold text-neutral-500">%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Expiry and AI Params */}
          <div className="space-y-3 pt-4 border-t border-neutral-100">
            <h4 className="font-bold text-neutral-800 text-xs uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-700" />
              <span>2. Parâmetros de Validade & Inteligência Artificial</span>
            </h4>

            <div className="grid sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
                <label className="font-bold text-neutral-800 block mb-1">Validade Crítica (dias)</label>
                <input
                  type="number"
                  value={criticalExpiryDays}
                  onChange={(e) => setCriticalExpiryDays(Number(e.target.value))}
                  min={15}
                  max={180}
                  className="w-full p-2 rounded-lg border border-neutral-300 bg-white"
                />
                <p className="text-[10px] text-neutral-500 mt-1">
                  Lotes que vencem dentro deste prazo são destacados em vermelho.
                </p>
              </div>

              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
                <label className="font-bold text-neutral-800 block mb-1">Cobertura Mínima de Estoque (dias)</label>
                <input
                  type="number"
                  value={minSafetyCoverageDays}
                  onChange={(e) => setMinSafetyCoverageDays(Number(e.target.value))}
                  min={5}
                  max={60}
                  className="w-full p-2 rounded-lg border border-neutral-300 bg-white"
                />
                <p className="text-[10px] text-neutral-500 mt-1">
                  Dias de giro para sugestão de compra automática em cotações.
                </p>
              </div>

              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
                <label className="font-bold text-neutral-800 block mb-1">Frequência da Análise IA</label>
                <select
                  value={aiAnalysisFrequency}
                  onChange={(e) => setAiAnalysisFrequency(e.target.value as any)}
                  className="w-full p-2 rounded-lg border border-neutral-300 bg-white"
                >
                  <option value="daily">Diária (Recomendado)</option>
                  <option value="weekly">Semanal</option>
                  <option value="manual">Apenas Sob Demanda</option>
                </select>
                <p className="text-[10px] text-neutral-500 mt-1">
                  Geração de diagnósticos preditivos e sugestões executivas.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-100 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Políticas de Estoque & IA</span>
            </button>
          </div>
        </form>
      )}

      {/* 8. AUDITORIA & BACKUP */}
      {activeSubTab === 'dados' && (
        <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs space-y-6 text-xs">
          <div className="border-b border-neutral-100 pb-3">
            <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
              <span>Auditoria, Integridade e Backup de Dados</span>
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Snapshot em tempo real, garantia de imutabilidade de logs e exportação de segurança.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-emerald-700 shrink-0" />
                <div>
                  <h4 className="font-bold text-neutral-900">Banco de Dados Atômico</h4>
                  <p className="text-neutral-600 text-[11px]">
                    Todas as transações de venda, sangrias e movimentações de lote são registradas com trilha de auditoria completa.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-neutral-900">Exportar Backup JSON</h4>
                <p className="text-neutral-600 text-[11px] mt-0.5">
                  Baixe uma cópia instantânea dos dados estruturados da drogaria para custódia externa.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportBackup}
                className="px-4 py-2 bg-neutral-900 hover:bg-black text-white font-bold rounded-xl text-xs flex items-center gap-2 self-start cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Snapshot JSON</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOVO / EDITAR COLABORADOR */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="font-bold text-base text-neutral-900 flex items-center gap-2">
                <UsersIcon className="w-5 h-5 text-emerald-700" />
                <span>{editingUser ? 'Editar Colaborador' : 'Novo Colaborador'}</span>
              </h3>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {userModalError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{userModalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveUserModal} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Nome Completo</label>
                <input
                  type="text"
                  value={userFormName}
                  onChange={(e) => setUserFormName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-neutral-300 text-neutral-900 focus:ring-2 focus:ring-emerald-600"
                  placeholder="Ex: João Silveira"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-neutral-700 block mb-1">E-mail de Acesso</label>
                <input
                  type="email"
                  value={userFormEmail}
                  onChange={(e) => setUserFormEmail(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-neutral-300 text-neutral-900 focus:ring-2 focus:ring-emerald-600"
                  placeholder="Ex: joao@farmavida.com.br"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Perfil no Sistema</label>
                  <select
                    value={userFormRole}
                    onChange={(e) => {
                      const r = e.target.value as 'admin' | 'colaborador';
                      setUserFormRole(r);
                      if (r === 'admin' && userFormRoleTitle === 'Balconista') setUserFormRoleTitle('Gerente');
                    }}
                    className="w-full p-2.5 rounded-xl border border-neutral-300 bg-white"
                  >
                    <option value="colaborador">Colaborador (PDV)</option>
                    <option value="admin">Administrador (Total)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Cargo / Função</label>
                  <input
                    type="text"
                    value={userFormRoleTitle}
                    onChange={(e) => setUserFormRoleTitle(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-neutral-300 text-neutral-900"
                    placeholder="Ex: Balconista / Farmacêutico"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">PIN de Balcão (4 dígitos)</label>
                  <input
                    type="password"
                    maxLength={4}
                    value={userFormPin}
                    onChange={(e) => setUserFormPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full p-2.5 rounded-xl border border-neutral-300 text-neutral-900 font-mono tracking-widest text-center text-sm font-bold"
                    placeholder="1234"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={userFormPhone}
                    onChange={(e) => setUserFormPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-neutral-300 text-neutral-900"
                    placeholder="(11) 98765-4321"
                  />
                </div>
              </div>

              {editingUser && (
                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={userFormActive}
                      onChange={(e) => setUserFormActive(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-semibold text-neutral-800">Colaborador Ativo no Sistema</span>
                  </label>
                </div>
              )}

              <div className="pt-4 border-t border-neutral-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-300 text-neutral-700 font-bold hover:bg-neutral-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={userModalLoading}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {userModalLoading ? 'Salvando...' : editingUser ? 'Salvar Alterações' : 'Cadastrar Colaborador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVO / EDITAR TERMINAL */}
      {isTerminalModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="font-bold text-base text-neutral-900 flex items-center gap-2">
                <Monitor className="w-5 h-5 text-emerald-700" />
                <span>{editingTerminal ? 'Editar Terminal PDV' : 'Adicionar Terminal PDV'}</span>
              </h3>
              <button
                onClick={() => setIsTerminalModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {terminalModalError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{terminalModalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveTerminalModal} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Nome do Terminal</label>
                <input
                  type="text"
                  value={terminalFormName}
                  onChange={(e) => setTerminalFormName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-neutral-300 text-neutral-900 focus:ring-2 focus:ring-emerald-600"
                  placeholder="Ex: Terminal Balcão 01"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Nome da Gaveta Física Conectada</label>
                <input
                  type="text"
                  value={terminalFormDrawer}
                  onChange={(e) => setTerminalFormDrawer(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-neutral-300 text-neutral-900"
                  placeholder="Ex: Gaveta Balcão 01"
                />
              </div>

              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Observações de Localização</label>
                <input
                  type="text"
                  value={terminalFormNotes}
                  onChange={(e) => setTerminalFormNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-neutral-300 text-neutral-900"
                  placeholder="Ex: Próximo à entrada principal"
                />
              </div>

              <div className="pt-4 border-t border-neutral-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTerminalModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-300 text-neutral-700 font-bold hover:bg-neutral-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={terminalModalLoading}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {terminalModalLoading ? 'Salvando...' : editingTerminal ? 'Salvar Alterações' : 'Criar Terminal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
