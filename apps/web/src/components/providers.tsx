'use client';

import { type ReactNode } from 'react';
import { AuthProvider } from '@/lib/auth-context';
import { exposeTestAuthToWindow } from '@/lib/test-auth';

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Client-side providers wrapper.
 * Add new providers here (e.g., ThemeProvider, QueryClientProvider).
 */
export function Providers({ children }: ProvidersProps) {
  exposeTestAuthToWindow();
  return <AuthProvider>{children}</AuthProvider>;
}
