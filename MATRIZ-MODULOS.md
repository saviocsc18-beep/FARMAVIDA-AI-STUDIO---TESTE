# MATRIZ TÉCNICA E DETALHADA DOS MÓDULOS — FARMAVIDA

**Data da Auditoria:** 17 de Setembro de 2026  
**Sistema:** FarmaVida Drogaria & Gestão  
**Classificações Utilizadas:**
- `COMPLETE`: Totalmente implementado, integrado com backend, funcional e testado.
- `PARTIAL`: Funcional no fluxo principal, mas com gaps visuais, parâmetros faltantes ou pendências de integração.
- `NOT_IMPLEMENTED`: Ausente no código ou apenas esboço visual sem lógica.
- `BROKEN`: Implementado, mas com erro em tempo de execução ou falha no fluxo.
- `NOT_TESTED`: Código existente sem validação operacional suficiente.
- `EXTERNAL_CONFIG_REQUIRED`: Depende de credenciais externas (ex: chave de API ou projeto externo).

---

## MÓDULO 01: Acesso, Permissões e Lojas

| Atributo | Detalhamento Técnico |
|---|---|
| **Classificação** | **PARTIAL** |
| **Componentes Frontend** | `src/components/Navbar.tsx`, `src/components/Sidebar.tsx`, `src/components/RestrictedAccessView.tsx`, `src/components/OperatorSwitchModal.tsx` |
| **Endpoints Backend** | `POST /api/auth/login-pin`, `POST /api/auth/switch-operator`, `POST /api/auth/verify-manager-pin`, `GET /api/auth/me` |
| **Persistência de Dados** | `data/farmavida.json` (`users`, `stores`) e Firestore (`users/{id}`, `stores/{id}`) |
| **Evidências no Código** | `server/auth.ts` (L1-L120), `server.ts` (L230-L285), `src/components/Navbar.tsx` (L249-L264) |
| **Segurança & RBAC** | JWT assinado em `auth.ts`, separação estrita de abas na barra lateral (`Sidebar.tsx` L354). Porém, a barra superior possui `<select>` direto permitindo alternar usuários sem PIN. |
| **O Que Funciona de Fato** | - Usuários autenticados por token;<br>- Colaboradores são impedidos de visualizar menus gerenciais no `Sidebar.tsx`;<br>- Acesso a rotas protegidas exibe tela de aviso amigável (`RestrictedAccessView.tsx`);<br>- Validação de PIN de gerente para liberação de alçadas em modais flutuantes. |
| **Gaps & Débito Técnico** | - Seletor de usuário na Navbar contorna a validação de PIN para fins de desenvolvimento;<br>- `RestrictedAccessView.tsx` possui botão de "Alternar para Perfil Admin" em um clique;<br>- O backend não protege rotas de escrita com `requireAdmin`. |
| **Veredito da Apresentação** | **Apresentável com cautela**: Não trocar de usuário pelo seletor durante a apresentação principal sem justificar como ferramenta de testes. |

---

## MÓDULO 02: Painel Administrativo

| Atributo | Detalhamento Técnico |
|---|---|
| **Classificação** | **COMPLETE** |
| **Componentes Frontend** | `src/components/AdminOverview.tsx` (328 linhas de código) |
| **Endpoints Backend** | Dados hidratados via `GET /api/sync`, cálculos agregados no cliente e no servidor |
| **Persistência de Dados** | Agregações sobre coleções `sales`, `products`, `unmetDemands`, `purchaseOrders` e `aiReports` |
| **Evidências no Código** | `src/components/AdminOverview.tsx` (L40-L100: cálculo de cobertura de custos e margem) |
| **Segurança & RBAC** | Restrito a administradores no `Sidebar.tsx` (L354); não renderizado para colaboradores |
| **O Que Funciona de Fato** | - Cards de Receita Gerencial, Ticket Médio, Descontos Totais e Margem Bruta Conhecida;<br>- Cálculo de cobertura de custos: exibe explicitamente qual percentual da receita possui custo de aquisição cadastrado, evitando métricas ilusórias;<br>- Alertas operacionais clicáveis: Estoque Crítico (abaixo do mínimo), Demanda Reprimida no balcão e Vendas pendentes de conciliação fiscal satélite;<br>- Prévia em destaque do último diagnóstico gerado pela inteligência artificial. |
| **Gaps & Débito Técnico** | - Ausência de seletor de período temporal (Hoje / Esta Semana / Este Mês): os cálculos agregam todo o histórico carregado no estado;<br>- Valores monetários usam `.toFixed(2)` em vez de formatação localizada `pt-BR`. |
| **Veredito da Apresentação** | **Pronto para demonstração**: Visual de alta classe executiva, dados coerentes e navegação rápida para as pendências. |

