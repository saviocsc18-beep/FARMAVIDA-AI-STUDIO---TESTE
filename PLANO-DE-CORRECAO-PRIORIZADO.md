# PLANO DE CORREÇÃO E EVOLUÇÃO PRIORIZADO — FARMAVIDA

**Data da Auditoria:** 17 de Setembro de 2026  
**Finalidade:** Roadmap Técnico Pós-Demonstração para Homologação e Entrada em Produção  

---

## 1. Matriz de Prioridades Técnicas (Visão Geral)

```text
[P0: BLOQUEADORES CRÍTICOS]
  ├── 1. Correção dos 3 Erros TypeScript no firestoreService.ts (Lint Exit Code 2)
  ├── 2. Remoção do Seletor Desprotegido de Usuários na Navbar
  └── 3. Fechamento de Segurança nos Endpoints Sensíveis do Backend

[P1: ALTA PRIORIDADE / COMPLETUDE DE ESCOPO]
  ├── 4. Conclusão do Cutover Operacional para Firestore (Phase 07)
  ├── 5. Criação da Aba Dedicada de CRM / Clientes no Menu Lateral
  ├── 6. Implementação dos Botões de Ação de Backup (Export/Restore) na UI
  └── 7. Padronização Global de Moeda BRL (Intl.NumberFormat)

[P2: MÉDIA PRIORIDADE / REFINAMENTO GERENCIAL]
  ├── 8. Filtro Temporal de Métricas no Painel Executivo (Hoje / Semana / Mês)
  ├── 9. Envio de Pedido de Compra para Fornecedor via WhatsApp / PDF
  └── 10. Paginação e Validação Prévia no Importador de Planilhas
```

---

## 2. Detalhamento dos Itens de Correção

### PRIORIDADE P0: BLOQUEADORES DE PRODUÇÃO & SEGURANÇA

#### Item 1: Correção dos Erros TypeScript no `server/firestoreService.ts`
* **Gravidade:** P0 (Impede aprovação do comando `npm run lint`).
* **Arquivos Impactados:** `src/types.ts` e `server/firestoreService.ts`.
* **Descrição:** A interface `Sale` não possui `saleNumber?: string;` nem os campos `cancelledAt?: string;`, `cancelledBy?: string;`, `cancellationReason?: string;`.
* **Ação Corretiva:**
  - Atualizar `src/types.ts` para tipar os atributos de rastreamento de estorno e identificador legível na interface `Sale`.
  - Reexecutar `npm run lint` para garantir zero erros.
* **Esforço Estimado:** 30 minutos.
* **Risco de Regressão:** Nulo.

#### Item 2: Remoção do Seletor Desprotegido de Usuários na Navbar
* **Gravidade:** P0 (Bypass de autenticação na interface).
* **Arquivos Impactados:** `src/components/Navbar.tsx` e `src/components/RestrictedAccessView.tsx`.
* **Descrição:** O componente `Navbar` exibe um `<select>` que troca o usuário ativo sem exigir PIN. A tela de acesso negado oferece botão de elevação direta para perfil Admin.
* **Ação Corretiva:**
  - Substituir o `<select>` por botão "Trocar Operador" que aciona o modal `OperatorSwitchModal` com verificação de PIN de 4 dígitos.
  - Remover o botão "Alternar para Perfil Admin" de `RestrictedAccessView.tsx`.
* **Esforço Estimado:** 2 horas.
* **Risco de Regressão:** Baixo.

#### Item 3: Fechamento de Segurança dos Endpoints Sensíveis
* **Gravidade:** P0 (Vulnerabilidade de escrita sem autenticação).
* **Arquivos Impactados:** `server.ts` e `src/lib/api.ts`.
* **Descrição:** 36 dos 37 endpoints da API aceitam requisições sem validar token JWT no cabeçalho `Authorization`.
* **Ação Corretiva:**
  - Aplicar os middlewares `requireAuth` e `requireAdmin` nas rotas de escrita (`/api/store/settings`, `/api/products/adjust-stock`, `/api/backup/restore`, etc.).
  - Padronizar as chamadas do frontend em `src/App.tsx` para passar pelo cliente HTTP autenticado.
* **Esforço Estimado:** 4 horas.
* **Risco de Regressão:** Médio (exige testar todos os fluxos com token expirado/válido).

