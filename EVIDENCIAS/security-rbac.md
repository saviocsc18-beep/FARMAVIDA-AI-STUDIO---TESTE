# EVIDÊNCIA TÉCNICA: SEGURANÇA, AUTENTICAÇÃO E CONTROLE DE ACESSO (RBAC)

**Data da Auditoria:** 17 de Setembro de 2026  
**Auditor:** Agente de Engenharia & Auditoria de Sistemas  

---

## 1. Mecanismo de Autenticação Disponível

1. **Tokens JWT (`server/auth.ts`)**:
   - Assinatura com `jsonwebtoken` utilizando segredo em variável de ambiente `JWT_SECRET` (com fallback seguro para ambiente de dev).
   - Payload do Token: `{ id, name, email, role, storeId }`.
   - Tempo de expiração padrão: 12 horas de jornada.

2. **Endpoints de Login e PIN**:
   - `POST /api/auth/login-pin`: Valida PIN numérico (4 a 6 dígitos).
   - `POST /api/auth/switch-operator`: Valida troca rápida de operador no balcão por PIN.
   - `POST /api/auth/verify-manager-pin`: Valida PIN de gerente para liberação de alçadas em modais flutuantes.

---

## 2. Pontos Críticos de Risco e Bypasses Encontrados

### Risco Crítico 1: Seletor Livre de Usuários na Barra Superior (`Navbar.tsx`)
- **Arquivo:** `src/components/Navbar.tsx` (Linhas 249-264)
- **Evidência:**
  ```tsx
  <select
    value={currentUser.id}
    onChange={(e) => {
      const found = availableUsers.find((u) => u.id === e.target.value);
      if (found) onSwitchUser(found);
    }}
    className="..."
  >
    {availableUsers.map((u) => (
      <option key={u.id} value={u.id}>
        {u.name.split(' ')[0]} ({u.role === 'admin' ? 'Admin' : 'Balcão'})
      </option>
    ))}
  </select>
  ```
- **Diagnóstico:** Qualquer pessoa com acesso à tela pode alternar instantaneamente entre Balconista e Administrador sem digitar nenhuma senha ou PIN.
- **Motivo Original:** Inserido durante a fase de prototipagem/testes para permitir testar fluxos dos dois papéis sem ter que deslogar repetidamente.
- **Ação para Produção (P0):** Remover o `<select>` direto e acionar o modal `OperatorSwitchModal` com validação de PIN obrigatória.

---

### Risco Crítico 2: Botão de Elevação de Privilégios na Tela de Acesso Negado (`RestrictedAccessView.tsx`)
- **Arquivo:** `src/components/RestrictedAccessView.tsx` (Linhas 71-79) e `src/App.tsx` (Linhas 1254-1257)
- **Evidência:**
  ```tsx
  // Em RestrictedAccessView.tsx:
  {onSwitchToAdmin && (
    <button onClick={onSwitchToAdmin} className="...">
      <span>Alternar para Perfil Admin</span>
    </button>
  )}

  // Em App.tsx:
  onSwitchToAdmin={() => {
    const adminUser = users.find((u) => u.role === 'admin');
    if (adminUser) setCurrentUser(adminUser);
  }}
  ```
- **Diagnóstico:** Quando um colaborador tenta acessar um módulo restrito, a tela bloqueia o conteúdo, mas oferece um botão direto que eleva o usuário para Administrador em um clique.
- **Ação para Produção (P0):** Excluir o botão de elevação direta ou substituir por modal de autenticação com PIN de gerente.

---

### Risco Crítico 3: Ausência de Interceptador com Token nas Chamadas HTTP (`src/App.tsx`)
- **Arquivo:** `src/App.tsx`
- **Evidência:** Funções como `handleSaveSale`, `handleOpenCash`, `handleImportProducts` chamam `window.fetch()` diretamente sem injetar o cabeçalho `Authorization: Bearer <token>`.
- **Diagnóstico:** O frontend possui a biblioteca `src/lib/api.ts` com o helper `apiFetch` que injeta o token, porém o arquivo principal `src/App.tsx` não a utilizou em todas as funções operacionais.
- **Ação para Produção (P0):** Padronizar todas as chamadas de API através de `apiFetch` com verificação de sessão e renovação de token.
