import { test, expect } from '@playwright/test';
import {
  expectTestAuthEnabled,
  getTestUserUid,
  ensureEncryptionKey,
} from '../helpers/test-auth';

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