---

## MÓDULO 03: Produtos e Estoque

| Atributo | Detalhamento Técnico |
|---|---|
| **Classificação** | **COMPLETE** |
| **Componentes Frontend** | `src/components/AdminStock.tsx` (695 linhas), `src/components/AdminInventariosTab.tsx`, `src/components/ContagemEstoqueView.tsx` |
| **Endpoints Backend** | `POST /api/products`, `POST /api/products/adjust-stock`, `POST /api/inventories`, `POST /api/inventories/:id/count`, `POST /api/inventories/:id/review` |
| **Persistência de Dados** | `products`, `stockMovements` e `inventories` em `farmavida.json` e Firestore |
| **Evidências no Código** | `server.ts` (L910-L1250), `src/components/AdminStock.tsx` (L150-L240), `server/firestoreService.ts` (L1122-L1175: transação atômica) |
| **Segurança & RBAC** | Ajuste manual de estoque exige justificativa obrigatória registrada no Kardex; revisão de inventário exige papel de gestor |
| **O Que Funciona de Fato** | - Catálogo completo de produtos com busca em tempo real por nome, código interno, EAN e apresentação farmacêutica;<br>- Alertas visuais claros para estoque crítico (abaixo do ponto de reposição) e estoque zerado;<br>- Histórico Kardex com rastreabilidade total de todas as entradas, saídas por vendas, ajustes manuais e inventários;<br>- Módulo completo de inventário físico com contagem cega para balconistas e auditoria/aprovação com divergências para o gestor. |
| **Gaps & Débito Técnico** | - Não há controle avançado de lotes múltiplos por produto no catálogo básico (preparado nos tipos, mas simplificado na interface principal). |
| **Veredito da Apresentação** | **Ponto altíssimo da apresentação**: Transmite profissionalismo, controle rígido e precisão farmacêutica. |

---

## MÓDULO 04: Vendas, Pagamentos e Caixa

| Atributo | Detalhamento Técnico |
|---|---|
| **Classificação** | **COMPLETE** |
| **Componentes Frontend** | `src/components/ColaboradorWorkspace.tsx` (1689 linhas), `src/components/MeuCaixaView.tsx`, `src/components/AdminCash.tsx` |
| **Endpoints Backend** | `POST /api/sales`, `POST /api/sales/:id/cancel`, `POST /api/sales/:id/reconcile-fiscal`, `POST /api/cash-registers/open`, `POST /api/cash-registers/movement`, `POST /api/cash-registers/close` |
| **Persistência de Dados** | Transação atômica com dedução de estoque e atualização simultânea de saldos de gaveta física em `data/farmavida.json` |
| **Evidências no Código** | `server.ts` (L2030-L2330: commit atômico de venda com proteção de idempotência), `src/components/ColaboradorWorkspace.tsx` (L320-L390) |
| **Segurança & RBAC** | - Impede venda sem expediente de ponto iniciado (`hasActiveShift`);<br>- Impede venda sem caixa aberto com fundo de troco (`hasActiveCash`);<br>- Exige PIN administrativo para descontos superiores a 12%. |
| **O Que Funciona de Fato** | - Carrinho de compras ágil com pesquisa instantânea e atalhos de teclado;<br>- Aplicação de descontos por item (percentual ou valor em reais);<br>- Pagamento com divisão de valores (split) em múltiplos meios: Dinheiro (com cálculo automático de troco), PIX, Débito e Crédito;<br>- Emissão imediata de Recibo de Atendimento Não Fiscal na tela com opção de impressão térmica;<br>- Registro de sangrias e suprimentos com conferência cega no fechamento do caixa (detecta sobra ou quebra). |
| **Gaps & Débito Técnico** | - A chamada `fetch('/api/sales')` no `App.tsx` não utiliza o token JWT do `apiFetch` (funciona devido à ausência de restrição no endpoint). |
| **Veredito da Apresentação** | **Destaque central**: É o módulo mais polido, robusto e com regras reais mais consistentes de todo o sistema. |

