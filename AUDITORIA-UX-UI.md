# AUDITORIA DE EXPERIÊNCIA DO USUÁRIO, DESIGN E INTERFACE (UX/UI) — FARMAVIDA

**Data da Auditoria:** 17 de Setembro de 2026  
**Sistema:** FarmaVida Drogaria & Gestão  
**Avaliador:** Engenharia de Produto & Auditoria de Interfaces  

---

## 1. Avaliação Geral e Arquétipo Visual

O FarmaVida adota um arquétipo visual profissional voltado para o setor de **saúde, farmácia e varejo técnico**. 
- **Paleta de Cores:** Neutros sofisticados (cinzas quentes de fundo `#f9fafb`, bordas sutis `#e5e7eb` e textos em alto contraste `#111827`), combinados com verde esmeralda institucional (`emerald-700` a `emerald-900`) e toques de suporte em azul e âmbar para alertas operacionais.
- **Conformidade Anti-Slop:**
  - Livre de clichês visuais de IA (sem gradientes roxos, sem bordas brilhantes neon, sem textos brancos ilegíveis sobre cinza claro).
  - Componentes com cantos arredondados equilibrados (`rounded-xl` e `rounded-2xl` matematicamente proporcionais ao padding interno).
  - Hierarquia de contraste estritamente alinhada com WCAG AA (texto escuro sobre fundo claro e texto branco puro sobre fundos esmeralda escuro).

---

## 2. Responsividade e Adaptação a Telas

| Dispositivo / Resolução | Comportamento da Interface | Avaliação |
|---|---|---|
| **Desktop Full HD (1920x1080)** | Layout com barra lateral persistente (expandida ou recolhida com atalho `S`). Espaçamento generoso, tabelas legíveis sem quebras forçadas. Máxima eficiência operacional. | **EXCELENTE** |
| **Notebook Padrão (1366x768)** | Barra lateral recolhe suavemente, cards do PDV e do Painel Executivo se reorganizam em 2 colunas. Tabela de produtos mantém botões de ação acessíveis. | **MUITO BOM** |
| **Tablet / PDV Touch (1024x768)** | O botão de menu lateral superior permite recolher para liberar 100% da largura. Alvos de clique (`touch-target`) no carrinho e na seleção de pagamentos possuem mais de 44px de altura, ideais para touch. | **BOM** |
| **Mobile (375px a 430px)** | Barra lateral se transforma em gaveta deslizante (`drawer`) com fundo translúcido escuro (`backdrop-blur`). O carrinho de compras empilha verticalmente abaixo da busca de produtos. | **SATISFATÓRIO** |

---

## 3. Padrão Financeiro e Formatação Numérica

### Diagnóstico de Débito Técnico
- **Problema Identificado:** O sistema possui **144 ocorrências** diretas de concatenação manual de moeda no formato `R$ {valor.toFixed(2)}`.
- **Impacto Visual:**
  - Exibe valores com ponto decimal em vez de vírgula (ex: `R$ 1250.50` em vez de `R$ 1.250,50`).
  - Não inclui o separador de milhar para valores de faturamento expressivos (ex: exibe `R$ 15420.00` em vez de `R$ 15.420,00`).
- **Recomendação de Correção (P1):**
  - Criar e padronizar o helper global `formatMoney(val: number)` baseado na API nativa `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
  - Durante a demonstração de hoje, isso não causa erros de cálculo (a matemática fecha no centavo), mas um olhar contábil mais atento notará o padrão americano de pontuação.

---

## 4. Usabilidade do Balcão e PDV (`ColaboradorWorkspace`)

1. **Eficiência no Atendimento:**
   - Campo de busca de medicamentos com foco imediato e filtragem em milissegundos enquanto o usuário digita nome, dosagem ou código.
   - Botões de quantidade rápida (`+` e `-`) no carrinho de compras.
   - Aplicação de desconto por item com alternância intuitiva entre percentual (`%`) e valor fixo em reais (`R$`).
2. **Prevenção de Erros Operacionais:**
   - Não permite prosseguir com pagamento se o valor total aplicado for inferior ou superior ao total devido.
   - Exibe em vermelho vivo o saldo restante caso falte dinheiro para fechar o carrinho.
   - Se o cliente pagar em dinheiro, exibe em destaque o campo de "Valor Recebido" e calcula o troco automaticamente em caracteres grandes.
3. **Pós-Venda e Comprovante:**
   - Ao finalizar a venda, abre modal com o **Recibo de Atendimento Não Fiscal**, contendo dados da drogaria, itens vendidos, operador do caixa, forma de pagamento e frase de orientação ao cliente.
   - Botão de impressão direta configurado para impressoras térmicas padrão de cupom.

---

## 5. Estados de Carregamento, Feedback e Mensagens de Erro

- **Sincronização:** O botão de sincronização na barra superior gira suavemente durante o carregamento de dados e exibe tooltip explicativo.
- **Feedback de Ações:** Operações como abertura de caixa, registro de falta e cadastro de produtos emitem avisos temporários verdes (`toast` ou badges de confirmação).
- **Tratamento de Exceções:** Quando uma venda falha por falta de estoque ou alçada de desconto, a mensagem de erro é explícita e orienta a ação corretiva (ex: "Desconto de 15% acima do permitido. Solicite autorização ao gerente via PIN").

---

## 6. Atalhos de Teclado Operacionais

O sistema implementa atalhos de teclado reais úteis para o operador de caixa:
- **`S` ou `s`**: Recolhe/expande a barra lateral esquerda, ampliando a área de trabalho do PDV.
- **`?`**: Abre o modal de ajuda contextual rápida com instruções operacionais do sistema.
- Os atalhos são desativados de forma inteligente quando o operador está digitando em campos de texto, inputs ou seletores, evitando disparos acidentais.
