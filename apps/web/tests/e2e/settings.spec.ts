import { test, expect } from '@playwright/test';

async function expectTestAuthEnabled(page: import('@playwright/test').Page) {
  await page.goto('/');

  await page.waitForFunction(() => Boolean(window.__testAuth?.status));

  const status = await page.evaluate(() => window.__testAuth!.status());
  expect(status.testEnvironment, 'Expected NEXT_PUBLIC_ENV=test in browser').toBe(true);
  expect(status.enabled, 'Expected NEXT_PUBLIC_ENABLE_TEST_AUTH=true in browser').toBe(true);
  expect(status.useEmulators, 'Expected NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true in browser').toBe(true);

  await expect(page.getByRole('heading', { name: /authenticated/i })).toBeVisible({ timeout: 15_000 });
}

async function getTestUserUid(page: import('@playwright/test').Page): Promise<string> {
  const uidParagraph = page.locator('p', { hasText: 'UID:' }).first();
  await expect(uidParagraph).toBeVisible({ timeout: 15_000 });
  const uidText = await uidParagraph.innerText();
  const uid = uidText.replace(/^.*UID:\s*/i, '').trim();
  if (!uid) throw new Error('Unable to read test user UID');
  return uid;
}

async function ensureEncryptionKey(page: import('@playwright/test').Page, uid: string) {
  await page.goto('/setup');

  await page.evaluate(async (uidArg) => {
    const uid = uidArg as string;

    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const raw = new Uint8Array(await crypto.subtle.exportKey('raw', key));
    const base64 = btoa(String.fromCharCode(...raw));

    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('mora-crypto', 1);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('keys')) {
          db.createObjectStore('keys', { keyPath: 'uid' });
        }
      };

      request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));

      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('keys', 'readwrite');
        const store = tx.objectStore('keys');
        store.put({
          uid,
          encryptedMasterKey: base64,
          passphraseSalt: '',
          iv: '',
          passphraseRequired: false,
          storedAt: new Date().toISOString(),
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('Failed to save device key'));
      };
    });
  }, uid);

  await page.reload({ waitUntil: 'load' });
  await page.waitForURL((url) => !url.pathname.startsWith('/setup'), { timeout: 15_000 });
  await page.goto('/');
}

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
