import { test, expect } from '@playwright/test';
import {
  expectTestAuthEnabled,
  getTestUserUid,
  ensureEncryptionKey,
} from '../helpers/test-auth';

test.describe('New Entry Flow', () => {
    test('can add a journal entry for a person', async ({ page }) => {
        const personName = `Entry Test ${Date.now()}`;
        const journalContent = 'This is a test journal entry.';

        await expectTestAuthEnabled(page);
        const uid = await getTestUserUid(page);
        await ensureEncryptionKey(page, uid);

        // 1. Create Person
        await page.goto('/people');
        await page.getByLabel('Name').fill(personName);
        await page.getByRole('button', { name: /add person/i }).click();
        await expect(page.getByText(personName)).toBeVisible();

        // 2. Click "Add Entry" (pen icon)
        // The pen icon is inside the card. We hover or just click it.
        // It has a hidden span "Add entry".
        await page.locator('a:has-text("Add entry")').first().click();

        // 3. Verify URL and UI
        await expect(page).toHaveURL(/\/people\/.*\/new-entry/);
        await expect(page.getByRole('heading', { name: `New Entry for ${personName}` })).toBeVisible();

        // 4. Fill journal
        await page.getByRole('textbox').fill(journalContent);

        // 5. Save
        await page.getByRole('button', { name: /analyze & save/i }).click();

        // 6. Verify redirect to conversation
        await expect(page).toHaveURL(/\/conversations\/.*/);
        await expect(page.getByText(journalContent)).toBeVisible();
    });
});
