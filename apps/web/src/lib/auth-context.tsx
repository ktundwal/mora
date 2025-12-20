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
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
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

import { useClientPreferences } from './stores/client-preferences';

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { setProfile, clearProfile } = useUserStore();
  const { setHasAuthenticatedBefore } = useClientPreferences();

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
          setHasAuthenticatedBefore(true);
          try {
            // Optimistic local profile
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
              onboardingCompleted: false,
              createdAt: now,
              updatedAt: now,
              schemaVersion: CURRENT_SCHEMA_VERSION,
            };

            setProfile(fallbackProfile);
            const profile = await getOrCreateUserProfile(firebaseUser);
            setProfile(profile);

            // MIGRATION: Check for guest data and migrate if present
            // We import dynamically to avoid circular dependencies if any
            const { useGuestStore } = await import('./stores/guest-store');
            const { createPerson } = await import('./services/person-service');
            const { hasActiveCryptoKey } = await import('./crypto/active-key');
            const guestStore = useGuestStore.getState();

            if (guestStore.hasGuestData() && !firebaseUser.isAnonymous) {
              console.log('[Migration] Guest data detected');

              // Check if encryption is set up
              if (!hasActiveCryptoKey()) {
                console.log('[Migration] No encryption key found');

                // Set loading to false so AuthGuard doesn't block the setup page
                setLoading(false);

                // Only redirect if we're not already on the setup page
                if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/setup')) {
                  console.log('[Migration] Redirecting to setup');
                  window.location.href = '/setup?migrate=true';
                  return;
                }

                // If we're already on setup, don't redirect - let the page handle it
                console.log('[Migration] Already on setup page, waiting for encryption setup');
                return;
              }

              console.log('[Migration] Encryption key found, proceeding with migration');
              const { guestPerson, guestContext, userDisplayName } = guestStore;

              let personId: string | null = null;

              // 1. Create Person (encrypted)
              if (guestPerson) {
                try {
                  personId = await createPerson({
                    uid: firebaseUser.uid,
                    displayName: guestPerson.displayName,
                    relationshipType: guestPerson.relationshipType as any,
                    importanceNote: guestContext?.importanceNote || null,
                  });
                  console.log('[Migration] Successfully migrated person:', personId);
                } catch (e) {
                  console.error('[Migration] Failed to migrate person:', e);
                }
              }

              // Note: We skip creating a conversation during onboarding migration
              // because we don't have actual parsed messages yet.
              // The user can create their first conversation from the dashboard.

              // Mark onboarding as complete
              try {
                const db = getFirebaseDb();
                const userRef = doc(db, 'users', firebaseUser.uid);
                await updateDoc(userRef, {
                  onboardingCompleted: true,
                  updatedAt: serverTimestamp(),
                });
                console.log('[Migration] Marked onboarding as complete');
              } catch (e) {
                console.error('[Migration] Failed to update onboarding status:', e);
              }

              guestStore.clearGuestData();
              console.log('[Migration] Guest data migration complete');
            }

          } catch (error) {
            console.error('Failed to get/create user profile or migrate data:', error);
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
    onboardingCompleted: false,
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
