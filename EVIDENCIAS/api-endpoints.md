# EVIDÊNCIA TÉCNICA: MAPEAMENTO E AUDITORIA DE ENDPOINTS DA API

**Data da Auditoria:** 17 de Setembro de 2026  
**Servidor:** Express 4.x / tsx (`server.ts`)  
**Porta Operacional:** 3000  

---

## 1. Tabela Geral de Endpoints Operacionais

| Rota | Método | Módulo | Autenticação Exigida | Implementação no Backend | Fonte de Dados Atual | Status |
|---|---|---|---|---|---|---|
| `/api/health` | `GET` | Sistema | Nenhuma | `server.ts` L27 | Firestore / Memória | **COMPLETE** |
| `/api/config/public` | `GET` | Sistema | Nenhuma | `server.ts` L38 | Env / Config | **COMPLETE** |
| `/api/sync` | `GET` | Global / Hidratação | Nenhuma | `server.ts` L52 | `data/farmavida.json` | **COMPLETE** |
| `/api/auth/login-pin` | `POST` | Acesso | Nenhuma (Login) | `server.ts` L230 | Firestore / JSON Fallback | **COMPLETE** |
| `/api/auth/switch-operator` | `POST` | Acesso | Nenhuma (Login) | `server.ts` L255 | Firestore / JSON Fallback | **COMPLETE** |
| `/api/auth/verify-manager-pin` | `POST` | Acesso | Nenhuma (PIN check) | `server.ts` L268 | Firestore / JSON Fallback | **COMPLETE** |
| `/api/auth/me` | `GET` | Acesso | `requireAuth` (JWT) | `server.ts` L280 | JWT Payload | **COMPLETE** |
| `/api/store/settings` | `POST` | Configurações | **Ausente** (Vulnerabilidade) | `server.ts` L310 | `data/farmavida.json` | **PARTIAL** |
| `/api/shifts/start` | `POST` | Turno & Ponto | **Ausente** (Valida payload) | `server.ts` L410 | `data/farmavida.json` | **COMPLETE** |
| `/api/shifts/break` | `POST` | Turno & Ponto | **Ausente** (Valida payload) | `server.ts` L445 | `data/farmavida.json` | **COMPLETE** |
| `/api/shifts/end` | `POST` | Turno & Ponto | **Ausente** (Bloqueia se caixa aberto) | `server.ts` L480 | `data/farmavida.json` | **COMPLETE** |
| `/api/cash-registers/open` | `POST` | Caixa | **Ausente** (Valida payload) | `server.ts` L530 | `data/farmavida.json` | **COMPLETE** |
| `/api/cash-registers/movement` | `POST` | Caixa (Sangria/Suprimento) | **Ausente** (Valida payload) | `server.ts` L580 | `data/farmavida.json` | **COMPLETE** |
| `/api/cash-registers/close` | `POST` | Caixa | **Ausente** (Calcula quebra/sobra) | `server.ts` L620 | `data/farmavida.json` | **COMPLETE** |
| `/api/sales` | `POST` | Vendas / PDV | **Ausente** (Valida turno e gaveta) | `server.ts` L2030 | `data/farmavida.json` (db.mutate) | **COMPLETE** |
| `/api/sales/:id/cancel` | `POST` | Vendas / Estorno | Valida PIN Admin se colaborador | `server.ts` L720 | Central Aprovações / db.mutate | **COMPLETE** |
| `/api/sales/:id/reconcile-fiscal` | `POST` | Vendas / Satélite | **Ausente** | `server.ts` L820 | `data/farmavida.json` | **COMPLETE** |
| `/api/products` | `POST` | Estoque / Cadastro | **Ausente** | `server.ts` L910 | `data/farmavida.json` | **COMPLETE** |
| `/api/products/adjust-stock` | `POST` | Estoque / Kardex | **Ausente** (Exige motivo) | `server.ts` L960 | `data/farmavida.json` | **COMPLETE** |
| `/api/import/products` | `POST` | Estoque / Planilha | **Ausente** | `server.ts` L3780 | `data/farmavida.json` | **COMPLETE** |
| `/api/inventories` | `POST` | Estoque / Inventário | **Ausente** | `server.ts` L1040 | `data/farmavida.json` | **COMPLETE** |
| `/api/inventories/:id/count` | `POST` | Estoque / Contagem Cega | **Ausente** | `server.ts` L1100 | `data/farmavida.json` | **COMPLETE** |
| `/api/inventories/:id/review` | `POST` | Estoque / Aprovação | Valida PIN/Papel Gerencial | `server.ts` L1150 | `data/farmavida.json` | **COMPLETE** |
| `/api/purchase-orders` | `POST` | Compras | **Ausente** | `server.ts` L1310 | `data/farmavida.json` | **COMPLETE** |
| `/api/purchase-orders/:id/approve` | `POST` | Compras | **Ausente** | `server.ts` L1360 | `data/farmavida.json` | **COMPLETE** |
| `/api/purchase-orders/:id/receive` | `POST` | Compras / Recebimento | **Ausente** (Atualiza estoque) | `server.ts` L1400 | `data/farmavida.json` | **COMPLETE** |
| `/api/demands` | `POST` | Demanda / Faltas | **Ausente** | `server.ts` L1520 | `data/farmavida.json` | **COMPLETE** |
| `/api/demands/:id/resolve` | `POST` | Demanda / Faltas | **Ausente** | `server.ts` L1560 | `data/farmavida.json` | **COMPLETE** |
| `/api/customers` | `POST` | Clientes | **Ausente** | `server.ts` L1620 | `data/farmavida.json` | **COMPLETE** |
| `/api/approvals` | `GET` | Governança | **Ausente** | `server.ts` L1710 | `data/farmavida.json` | **COMPLETE** |
| `/api/approvals/:id/review` | `POST` | Governança | Valida PIN Admin | `server.ts` L1750 | `data/farmavida.json` | **COMPLETE** |
| `/api/ai/analyze` | `POST` | IA / Diagnóstico | **Ausente** | `server.ts` L3529 | Gemini SDK / Fallback | **COMPLETE** |
| `/api/ai/convert-recommendation-to-task` | `POST` | IA / Tarefas | **Ausente** | `server.ts` L3647 | `data/farmavida.json` | **COMPLETE** |
| `/api/tasks` | `POST` | Tarefas & Auditoria | **Ausente** | `server.ts` L3700 | `data/farmavida.json` | **COMPLETE** |
| `/api/tasks/:id/toggle` | `POST` | Tarefas & Auditoria | **Ausente** | `server.ts` L3740 | `data/farmavida.json` | **COMPLETE** |
| `/api/backup/export` | `GET` | Continuidade | **Ausente** (Sem proteção admin) | `server.ts` L3832 | JSON Snapshot Download | **PARTIAL** |
| `/api/backup/restore` | `POST` | Continuidade | **Ausente** (Risco Crítico) | `server.ts` L3845 | Substituição total JSON | **PARTIAL** |

