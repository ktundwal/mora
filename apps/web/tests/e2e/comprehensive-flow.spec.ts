import { test, expect } from '@playwright/test';

// Helper to generate a unique email
const generateEmail = () => `e2e-test-${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPass123!';
const DEVICE_A_PASSPHRASE = 'device-a-secret';
const DEVICE_B_PASSPHRASE = 'device-b-secret';

test.describe('Comprehensive E2E UX Flow', () => {
  // Shared state between steps
  let userEmail: string;
  let recoveryPhrase: string[];

  test('Full User Journey: Signup, Security, Sync, and Recovery', async ({ browser }) => {
    userEmail = generateEmail();
    console.log(`Starting test with email: ${userEmail}`);

    // ========================================================================
    // PHASE 1: New User & Device A Setup
    // ========================================================================
    const contextA = await browser.newContext({ baseURL: 'http://127.0.0.1:3100' });
    const pageA = await contextA.newPage();

    await test.step('Phase 1: Sign Up & Onboarding (Device A)', async () => {
      await pageA.goto('/login');

      // 1. Sign Up via FirebaseUI
      // Click "Sign in with email"
      await pageA.getByRole('button', { name: /sign in with email/i }).click();
      
      // Enter Email
      await pageA.getByPlaceholder(/email/i).fill(userEmail);
      await pageA.getByRole('button', { name: /next/i }).click();

      // Enter Name & Password (New Account Flow)
      // Wait for the name/password fields to appear
      await pageA.getByPlaceholder(/first name/i).fill('Test');
      await pageA.getByPlaceholder(/last name/i).fill('User');
      await pageA.getByLabel(/password/i).fill(TEST_PASSWORD);
      
      // Click Save/Sign In
      await pageA.getByRole('button', { name: /save/i }).click();

      // 2. Encryption Setup
      // Should be redirected to /setup
      await expect(pageA).toHaveURL(/\/setup/);
      
      // Generate Key
      await pageA.getByRole('button', { name: /generate key/i }).click();
      
      // Wait for recovery phrase to appear
      const phraseTextarea = pageA.locator('textarea');
      await expect(phraseTextarea).toBeVisible();
      
      // Capture Recovery Phrase
      const phraseText = await phraseTextarea.inputValue();
      recoveryPhrase = phraseText.split(' ');
      expect(recoveryPhrase.length).toBe(24);
      console.log('Recovery Phrase captured');

      // Continue
      await pageA.getByRole('button', { name: /continue to app/i }).click();
      
      // Verify Dashboard
      await expect(pageA).toHaveURL(/\/people/);
    });

    await test.step('Phase 1: Device Security & Core Actions (Device A)', async () => {
      // 3. Set Device Lock
      await pageA.goto('/settings');
      await pageA.getByRole('button', { name: /enable/i }).click();
      
      // Dialog appears
      await pageA.getByLabel(/passphrase/i).fill(DEVICE_A_PASSPHRASE);
      await pageA.getByRole('button', { name: /set phrase/i }).click();
      
      // Verify Toast or UI change
      await expect(pageA.getByRole('button', { name: /disable/i })).toBeVisible();

      // 4. Add Person
      await pageA.goto('/people');
      await pageA.getByRole('button', { name: /add person/i }).click();
      await pageA.getByLabel(/name/i).fill('Alex');
      
      // Select relationship
      await pageA.getByRole('combobox').click();
      await pageA.getByRole('option', { name: /partner/i }).click();
      
      await pageA.getByRole('button', { name: /save/i }).click();
      await expect(pageA.getByText('Alex')).toBeVisible();

      // 5. Add Entry
      // Click "Add entry" on the person card
      await pageA.locator('a:has-text("Add entry")').first().click();
      await pageA.getByRole('textbox').fill('Entry 1 from Device A');
      await pageA.getByRole('button', { name: /analyze & save/i }).click();
      
      // Verify saved
      await expect(pageA.getByText('Entry 1 from Device A')).toBeVisible();

      // 6. Sign Out
      await pageA.goto('/settings');
      const signOutCard = pageA.locator('.rounded-xl', { hasText: 'Sign out' });
      await signOutCard.getByRole('button', { name: /continue/i }).click();
      
      await expect(pageA).toHaveURL('/');
    });

    // ========================================================================
    // PHASE 2: Returning User on New Device (Device B)
    // ========================================================================
    const contextB = await browser.newContext({ baseURL: 'http://127.0.0.1:3100' });
    const pageB = await contextB.newPage();

    await test.step('Phase 2: Recovery & Sync (Device B)', async () => {
      await pageB.goto('/login');
      
      // Sign In
      await pageB.getByRole('button', { name: /sign in with email/i }).click();
      await pageB.getByPlaceholder(/email/i).fill(userEmail);
      await pageB.getByRole('button', { name: /next/i }).click();
      await pageB.getByLabel(/password/i).fill(TEST_PASSWORD);
      await pageB.getByRole('button', { name: /sign in/i }).click();

      // Should be redirected to /setup with "New Device Detected"
      await expect(pageB).toHaveURL(/\/setup/);
      await expect(pageB.getByText(/new device detected/i)).toBeVisible();

      // Go to Recover
      await pageB.getByRole('link', { name: /import key/i }).click();
      await expect(pageB).toHaveURL(/\/recover/);

      // Enter Phrase
      await pageB.locator('textarea').fill(recoveryPhrase.join(' '));
      
      await pageB.getByRole('button', { name: /recover/i }).click();

      // Should redirect to /people
      await expect(pageB).toHaveURL(/\/people/);
      
      // Verify Data Sync
      await expect(pageB.getByText('Alex')).toBeVisible();
      // Navigate to conversation to see entry
      await pageB.getByText('Alex').click();
      await expect(pageB.getByText('Entry 1 from Device A')).toBeVisible();
    });

    await test.step('Phase 2: Device Security & New Entry (Device B)', async () => {
      // Set Lock on Device B
      await pageB.goto('/settings');
      await pageB.getByRole('button', { name: /enable/i }).click();
      await pageB.getByLabel(/passphrase/i).fill(DEVICE_B_PASSPHRASE);
      await pageB.getByRole('button', { name: /set phrase/i }).click();
      await expect(pageB.getByRole('button', { name: /disable/i })).toBeVisible();

      // Add Entry 2
      await pageB.goto('/people');
      await pageB.locator('a:has-text("Add entry")').first().click();
      await pageB.getByRole('textbox').fill('Entry 2 from Device B');
      await pageB.getByRole('button', { name: /analyze & save/i }).click();
      
      await expect(pageB.getByText('Entry 2 from Device B')).toBeVisible();
      
      // Sign Out
      await pageB.goto('/settings');
      const signOutCard = pageB.locator('.rounded-xl', { hasText: 'Sign out' });
      await signOutCard.getByRole('button', { name: /continue/i }).click();
    });

    // ========================================================================
    // PHASE 3: Return to Device A (Locked)
    // ========================================================================
    await test.step('Phase 3: Unlock Device A & Verify Sync', async () => {
      // Device A session might still be active or expired.
      // If we signed out in Phase 1, we need to sign in again.
      
      await pageA.goto('/login');
      await pageA.getByRole('button', { name: /sign in with email/i }).click();
      await pageA.getByPlaceholder(/email/i).fill(userEmail);
      await pageA.getByRole('button', { name: /next/i }).click();
      await pageA.getByLabel(/password/i).fill(TEST_PASSWORD);
      await pageA.getByRole('button', { name: /sign in/i }).click();

      // Should be redirected to /unlock because key is present but locked
      await expect(pageA).toHaveURL(/\/unlock/);

      // Unlock
      await pageA.getByLabel(/passphrase/i).fill(DEVICE_A_PASSPHRASE);
      await pageA.getByRole('button', { name: /unlock/i }).click();

      // Verify Dashboard
      await expect(pageA).toHaveURL(/\/people/);

      // Verify Sync (Entry 2)
      await pageA.getByText('Alex').click();
      await expect(pageA.getByText('Entry 2 from Device B')).toBeVisible();
    });

    await test.step('Phase 3: Remove Security', async () => {
      await pageA.goto('/settings');
      await pageA.getByRole('button', { name: /disable/i }).click();
      // Confirm dialog
      await pageA.getByRole('button', { name: /remove protection/i }).click();
      
      await expect(pageA.getByRole('button', { name: /enable/i })).toBeVisible();
    });

    // ========================================================================
    // PHASE 4: Return to Device A (Unlocked)
    // ========================================================================
    await test.step('Phase 4: Verify Unlocked Access', async () => {
      // Reload page to simulate fresh visit (session still active)
      await pageA.reload();
      
      // Should NOT ask for passphrase
      await expect(pageA).toHaveURL(/\/people/);
      await expect(pageA.getByText('Alex')).toBeVisible();
    });

    await contextA.close();
    await contextB.close();
  });
});
