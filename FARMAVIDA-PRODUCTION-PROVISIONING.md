# FARMAVIDA — GUIA DEFINITIVO DE PROVISIONAMENTO E IMPLANTAÇÃO EM PRODUÇÃO
**Ambiente Oficial de Produção | Google Cloud Platform & Firebase | FarmaVida Drogaria**

---

## 1. Contexto e Objetivos da Produção

O sistema **FarmaVida Drogaria** foi arquitetado sob o padrão de **Single Source of Truth** em nuvem, garantindo:
- Alta disponibilidade com isolamento multi-tenant por Organização (`organizations/{orgId}`) e Loja (`stores/{storeId}`).
- Concorrência segura em operações financeiras e movimentações de estoque via transações atômicas no Firestore (`runTransaction`).
- Sessões protegidas por tokens JWT criptográficos com hashes de PIN seguros (`bcrypt`).
- Portabilidade total: o código-fonte é 100% desacoplado do ambiente de desenvolvimento/staging, sendo parametrizado exclusivamente por variáveis de ambiente.

---

## 2. Pré-requisitos de Conta e Permissões na Conta Oficial

Para provisionar o ambiente de produção na conta corporativa oficial da Farmavida:
1. **Conta Google Corporativa:** Acesso ao Google Cloud Console (`console.cloud.google.com`) e Firebase Console (`console.firebase.google.com`) com e-mail corporativo institucional.
2. **Papéis IAM Mínimos Recomendados:**
   - `Owner` ou `Editor` do Projeto GCP.
   - `Firebase Admin` (`roles/firebase.admin`).
   - `Cloud Datastore Owner` (`roles/datastore.owner`).
   - `Service Account Admin` (para geração de credenciais do Cloud Run).

---

## 3. Criação e Configuração do Projeto no Google Cloud / Firebase

1. Acesse o **Firebase Console** e clique em **Adicionar Projeto**.
2. Nomeie o projeto: `farmavida-pdv-prod` (ou equivalente corporativo).
3. Selecione o faturamento (Plano Blaze recomendado para escalabilidade e limites elásticos do Cloud Run / Firestore).
4. Localização dos recursos do Google Cloud: selecione `southamerica-east1` (São Paulo) para menor latência no Brasil.

---

## 4. Habilitação de APIs no Google Cloud Console

No menu **APIs & Services > Enable APIs and Services**, ative as seguintes APIs:
- `firestore.googleapis.com` (Cloud Firestore API)
- `identitytoolkit.googleapis.com` (Identity Toolkit API / Firebase Authentication)
- `cloudresourcemanager.googleapis.com` (Cloud Resource Manager API)
- `generativelanguage.googleapis.com` (Google Gemini AI API - para inteligência de vendas e relatórios executivos)

---

## 5. Provisionamento do Firestore Database

1. No Firebase Console, navegue até **Build > Firestore Database**.
2. Clique em **Criar Banco de Dados**.
3. **Modo do Banco de Dados:** Selecione **Modo Nativo (Native Mode)**.
4. **Localização:** `southamerica-east1` (São Paulo).
5. **Database ID:** Utilize `(default)` ou defina um identificador dedicado caso use instâncias nomeadas.

---

## 6. Configuração de Firebase Authentication

1. No menu **Build > Authentication**, clique em **Get Started**.
2. Na aba **Sign-in method**, ative:
   - **Custom Token** / **Email/Password** (conforme a política de acesso adotada).
3. O FarmaVida opera com autenticação server-side por PIN com tokens de sessão JWT e custom tokens, dispensando senhas complexas no balcão do PDV enquanto mantém total rigor de segurança.

---

## 7. Criação do Web App no Firebase Console

1. No painel inicial do projeto no Firebase Console, adicione um **Web App** (ícone `</>`).
2. Registre o aplicativo: `FarmaVida Web PDV`.
3. Copie as chaves do objeto `firebaseConfig`:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`

---

## 8. Exportação e Configuração de Variáveis de Ambiente (`.env`)

No servidor de produção (Cloud Run, Compute Engine ou container Docker), configure as variáveis de ambiente:

```env
# AMBIENTE E TENANCY
APP_ENV=production
ORGANIZATION_ID=org_farmavida
DEFAULT_STORE_ID=store_matriz

# CHAVE DE SESSÃO CRIPTOGRÁFICA (Mínimo 32 caracteres)
JWT_SECRET=sua_chave_mestra_secreta_de_alta_entropia_32_chars_prod_2026

# FIREBASE OFICIAL DA FARMAVIDA
FIREBASE_PROJECT_ID=farmavida-pdv-prod
FIREBASE_API_KEY=AIzaSy...
FIREBASE_AUTH_DOMAIN=farmavida-pdv-prod.firebaseapp.com
FIREBASE_DATABASE_ID=(default)
FIREBASE_STORAGE_BUCKET=farmavida-pdv-prod.firebasestorage.app
FIREBASE_APP_ID=1:1234567890:web:abcdef123456
FIREBASE_MESSAGING_SENDER_ID=1234567890

