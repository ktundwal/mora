// Firebase Client SDK initialization
// Uses environment variables from .env.local
// Only initializes on client-side to prevent SSR build errors

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Check if we should use emulators
const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';

// Initialize Firebase lazily (only when actually needed on client)
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let emulatorsConnected = false;

function getFirebaseApp(): FirebaseApp {
  if (typeof window === 'undefined') {
    throw new Error('Firebase should only be used on the client side');
  }

  if (app) return app;

  const apps = getApps();
  if (apps.length > 0) {
    app = apps[0]!;
  } else {
    app = initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (auth) return auth;
  auth = getAuth(getFirebaseApp());
  connectToEmulators();
  return auth;
}

export function getFirebaseDb(): Firestore {
  if (db) return db;
  db = getFirestore(getFirebaseApp());
  connectToEmulators();
  return db;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (storage) return storage;
  storage = getStorage(getFirebaseApp());
  connectToEmulators();
  return storage;
}

/**
 * Connect to Firebase emulators if enabled
 * Only connects once, even if called multiple times
 */
function connectToEmulators(): void {
  if (!useEmulators || emulatorsConnected) return;
  
  emulatorsConnected = true;
  console.log('[Firebase] Connecting to emulators...');

  if (auth) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  }
  if (db) {
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
  if (storage) {
    connectStorageEmulator(storage, '127.0.0.1', 9199);
  }
}
