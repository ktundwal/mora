// Test-only auth utilities
// These should ONLY be used in development/test environments

/**
 * Check if we're in a test environment
 */
export function isTestEnvironment(): boolean {
  return (
    process.env.NODE_ENV === 'test' ||
    process.env.NEXT_PUBLIC_ENV === 'test' ||
    process.env.PLAYWRIGHT_TEST === 'true'
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
}

const testAuthMethods: TestAuthMethods = {
  isEnabled: () => isTestAuthEnabled(),
};

// Type declaration for window
declare global {
  interface Window {
    __testAuth?: TestAuthMethods;
  }
}
