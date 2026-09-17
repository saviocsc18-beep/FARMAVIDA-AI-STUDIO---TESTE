import React from 'react';
import { User } from '../types';
import { 
  HelpCircle, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  BookOpen, 
  ArrowRight,
  Sparkles,
  Info
} from 'lucide-react';

interface ContextualHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  currentUser: User;
}

interface HelpContent {
  title: string;
  subtitle: string;
  purpose: string;
  allowedActions: string[];
  workflowSteps: string[];
  rulesAndApprovals: string[];
  commonMistakesAndFixes: { problem: string; solution: string }[];
}

const HELP_DICTIONARY: Record<string, HelpContent> = {
  balcao: {
    title: 'Balcão & PDV (Ponto de Venda)',
    subtitle: 'Atendimento ao cliente, registro de itens, descontos e recebimentos',
    purpose: 'É o coração operacional da farmácia. Usado para registrar compras de forma ágil, aplicar descontos permitidos e emitir o Recibo Não Fiscal.',
    allowedActions: [
      'Consultar catálogo e conferir preços a qualquer momento (sem restrição de expediente)',
      'Buscar produtos por nome, dosagem ou bipar com leitor de código de barras USB',
      'Montar carrinho de atendimento e simular formas de pagamento',
      'Registrar demandas de balcão (produtos em falta ou não trabalhados)',
      'Finalizar vendas com expediente ativo e caixa aberto vinculado ao operador',
      'Dividir o pagamento em múltiplos métodos (Dinheiro com troco, Pix, Cartões)',
      'Emitir o Recibo Não Fiscal de controle operacional interno ao concluir'
    ],
    workflowSteps: [
      '1. Certifique-se de que seu Expediente está iniciado (Meu Turno) e seu Caixa está aberto (Meu Caixa).',
      '2. Bipe o código de barras ou digite o nome do medicamento na barra de busca.',
      '3. Confira o estoque disponível e adicione os itens ao carrinho.',
      '4. Adicione as formas de pagamento até liquidar o saldo devido.',
      '5. Clique em "Finalizar Venda (Balcão)" e entregue o Recibo Não Fiscal ao cliente.'
    ],
    rulesAndApprovals: [
      'REGRA DE OURO OP-03: Nenhuma venda pode ser finalizada sem Expediente Ativo E Caixa Aberto vinculado ao operador.',
      'A consulta de produtos e preços é livre mesmo sem expediente ou caixa.',
      'O comprovante emitido é estritamente um RECIBO NÃO FISCAL para controle operacional interno.',
      'Descontos acima da tolerância são bloqueados automaticamente e enviados à Central de Aprovações.',
      'Se o cliente procurar um produto sem estoque, clique em "Registrar Falta" para anotar a procura.'
    ],
    commonMistakesAndFixes: [
      {
        problem: 'O botão "Finalizar Venda" está desabilitado e há um aviso de "Expediente Não Iniciado".',
        solution: 'Clique no botão "Iniciar Expediente" diretamente no aviso para registrar sua entrada em "Meu Turno".'
      },
      {
        problem: 'Há um aviso de "Caixa Não Aberto" no carrinho de atendimento.',
        solution: 'Clique em "Abrir Meu Caixa" para informar o fundo de troco inicial e abrir sua sessão de caixa.'
      },
      {
        problem: 'O produto procurado não tem estoque suficiente.',
        solution: 'O sistema bloqueia vendas com quantidade superior ao saldo em estoque. Registre a falta no botão "Registrar Falta".'
      }
    ]
  },
  meu_caixa: {
    title: 'Meu Caixa Operacional',
    subtitle: 'Abertura, movimentações de troco, sangrias e fechamento transparente',
    purpose: 'Permite ao operador de balcão gerenciar sua gaveta de dinheiro com total clareza. Na FarmaVida, o fechamento NÃO É CEGO: o operador vê o valor esperado calculado pelo sistema, confere as cédulas físicas e declara o valor apurado. Diferenças apuradas exigem justificativa por escrito.',
    allowedActions: [
      'Abrir sessão de caixa informando o fundo de troco inicial real colocado na gaveta',
      'Registrar sangrias (retirada física de dinheiro) com justificativa por escrito obrigatória',
      'Registrar suprimentos (adicionais de troco) com motivo opcional',
      'Acompanhar em tempo real o dinheiro físico esperado e as vendas por método (Pix, débito e crédito não entram na gaveta)',
      'Realizar conferência orientada com apuração de diferença e confirmação física da sangria de recolhimento para o cofre'
    ],
    workflowSteps: [
      '1. Inicie seu expediente no módulo "Meu Turno & Ponto".',
      '2. Acesse "Meu Caixa" e clique em "Abrir Meu Caixa", confirmando a contagem do fundo de troco inicial.',
      '3. Ao longo do dia, opere o PDV. Se precisar retirar dinheiro para o cofre, registre uma "Sangria". Se adicionar moedas/cédulas de troco, registre um "Suprimento".',
      '4. No final do turno, clique em "Conferir / Fechar Caixa". Conte todas as cédulas e moedas físicas da gaveta e digite o valor apurado.',
      '5. Se houver diferença entre o esperado e o contado, preencha a justificativa por escrito obrigatória.',
      '6. Verifique o valor sugerido para o fundo do próximo turno e o valor para o cofre. Marque a confirmação de retirada física e clique em "Fechar Meu Caixa".'
    ],
    rulesAndApprovals: [
      'O fechamento da FarmaVida NÃO é cego: você visualiza os valores calculados pelo sistema para conferência precisa.',
      'Pix e cartões de débito/crédito são liquidados eletronicamente e NUNCA somam no dinheiro físico da gaveta.',
      'A justificativa por escrito é estritamente obrigatória para sangrias e para qualquer fechamento com divergência de valores.',
      'A retirada para o cofre no fechamento só é lançada como sangria se você confirmar explicitamente que retirou o montante físico da gaveta.'
    ],
    commonMistakesAndFixes: [
      {
        problem: 'O botão "Abrir Meu Caixa" não está disponível.',
        solution: 'Você precisa iniciar seu expediente no módulo "Meu Turno & Ponto" antes de iniciar a sessão de caixa.'
      },
      {
        problem: 'Houve diferença entre o dinheiro contado e o valor esperado pelo sistema.',
        solution: 'Reconte as cédulas e moedas com calma. Se a diferença persistir, descreva exatamente o que ocorreu no campo de justificativa obrigatória para que a gerência possa auditar.'
      },
      {
        problem: 'Vendi no Pix ou Cartão e o dinheiro esperado não aumentou.',
        solution: 'Isso é o comportamento correto! Apenas vendas pagas em DINHEIRO FÍSICO aumentam o saldo esperado da gaveta física.'
      }
    ]
  },
  meu_turno: {
    title: 'Meu Turno & Ponto Eletrônico',
    subtitle: 'Controle de frequência, pausas e integração com Meu Caixa',
    purpose: 'Registra a jornada de trabalho (ponto eletrônico), intervalos intrajornada e gerencia o ciclo operacional integrado ao caixa da farmácia.',
    allowedActions: [
      'Iniciar expediente ao chegar na drogaria para liberar o acesso ao balcão e abertura de caixa',
      'Iniciar e encerrar pausas de intervalo intrajornada (almoço e descanso)',
      'Navegar diretamente para a abertura ou conferência do Meu Caixa',
      'Encerrar o turno de trabalho após realizar o devido fechamento do caixa',
      'Visualizar o histórico pessoal de expedientes, horários de ponto e horas cumpridas'
    ],
    workflowSteps: [
      '1. Iniciar Expediente: Ao chegar, registre o início da jornada no botão "Iniciar Expediente de Hoje".',
      '2. Abrir Meu Caixa: Com o expediente ativo, clique em "Abrir Meu Caixa", informe o terminal e o fundo de troco inicial.',
      '3. Intervalos: Ao sair para almoço/descanso, registre "Iniciar Intervalo" e, ao retornar, "Retomar do Intervalo".',
      '4. Fechar Caixa: No final do expediente, vá para "Meu Caixa", conte o dinheiro da gaveta e feche a sessão financeira.',
      '5. Encerrar Expediente: Retorne a "Meu Turno" com o status "Caixa Fechado" e confirme o encerramento da jornada.'
    ],
    rulesAndApprovals: [
      'Diferença entre Expediente e Caixa: O expediente controla as horas trabalhadas do colaborador (ponto). O caixa controla o dinheiro físico e as transações financeiras do terminal.',
      'Bloqueio com Caixa Aberto: O sistema bloqueia o encerramento do expediente se houver caixa aberto. É obrigatório fazer a conferência física e fechar o caixa para garantir a integridade financeira.',
      'Colaboradores sem Caixa: Colaboradores que não operaram caixa durante o turno podem encerrar o expediente normalmente sem necessidade de abrir caixa.',
      'Reconciliação da Tesouraria: A conferência e reconciliação administrativa pela Tesouraria ocorrem a posteriori pela gerência e NÃO prendem o colaborador no relógio de ponto.'
    ],
    commonMistakesAndFixes: [
      {
        problem: 'O sistema não deixa eu encerrar o expediente.',
        solution: 'Você possui uma sessão de caixa aberta. Clique em "Ir para Meu Caixa", faça a contagem do dinheiro físico, confirme o fechamento do caixa e depois encerre o expediente.'
      },
      {
        problem: 'Esqueci de bater o ponto na chegada e já estou atendendo.',
        solution: 'Inicie o expediente imediatamente e comunique seu gerente para inclusão de justificativa na trilha de auditoria.'
      },
      {
        problem: 'Preciso esperar o gerente aprovar o fechamento do caixa para bater a saída?',
        solution: 'Não! Assim que você fechar o seu caixa em Meu Caixa, o status mudará para "Caixa Fechado" e você já pode encerrar o expediente. A reconciliação da tesouraria é feita pela gerência depois.'
      }
    ]
  },
  colab_metas: {
    title: 'Minhas Metas & Comissões',
    subtitle: 'Painel motivacional individual do balconista',
    purpose: 'Exibe o faturamento acumulado do colaborador no mês, ticket médio, total de vendas e a distância até a meta individual.',
    allowedActions: [
      'Acompanhar o percentual atingido da meta mensal em tempo real',
      'Consultar o ticket médio das suas vendas no período',
      'Visualizar dicas práticas para atingir a bonificação'
    ],
    workflowSteps: [
      '1. Consulte o gráfico de progresso diário.',
      '2. Foque em produtos recomendados e itens complementares para elevar o ticket médio.',
      '3. Acompanhe a estimativa de comissão conforme as faixas de atingimento.'
    ],
    rulesAndApprovals: [
      'Vendas canceladas ou estornadas deixam de pontuar para a meta.',
      'Os rankings de equipe são consolidados exclusivamente para a administração.'
    ],
    commonMistakesAndFixes: [
      {
        problem: 'Uma venda que realizei ainda não apareceu na minha meta.',
        solution: 'Clique no botão de sincronização no topo da tela para atualizar os dados com o servidor.'
      }
    ]
  },
  admin_demands: {
    title: 'Falta de Medicamentos (Demanda Reprimida)',
    subtitle: 'Registro de procuras não atendidas para reposição de compras',
    purpose: 'Captura tudo o que o cliente pediu no balcão e a farmácia não tinha, servindo de base para o plano de compras da gerência.',
    allowedActions: [
      'Cadastrar remédio procurado que estava com saldo zero ou não cadastrado',
      'Registrar quantidade procurada e telefone do cliente para aviso futuro',
      'Administradores: transformar demandas recorrentes diretamente em pedidos de compra'
    ],
    workflowSteps: [
      '1. Clique em "Registrar Falta de Medicamento".',
      '2. Digite o nome do produto, dosagem e laboratório preferido pelo cliente.',
      '3. Anote a quantidade procurada e o WhatsApp do cliente para avisá-lo quando chegar.',
      '4. Salve o registro. O painel da gerência será notificado em tempo real.'
    ],
    rulesAndApprovals: [
      'Nunca dispense um cliente sem anotar o produto em falta quando a drogaria não possuir o item.',
      'A gerência utiliza esse relatório semanalmente para direcionar as compras e não perder vendas.'
    ],
    commonMistakesAndFixes: [
      {
        problem: 'O produto chegou na loja, como marcar como resolvido?',
        solution: 'O administrador pode clicar em "Marcar como Resolvido" na lista de demandas.'
      }
    ]
  },
  admin_approvals: {
    title: 'Central de Aprovações (Exclusivo Gerência)',
    subtitle: 'Validação de exceções, cancelamentos, preços e descontos',
    purpose: 'Garante o controle anti-fraude da farmácia, centralizando solicitações sensíveis feitas pelos colaboradores.',
    allowedActions: [
      'Aprovar ou Rejeitar modificações e cancelamentos de vendas',
      'Revisar e autorizar alterações manuais de preço feitas no balcão',
      'Aprovar descontos que ultrapassaram a alçada padrão do colaborador',
      'Analisar e aprovar divergências de inventário físico de estoque'
    ],
    workflowSteps: [
      '1. Analise o motivo apresentado pelo colaborador e o impacto financeiro.',
      '2. Confira o valor anterior e o novo valor proposto.',
      '3. Clique em "Aprovar" para confirmar a operação ou "Rejeitar" com justificativa.',
      '4. Todas as decisões são gravadas irreversivelmente no Log de Auditoria.'
    ],
    rulesAndApprovals: [
      'Colaboradores que alterarem o preço de um produto não podem alterá-lo novamente até esta aprovação ser concluída.',
      'Cancelamentos aprovados estornam automaticamente os itens de volta ao estoque.'
    ],
    commonMistakesAndFixes: [
      {
        problem: 'Como identificar quem solicitou a aprovação?',
        solution: 'Cada cartão exibe o nome do colaborador, data, hora e a justificativa preenchida.'
      }
    ]
  },
  admin_overview: {
    title: 'Painel Executivo & DRE Gerencial',
    subtitle: 'Indicadores de faturamento, margem e visão global da farmácia',
    purpose: 'Apresenta a saúde operacional do negócio em tempo real para tomada rápida de decisões.',
    allowedActions: [
      'Consultar faturamento bruto, margem de contribuição e ticket médio',
      'Visualizar caixas atualmente em operação e estoque crítico',
      'Navegar diretamente para módulos com alertas pendentes'
    ],
    workflowSteps: [
      '1. Selecione o período desejado (Hoje, 7 dias, Mês atual).',
      '2. Verifique os cartões de alerta (estoque em ruptura, compras pendentes).',
      '3. Clique nos cartões de alerta para ir direto aos registros correspondentes.'
    ],
    rulesAndApprovals: [
      'Todos os valores apresentados são calculados de forma transparente com base nas vendas do período.',
      'Acesso restrito ao perfil de Administrador.'
    ],
    commonMistakesAndFixes: [
      {
        problem: 'Os valores parecem desatualizados.',
        solution: 'Use o botão de sincronização no cabeçalho para obter o status mais recente.'
      }
    ]
  },
  admin_sales: {
    title: 'Vendas & Histórico Operacional',
    subtitle: 'Histórico auditado de todas as vendas e estornos',
    purpose: 'Consulta detalhada de cupons não fiscais emitidos, composições de itens e formas de pagamento recebidas.',
    allowedActions: [
      'Filtrar vendas por data, vendedor, cliente ou forma de pagamento',
      'Reimprimir ou reenviar Recibo Não Fiscal via WhatsApp',
      'Solicitar cancelamento ou estorno com justificativa obrigatória'
    ],
    workflowSteps: [
      '1. Localize a venda pelo código ou nome do cliente.',
      '2. Clique em "Ver Detalhes" para inspecionar itens e histórico de eventos.',
      '3. Se houver necessidade de cancelamento, informe a justificativa para envio à Central de Aprovações.'
    ],
    rulesAndApprovals: [
      'FarmaVida V1 emite Recibos Não Fiscais. O histórico original é imutável e correções ocorrem por eventos compensatórios.'
    ],
    commonMistakesAndFixes: [
      {
        problem: 'Como localizar uma venda feita em dinheiro?',
        solution: 'Utilize o filtro de método de pagamento selecionando "Dinheiro".'
      }
    ]
  },
  admin_cash: {
    title: 'Caixa & Tesouraria Gerencial',
    subtitle: 'Abertura, suprimento, sangrias e fechamento com fundo de troco',
    purpose: 'Controla a movimentação física de dinheiro e eletrônica (Pix/Cartão) por terminal de atendimento.',
    allowedActions: [
      'Abrir caixa informando o valor inicial conferido (fundo de reserva/troco)',
      'Lançar retiradas para o cofre (sangria) com motivo obrigatório',
      'Lançar entradas adicionais de troco (suprimento)',
      'Realizar a conferência de fechamento com cálculo de dinheiro a recolher'
    ],
    workflowSteps: [
      '1. Na abertura, conte o dinheiro da gaveta e confirme o valor de fundo de troco.',
      '2. Durante o dia, lance sangrias sempre que o valor em dinheiro atingir o teto de segurança.',
      '3. No fechamento, insira o valor físico apurado. O sistema calcula a diferença e a sangria final.',
      '4. O administrador confirma o recolhimento do valor físico para o cofre.'
    ],
    rulesAndApprovals: [
      'O fechamento NÃO é cego: os valores apurados pelo sistema são exibidos para facilitar a conferência.',
      'Divergências de caixa exigem justificativa detalhada por escrito.'
    ],
    commonMistakesAndFixes: [
      {
        problem: 'Deu diferença entre o dinheiro da gaveta e o sistema.',
        solution: 'Reconte as cédulas e moedas. Se a diferença persistir, descreva a justificativa no campo obrigatório.'
      }
    ]
  },
  admin_stock: {
    title: 'Estoque & Produtos',
    subtitle: 'Controle de saldo, curva ABC, inventário e movimentações',
    purpose: 'Mantém os níveis de estoque equilibrados, evitando rupturas de medicamentos essenciais.',
    allowedActions: [
      'Cadastrar e editar produtos (preço de custo, venda, categoria)',
      'Consultar curva ABC e produtos com estoque crítico/zerado',
      'Registrar ajustes manuais de estoque com justificativa (avaria, perda)',
      'Iniciar contagem física de inventário'
    ],
    workflowSteps: [
      '1. Monitore a lista de produtos com estoque abaixo do mínimo.',
      '2. Em caso de quebra ou avaria, faça um ajuste negativo com justificativa.',
      '3. Ajustes manuais de estoque geram registro de auditoria e pendência quando aplicável.'
    ],
    rulesAndApprovals: [
      'O estoque nunca pode ficar negativo.',
      'Toda entrada e saída gera um registro imutável em StockMovement.'
    ],
    commonMistakesAndFixes: [
      {
        problem: 'O produto está na prateleira mas não consta no sistema.',
        solution: 'Verifique se o produto chegou em um pedido de compra pendente de conferência ou use o cadastro via compras.'
      }
    ]
  },
  admin_purchases: {
    title: 'Compras & Pedidos de Fornecedores',
    subtitle: 'Inteligência de compras, cotações e acompanhamento de entregas',
    purpose: 'Centraliza a compra com distribuidoras farmacêuticas com base em demanda real e giro de estoque.',
    allowedActions: [
      'Gerar sugestão de compras unindo estoque mínimo + vendas recentes + remédios em falta',
      'Criar e aprovar pedidos de compra com distribuidoras',
      'Acompanhar status: Rascunho, Aprovado, Aguardando Entrega e Recebido',
      'Realizar a conferência física e dar entrada no estoque'
    ],
    workflowSteps: [
      '1. Analise os itens sugeridos pelo cálculo de reposição.',
      '2. Selecione a distribuidora e revise as quantidades e custos cotados.',
      '3. Aprove o pedido para que ele fique aguardando a chegada da mercadoria física.',
      '4. No ato da entrega, use a tela de conferência física (Pedido vs Recebido vs Diferença).'
    ],
    rulesAndApprovals: [
      'Pedidos aprovados só alteram o estoque após a conferência física do recebimento.',
      'Faltas na entrega geram recebimento parcial e mantêm a divergência registrada.'
    ],
    commonMistakesAndFixes: [
      {
        problem: 'A distribuidora enviou menos caixas do que foi pedido.',
        solution: 'Na conferência de recebimento, aponte a quantidade exata recebida para manter a pendência de cobrança.'
      }
    ]
  },
  admin_settings: {
    title: 'Configurações Gerais do Sistema',
    subtitle: 'Parâmetros operacionais da drogaria, usuários, jornadas e caixa',
    purpose: 'Configuração centralizada de todas as regras de negócio da FarmaVida.',
    allowedActions: [
      'Configurar dados da Drogaria (Razão Social, Nome Fantasia, Telefones, WhatsApp)',
      'Gerenciar colaboradores e administradores com seus respectivos PINs de acesso',
      'Definir tolerâncias de jornada (janela de acesso e atraso tolerado)',
      'Ajustar limites de desconto sem aprovação da gerência',
      'Definir fundo de troco padrão e métodos de pagamento'
    ],
    workflowSteps: [
      '1. Navegue entre as abas temáticas de configuração.',
      '2. Ajuste os valores desejados.',
      '3. Salve as alterações para aplicação imediata.'
    ],
    rulesAndApprovals: [
      'Apenas Administradores têm acesso a este módulo.',
      'Todas as alterações de configurações são registradas no Log de Auditoria.'
    ],
    commonMistakesAndFixes: [
      {
        problem: 'Um colaborador esqueceu o PIN.',
        solution: 'O administrador pode redefinir o PIN de 4 dígitos na aba "Usuários & Acessos".'
      }
    ]
  }
};

