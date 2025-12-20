// Test-only auth utilities
// These should ONLY be used in development/test environments

/**
 * Check if we're in a test environment
 */
export function isTestEnvironment(): boolean {
  return (
    process.env.NODE_ENV === 'test' ||
    process.env.NEXT_PUBLIC_ENV === 'test' ||
    process.env.NEXT_PUBLIC_PLAYWRIGHT_TEST === 'true'
  );
}

/**
 * Check if test auth bypass is enabled
 */
export function isTestAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_TEST_AUTH === 'true';
}

/**
 * Expose test auth methods on window for Playwright
 * Call this in your app's initialization when in test mode
 */
export function exposeTestAuthToWindow(): void {
  if (typeof window === 'undefined') return;
  if (!isTestEnvironment()) return;

  (window as Window & { __testAuth?: TestAuthMethods }).__testAuth = testAuthMethods;
}

interface TestAuthMethods {
  isEnabled: () => boolean;
  status: () => {
    testEnvironment: boolean;
    enabled: boolean;
    useEmulators: boolean;
  };
  user?: { uid: string; email: string | null };
}

const testAuthMethods: TestAuthMethods = {
  isEnabled: () => isTestAuthEnabled(),
  status: () => ({
    testEnvironment: isTestEnvironment(),
    enabled: isTestAuthEnabled(),
    useEmulators: process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true',
  }),
};

/**
 * Update the current user in test auth methods
 */
export function updateTestAuthUser(user: { uid: string; email: string | null } | null): void {
  if (typeof window === 'undefined') return;
  if (!isTestEnvironment()) return;

  if (window.__testAuth) {
    if (user) {
      window.__testAuth.user = user;
    } else {
      delete window.__testAuth.user;
    }
  }
}

// Type declaration for window
declare global {
  interface Window {
    __testAuth?: TestAuthMethods;
  }
}
