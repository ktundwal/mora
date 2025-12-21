"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { useCrypto } from '@/lib/crypto/key-context';
import { useClientPreferences } from '@/lib/stores/client-preferences';

export default function Home() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();

  const { status: cryptoStatus } = useCrypto();

  const {
    hasAuthenticatedBefore,
    setHasAuthenticatedBefore,
    setOnboardingState
  } = useClientPreferences();

  // Redirect authenticated users
  useEffect(() => {
    if (!loading && user) {
      // Mark as known user since they are authenticated
      if (!hasAuthenticatedBefore) {
        setHasAuthenticatedBefore(true);
      }

      if (cryptoStatus === 'missing') {
        router.push('/setup');
      } else if (cryptoStatus === 'ready' || cryptoStatus === 'locked') {
        router.push('/people');
      }
    }
  }, [user, loading, router, cryptoStatus, hasAuthenticatedBefore, setHasAuthenticatedBefore]);

  const handleStartUnpacking = () => {
    if (hasAuthenticatedBefore) {
      router.push('/login');
    } else {
      setOnboardingState('started');
      router.push('/onboarding');
    }
  };

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-zinc-500">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated, show nothing (redirect will happen)
  if (user) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5F7] font-sans text-zinc-900 dark:bg-black dark:text-zinc-100">

      {/* Navbar / Brand */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-xl bg-white/70 dark:bg-black/70">
        <div className="text-xl font-bold tracking-tight">Mora</div>
        <nav className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => signInWithGoogle()}
            disabled={loading}
            className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
          >
            Sign In
          </Button>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex flex-1 flex-col items-center pt-20 px-6 pb-16 text-center">
        <div className="mx-auto max-w-3xl animate-in fade-in slide-in-from-bottom-8 duration-700">

          <h1 className="mb-6 text-5xl font-semibold tracking-tighter sm:text-7xl">
            Turn hard moments into <span className="text-blue-600 dark:text-blue-500">trust</span>.
          </h1>

          <p className="mx-auto mb-10 max-w-xl text-xl font-medium leading-relaxed text-zinc-500 dark:text-zinc-400">
            Navigate high-stakes conversations with clarity. Get the outside perspective you need—private, fast, and judgment-free.
          </p>

          <div className="flex flex-col items-center gap-4">
            <Button
              size="lg"
              onClick={handleStartUnpacking}
              className="h-12 rounded-full px-8 text-lg font-medium shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all hover:scale-105 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              {hasAuthenticatedBefore ? 'Sign In to Resume' : 'Start Unpacking'}
            </Button>
            <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">
              {hasAuthenticatedBefore ? 'Welcome back' : 'No account required'}
            </p>
          </div>

        </div>

        {/* Visual Placeholders for Animated Scenarios */}
        <div className="mt-20 grid w-full max-w-5xl gap-8 px-6 sm:grid-cols-2">

          {/* Work Scenario Placeholder */}
          <div className="group relative flex aspect-video w-full flex-col items-center justify-center rounded-3xl bg-white border-2 border-dashed border-zinc-200 p-8 text-center transition-all hover:border-zinc-300 dark:bg-zinc-900 dark:border-zinc-800">
            <div className="mb-4 rounded-full bg-zinc-100 p-4 dark:bg-zinc-800">
              <span className="text-2xl">💼</span>
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Work Scenario</h3>
            <p className="mt-2 text-sm text-zinc-500">
              [Placeholder: Animated visual of reframing a tense slack message or meeting]
            </p>
          </div>

          {/* Life Scenario Placeholder */}
          <div className="group relative flex aspect-video w-full flex-col items-center justify-center rounded-3xl bg-white border-2 border-dashed border-zinc-200 p-8 text-center transition-all hover:border-zinc-300 dark:bg-zinc-900 dark:border-zinc-800">
            <div className="mb-4 rounded-full bg-zinc-100 p-4 dark:bg-zinc-800">
              <span className="text-2xl">❤️</span>
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Life Scenario</h3>
            <p className="mt-2 text-sm text-zinc-500">
              [Placeholder: Animated visual of unpacking a conflict with a partner]
            </p>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-zinc-200 bg-white py-12 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        <p>&copy; {new Date().getFullYear()} Mora. All rights reserved.</p>
      </footer>
    </div>
  );
}
