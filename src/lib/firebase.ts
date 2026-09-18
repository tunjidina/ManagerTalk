// src/lib/firebase.ts
//
// Firebase initialisation for ManagerTalk.
//
// Firebase web config values are PUBLIC by design — they ship in the JS
// bundle and are not secrets. Security comes from the Firebase console
// (authorised domains, enabled providers) and from security rules.
//
// IMPORTANT: getAuth() throws `auth/invalid-api-key` when the config is
// empty. Because this module is imported at the top of App.tsx, a throw
// here happens before React mounts and the page renders completely blank.
// So auth and Firestore are created lazily and the config is checked first.

import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

const missingKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

/** True when every required config value is present. */
export const isFirebaseConfigured = (): boolean => missingKeys.length === 0;

/** Which REACT_APP_* variables are missing, for the on-screen message. */
export const missingFirebaseKeys = (): string[] =>
  missingKeys.map(
    (key) => 'REACT_APP_FIREBASE_' + key.replace(/([A-Z])/g, '_$1').toUpperCase()
  );

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

/**
 * Single initialisation point. Both getFirebaseAuth() and getFirebaseDb()
 * route through here, so the app is created exactly once no matter which
 * one is touched first.
 */
function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error(
      'Firebase is not configured. Missing: ' + missingFirebaseKeys().join(', ')
    );
  }

  if (!app) {
    app = initializeApp(firebaseConfig);
  }

  return app;
}

/**
 * Creates the Firebase app and auth on first use. Never called while
 * isFirebaseConfigured() is false — AuthGate checks that first and shows
 * a setup screen instead.
 */
export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    authInstance = getAuth(getFirebaseApp());
  }

  return authInstance;
}

/**
 * Lazily created Firestore instance. Same contract as getFirebaseAuth():
 * only call this behind an isFirebaseConfigured() check, or inside code
 * that already runs after AuthGate has rendered its children.
 */
export function getFirebaseDb(): Firestore {
  if (!dbInstance) {
    dbInstance = getFirestore(getFirebaseApp());
  }

  return dbInstance;
}
