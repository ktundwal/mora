// Test-only auth utilities
// These should ONLY be used in development/test environments

/**
 * Check if we're in a test environment
 * NOTE: In dev mode with Firebase emulators, Next.js builds client code with .env.local values,
 * so we can't rely solely on NEXT_PUBLIC_ENV being 'test'. Instead, we check for emulator usage
 * as the primary signal of test mode.
 */
export function isTestEnvironment(): boolean {
  // If emulators are being used, we're in test mode
  if (typeof window !== 'undefined') {
    // Runtime check: if auth or firestore are pointing to localhost, we're using emulators
    const authEmulatorPort = process.env.NEXT_PUBLIC_AUTH_EMULATOR_PORT;
    const firestoreEmulatorPort = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT;
    if (authEmulatorPort || firestoreEmulatorPort) {
      return true;
    }
  }
  
  return (
    process.env.NODE_ENV === 'test' ||
    process.env.NEXT_PUBLIC_ENV === 'test' ||
    process.env.NEXT_PUBLIC_PLAYWRIGHT_TEST === 'true' ||
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true'
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
    useEmulators: Boolean(
      process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true' ||
      process.env.NEXT_PUBLIC_AUTH_EMULATOR_PORT ||
      process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT
    ),
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
