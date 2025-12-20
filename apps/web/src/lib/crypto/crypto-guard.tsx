'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useCrypto } from './key-context';

const ALLOWED_PATHS = ['/setup', '/unlock', '/recover'];

interface CryptoGuardProps {
  children: ReactNode;
}

export function CryptoGuard({ children }: CryptoGuardProps) {
  const { status } = useCrypto();
  const router = useRouter();
  const pathname = usePathname();

  // Check if current path is allowed (ignoring query params)
  const isAllowedPath = ALLOWED_PATHS.some(path => pathname.startsWith(path));

  console.log('[CryptoGuard]', { pathname, status, isAllowedPath });

  useEffect(() => {
    if (status === 'missing' && !isAllowedPath) {
      router.replace('/setup');
    }
    if (status === 'locked' && !isAllowedPath) {
      router.replace('/unlock');
    }
  }, [pathname, router, status, isAllowedPath]);

  // Allow setup/unlock/recover pages to render immediately
  if (isAllowedPath) {
    console.log('[CryptoGuard] Rendering allowed path immediately');
    return <>{children}</>;
  }

  // Show loading for other pages while crypto is initializing
  if (status === 'loading') {
    console.log('[CryptoGuard] Showing loading spinner');
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
          <p className="text-sm text-gray-500">Loading encryption…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