---

## 2. Diagnóstico de Riscos Técnicos nos Endpoints

1. **Ausência de Middleware `requireAuth` / `requireAdmin`**:
   - Dos 37 endpoints analisados, **apenas 1 (`/api/auth/me`)** possui o middleware `requireAuth`.
   - Todas as rotas de escrita (como `/api/store/settings`, `/api/products/adjust-stock`, `/api/backup/restore`) aceitam requisições sem validar cabeçalho `Authorization: Bearer <token>`.
   - Isso foi mantido na fase de prototipagem rápida para facilitar a demonstração no frontend, mas constitui um **Risco P0 de Segurança** antes de publicação externa.

2. **Garantias Operacionais Implementadas em Nível de Negócio**:
   - Apesar da falta de validação estrita de token em algumas rotas, o endpoint principal `/api/sales` implementa validações robustas de regra de negócio:
     - Impede venda se operador não tiver expediente aberto (`activeShift`);
     - Impede venda se o caixa físico/gaveta não estiver aberto com fundo de troco;
     - Exige PIN de gestor ou aprovação prévia se o desconto ultrapassar a alçada da loja;
     - Exige fechamento exato da soma dos pagamentos aplicados em relação ao total a pagar;
     - Executa dedução atômica no estoque e gera lançamentos rastreáveis no Kardex (`StockMovement`).
