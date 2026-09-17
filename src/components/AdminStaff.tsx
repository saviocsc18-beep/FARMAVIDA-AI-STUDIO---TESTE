import React, { useState } from 'react';
import { User, WorkShift, Sale, SalesGoal } from '../types';
import { 
  Users, 
  Clock, 
  Target, 
  Percent, 
  Award, 
  DollarSign, 
  Coffee, 
  AlertCircle,
  Plus
} from 'lucide-react';

interface AdminStaffProps {
  users: User[];
  workShifts: WorkShift[];
  sales: Sale[];
  salesGoals: SalesGoal[];
  onSaveGoal: (goalData: any) => Promise<boolean>;
}

export const AdminStaff: React.FC<AdminStaffProps> = ({
  users,
  workShifts,
  sales,
  salesGoals,
  onSaveGoal,
}) => {
  const [activeTab, setActiveTab] = useState<'desempenho' | 'jornadas' | 'metas'>('desempenho');

  // Goal modal
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [goalAmountInput, setGoalAmountInput] = useState('20000');
  const [goalMonthInput, setGoalMonthInput] = useState('2026-09');

  // Compute staff performance metrics
  const staffMetrics = users.map((user) => {
    const userSales = sales.filter((s) => s.sellerId === user.id);
    const totalRevenue = userSales.reduce((acc, s) => acc + s.total, 0);
    const totalSubtotal = userSales.reduce((acc, s) => acc + s.subtotal, 0);
    const totalDiscounts = userSales.reduce((acc, s) => acc + s.totalDiscount, 0);
    const count = userSales.length;
    const avgTicket = count > 0 ? totalRevenue / count : 0;
    const discountRate = totalSubtotal > 0 ? (totalDiscounts / totalSubtotal) * 100 : 0;

    // Work shift status
    const currentShift = workShifts.find((ws) => ws.userId === user.id && ws.status !== 'encerrado');

    return {
      user,
      totalRevenue,
      totalDiscounts,
      discountRate,
      count,
      avgTicket,
      currentShift,
    };
  });

  // Sort by revenue descending
  staffMetrics.sort((a, b) => b.totalRevenue - a.totalRevenue);

  const handleSaveGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onSaveGoal({
      userId: selectedUserId || undefined,
      month: goalMonthInput,
      targetAmount: Number(goalAmountInput) || 10000,
    });

    if (success) {
      setIsGoalModalOpen(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-700" />
            <span>Gestão da Equipe, Jornadas & Descontos</span>
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Acompanhamento de vendas por atendente, auditoria de concessão de descontos e metas mensais.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Subtabs */}
          <div className="flex bg-neutral-100 p-0.5 rounded-lg border border-neutral-200 text-xs">
            <button
              onClick={() => setActiveTab('desempenho')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                activeTab === 'desempenho' ? 'bg-white text-emerald-900 shadow-xs' : 'text-neutral-600'
              }`}
            >
              Desempenho & Descontos
            </button>
            <button
              onClick={() => setActiveTab('jornadas')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                activeTab === 'jornadas' ? 'bg-white text-emerald-900 shadow-xs' : 'text-neutral-600'
              }`}
            >
              Jornadas & Turnos
            </button>
            <button
              onClick={() => setActiveTab('metas')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                activeTab === 'metas' ? 'bg-white text-emerald-900 shadow-xs' : 'text-neutral-600'
              }`}
            >
              Metas do Mês
            </button>
          </div>

          <button
            onClick={() => {
              setSelectedUserId('');
              setIsGoalModalOpen(true);
            }}
            className="px-3.5 py-2 bg-emerald-700 text-white text-xs font-bold rounded-lg hover:bg-emerald-800 transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Definir Meta</span>
          </button>
        </div>
      </div>

      {activeTab === 'desempenho' && (
        <div className="space-y-6">
          {/* Performance Table with Discount Audit */}
          <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
              <h3 className="font-bold text-neutral-900 text-sm">
                Desempenho de Vendas e Auditoria de Descontos por Colaborador
              </h3>
              <span className="text-xs text-neutral-500">
                Auditoria rigorosa de descontos para proteção da margem da farmácia
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-100 text-neutral-600 font-semibold border-b border-neutral-200">
                  <tr>
                    <th className="py-3 px-4">Colaborador</th>
                    <th className="py-3 px-4">Cargo / Função</th>
                    <th className="py-3 px-4 text-center">Atendimentos</th>
                    <th className="py-3 px-4 text-right">Faturamento Total</th>
                    <th className="py-3 px-4 text-right">Ticket Médio</th>
                    <th className="py-3 px-4 text-right">Descontos Concedidos</th>
                    <th className="py-3 px-4 text-right">Taxa Média Desconto</th>
                    <th className="py-3 px-4">Status Jornada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-neutral-800">
                  {staffMetrics.map((item, idx) => (
                    <tr key={item.user.id} className="hover:bg-neutral-50">
                      <td className="py-3 px-4">
                        <div className="font-bold text-neutral-900 flex items-center gap-1.5">
                          {idx === 0 && <Award className="w-3.5 h-3.5 text-amber-500" />}
                          <span>{item.user.name}</span>
                        </div>
                        <div className="text-[10px] text-neutral-400">PIN: ****</div>
                      </td>

                      <td className="py-3 px-4 text-neutral-600">
                        {item.user.roleTitle || item.user.role}
                      </td>

                      <td className="py-3 px-4 text-center font-semibold">
                        {item.count} vendas
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-emerald-800 text-sm">
                        R$ {(item.totalRevenue || 0).toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-right font-medium">
                        R$ {(item.avgTicket || 0).toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-right text-amber-900 font-semibold">
                        R$ {(item.totalDiscounts || 0).toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                          (item.discountRate || 0) > 6 
                            ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                            : 'bg-neutral-100 text-neutral-700'
                        }`}>
                          {(item.discountRate || 0).toFixed(1)}%
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {item.currentShift ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Em Turno</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-neutral-400">Fora do expediente</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'jornadas' && (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
            <h3 className="font-bold text-neutral-900 text-sm">
              Registro de Expedientes e Intervalos da Equipe
            </h3>
            <span className="text-xs text-neutral-500">{workShifts.length} turnos registrados</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-100 text-neutral-600 font-semibold border-b border-neutral-200">
                <tr>
                  <th className="py-2.5 px-4">Data</th>
                  <th className="py-2.5 px-4">Colaborador</th>
                  <th className="py-2.5 px-4">Início</th>
                  <th className="py-2.5 px-4">Término</th>
                  <th className="py-2.5 px-4">Intervalos Registrados</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-neutral-800">
                {workShifts.map((ws) => (
                  <tr key={ws.id} className="hover:bg-neutral-50">
                    <td className="py-2.5 px-4 font-medium">{ws.date}</td>
                    <td className="py-2.5 px-4 font-bold text-neutral-900">{ws.userName}</td>
                    <td className="py-2.5 px-4">{new Date(ws.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="py-2.5 px-4">
                      {ws.endedAt ? new Date(ws.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Em andamento'}
                    </td>
                    <td className="py-2.5 px-4">
                      {(ws.breaks || []).length > 0 ? (
                        <span className="text-neutral-700">
                          {(ws.breaks || []).length} intervalo(s) ({(ws.breaks || []).map((b) => b.reason).join(', ')})
                        </span>
                      ) : (
                        <span className="text-neutral-400">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        ws.status === 'em_andamento' ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-600'
                      }`}>
                        {ws.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'metas' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {salesGoals.map((goal) => {
              const user = users.find((u) => u.id === goal.userId);
              const target = goal.targetAmount;
              const current = goal.currentAmount;
              const percent = target > 0 ? Math.min(100, (current / target) * 100) : 0;

              return (
                <div key={goal.id} className="p-5 rounded-xl bg-white border border-neutral-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-neutral-900 text-base">
                        {user ? user.name : 'Meta Geral da Loja FarmaVida'}
                      </h4>
                      <span className="text-xs text-neutral-500">
                        Referência: {goal.month} • {user ? user.roleTitle : 'Equipe Completa'}
                      </span>
                    </div>
                    <Target className="w-5 h-5 text-emerald-700" />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-neutral-600">Progresso Atual:</span>
                      <span className="text-emerald-800 font-bold">{(percent || 0).toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-3 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between text-xs pt-1 border-t border-neutral-100 text-neutral-600">
                    <div>
                      <span>Realizado: </span>
                      <strong className="text-emerald-900">R$ {(current || 0).toFixed(2)}</strong>
                    </div>
                    <div>
                      <span>Meta: </span>
                      <strong className="text-neutral-900">R$ {(target || 0).toFixed(2)}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal: Definir Meta */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-neutral-200 space-y-4">
            <h3 className="font-bold text-neutral-900 text-base">Definir Meta de Vendas</h3>

            <form onSubmit={handleSaveGoalSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-700 font-semibold mb-1">Colaborador / Alvo:</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900"
                >
                  <option value="">Meta Geral da Farmácia (Todos)</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.roleTitle || u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">Mês de Referência (YYYY-MM):</label>
                <input
                  type="month"
                  required
                  value={goalMonthInput}
                  onChange={(e) => setGoalMonthInput(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900"
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">Valor Alvo da Meta (R$):</label>
                <input
                  type="number"
                  required
                  step="100"
                  value={goalAmountInput}
                  onChange={(e) => setGoalAmountInput(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900 font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsGoalModalOpen(false)}
                  className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700 font-medium hover:bg-neutral-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 text-white font-semibold rounded-lg hover:bg-emerald-800"
                >
                  Salvar Meta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