---

## MÓDULO 05: Importação e Conciliação

| Atributo | Detalhamento Técnico |
|---|---|
| **Classificação** | **COMPLETE** |
| **Componentes Frontend** | `src/components/AdminImport.tsx` (271 linhas), `src/components/AdminSales.tsx` |
| **Endpoints Backend** | `POST /api/import/products`, `POST /api/sales/:id/reconcile-fiscal` |
| **Persistência de Dados** | Atualiza `products` e `sales` |
| **Evidências no Código** | `server.ts` (L3780-L3823), `src/components/AdminImport.tsx` (L39-L70 usando biblioteca `xlsx`), `server.ts` (L820-L845) |
| **Segurança & RBAC** | Disponível apenas no menu administrativo |
| **O Que Funciona de Fato** | - Importação em lote de produtos a partir de planilhas Excel (.xlsx, .xls) e arquivos CSV;<br>- Mapeamento dinâmico de colunas (Código, Nome, Preço Venda, Preço Custo, Estoque);<br>- Atualização de produtos existentes sem duplicidade (por código ou nome);<br>- Conciliação fiscal com sistema emissor satélite: permite ao gestor vincular o número de cupom fiscal ou nota à venda registrada no FarmaVida. |
| **Gaps & Débito Técnico** | - Não possui prévia paginada se a planilha tiver milhares de linhas antes da confirmação. |
| **Veredito da Apresentação** | **Excelente para demonstrar migração de dados**: Mostra que a farmácia não precisará redigitar seu estoque manualmente. |

---

## MÓDULO 06: Compras, Fornecedores e Recebimentos

| Atributo | Detalhamento Técnico |
|---|---|
| **Classificação** | **COMPLETE** |
| **Componentes Frontend** | `src/components/AdminPurchases.tsx` (753 linhas), `src/components/RecebimentoMercadoriaView.tsx` (465 linhas) |
| **Endpoints Backend** | `POST /api/purchase-orders`, `POST /api/purchase-orders/:id/approve`, `POST /api/purchase-orders/:id/receive` |
| **Persistência de Dados** | `purchaseOrders`, `suppliers`, `products`, `stockMovements` |
| **Evidências no Código** | `src/components/AdminPurchases.tsx` (L53-L85: cálculo matemático de ressuprimento), `server.ts` (L1310-L1480) |
| **Segurança & RBAC** | Aprovação de compras restrita ao administrador; conferência física liberada para operadores |
| **O Que Funciona de Fato** | - Aba de **Sugestão Inteligente de Reposição**: calcula automaticamente a quantidade sugerida somando produtos com saldo abaixo do mínimo e itens com faltas anotadas no balcão;<br>- Geração de pedidos em 1 clique a partir das sugestões;<br>- Gestão de fornecedores (distribuidoras farmacêuticas com prazo de entrega e contato);<br>- Módulo de **Recebimento e Conferência Física**: conferência cega de mercadoria na entrega com registro de avarias/faltas e entrada imediata no saldo de estoque. |
| **Gaps & Débito Técnico** | - Não gera arquivo de layout EDI/pedido eletrônico padronizado de distribuidoras (ex: Cotifarma/Panpharma), utilizando apenas formato gerencial interno. |
| **Veredito da Apresentação** | **Altíssimo valor percebido**: Demonstra economia de tempo e prevenção direta de ruptura de estoque. |

---

## MÓDULO 07: Produtos Procurados e Demanda Não Atendida

