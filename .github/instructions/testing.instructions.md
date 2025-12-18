---
description: 'Testing standards for Mora - Vitest for unit, Playwright for E2E'
applyTo: '**/*.test.ts, **/*.spec.ts, **/tests/**'
---

# Testing Standards

## Unit Tests (Vitest)

Location: `*.test.ts` files alongside source

```typescript
import { describe, it, expect } from 'vitest';
import { parseWhatsApp } from './parser';

describe('parseWhatsApp', () => {
  it('extracts messages from WhatsApp export', () => {
    const input = '[12/18/24, 10:30 AM] John: Hello';
    const result = parseWhatsApp(input);
    
    expect(result).toHaveLength(1);
    expect(result[0].speaker).toBe('John');
    expect(result[0].content).toBe('Hello');
  });

  it('handles multi-line messages', () => {
    // Test edge cases
  });
});
```

## E2E Tests (Playwright)

Location: `apps/web/tests/e2e/*.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('shows sign-in button when logged out', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('redirects to dashboard after login', async ({ page }) => {
    // Use test fixtures for authenticated state
  });
});
```

## Test Commands

```bash
# Unit tests
npm run test:unit

# E2E tests (requires dev server)
npm run dev & sleep 3 && npm run test:e2e

# All verification
npm run verify
```

## Test-First Development

1. Write failing test
2. Write minimum code to pass
3. Refactor
4. Run `npm run verify`

## Coverage Requirements

- Critical paths: Auth, payments, data persistence
- Parser logic: All edge cases for WhatsApp format
- UI flows: Happy path E2E for main features
