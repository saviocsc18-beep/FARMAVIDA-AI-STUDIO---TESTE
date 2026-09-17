import { initializeApp, getApps, getApp, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import bcrypt from 'bcryptjs';
import { loadAppConfig, FirebaseAppConfig } from './config.js';

let firebaseAdminApp: App | null = null;
let firestoreDb: Firestore | null = null;

export function getFirebaseConfig(): FirebaseAppConfig {
  const config = loadAppConfig();
  return config.firebase;
}

export function initFirebaseAdmin(): { app: App; db: Firestore } {
  if (firebaseAdminApp && firestoreDb) {
    return { app: firebaseAdminApp, db: firestoreDb };
  }

  const config = getFirebaseConfig();
  const existingApps = getApps();

  if (!existingApps.length) {
    try {
      firebaseAdminApp = initializeApp({
        projectId: config.projectId || undefined,
      });
    } catch (err: any) {
      console.error('Error initializing Firebase Admin:', err);
      firebaseAdminApp = getApp();
    }
  } else {
    firebaseAdminApp = existingApps[0];
  }

  const dbId = config.firestoreDatabaseId || '(default)';
  try {
    firestoreDb = getFirestore(firebaseAdminApp, dbId);
  } catch (err: any) {
    console.warn(`Could not connect to named database ${dbId}, falling back to default:`, err?.message);
    firestoreDb = getFirestore(firebaseAdminApp);
  }

  return { app: firebaseAdminApp, db: firestoreDb };
}

export function getDb(): Firestore {
  if (!firestoreDb) {
    initFirebaseAdmin();
  }
  return firestoreDb!;
}

export async function hashPin(plainPin: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainPin, salt);
}

export async function comparePin(plainPin: string, hash: string): Promise<boolean> {
  if (!plainPin || !hash) return false;
  return bcrypt.compare(plainPin, hash);
}

export async function createAuthCustomToken(uid: string, claims?: Record<string, any>): Promise<string> {
  initFirebaseAdmin();
  const auth = getAuth();
  return auth.createCustomToken(uid, claims);
}

export async function verifyIdToken(idToken: string) {
  initFirebaseAdmin();
  const auth = getAuth();
  return auth.verifyIdToken(idToken);
}
