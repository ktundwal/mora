'use client';

import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { useUserStore } from '@/lib/stores/user-store';

/**
 * Test component for verifying auth flow.
 * Shows sign-in button when logged out, user info when logged in.
 */
export function AuthTest() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const { profile, isPro, remainingUnpacks } = useUserStore();

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
          <span className="text-gray-600">Checking auth...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          🔐 Auth Test
        </h3>
        <p className="mb-4 text-sm text-gray-600">
          Click below to test Google sign-in
        </p>
        <button
          onClick={signInWithGoogle}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-green-900">
        ✅ Authenticated!
      </h3>
      
      <div className="mb-4 space-y-2 text-sm">
        <div className="flex items-center gap-3">
          {user.photoURL && (
            <Image
              src={user.photoURL}
              alt="Profile"
              width={40}
              height={40}
              className="rounded-full"
            />
          )}
          <div>
            <p className="font-medium text-gray-900">{user.displayName}</p>
            <p className="text-gray-600">{user.email}</p>
          </div>
        </div>
        
        <div className="mt-4 rounded bg-white p-3 text-xs">
          <p><strong>UID:</strong> {user.uid}</p>
          <p><strong>Tier:</strong> {isPro ? '⭐ Pro' : 'Free'}</p>
          <p><strong>Unpacks remaining:</strong> {remainingUnpacks()}</p>
          {profile && (
            <p><strong>Profile created:</strong> {profile.createdAt}</p>
          )}
        </div>
      </div>

      <button
        onClick={signOut}
        className="rounded-lg bg-red-600 px-4 py-2 text-white transition hover:bg-red-700"
      >
        Sign Out
      </button>
    </div>
  );
}
