---
description: 'Run Playwright E2E tests and debug failures'
agent: 'agent'
tools: ['runCommands', 'runTests', 'codebase', 'terminalLastCommand', 'problems']
---

# End-to-End Testing

**Role:** QA Engineer
**Goal:** Run and manage Playwright E2E tests.

---

## Step 1: Build Context (REQUIRED)

Before running E2E tests, understand the test setup:

1. **`apps/web/playwright.config.ts`** - Test configuration
2. **`apps/web/tests/e2e/`** - Existing test files
3. **`docs/PROCESS.md`** - Testing requirements in workflow

---

## Step 2: Ensure Server is Running

E2E tests require the dev server:
```bash
npm run dev
```

Or use the one-liner that starts server and runs tests:
```bash
npm run dev & sleep 3 && npm run test:e2e
```

---

## Step 3: Run Tests

**All tests:**
```bash
npm run test:e2e
```

**Specific file:**
```bash
npm run test:e2e -- tests/e2e/home.spec.ts
```

**Specific test by name:**
```bash
npm run test:e2e -- -g "should display the landing page"
```

---

## Step 4: Debug Failing Tests

**Headed mode (see the browser):**
```bash
npm run test:e2e -- --headed
```

**Debug mode (step through):**
```bash
npm run test:e2e -- --debug
```

**Show report after run:**
```bash
npx playwright show-report
```

Traces & screenshots: Every test now records a full trace with step-by-step screenshots. Reports render in `playwright-report/` after `npm run test:e2e`.

Screenshots now save for every run (not just failures) in Playwright's default output directory.

---

## Step 5: Update Snapshots

If visual tests fail due to intentional changes:
```bash
npm run test:e2e -- --update-snapshots
```

---

## Test File Location

Tests live in: `apps/web/tests/e2e/*.spec.ts`

Current tests:
- `home.spec.ts` - Landing page tests
- `comprehensive-flow.spec.ts` - Full onboarding + people + settings UX flow

---

## Firebase Emulator Mode

For testing with Firebase emulators:
```bash
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true npm run dev
```
