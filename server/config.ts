import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load .env if present
dotenv.config();

export type AppEnvironment = 'development' | 'staging' | 'production';

export interface FirebaseAppConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  oAuthClientId?: string;
  measurementId?: string;
  recaptchaSiteKey?: string;
}

export interface AppConfig {
  env: AppEnvironment;
  organizationId: string;
  defaultStoreId: string;
  jwtSecret: string;
  geminiApiKey?: string;
  firebase: FirebaseAppConfig;
  apiBaseUrl: string;
  isDevelopment: boolean;
  isStaging: boolean;
  isProduction: boolean;
}

const KNOWN_STAGING_PROJECT_ID = 'gen-lang-client-0130643182';

let cachedConfig: AppConfig | null = null;

export function loadAppConfig(forceReload = false): AppConfig {
  if (cachedConfig && !forceReload) {
    return cachedConfig;
  }

  const rawEnv = (process.env.APP_ENV || process.env.NODE_ENV || 'development').toLowerCase();
  const env: AppEnvironment = rawEnv === 'production' ? 'production' : rawEnv === 'staging' ? 'staging' : 'development';

  const organizationId = process.env.ORGANIZATION_ID || 'org_farmavida';
  const defaultStoreId = process.env.DEFAULT_STORE_ID || 'store_matriz';
  const apiBaseUrl = process.env.API_BASE_URL || '';
  const geminiApiKey = process.env.GEMINI_API_KEY || '';

  // 1. Read optional runtime config file
  let fileConfig: Partial<FirebaseAppConfig> = {};
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, 'utf8');
      fileConfig = JSON.parse(raw);
    } catch (e) {
      console.warn('[CONFIG] Note: Could not parse firebase-applet-config.json:', (e as any)?.message);
    }
  }

  // 2. Resolve Firebase parameters with strict precedence: ENV > fileConfig
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || fileConfig.projectId || '';
  const appId = process.env.FIREBASE_APP_ID || fileConfig.appId || '';
  const apiKey = process.env.FIREBASE_API_KEY || fileConfig.apiKey || '';
  const authDomain = process.env.FIREBASE_AUTH_DOMAIN || fileConfig.authDomain || (projectId ? `${projectId}.firebaseapp.com` : '');
  const firestoreDatabaseId = process.env.FIREBASE_DATABASE_ID || fileConfig.firestoreDatabaseId || '(default)';
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || fileConfig.storageBucket || (projectId ? `${projectId}.firebasestorage.app` : '');
  const messagingSenderId = process.env.FIREBASE_MESSAGING_SENDER_ID || fileConfig.messagingSenderId || '';
  const oAuthClientId = process.env.FIREBASE_OAUTH_CLIENT_ID || fileConfig.oAuthClientId || '';

  // 3. JWT Secret resolution
  let jwtSecret = process.env.JWT_SECRET || '';
  if (!jwtSecret) {
    if (env === 'production') {
      throw new Error(
        '[ENVIRONMENT GUARD FATAL] Production requires a secure JWT_SECRET environment variable (at least 32 characters).'
      );
    }
    jwtSecret = 'farmavida_staging_jwt_secret_default_key_2026';
  }

  const firebase: FirebaseAppConfig = {
    projectId,
    appId,
    apiKey,
    authDomain,
    firestoreDatabaseId,
    storageBucket,
    messagingSenderId,
    oAuthClientId,
  };

  // 4. ENVIRONMENT GUARD & PRODUCTION FAIL-FAST
  if (env === 'production') {
    if (!projectId) {
      throw new Error(
        '[ENVIRONMENT GUARD FATAL] APP_ENV=production requires an explicit FIREBASE_PROJECT_ID in environment variables. ' +
        'Refusing to boot production without official Farmavida Firebase configuration.'
      );
    }

    if (projectId === KNOWN_STAGING_PROJECT_ID) {
      throw new Error(
        `[ENVIRONMENT GUARD FATAL] Production environment (APP_ENV=production) is attempting to connect to the developer staging project ("${KNOWN_STAGING_PROJECT_ID}"). ` +
        'Boot blocked immediately to prevent staging account lock-in or cross-environment data contamination.'
      );
    }

    const expectedProject = process.env.EXPECTED_FIREBASE_PROJECT_ID;
    if (expectedProject && projectId !== expectedProject) {
      throw new Error(
        `[ENVIRONMENT GUARD FATAL] Expected Firebase Project ID "${expectedProject}" does not match configured Project ID "${projectId}". Startup aborted.`
      );
    }
  }

  cachedConfig = {
    env,
    organizationId,
    defaultStoreId,
    jwtSecret,
    geminiApiKey,
    firebase,
    apiBaseUrl,
    isDevelopment: env === 'development',
    isStaging: env === 'staging',
    isProduction: env === 'production',
  };

  return cachedConfig;
}

export function getPublicClientConfig() {
  const config = loadAppConfig();
  return {
    env: config.env,
    organizationId: config.organizationId,
    defaultStoreId: config.defaultStoreId,
    apiBaseUrl: config.apiBaseUrl,
    firebase: {
      projectId: config.firebase.projectId,
      appId: config.firebase.appId,
      apiKey: config.firebase.apiKey,
      authDomain: config.firebase.authDomain,
      firestoreDatabaseId: config.firebase.firestoreDatabaseId,
      storageBucket: config.firebase.storageBucket,
      messagingSenderId: config.firebase.messagingSenderId,
    },
  };
}