export const ContextualHelpModal: React.FC<ContextualHelpModalProps> = ({
  isOpen,
  onClose,
  activeTab,
  currentUser
}) => {
  if (!isOpen) return null;

  const content = HELP_DICTIONARY[activeTab] || {
    title: 'Ajuda Operacional FarmaVida',
    subtitle: 'Guia do sistema para a tela atual',
    purpose: 'Este módulo permite a realização das tarefas do seu perfil de trabalho na drogaria.',
    allowedActions: ['Navegar pelo menu lateral', 'Consultar dados disponíveis', 'Acionar suporte gerencial quando necessário'],
    workflowSteps: ['Selecione a ação desejada na tela e siga os passos indicados.'],
    rulesAndApprovals: ['Siga as políticas da farmácia e confira as orientações com a gerência.'],
    commonMistakesAndFixes: [{ problem: 'Dúvida operacional geral', solution: 'Consulte o administrador da loja.' }]
  };

  const isAdmin = currentUser.role === 'admin';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden select-none"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-modal-title"
      >
        {/* Header */}
        <div className="bg-emerald-950 text-white p-4 sm:p-5 flex items-start justify-between border-b border-emerald-900">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-800/80 flex items-center justify-center text-emerald-300 shrink-0 mt-0.5">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="help-modal-title" className="text-base sm:text-lg font-bold text-white tracking-wide">
                  {content.title}
                </h2>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  isAdmin ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  Modo {isAdmin ? 'Administrador' : 'Colaborador'}
                </span>
              </div>
              <p className="text-xs text-emerald-300/90 mt-0.5">
                {content.subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-900 transition-colors"
            aria-label="Fechar ajuda contextual"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-sm text-neutral-800">
          {/* Purpose Box */}
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-950 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-xs text-emerald-900 block uppercase tracking-wider mb-0.5">
                Finalidade Desta Tela
              </span>
              <p className="text-xs sm:text-sm text-emerald-900 leading-relaxed">
                {content.purpose}
              </p>
            </div>
          </div>

          {/* Workflow Steps */}
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-600 mb-2.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Passo a Passo Recomendado</span>
            </h3>
            <div className="space-y-1.5 bg-neutral-50 rounded-xl p-3 border border-neutral-200">
              {content.workflowSteps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-neutral-700">
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Allowed Actions */}
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-600 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Ações Disponíveis</span>
            </h3>
            <ul className="grid sm:grid-cols-2 gap-2">
              {content.allowedActions.map((action, idx) => (
                <li key={idx} className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-200/60 text-xs text-neutral-700 flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0 mt-1.5" />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Rules & Approvals */}
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-amber-800 mb-2 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Regras de Negócio & Alçadas</span>
            </h3>
            <div className="space-y-1.5 bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-xs text-amber-950">
              {content.rulesAndApprovals.map((rule, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>{rule}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Common Mistakes & Fixes */}
          {content.commonMistakesAndFixes.length > 0 && (
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-600 mb-2 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-neutral-600" />
                <span>Dúvidas Frequentes & Resoluções</span>
              </h3>
              <div className="space-y-2">
                {content.commonMistakesAndFixes.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-xs space-y-1">
                    <p className="font-semibold text-neutral-900 flex items-center gap-1.5">
                      <span className="text-red-500 font-bold">Dúvida:</span>
                      {item.problem}
                    </p>
                    <p className="text-neutral-600 pl-4 border-l-2 border-emerald-500 text-neutral-700">
                      <strong className="text-emerald-700">Como resolver:</strong> {item.solution}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-neutral-100 border-t border-neutral-200 flex items-center justify-between text-xs text-neutral-500">
          <span>Pressione <kbd className="px-1.5 py-0.5 font-mono bg-white border border-neutral-300 rounded">ESC</kbd> para fechar</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs"
          >
            Entendido, fechar ajuda
          </button>
        </div>
      </div>
    </div>
  );
};