# ENVIRONMENT GUARD (Previne inicialização acidental se o ID não bater)
EXPECTED_FIREBASE_PROJECT_ID=farmavida-pdv-prod

# INTELIGÊNCIA ARTIFICIAL GEMINI
GEMINI_API_KEY=AIzaSy...
```

---

## 9. Deployment de Regras de Segurança (`firestore.rules`)

Execute o deployment das regras de segurança de produção usando a Firebase CLI:

```bash
firebase use production
firebase deploy --only firestore:rules
```

As regras contêm o princípio de **Deny-by-Default** e validam a estrutura hierárquica `organizations/{orgId}/stores/{storeId}/...`.

---

## 10. Deployment de Índices Compostos (`firestore.indexes.json`)

Para garantir ordenações e paginações performáticas sem degradação:

```bash
firebase deploy --only firestore:indexes
```

Principais índices provisionados:
- `stockMovements` (`productId` ASC, `timestamp` DESC)
- `sales` (`storeId` ASC, `timestamp` DESC)
- `cashRegisters` (`status` ASC, `terminalId` ASC, `openedAt` DESC)
- `cashMovements` (`cashRegisterId` ASC, `timestamp` DESC)
- `approvals` (`status` ASC, `createdAt` DESC)
- `shifts` (`userId` ASC, `status` ASC, `startedAt` DESC)

---

## 11. Estrutura Canônica de Dados no Firestore

```text
organizations/{orgId}
├── stores/{storeId}
│   ├── products/{productId}
│   ├── stockMovements/{movementId}
│   ├── sales/{saleId}
│   ├── cashRegisters/{cashRegisterId}
│   ├── cashMovements/{movementId}
│   ├── terminals/{terminalId}
│   ├── shifts/{shiftId}
│   ├── approvals/{approvalId}
│   ├── purchaseOrders/{orderId}
│   ├── suppliers/{supplierId}
│   ├── inventories/{inventoryId}
│   ├── customers/{customerId}
│   ├── targets/{targetId}
│   ├── tasks/{taskId}
│   ├── aiReports/{reportId}
│   └── auditLogs/{logId}
└── users/{userId} (Coleção unificada de operadores e administradores)
```

---

## 12. Primeiro Bootstrap de Administrador (`/api/auth/bootstrap-first-admin`)

Quando o banco de dados oficial estiver vazio (sem administradores ativos):
1. Faça uma requisição `POST` para `/api/auth/bootstrap-first-admin`:

```json
{
  "name": "Dr. Farmacêutico Responsável",
  "email": "farmaceutico@farmavida.com.br",
  "pin": "8855",
  "roleTitle": "Farmacêutico RT / Diretor Geral",
  "phone": "(11) 98765-4321"
}
```

2. O sistema:
   - Valida se **nenhum** administrador ativo existe no banco.
   - Gera o hash seguro `bcrypt` do PIN.
   - Cria o usuário root administrador em `organizations/{orgId}/users/{userId}`.
   - Gera o log de auditoria `BOOTSTRAP_FIRST_ADMIN`.
   - **Bloqueia permanentemente** novas chamadas a este endpoint (retornando `403 Forbidden` se já houver admins).

---

## 13. Estratégias e Modos de Migração de Dados

O script `server/migrateToFirestore.ts` suporta 3 modos operacionais:

- **Modo A (`--mode=clean`):** Inicializa loja, terminais e parâmetros do sistema sem dados transacionais legados. Recomendado para novas filiais.
- **Modo B (`--mode=master_data`):** Migra produtos, categorias, clientes, fornecedores e estoques base, descartando histórico de vendas ou caixas transitórios de teste.
- **Modo C (`--mode=full`):** Migra a totalidade dos dados cadastrais e histórico transacional validado.

Para executar:
```bash
npm run migrate:firestore -- --mode=master_data
```

---

## 14. Validação de Integridade e Conciliação Financeira

O processo de migração emite um manifesto completo contendo:
- Conferência de saldo total de estoque (unidades físicas de entrada vs. saída).
- Total financeiro conciliado de vendas.
- Status e integridade de sessões de caixa.
- Verificação de referências de integridade relacional entre produtos, vendas e operadores.

---

## 15. Configuração de Terminais e Gavetas de Caixa

1. No painel **Configurações > Terminais**, cadastre os terminais físicos da loja (ex.: `Terminal Balcão 01`, `Terminal Caixa 02`).
2. Cada terminal mantém vínculo estrito com a sua sessão de caixa aberta.
3. Trocas de atendente operam dentro da mesma sessão de caixa sem fechar a gaveta do colega, acumulando subtotais por operador no campo `operatorSummaries`.

---

## 16. Troca Rápida de Operador e Validação de PIN

- Troca de operador no PDV (`POST /api/auth/switch-operator`):
  - Verifica o PIN do operador de destino via `bcrypt.compare`.
  - Emite novo token JWT de sessão.
  - Preserva o terminal, o turno e o caixa ativos.
- Autorização de Gerente (`POST /api/auth/verify-manager-pin`):
  - Exigido para sangrias de alto valor, descontos acima da alçada permitida e cancelamentos de itens.

---

## 17. Concorrência e Transações Atômicas

Todas as mutações críticas utilizam `runTransaction`:
- **Vendas (`executeSaleTransaction`):** Bloqueio de leitura e decremento do saldo de produto + registro de histórico + acúmulo no caixa ativo.
- **Abertura de Caixa (`openCashRegister`):** Previne duplicação de gavetas abertas no mesmo terminal.
- **Movimentações (`addCashMovement`):** Atualização instantânea do `expectedCash`.

---

## 18. Proteção de Custos e Contagem Cega de Inventário

- Usuários com papel `colaborador` nunca recebem os campos `costPrice` nas respostas de API de produtos.
- Durante inventários rotativos, os campos `expectedQuantitySnapshot`, `recordedStock` e `financialImpact` são mascarados para colaboradores no backend, garantindo contagem física fidedigna sem viés.

---

## 19. Políticas de Backup no Google Cloud

1. No Google Cloud Console, acesse **Firestore > Backups**.
2. Configure a política de **Backups Diários Automáticos** com retenção de 30 a 90 dias.
3. Para exportação manual pontual via `gcloud`:
   ```bash
   gcloud firestore export gs://farmavida-backups-bucket/$(date +%Y-%m-%d)
   ```

---

## 20. Configuração de Domínio Personalizado e SSL

1. No Cloud Run ou Firebase Hosting:
   - Adicione o domínio personalizado: `pdv.farmavida.com.br` (ou `app.farmavida.com.br`).
2. Aponte os registros DNS `CNAME` e `A` indicados pelo Google Cloud.
3. O certificado SSL TLS 1.3 é emitido e renovado automaticamente pela infraestrutura do Google.

---

## 21. Environment Guard e Fail-Fast Anti-Poluição

O FarmaVida possui um módulo de proteção em `server/config.ts` que executa no startup:
- Se `APP_ENV=production` e `FIREBASE_PROJECT_ID` for o ID temporário do desenvolvedor (`gen-lang-client-0130643182`), o servidor **aborta imediatamente o boot** com erro fatal explícito.
- Se `EXPECTED_FIREBASE_PROJECT_ID` estiver configurado e o ID conectado for diferente, a inicialização é bloqueada.
- Garante que a produção nunca toque acidentalmente nos bancos de staging/dev.

---

## 22. Checklist de Testes Pós-Implantação (Smoke Test)

- [ ] Acessar URL de produção e verificar carregamento limpo do layout sem erros de console.
- [ ] Executar o bootstrap do primeiro administrador com sucesso.
- [ ] Tentar chamar o bootstrap novamente e validar o bloqueio `403 Forbidden`.
- [ ] Efetuar login com PIN do Administrador.
- [ ] Abrir uma sessão de caixa com fundo de troco inicial.
- [ ] Realizar uma venda teste (dinheiro e Pix) e conferir baixa no estoque e no caixa.
- [ ] Efetuar a troca rápida de operador para um colaborador cadastrado.
- [ ] Realizar sangria/suprimento e conferir a atualização do saldo esperado.
- [ ] Realizar o fechamento de caixa e validar conciliação e divergências.
- [ ] Testar solicitação e aprovação de ajuste de estoque.

---

## 23. Plano de Contingência e Rollback

1. Em caso de falha de conectividade externa, os dados de transações com `idempotencyKey` garantem que re-tentativas no PDV não dupliquem cobranças ou baixas de estoque.
2. Em caso de inconsistência de configuração, restaure o snapshot do Firestore através do Cloud Storage Backup.
3. Os logs de auditoria (`auditLogs`) gravam o autor, data, IP/terminal e contexto de qualquer alteração cadastral ou financeira.

---

## 24. Handoff de Credenciais e Governança

- As credenciais de acesso e chaves de API devem ser armazenadas no **Google Cloud Secret Manager** ou no cofre de senhas institucional da Farmavida.
- A conta Google do desenvolvedor deve ser removida dos papéis IAM do projeto de produção após a conclusão do handoff oficial.

---

## 25. Matriz de Contatos e Suporte

- **Suporte Técnico de Infraestrutura:** Equipe de TI FarmaVida
- **Responsável Farmacêutico / Validação Regulatória:** Diretoria Técnica FarmaVida
- **Documentação de Engenharia:** Mantida no repositório oficial do projeto FarmaVida
