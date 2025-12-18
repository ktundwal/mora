# Run E2E Tests

Run the Playwright end-to-end tests for the Mora web app.

## Instructions

1. Start the dev server (if not already running):
   ```bash
   npm run dev
   ```

2. Run E2E tests:
   ```bash
   npm run test:e2e
   ```

## One-liner (server + tests)
```bash
npm run dev & sleep 3 && npm run test:e2e
```

## With specific test file
```bash
npm run test:e2e -- tests/e2e/home.spec.ts
```

## Debug mode (headed browser)
```bash
npm run test:e2e -- --headed
```

## Update snapshots
```bash
npm run test:e2e -- --update-snapshots
```
