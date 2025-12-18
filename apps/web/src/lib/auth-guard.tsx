'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './auth-context';

interface AuthGuardProps {
  children: ReactNode;
  /** Where to redirect if not authenticated. Defaults to "/" */
  redirectTo?: string;
  /** Show loading spinner while checking auth. Defaults to true */
  showLoading?: boolean;
}

/**
 * Wraps protected pages that require authentication.
 * Redirects to landing page if user is not signed in.
 *
 * Usage:
 * ```tsx
 * export default function DashboardPage() {
 *   return (
 *     <AuthGuard>
 *       <Dashboard />
 *     </AuthGuard>
 *   );
 * }
 * ```
 */
export function AuthGuard({
  children,
  redirectTo = '/',
  showLoading = true,
}: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(redirectTo);
    }
  }, [user, loading, router, redirectTo]);

  // Still checking auth state
  if (loading) {
    if (!showLoading) return null;

    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect is happening
  if (!user) {
    return null;
  }

  // Authenticated - render children
  return <>{children}</>;
}

/**
 * HOC version for pages that need auth guard
 */
export function withAuthGuard<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<AuthGuardProps, 'children'>
) {
  return function ProtectedComponent(props: P) {
    return (
      <AuthGuard {...options}>
        <Component {...props} />
      </AuthGuard>
    );
  };
}
