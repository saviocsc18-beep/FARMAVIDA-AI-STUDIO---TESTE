import { User } from '../types';

const TOKEN_KEY = 'farmavida_jwt_session_token';
const USER_KEY = 'farmavida_auth_user';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {}
}

export function clearStoredAuth() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {}
}

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: User) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {}
}

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  const token = getStoredToken();
  const storedUser = getStoredUser();

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (storedUser?.role) {
    headers.set('x-user-role', storedUser.role);
    headers.set('x-user-id', storedUser.id);
  }

  const mergedInit: RequestInit = {
    ...init,
    headers,
  };

  const response = await fetch(input, mergedInit);
  return response;
}

export async function loginWithPinApi(
  usernameOrId: string, 
  pin: string, 
  terminalId?: string
): Promise<{ success: boolean; user?: User; token?: string; error?: string }> {
  try {
    const res = await fetch('/api/auth/login-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: usernameOrId, pin, terminalId }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Falha na autenticação' };
    }

    if (data.token) {
      setStoredToken(data.token);
    }
    if (data.user) {
      setStoredUser(data.user);
    }

    return { success: true, user: data.user, token: data.token };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro de rede na autenticação' };
  }
}

export async function switchOperatorApi(
  operatorId: string, 
  pin: string, 
  terminalId: string
): Promise<{ success: boolean; user?: User; token?: string; error?: string }> {
  try {
    const res = await apiFetch('/api/auth/switch-operator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operatorId, pin, terminalId }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Falha na troca de operador' };
    }

    if (data.token) {
      setStoredToken(data.token);
    }
    if (data.user) {
      setStoredUser(data.user);
    }

    return { success: true, user: data.user, token: data.token };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro de comunicação ao trocar operador' };
  }
}

export async function verifyManagerPinApi(
  managerId: string, 
  pin: string
): Promise<{ success: boolean; managerName?: string; error?: string }> {
  try {
    const res = await apiFetch('/api/auth/verify-manager-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ managerId, pin }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'PIN de gerente incorreto' };
    }
    return { success: true, managerName: data.managerName };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao validar autorização de gerente' };
  }
}
