import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

export interface AIAnalysisRequest {
  storeName: string;
  periodLabel: string;
  metrics: {
    totalRevenue: number;
    salesCount: number;
    averageTicket: number;
    discountTotal: number;
    averageDiscountPercent: number;
    knownCostRevenue: number;
    costCoveragePercent: number;
    grossMarginPercent?: number;
  };
  criticalProducts: {
    code: string;
    name: string;
    stock: number;
    minStock: number;
  }[];
  unmetDemands: {
    productName: string;
    quantity: number;
    reason: string;
  }[];
  staffPerformance: {
    name: string;
    role: string;
    salesCount: number;
    totalSold: number;
    avgDiscountPercent: number;
  }[];
  openPurchasesCount: number;
}

export interface AIAnalysisResponse {
  facts: string[];
  hypotheses: string[];
  limitations: string[];
  recommendations: {
    title: string;
    rationale: string;
    suggestedAction: string;
    category: 'compras' | 'descontos' | 'equipe' | 'estoque';
  }[];
}

export async function generateStoreAnalysis(data: AIAnalysisRequest): Promise<AIAnalysisResponse> {
  const ai = getGenAI();

  // If Gemini API Key is not configured, return an honest deterministic analysis
  if (!ai) {
    return generateDeterministicFallback(data, 'Integração Gemini aguardando chave GEMINI_API_KEY no ambiente.');
  }

  try {
    const prompt = `
Você é o Assistente de Inteligência Administrativa e Gestão Farmacêutica do sistema FarmaVida.
Seu papel é analisar a operação da farmácia com rigor metodológico, clareza e honestidade.

REGRAS ESTRITAS DE COMPORTAMENTO:
1. NUNCA invente números, despesas ou custos que não foram fornecidos.
2. Não apresente margem bruta como lucro líquido.
3. Se a cobertura de custo for inferior a 100%, aponte isso claramente nas Limitações.
4. Responda ESTRITAMENTE em formato JSON com o seguinte schema:
{
  "facts": ["string", "string"],
  "hypotheses": ["string", "string"],
  "limitations": ["string", "string"],
  "recommendations": [
    {
      "title": "string",
      "rationale": "string",
      "suggestedAction": "string",
      "category": "compras" | "descontos" | "equipe" | "estoque"
    }
  ]
}

DADOS CONSOLIDADOS DA LOJA (${data.storeName} - Período: ${data.periodLabel}):
- Faturamento Total Registrado: R$ ${data.metrics.totalRevenue.toFixed(2)}
- Volume de Vendas: ${data.metrics.salesCount} vendas
- Ticket Médio: R$ ${data.metrics.averageTicket.toFixed(2)}
- Total de Descontos Concedidos: R$ ${data.metrics.discountTotal.toFixed(2)} (Média: ${data.metrics.averageDiscountPercent.toFixed(1)}%)
- Cobertura de Custo Conhecido: ${data.metrics.costCoveragePercent.toFixed(1)}% da receita
${data.metrics.grossMarginPercent !== undefined ? `- Margem Bruta Conhecida: ${data.metrics.grossMarginPercent.toFixed(1)}%` : '- Margem Bruta: Não calculável (sem dados de custo suficientes)'}

PRODUTOS EM NÍVEL CRÍTICO DE ESTOQUE:
${data.criticalProducts.length > 0 ? data.criticalProducts.map(p => `• [${p.code}] ${p.name}: Saldo atual ${p.stock} un (Mínimo exigido: ${p.minStock} un)`).join('\n') : 'Nenhum produto abaixo do mínimo no momento.'}

DEMANDAS NÃO ATENDIDAS (PRODUTOS PROCURADOS E FALTA NO BALCÃO):
${data.unmetDemands.length > 0 ? data.unmetDemands.map(d => `• ${d.productName} (Qtd procurada: ${d.quantity}, Motivo: ${d.reason})`).join('\n') : 'Nenhuma falta registrada no período.'}

DESEMPENHO DOS COLABORADORES:
${data.staffPerformance.map(s => `• ${s.name} (${s.role}): ${s.salesCount} vendas | Total vendido: R$ ${s.totalSold.toFixed(2)} | Desconto médio concedido: ${s.avgDiscountPercent.toFixed(1)}%`).join('\n')}

PEDIDOS DE COMPRA EM ABERTO/PENDENTES: ${data.openPurchasesCount} pedido(s).

Gere um diagnóstico objetivo, separando Fatos (certezas comprovadas pelos números), Hipóteses (possíveis causas na operação do balcão), Limitações (o que os dados atuais ainda não mostram) e Recomendações práticas para a farmácia.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Resposta vazia da API Gemini');
    }

    const parsed = JSON.parse(text) as AIAnalysisResponse;
    return parsed;
  } catch (err: any) {
    console.error('Erro na chamada Gemini AI:', err);
    return generateDeterministicFallback(data, `Falha na conexão com Gemini AI (${err.message || 'desconhecido'}). Análise gerada pelo motor determinístico local.`);
  }
}

function generateDeterministicFallback(data: AIAnalysisRequest, note: string): AIAnalysisResponse {
  const facts: string[] = [
    `Faturamento total registrado de R$ ${data.metrics.totalRevenue.toFixed(2)} em ${data.metrics.salesCount} vendas (Ticket médio de R$ ${data.metrics.averageTicket.toFixed(2)}).`,
    `Descontos concedidos totalizaram R$ ${data.metrics.discountTotal.toFixed(2)} (índice médio de ${data.metrics.averageDiscountPercent.toFixed(1)}%).`,
    `A cobertura de custo cadastrado abrange ${data.metrics.costCoveragePercent.toFixed(1)}% do faturamento da loja.`,
  ];

  if (data.criticalProducts.length > 0) {
    facts.push(`Existem ${data.criticalProducts.length} produto(s) com saldo em estoque abaixo do nível mínimo de segurança.`);
  }

  if (data.unmetDemands.length > 0) {
    facts.push(`Foram registradas ${data.unmetDemands.length} ocorrências de procura no balcão por produtos sem estoque ou não trabalhados.`);
  }

  const hypotheses: string[] = [
    'A concessão de descontos varia entre os atendentes, o que pode indicar falta de padronização nas regras de negociação no balcão.',
    'Itens de uso contínuo com estoque baixo podem gerar perda recorrente de clientes para drogarias concorrentes da região.',
  ];

  const limitations: string[] = [
    note,
    `A margem bruta estimada reflete apenas ${data.metrics.costCoveragePercent.toFixed(1)}% das vendas que possuem custo de aquisição cadastrado no catálogo.`,
    'Custos fixos operacionais (aluguel, folha, energia) não foram informados, portanto o lucro líquido não pode ser mensurado.',
  ];

  const recommendations: AIAnalysisResponse['recommendations'] = [];

  if (data.criticalProducts.length > 0) {
    recommendations.push({
      title: 'Repor produtos com estoque crítico imediatamente',
      rationale: `Há ${data.criticalProducts.length} itens abaixo da margem de segurança mínima na loja.`,
      suggestedAction: `Emitir pedido de compra emergencial para: ${data.criticalProducts.map(p => p.name).slice(0, 3).join(', ')}.`,
      category: 'compras',
    });
  }

  if (data.unmetDemands.length > 0) {
    recommendations.push({
      title: 'Avaliar inclusão de itens com demanda reprimida no mix',
      rationale: 'Clientes solicitaram produtos que não estavam disponíveis no balcão.',
      suggestedAction: `Cadastrar e cotar com fornecedores: ${data.unmetDemands.map(d => d.productName).slice(0, 2).join(', ')}.`,
      category: 'estoque',
    });
  }

  recommendations.push({
    title: 'Auditar política de descontos no balcão',
    rationale: `Desconto médio geral atingiu ${data.metrics.averageDiscountPercent.toFixed(1)}%, exigindo alinhamento de limites entre os colaboradores.`,
    suggestedAction: 'Definir teto de desconto automático de 10% para balconistas e exigir validação de gerente para percentuais maiores.',
    category: 'descontos',
  });

  return {
    facts,
    hypotheses,
    limitations,
    recommendations,
  };
}
