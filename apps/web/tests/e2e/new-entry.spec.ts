import { test, expect } from '@playwright/test';

async function expectTestAuthEnabled(page: import('@playwright/test').Page) {
    await page.goto('/');

    await page.waitForFunction(() => {
        return Boolean(window.__testAuth?.status);
    });

    const status = await page.evaluate(() => window.__testAuth!.status());
    expect(status.testEnvironment, 'Expected NEXT_PUBLIC_ENV=test in browser').toBe(true);
    expect(status.enabled, 'Expected NEXT_PUBLIC_ENABLE_TEST_AUTH=true in browser').toBe(true);
}

async function getTestUserUid(page: import('@playwright/test').Page): Promise<string> {
    // Access the exposed test auth state directly instead of scraping the UI
    await page.waitForFunction(() => Boolean(window.__testAuth?.user?.uid), { timeout: 15_000 });
    const uid = await page.evaluate(() => window.__testAuth!.user!.uid);
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

        await new Promise<void>((resolve) => {
            const request = indexedDB.open('mora-crypto', 1);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('keys')) {
                    db.createObjectStore('keys', { keyPath: 'uid' });
                }
            };
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
            };
        });
    }, uid);

    await page.reload({ waitUntil: 'load' });
    await page.waitForURL((url) => !url.pathname.startsWith('/setup'), { timeout: 15_000 });
}

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