---

### PRIORIDADE P1: ALTA PRIORIDADE / ESCOPO COMPLETO

#### Item 4: Conclusão do Cutover Operacional para Firestore (Phase 07)
* **Gravidade:** P1 (Persistência unificada em nuvem).
* **Arquivos Impactados:** `server.ts` e `server/firestoreService.ts`.
* **Descrição:** Os métodos transacionais do Firestore estão prontos, mas `server.ts` ainda despacha a maioria das requisições para `data/farmavida.json`.
* **Ação Corretiva:**
  - Realizar chaveamento das rotas operacionais (`/api/sales`, `/api/products`, `/api/cash-registers`) para invocar diretamente o `firestoreService`.
  - Manter `farmavida.json` como contingência secundária.
* **Esforço Estimado:** 8 horas.
* **Risco de Regressão:** Alto (exige validação de concorrência e integridade das regras do Firestore).

#### Item 5: Aba Dedicada de Clientes / CRM no Menu Lateral
* **Gravidade:** P1 (Funcionalidade esperada por proprietários de farmácia).
* **Arquivos Impactados:** `src/components/Sidebar.tsx`, `src/App.tsx`, novo componente `src/components/AdminCustomers.tsx`.
* **Descrição:** Os clientes são registrados apenas no PDV durante a venda, sem histórico consolidado.
* **Ação Corretiva:**
  - Criar componente de CRM de Clientes com listagem, busca por CPF/Nome, histórico de compras realizadas, saldo devedor/crediário e convênios.
  - Adicionar o item "Clientes" na navegação administrativa do `Sidebar.tsx`.
* **Esforço Estimado:** 6 horas.
* **Risco de Regressão:** Baixo.

#### Item 6: Implementação dos Botões de Ação de Backup na Interface
* **Gravidade:** P1 (Completude visual e operacional).
* **Arquivos Impactados:** `src/components/AdminSettings.tsx`.
* **Descrição:** Os endpoints `/api/backup/export` e `/api/backup/restore` existem no servidor, mas a aba "Auditoria e Backups" não oferece botões para o usuário.
* **Ação Corretiva:**
  - Adicionar botão "Baixar Cópia de Segurança Completa (JSON)" conectado a `/api/backup/export`.
  - Adicionar botão "Restaurar Banco de Dados a partir de Arquivo" com modal de confirmação de senha do administrador.
* **Esforço Estimado:** 3 horas.
* **Risco de Regressão:** Baixo.

#### Item 7: Padronização Global de Moeda BRL (Intl.NumberFormat)
* **Gravidade:** P1 (Qualidade visual e contábil).
* **Arquivos Impactados:** `src/utils/format.ts` e componentes de exibição monetária.
* **Descrição:** Concatenações com `.toFixed(2)` geram exibição no padrão americano (`R$ 1250.50`).
* **Ação Corretiva:**
  - Implementar helper unificado `formatBRL(val: number): string` com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
  - Substituir ocorrências de formatação manual.
* **Esforço Estimado:** 4 horas.
* **Risco de Regressão:** Mínimo.

---

### PRIORIDADE P2: MÉDIA PRIORIDADE / REFINAMENTO OPERACIONAL

#### Item 8: Filtro de Intervalo de Datas no Painel Executivo
* **Arquivos Impactados:** `src/components/AdminOverview.tsx`.
* **Descrição:** Permitir ao gestor filtrar as métricas do painel por: "Hoje", "Últimos 7 dias", "Mês Vigente" ou "Período Personalizado".
* **Esforço Estimado:** 4 horas.

#### Item 9: Envio de Pedido de Compra via WhatsApp e PDF
* **Arquivos Impactados:** `src/components/AdminPurchases.tsx`.
* **Descrição:** Gerar mensagem estruturada para envio direto via WhatsApp para o representante da distribuidora farmacêutica e PDF para impressão do espelho de compra.
* **Esforço Estimado:** 5 horas.

#### Item 10: Validação Prévia e Paginação no Importador de Planilhas
* **Arquivos Impactados:** `src/components/AdminImport.tsx`.
* **Descrição:** Para planilhas acima de 5.000 itens, exibir tabela paginada com pré-visualização das 20 primeiras linhas e checagem de erros de formato antes do envio ao servidor.
* **Esforço Estimado:** 4 horas.
