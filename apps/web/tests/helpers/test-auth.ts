import { expect, type Page } from '@playwright/test';

/**
 * Verify test auth is enabled and working correctly
 */
export async function expectTestAuthEnabled(page: Page) {
  // Wait for __testAuth to be exposed on window
  await page.waitForFunction(() => Boolean(window.__testAuth?.status), { timeout: 15000 });

  const status = await page.evaluate(() => window.__testAuth!.status());
  expect(status.testEnvironment, 'Expected NEXT_PUBLIC_ENV=test in browser').toBe(true);
  expect(status.enabled, 'Expected NEXT_PUBLIC_ENABLE_TEST_AUTH=true in browser').toBe(true);
  expect(status.useEmulators, 'Expected NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true in browser').toBe(true);

  // Wait for anonymous auth to complete
  await page.waitForFunction(() => Boolean(window.__testAuth?.user?.uid), { timeout: 30000 });
}

/**
 * Get the test user's UID from the test auth state
 */
export async function getTestUserUid(page: Page): Promise<string> {
  await page.waitForFunction(() => Boolean(window.__testAuth?.user?.uid), { timeout: 15_000 });
  const uid = await page.evaluate(() => window.__testAuth!.user!.uid);
  if (!uid) throw new Error('Unable to read test user UID');
  return uid;
}

/**
 * Ensure encryption key is set up for the test user
 */
export async function ensureEncryptionKey(page: Page, uid: string) {
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
          key: base64,
          recoveryPhrase: 'test recovery phrase for e2e tests',
          createdAt: new Date().toISOString(),
        });

        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error ?? new Error('Failed to write key'));
      };
    });
  }, uid);

  // Navigate to people page to complete setup
  await page.goto('/people');
  await page.waitForURL('/people', { timeout: 5000 });
}
