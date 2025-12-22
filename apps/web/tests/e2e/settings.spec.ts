import { test, expect } from '@playwright/test';
import {
  expectTestAuthEnabled,
  getTestUserUid,
  ensureEncryptionKey,
} from '../helpers/test-auth';

test.describe('Settings actions', () => {
  test('can request export and see success toast', async ({ page }) => {
    await expectTestAuthEnabled(page);
    const uid = await getTestUserUid(page);
    await ensureEncryptionKey(page, uid);

    await page.route('**/*requestExport*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { status: 'queued', action: 'export', message: 'queued' } }),
      });
    });

    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: /^Settings$/ })).toBeVisible({ timeout: 15_000 });

    const exportButton = page.getByRole('button', { name: /continue/i }).first();
    await exportButton.click();

    await expect(page.getByText(/export requested/i)).toBeVisible({ timeout: 10_000 });
  });

  test('shows confirmation prompts for destructive actions', async ({ page }) => {
    await expectTestAuthEnabled(page);
    const uid = await getTestUserUid(page);
    await ensureEncryptionKey(page, uid);

    let deleteAccountCalls = 0;
    await page.route('**/*requestDataDelete*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { status: 'queued', action: 'deleteData', message: 'queued' } }),
      });
    });

    await page.route('**/*requestAccountDelete*', async (route) => {
      deleteAccountCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { status: 'queued', action: 'deleteAccount', message: 'queued' } }),
      });
    });

    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: /^Settings$/ })).toBeVisible({ timeout: 15_000 });

    const deleteDataButton = page.getByRole('button', { name: /continue/i }).nth(1);
    await page.evaluate(() => {
      window.confirm = () => true;
    });

    await deleteDataButton.click();
    await expect(page.getByText(/Delete requested/i)).toBeVisible({ timeout: 10_000 });

    const deleteAccountButton = page.getByRole('button', { name: /continue/i }).nth(2);
    await deleteAccountButton.click();
    await expect.poll(() => deleteAccountCalls).toBeGreaterThan(0);
  });
});
