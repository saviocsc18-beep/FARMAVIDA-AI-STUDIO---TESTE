import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithCustomToken as fbSignInWithCustomToken, 
  signOut as fbSignOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  Auth
} from 'firebase/auth';

// Configuration loaded dynamically from client environment or public API
const metaEnv = (import.meta as any).env || {};
const defaultClientConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || "",
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: metaEnv.VITE_FIREBASE_APP_ID || ""
};

let firebaseAppInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;

export function getClientFirebaseApp(): FirebaseApp {
  if (!firebaseAppInstance) {
    const existing = getApps();
    if (existing.length > 0) {
      firebaseAppInstance = existing[0];
    } else {
      firebaseAppInstance = initializeApp(defaultClientConfig);
    }
  }
  return firebaseAppInstance;
}

export function getClientAuth(): Auth {
  if (!authInstance) {
    const app = getClientFirebaseApp();
    authInstance = getAuth(app);
  }
  return authInstance;
}

export const auth = getClientAuth();

let currentCachedToken: string | null = null;

// Keep token fresh in memory
onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
  if (user) {
    try {
      currentCachedToken = await user.getIdToken();
    } catch {
      currentCachedToken = null;
    }
  } else {
    currentCachedToken = null;
  }
});

export async function getValidIdToken(forceRefresh = false): Promise<string | null> {
  const currentAuth = getClientAuth();
  if (currentAuth.currentUser) {
    try {
      currentCachedToken = await currentAuth.currentUser.getIdToken(forceRefresh);
      return currentCachedToken;
    } catch {
      return null;
    }
  }
  return currentCachedToken;
}

export async function loginWithCustomToken(customToken: string): Promise<FirebaseUser> {
  const currentAuth = getClientAuth();
  const userCredential = await fbSignInWithCustomToken(currentAuth, customToken);
  currentCachedToken = await userCredential.user.getIdToken(true);
  return userCredential.user;
}

export async function logoutFirebaseAuth(): Promise<void> {
  const currentAuth = getClientAuth();
  await fbSignOut(currentAuth);
  currentCachedToken = null;
}

