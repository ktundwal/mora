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

test.describe('Proxy flows (Unpack + Draft)', () => {
  test('happy path with stubbed proxyChat', async ({ page }) => {
    const stubResponses = ['Stub unpack summary', 'Stub draft reply'];
    let callIndex = 0;
    const proxyCalls: string[] = [];

    await page.route('**/*proxyChat*', async (route) => {
      proxyCalls.push(route.request().url());
      const content = stubResponses[Math.min(callIndex, stubResponses.length - 1)];
      callIndex += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { content, model: 'stub-model' } }),
      });
    });

    await expectTestAuthEnabled(page);
  const uid = await getTestUserUid(page);
  await ensureEncryptionKey(page, uid);

    // Create a conversation via the wizard so encryption + client logic run
    await page.goto('/new');

    const chatText = `[12/18/24, 10:30 AM] Me: Hey, are we still on for tonight?\n[12/18/24, 10:31 AM] Partner: Not sure, feeling a bit off.`;
    await page.getByPlaceholder(/Paste your WhatsApp chat here/i).fill(chatText);
    await page.getByLabel(/I have permission/i).click();
    await page.getByRole('button', { name: /Parse & Preview/i }).click();

    await expect(page.getByRole('heading', { name: /^Preview$/i })).toBeVisible();
    await page.getByRole('button', { name: /^Continue$/i }).click();

    await expect(page.getByRole('heading', { name: /who's who?/i })).toBeVisible();
    await page.getByRole('button', { name: /^Continue$/i }).click();

    await expect(page.getByRole('heading', { name: /Almost there/i })).toBeVisible();
    await page.getByLabel(/Conversation Title/i).fill('Proxy Flow Conversation');
    await page.getByRole('button', { name: /Save Conversation/i }).click();

    await page.waitForURL(/conversations\/[^/]+/i, { timeout: 15_000 });
    const url = page.url();
    const match = url.match(/conversations\/([^/]+)/i);
    const conversationId = match?.[1];
    expect(conversationId, 'conversation id should be present after save').toBeTruthy();

    await page.goto(`/conversations/${conversationId}`);
    await expect(page.getByRole('heading', { name: /Drafts/i })).toBeVisible({ timeout: 15_000 });

    // Trigger Unpack via proxy
    await page.getByRole('button', { name: /Unpack this Conversation/i }).click();
    await expect.poll(() => proxyCalls.length).toBeGreaterThan(0);
    await expect(page.getByText(/Stub unpack summary/i)).toBeVisible({ timeout: 20_000 });

    // Trigger Draft via proxy
    await page.getByRole('button', { name: /Draft a Reply/i }).click();
    await expect.poll(() => proxyCalls.length).toBeGreaterThanOrEqual(2);
    await expect(page.getByText(/Stub draft reply/i)).toBeVisible({ timeout: 20_000 });

    expect(proxyCalls.length).toBeGreaterThanOrEqual(2);
  });
});
