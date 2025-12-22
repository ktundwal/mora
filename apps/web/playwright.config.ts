import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3100',
    trace: 'on',
    screenshot: 'on',
  },
  webServer: {
    command: `sh scripts/start-test-server.sh`,
    url: 'http://localhost:3100',
    reuseExistingServer: false,
    timeout: 120_000,
    cwd: '.',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
