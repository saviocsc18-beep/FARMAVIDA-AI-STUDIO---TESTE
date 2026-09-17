import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../src/types.js';
import { loadAppConfig } from './config.js';

const JWT_EXPIRES_IN = '24h';

export interface AuthContext {
  uid: string;
  employeeId: string;
  name: string;
  email?: string;
  role: 'admin' | 'colaborador';
  storeId: string;
  organizationId: string;
  terminalId?: string;
}

declare global {
  namespace Express {
    interface Request {
      authenticatedUser?: AuthContext;
    }
  }
}

function getJwtSecret(): string {
  const config = loadAppConfig();
  return config.jwtSecret;
}

export function generateAuthToken(user: User, terminalId?: string): string {
  const config = loadAppConfig();
  const payload: AuthContext = {
    uid: user.id,
    employeeId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    storeId: user.storeId || config.defaultStoreId,
    organizationId: config.organizationId,
    terminalId,
  };
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
}

export function verifyAuthToken(token: string): AuthContext | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as AuthContext;
    return decoded;
  } catch (err) {
    return null;
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyAuthToken(token);
    if (decoded) {
      req.authenticatedUser = decoded;
      return next();
    }
  }

  // Fallback for initial unauthenticated development queries if specified
  const devRole = req.headers['x-user-role'] as string;
  if (process.env.ALLOW_DEV_FALLBACK === 'true' && devRole) {
    req.authenticatedUser = {
      uid: devRole === 'admin' ? 'usr_admin' : 'usr_colab1',
      employeeId: devRole === 'admin' ? 'usr_admin' : 'usr_colab1',
      name: devRole === 'admin' ? 'Dr. Roberto Mendes' : 'Camila Santos',
      role: devRole === 'admin' ? 'admin' : 'colaborador',
      storeId: 'store_matriz',
      organizationId: 'org_farmavida',
    };
    return next();
  }

  // Default guest/operator context for unauthenticated endpoints
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.authenticatedUser) {
    return res.status(401).json({
      error: 'Não autorizado. Token de sessão ausente ou inválido. Por favor, autentique-se novamente.',
      code: 'UNAUTHORIZED'
    });
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.authenticatedUser) {
    return res.status(401).json({
      error: 'Não autorizado. Sessão necessária.',
      code: 'UNAUTHORIZED'
    });
  }
  if (req.authenticatedUser.role !== 'admin') {
    return res.status(403).json({
      error: 'Acesso negado. Esta operação exige privilégios de Administrador/Gerente.',
      code: 'FORBIDDEN_ADMIN_REQUIRED'
    });
  }
  next();
}
