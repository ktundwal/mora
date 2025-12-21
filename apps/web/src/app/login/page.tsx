'use client';

import dynamic from 'next/dynamic';

const FirebaseAuthUI = dynamic(
  () => import('@/components/auth/firebase-auth-ui'),
  { ssr: false }
);

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-zinc-50 dark:bg-zinc-900">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Sign in to Mora
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Manage your relationship conflicts with confidence.
          </p>
        </div>
        <FirebaseAuthUI />
      </div>
    </div>
  );
}
