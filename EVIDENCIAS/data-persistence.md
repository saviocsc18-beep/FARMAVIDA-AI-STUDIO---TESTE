# EVIDÊNCIA TÉCNICA: ESTADO DA PERSISTÊNCIA DE DADOS (JSON VS FIRESTORE)

**Data da Auditoria:** 17 de Setembro de 2026  
**Ambiente:** Staging / Desenvolvimento Local com Conector Firestore Habilitado  

---

## 1. Topologia de Dados Atual

```text
[Cliente Web / React SPA]
           │
           │ (Fetch HTTP / JSON)
           ▼
[Servidor Express (server.ts)]
     │                      │
     │ (Primário Operacional)│ (Secundário / Métodos Prontos)
     ▼                      ▼
[data/farmavida.json]   [server/firestoreService.ts]
 (db.mutate / fs.write)     │
                            ▼
                    [Google Cloud Firestore]
                     (Coleções Estruturadas + Rules)
```

---

## 2. Evidências de Persistência no Arquivo Local (`data/farmavida.json`)

1. **Volume de Registros Atual**:
   - Produtos cadastrados: 16 itens básicos com EAN, código interno, preços e estoque.
   - Colaboradores e Administradores: 4 usuários (1 Admin, 2 Balconistas, 1 Farmacêutico Responsável).
   - Sessões de Caixa Históricas: Registros de abertura, sangria e fechamento com conciliação.
   - Vendas Concluídas: Vendas com múltiplos métodos de pagamento e cupons de auditoria.
   - Movimentações de Kardex: Entradas por compras e saídas por vendas e ajustes manuais.

2. **Mecanismo de Integridade (`db.mutate`)**:
   - `server/db.ts` utiliza controle de concorrência com fila assíncrona (lock em memória) e escrita atômica via `fs.writeFileSync` em arquivo temporário com rename seguro.
   - Garante que vendas concorrentes não sobrescrevam o saldo de estoque sem detecção de conflito.

---

## 3. Evidências do Conector Firestore (`server/firestoreService.ts`)

1. **Estrutura de Coleções Mapeadas**:
   - Todas as 17 coleções de negócios estão tipadas e provisionadas.
   - `server/migrateToFirestore.ts` contém rotina de migração completa de `farmavida.json` para o Firestore.

2. **Transações Atômicas Implementadas no Firestore**:
   - `cancelSale(storeId, saleId, cancelledByUserId, reason)`:
     - Linhas 1050-1120 de `server/firestoreService.ts`.
     - Utiliza `db.runTransaction()` para:
       1. Ler a venda e verificar se já foi cancelada;
       2. Devolver estoque de cada produto participante da venda;
       3. Gravar documento em `stock_movements` com tipo `estorno_venda`;
       4. Atualizar o status da venda para `cancelada`;
       5. Gravar log em `audit_logs`.
   - `adjustProductStock(storeId, productId, newStock, reason, authorId, authorName)`:
     - Linhas 1122-1175 de `server/firestoreService.ts`.
     - Utiliza transação Firestore para atualizar saldo e emitir Kardex no mesmo lote.

3. **Status do Chaveamento Operacional (Cutover)**:
   - **Status Atual: PARTIAL / STAGING**.
   - As rotas em `server.ts` ainda lêem e gravam em `data/farmavida.json`.
   - O Firestore está totalmente modelado e pronto para o cutover (Phase 07), mas ainda não é a única fonte da verdade em tempo de execução das rotas REST.
