'use client';

import { type ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/lib/auth-context';
import { CryptoProvider } from '@/lib/crypto/key-context';
import { exposeTestAuthToWindow } from '@/lib/test-auth';
import { GuestMigrator } from '@/components/guest-migrator';

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Client-side providers wrapper.
 * Add new providers here (e.g., ThemeProvider, QueryClientProvider).
 */
export function Providers({ children }: ProvidersProps) {
  exposeTestAuthToWindow();
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <CryptoProvider>
          <GuestMigrator />
          {children}
          <Toaster richColors position="top-center" />
        </CryptoProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
