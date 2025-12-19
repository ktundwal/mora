import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3100',
    trace: 'on-first-retry',
  },
  webServer: {
    command:
      'cd ../.. && (for p in 8080 8085 9099; do lsof -tiTCP:$p -sTCP:LISTEN | xargs kill -9 2>/dev/null || true; done) && pkill -f "next dev" || true && firebase emulators:exec --only auth,firestore --project mora-test "cd apps/web && NEXT_PUBLIC_ENV=test NEXT_PUBLIC_PLAYWRIGHT_TEST=true NEXT_PUBLIC_ENABLE_TEST_AUTH=true NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true NEXT_PUBLIC_AUTH_EMULATOR_PORT=9099 NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT=8085 npm run dev -- --port 3100"',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
