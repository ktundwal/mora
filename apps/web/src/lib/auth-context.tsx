'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInAnonymously,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from './firebase';
import { useUserStore } from './stores/user-store';
import { isTestAuthEnabled, isTestEnvironment } from './test-auth';
import type { UserProfile } from '@mora/core';
import { CURRENT_SCHEMA_VERSION } from '@mora/core';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { setProfile, clearProfile } = useUserStore();

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let isCancelled = false;

    const run = async () => {
      const auth = getFirebaseAuth();

      // Test-mode auth: when running against emulators, sign in anonymously so
      // Firestore rules work and AuthGuard doesn't redirect.
      if (isTestEnvironment() && isTestAuthEnabled() && !auth.currentUser) {
        try {
          await signInAnonymously(auth);
        } catch (error) {
          console.error('[TestAuth] Failed to sign in anonymously:', error);
        }
      }

      if (isCancelled) return;

      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        setUser(firebaseUser);

        if (firebaseUser) {
          try {
            // Optimistic local profile so the app can function immediately (uid-scoped).
            // Firestore remains the source of truth; we overwrite if fetch/create succeeds.
            const now = new Date().toISOString();
            const fallbackProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              isPro: false,
              subscriptionTier: 'free',
              stripeCustomerId: null,
              unpacksUsedThisMonth: 0,
              unpacksResetAt: getNextMonthReset(),
              encryptionVersion: null,
              recoveryPhraseHash: null,
              keySalt: null,
              encryptionEnabled: false,
              createdAt: now,
              updatedAt: now,
              schemaVersion: CURRENT_SCHEMA_VERSION,
            };

            setProfile(fallbackProfile);

            const profile = await getOrCreateUserProfile(firebaseUser);
            setProfile(profile);
          } catch (error) {
            console.error('Failed to get/create user profile:', error);
          }
        } else {
          clearProfile();
        }

        setLoading(false);
      });
    };

    run();

    return () => {
      isCancelled = true;
      unsubscribe?.();
    };
  }, [setProfile, clearProfile]);

  const signInWithGoogle = async () => {
    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    // Request email scope
    provider.addScope('email');
    provider.addScope('profile');

    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    const auth = getFirebaseAuth();
    try {
      await firebaseSignOut(auth);
      clearProfile();
    } catch (error) {
      console.error('Sign-out error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// Helper: Convert Firestore Timestamp to ISO string
function toISOString(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  // Fallback for unexpected types
  return new Date().toISOString();
}

// Helper: Get existing profile or create new one
async function getOrCreateUserProfile(user: User): Promise<UserProfile> {
  const db = getFirebaseDb();
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const data = userSnap.data();
    // Convert Firestore Timestamps to ISO strings
    return {
      ...data,
      createdAt: toISOString(data.createdAt),
      updatedAt: toISOString(data.updatedAt),
      unpacksResetAt: toISOString(data.unpacksResetAt),
    } as UserProfile;
  }

  // Create new user profile
  const now = new Date().toISOString();
  const newProfile: UserProfile = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    isPro: false,
    subscriptionTier: 'free',
    stripeCustomerId: null,
    unpacksUsedThisMonth: 0,
    unpacksResetAt: getNextMonthReset(),
    encryptionVersion: null,
    recoveryPhraseHash: null,
    keySalt: null,
    encryptionEnabled: false,
    createdAt: now,
    updatedAt: now,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };

  await setDoc(userRef, {
    ...newProfile,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return newProfile;
}

// Get first day of next month as reset date
function getNextMonthReset(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString();
}
