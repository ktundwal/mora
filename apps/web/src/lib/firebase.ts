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

const authEmulatorHost = process.env.NEXT_PUBLIC_AUTH_EMULATOR_HOST || '127.0.0.1';
const authEmulatorPort = Number(process.env.NEXT_PUBLIC_AUTH_EMULATOR_PORT || '9099');
const firestoreEmulatorHost = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST || '127.0.0.1';
const firestoreEmulatorPort = Number(process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT || '8080');
const storageEmulatorHost = process.env.NEXT_PUBLIC_STORAGE_EMULATOR_HOST || '127.0.0.1';
const storageEmulatorPort = Number(process.env.NEXT_PUBLIC_STORAGE_EMULATOR_PORT || '9199');

// Initialize Firebase lazily (only when actually needed on client)
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let authEmulatorConnected = false;
let firestoreEmulatorConnected = false;
let storageEmulatorConnected = false;

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
  if (!useEmulators) return;

  if (auth && !authEmulatorConnected) {
    authEmulatorConnected = true;
    console.log('[Firebase] Connecting Auth emulator...');
    connectAuthEmulator(auth, `http://${authEmulatorHost}:${authEmulatorPort}`, { disableWarnings: true });
  }

  if (db && !firestoreEmulatorConnected) {
    firestoreEmulatorConnected = true;
    console.log('[Firebase] Connecting Firestore emulator...');
    connectFirestoreEmulator(db, firestoreEmulatorHost, firestoreEmulatorPort);
  }

  if (storage && !storageEmulatorConnected) {
    storageEmulatorConnected = true;
    console.log('[Firebase] Connecting Storage emulator...');
    connectStorageEmulator(storage, storageEmulatorHost, storageEmulatorPort);
  }
}
