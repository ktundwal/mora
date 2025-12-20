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

  useEffect(() => {
    if (status === 'missing' && !ALLOWED_PATHS.includes(pathname)) {
      router.replace('/setup');
    }
    if (status === 'locked' && !ALLOWED_PATHS.includes(pathname)) {
      router.replace('/unlock');
    }
  }, [pathname, router, status]);

  if (status === 'loading') {
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
