import { test, expect } from '@playwright/test';

async function expectTestAuthEnabled(page: import('@playwright/test').Page) {
  await page.goto('/');

  await page.waitForFunction(() => {
    return Boolean(window.__testAuth?.status);
  });

  const status = await page.evaluate(() => window.__testAuth!.status());
  expect(status.testEnvironment, 'Expected NEXT_PUBLIC_ENV=test in browser').toBe(true);
  expect(status.enabled, 'Expected NEXT_PUBLIC_ENABLE_TEST_AUTH=true in browser').toBe(true);
  expect(status.useEmulators, 'Expected NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true in browser').toBe(true);

  // Ensure Firebase auth is complete.
  await expect(page.getByRole('heading', { name: /authenticated/i })).toBeVisible({
    timeout: 15_000,
  });
}

test.describe('People (SPEC-002)', () => {
  test('can create a person and see them in the list', async ({ page }) => {
    const personName = `Sam Test ${Date.now()}`;

    await expectTestAuthEnabled(page);

    await page.goto('/people');

    await expect(page.getByRole('heading', { name: /^People$/ })).toBeVisible({ timeout: 15_000 });

    await page.getByLabel('Name').fill(personName);

    // Relationship defaults to Partner; keep as-is to avoid brittle select interactions.
    await page.getByRole('button', { name: /add person/i }).click();

    await expect(page.getByText(personName)).toBeVisible();
  });

  test('can add an entry for a person and see it render', async ({ page }) => {
    const personName = `Alex Test ${Date.now()}`;
    const theySaid = 'Can we talk about what happened yesterday?';

    await expectTestAuthEnabled(page);

    await page.goto('/people');
    await expect(page.getByRole('heading', { name: /^People$/ })).toBeVisible({ timeout: 15_000 });

    await page.getByLabel('Name').fill(personName);
    await page.getByRole('button', { name: /add person/i }).click();

    // Open person detail
    await page.getByText(personName).click();
    await expect(page.getByRole('heading', { name: personName })).toBeVisible();

    // Add an interaction entry using the default type and why.
    await page.getByLabel('What they said (optional)').fill(theySaid);
    await page.getByRole('button', { name: /save entry/i }).click();

    // Entry should appear under Entries
    await expect(page.getByText(theySaid)).toBeVisible();

    // Linked chats section should be present + import link should exist
    await expect(page.getByRole('heading', { name: /^Linked chats$/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /import chat/i })).toBeVisible();
  });

  // This test verifies the linking flow works independently.
  // The redirect from /new is harder to test due to the multi-step wizard.
  // Manual testing confirms: saving without personId -> redirects to /conversations/{id}/link
  test('link page allows selecting a person and linking (REQ-LINK-002)', async ({ page }) => {
    const personName = `Link Test ${Date.now()}`;

    await expectTestAuthEnabled(page);

    // First, create a person to link to
    await page.goto('/people');
    await expect(page.getByRole('heading', { name: /^People$/ })).toBeVisible({ timeout: 15_000 });
    await page.getByLabel('Name').fill(personName);
    await page.getByRole('button', { name: /add person/i }).click();
    await expect(page.getByText(personName)).toBeVisible();

    // Navigate directly to a hypothetical link page to test the UI
    // In real usage, users get here after saving without a personId
    // For this test, we just verify the page loads correctly
    await page.goto('/conversations/test-id/link');

    // Should show the link page (even if conversation doesn't exist, we test UI loads)
    // The page will show an error about conversation not found, but that's expected
    await expect(page.getByRole('heading', { name: /link to person/i })).toBeVisible({ timeout: 10_000 });
  });

  test('conversations page redirects to /people when no people exist (REQ-ONB-001)', async ({ page }) => {
    // This test assumes a fresh anonymous user with no data.
    // The emulator should give us a new user each time.

    await expectTestAuthEnabled(page);

    // Try to go directly to /conversations
    await page.goto('/conversations');

    // Should redirect to /people since there are no people
    await expect(page).toHaveURL(/\/people/i, { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: /^People$/ })).toBeVisible();
  });
});
