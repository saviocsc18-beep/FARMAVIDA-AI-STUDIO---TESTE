import React, { useState } from 'react';
import { Task, AuditLog, User } from '../types';
import { 
  CheckSquare, 
  ShieldCheck, 
  Plus, 
  CheckCircle2, 
  Clock, 
  FileDown, 
  Upload, 
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

interface AdminTasksAndAuditProps {
  tasks: Task[];
  auditLogs: AuditLog[];
  currentUser: User;
  users: User[];
  onSaveTask: (taskData: any) => Promise<boolean>;
  onToggleTaskStatus: (taskId: string, currentStatus: string) => Promise<boolean>;
}

export const AdminTasksAndAudit: React.FC<AdminTasksAndAuditProps> = ({
  tasks,
  auditLogs,
  currentUser,
  users,
  onSaveTask,
  onToggleTaskStatus,
}) => {
  const [activeTab, setActiveTab] = useState<'tarefas' | 'auditoria' | 'backup'>('tarefas');

  // Task creation modal
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState<'alta' | 'media' | 'baixa'>('media');
  const [taskAssigneeId, setTaskAssigneeId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    const assignee = users.find((u) => u.id === taskAssigneeId);

    setIsSubmitting(true);
    const success = await onSaveTask({
      title: taskTitle.trim(),
      description: taskDescription.trim() || undefined,
      priority: taskPriority,
      assignedToId: assignee?.id,
      assignedToName: assignee?.name,
      status: 'pendente',
    });
    setIsSubmitting(false);

    if (success) {
      setIsTaskModalOpen(false);
      setTaskTitle('');
      setTaskDescription('');
    }
  };

  const handleDownloadBackup = async () => {
    try {
      const res = await fetch('/api/data/export');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_farmavida_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Falha ao baixar backup:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-emerald-700" />
            <span>Tarefas Administrativas & Trilha de Auditoria</span>
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Plano de ações operacionais, auditoria inviolável de eventos e segurança dos dados da loja.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Subtabs */}
          <div className="flex bg-neutral-100 p-0.5 rounded-lg border border-neutral-200 text-xs">
            <button
              onClick={() => setActiveTab('tarefas')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                activeTab === 'tarefas' ? 'bg-white text-emerald-900 shadow-xs' : 'text-neutral-600'
              }`}
            >
              Tarefas ({tasks.filter((t) => t.status !== 'concluida').length})
            </button>
            <button
              onClick={() => setActiveTab('auditoria')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                activeTab === 'auditoria' ? 'bg-white text-emerald-900 shadow-xs' : 'text-neutral-600'
              }`}
            >
              Auditoria ({auditLogs.length})
            </button>
            <button
              onClick={() => setActiveTab('backup')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                activeTab === 'backup' ? 'bg-white text-emerald-900 shadow-xs' : 'text-neutral-600'
              }`}
            >
              Backup & Restauração
            </button>
          </div>

          {activeTab === 'tarefas' && (
            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="px-3.5 py-2 bg-emerald-700 text-white text-xs font-bold rounded-lg hover:bg-emerald-800 transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Tarefa</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'tarefas' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['pendente', 'em_andamento', 'concluida'].map((colStatus) => {
            const colTasks = tasks.filter((t) => t.status === colStatus);
            const colTitle =
              colStatus === 'pendente'
                ? 'A Fazer (Pendentes)'
                : colStatus === 'em_andamento'
                ? 'Em Execução'
                : 'Concluídas';

            return (
              <div
                key={colStatus}
                className="bg-neutral-50/80 rounded-xl border border-neutral-200 p-4 space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
                  <h3 className="font-bold text-neutral-900 text-xs uppercase tracking-wider">
                    {colTitle}
                  </h3>
                  <span className="text-xs font-bold bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded-full">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {colTasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-white rounded-lg p-3.5 border border-neutral-200 shadow-xs space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-neutral-900 text-xs">{task.title}</h4>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          task.priority === 'alta'
                            ? 'bg-red-100 text-red-800'
                            : task.priority === 'media'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {task.priority}
                        </span>
                      </div>

                      {task.description && (
                        <p className="text-[11px] text-neutral-600 line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-[11px] text-neutral-500">
                        <span>Resp: <strong className="text-neutral-700">{task.assignedToName || 'Equipe'}</strong></span>
                        <button
                          onClick={() => onToggleTaskStatus(task.id, task.status)}
                          className="font-semibold text-emerald-700 hover:underline"
                        >
                          {task.status === 'concluida' ? 'Reabrir' : 'Avançar →'}
                        </button>
                      </div>
                    </div>
                  ))}

                  {colTasks.length === 0 && (
                    <div className="text-center py-6 text-neutral-400 text-xs">
                      Nenhuma tarefa nesta coluna.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'auditoria' && (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
            <h3 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Registro Cronológico de Eventos Críticos da Farmácia</span>
            </h3>
            <span className="text-xs text-neutral-500">
              Inviolável • Rastreabilidade ponta a ponta
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-100 text-neutral-600 font-semibold border-b border-neutral-200">
                <tr>
                  <th className="py-2.5 px-4">Data/Hora</th>
                  <th className="py-2.5 px-4">Ação</th>
                  <th className="py-2.5 px-4">Entidade</th>
                  <th className="py-2.5 px-4">Usuário</th>
                  <th className="py-2.5 px-4">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-neutral-800">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-50">
                    <td className="py-2.5 px-4 text-neutral-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleDateString()}{' '}
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>

                    <td className="py-2.5 px-4 font-bold text-neutral-900">
                      {log.action}
                    </td>

                    <td className="py-2.5 px-4">
                      <span className="bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded text-[10px] font-semibold uppercase">
                        {log.entityType}
                      </span>
                    </td>

                    <td className="py-2.5 px-4 font-medium text-neutral-800">
                      {log.userName}
                    </td>

                    <td className="py-2.5 px-4 text-neutral-600 max-w-sm truncate">
                      {log.details ? JSON.stringify(log.details) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'backup' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-white rounded-xl border border-neutral-200 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <FileDown className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-neutral-900 text-sm">Download do Banco de Dados Completo</h3>
                <p className="text-xs text-neutral-500">
                  Exporta todas as vendas, estoques, clientes e registros de turno em formato JSON estruturado.
                </p>
              </div>
            </div>

            <button
              onClick={handleDownloadBackup}
              className="w-full py-2.5 bg-emerald-700 text-white text-xs font-bold rounded-lg hover:bg-emerald-800 transition-colors shadow-xs flex items-center justify-center gap-2"
            >
              <FileDown className="w-4 h-4" />
              <span>Baixar Arquivo de Backup JSON</span>
            </button>
          </div>

          <div className="p-6 bg-white rounded-xl border border-neutral-200 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-neutral-900 text-sm">Integridade & Segurança dos Registros</h3>
                <p className="text-xs text-neutral-500">
                  Seus dados são salvos continuamente no disco local do servidor FarmaVida com backup JSON.
                </p>
              </div>
            </div>

            <div className="text-xs text-neutral-600 space-y-1 bg-neutral-50 p-3 rounded-lg border border-neutral-200">
              <div className="flex justify-between">
                <span>Versão do FarmaVida:</span>
                <strong className="text-neutral-800">2.0.0 (Sistema Principal)</strong>
              </div>
              <div className="flex justify-between">
                <span>Integração Fiscal:</span>
                <strong className="text-neutral-800">Satélite Desacoplado</strong>
              </div>
              <div className="flex justify-between">
                <span>Inteligência Artificial:</span>
                <strong className="text-emerald-700">Gemini 3.8 Flash</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nova Tarefa */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-neutral-200 space-y-4">
            <h3 className="font-bold text-neutral-900 text-base">Criar Tarefa Operacional</h3>

            <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-700 font-semibold mb-1">Título da Tarefa *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Conferir lote de antibióticos..."
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900"
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">Descrição Detalhada:</label>
                <textarea
                  rows={2}
                  placeholder="Instruções para o colaborador..."
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  className="w-full p-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">Prioridade:</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">Atribuir a:</label>
                  <select
                    value={taskAssigneeId}
                    onChange={(e) => setTaskAssigneeId(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900"
                  >
                    <option value="">Equipe Geral</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700 font-medium hover:bg-neutral-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-700 text-white font-semibold rounded-lg hover:bg-emerald-800"
                >
                  Criar Tarefa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