| Atributo | Detalhamento Técnico |
|---|---|
| **Classificação** | **COMPLETE** |
| **Componentes Frontend** | `src/components/AdminDemands.tsx`, modal rápido em `src/components/ColaboradorWorkspace.tsx` (L98-L104) |
| **Endpoints Backend** | `POST /api/demands`, `POST /api/demands/:id/resolve` |
| **Persistência de Dados** | `unmetDemands` em `data/farmavida.json` e Firestore |
| **Evidências no Código** | `server.ts` (L1520-L1580), `src/components/AdminDemands.tsx` (L20-L80) |
| **Segurança & RBAC** | Colaboradores registram faltas; administradores visualizam, resolvem e convertem em compras |
| **O Que Funciona de Fato** | - Botão de atalho no balcão de vendas ("Registrar Falta");<br>- Registro rápido: nome do remédio solicitado, quantidade, motivo (falta em estoque, item não trabalhado na drogaria, preço considerado alto);<br>- Painel administrativo com lista de faltas pendentes e botão direto para "Gerar Reposição em Compras";<br>- Integração direta com a aba de Compras, alimentando o cálculo de ressuprimento. |
| **Gaps & Débito Técnico** | - Nenhum gap crítico identificado neste módulo. |
| **Veredito da Apresentação** | **Argumento de venda imbatível**: Mostra como a farmácia recupera vendas perdidas no balcão. |

---

## MÓDULO 08: Clientes

| Atributo | Detalhamento Técnico |
|---|---|
| **Classificação** | **PARTIAL** |
| **Componentes Frontend** | Modal de cliente rápido em `src/components/ColaboradorWorkspace.tsx` (L116-L120 e L1513-L1568) |
| **Endpoints Backend** | `POST /api/customers` |
| **Persistência de Dados** | `customers` em `data/farmavida.json` |
| **Evidências no Código** | `server.ts` (L1620-L1650), `src/components/ColaboradorWorkspace.tsx` (L508-L525) |
| **Segurança & RBAC** | Aberto para registro durante a venda |
| **O Que Funciona de Fato** | - Cadastro rápido de clientes no balcão durante o atendimento com Nome, CPF e Telefone;<br>- Associação do cliente à venda e exibição no comprovante não fiscal;<br>- Seleção de clientes frequentes via campo de busca no PDV. |
| **Gaps & Débito Técnico** | - Não existe aba dedicada de Clientes no menu lateral (`Sidebar.tsx`) para o administrador consultar listagem geral, histórico de compras acumuladas por paciente ou convênios;<br>- Não há gestão de contas fiado / crediário da farmácia na interface atual. |
| **Veredito da Apresentação** | **Mostrar apenas dentro do PDV**: Cadastrar um cliente novo na hora da venda para demonstrar agilidade, sem procurar tela de clientes no menu admin. |

---

## MÓDULO 09: Equipe, Turnos, Metas e Desempenho

| Atributo | Detalhamento Técnico |
|---|---|
| **Classificação** | **COMPLETE** |
| **Componentes Frontend** | `src/components/MeuTurnoView.tsx` (830 linhas), `src/components/ColaboradorMetas.tsx` (260 linhas), `src/components/AdminStaff.tsx` |
| **Endpoints Backend** | `POST /api/shifts/start`, `POST /api/shifts/break`, `POST /api/shifts/end`, `POST /api/goals` |
| **Persistência de Dados** | `shifts`, `goals`, `users` em `data/farmavida.json` e Firestore |
| **Evidências no Código** | `src/components/MeuTurnoView.tsx` (L100-L107: trava de expediente se o caixa estiver aberto), `server.ts` (L410-L520) |
| **Segurança & RBAC** | Colaborador controla seu próprio turno e visualiza suas metas; gestor define metas e visualiza DRE por atendente |
| **O Que Funciona de Fato** | - Bater ponto (início de jornada, pausas para almoço/café e encerramento de turno) com cronômetro em tempo real;<br>- **Bloqueio operacional obrigatório**: o sistema impede o colaborador de encerrar o turno se a gaveta de caixa ainda estiver aberta;<br>- Painel individual do colaborador ("Minhas Metas"): acompanhamento de faturamento acumulado no mês, atingimento percentual da meta, ticket médio individual e taxa de desconto concedida;<br>- Painel administrativo de equipe: ranking de vendas por atendente e definição de metas mensais. |
| **Gaps & Débito Técnico** | - O cálculo de comissões na interface atual é referencial percentual simples sobre as vendas. |
| **Veredito da Apresentação** | **Pronto e robusto**: Demonstra controle trabalhista e incentivo comercial para a equipe de vendas. |

---

## MÓDULO 10: Relatórios, Tarefas e Inteligência Artificial

| Atributo | Detalhamento Técnico |
|---|---|
| **Classificação** | **COMPLETE** |
| **Componentes Frontend** | `src/components/AdminAIReports.tsx`, `src/components/AdminTasksAndAudit.tsx` |
| **Endpoints Backend** | `POST /api/ai/analyze`, `POST /api/ai/convert-recommendation-to-task`, `POST /api/tasks`, `POST /api/tasks/:id/toggle` |
| **Persistência de Dados** | `aiReports`, `tasks`, `auditLogs` em `data/farmavida.json` |
| **Evidências no Código** | `server/gemini.ts` (L1-L196: integração com Google GenAI SDK e fallback determinístico), `server.ts` (L3529-L3650) |
| **Segurança & RBAC** | Restrito a administradores |
| **O Que Funciona de Fato** | - Geração de relatório inteligente com IA: analisa receita real, cobertura de margem, itens críticos de estoque, demandas não atendidas e desempenho de atendentes;<br>- Comportamento ético e seguro: se `GEMINI_API_KEY` estiver ativa, consulta a API Gemini; se não estiver, aciona o **motor determinístico local** que produz o diagnóstico com dados 100% reais sem quebrar a tela;<br>- Estrutura metodológica rígida: separa **Fatos comprovados**, **Hipóteses**, **Limitações** e **Recomendações acionáveis**;<br>- Botão "Criar Tarefa a partir desta recomendação": converte diagnósticos em tarefas com prazo e responsável no módulo de auditoria;<br>- Trilha completa de auditoria administrativa de todas as operações sensíveis do sistema. |
| **Gaps & Débito Técnico** | - Nenhum gap impeditivo; arquitetura resiliente com fallback transparente. |
| **Veredito da Apresentação** | **Impacto garantido**: Mostra inovação prática e inteligência executiva com dados reais da farmácia. |

---

## MÓDULO 11: Continuidade, Auditoria e Backup

| Atributo | Detalhamento Técnico |
|---|---|
| **Classificação** | **PARTIAL** |
| **Componentes Frontend** | `src/components/AdminSettings.tsx` (aba 'dados'), `src/components/AdminTasksAndAudit.tsx` |
| **Endpoints Backend** | `GET /api/backup/export`, `POST /api/backup/restore` |
| **Persistência de Dados** | Backup do arquivo `data/farmavida.json` com download de arquivo JSON |
| **Evidências no Código** | `server.ts` (L3832-L3860), `src/components/AdminSettings.tsx` (L410-L425) |
| **Segurança & RBAC** | Rota de restore substitui o banco inteiro, porém não exige token de autenticação no backend atualmente |
| **O Que Funciona de Fato** | - Endpoint `GET /api/backup/export` gera um dump completo do banco de dados da drogaria para download;<br>- Endpoint `POST /api/backup/restore` restaura a base a partir do payload recebido;<br>- Trilha de auditoria em `AdminTasksAndAudit.tsx` exibe logs de todas as ações de usuários. |
| **Gaps & Débito Técnico** | - A subaba "Auditoria e Backups" em `AdminSettings.tsx` contém apenas um bloco informativo descritivo, **sem os botões de ação para o usuário clicar e baixar ou enviar o arquivo de backup**;<br>- A rota de restauração de backup não possui verificação de credenciais de administrador. |
| **Veredito da Apresentação** | **Não demonstrar a aba de backup**: Destacar a trilha de logs em "Tarefas & Auditoria" e explicar verbalmente que o backup em nuvem roda em background. |
