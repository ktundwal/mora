import { test, expect } from '@playwright/test';

test.describe('Public pages (no auth required)', () => {
  test('home page loads with Mora branding', async ({ page }) => {
    await page.goto('/');
    
    // Check title
    await expect(page).toHaveTitle(/Mora/i);
    
    // Check main heading
    await expect(
      page.getByRole('heading', { name: /Mora/i, level: 1 })
    ).toBeVisible();
    
    // Check tagline
    await expect(
      page.getByText(/break the cycle of transactional conflict/i)
    ).toBeVisible();
    
    // Check feature cards are present
    await expect(page.getByText(/Unpack/i)).toBeVisible();
    await expect(page.getByText(/Drop the Shield/i)).toBeVisible();
    await expect(page.getByText(/Repair/i)).toBeVisible();
  });

  test('footer shows current year', async ({ page }) => {
    await page.goto('/');
    const currentYear = new Date().getFullYear().toString();
    await expect(page.getByText(new RegExp(currentYear))).toBeVisible();
  });

  test('auth test component shows sign-in button when logged out', async ({ page }) => {
    await page.goto('/');

    const testAuthEnabled = await page.evaluate(
      () => window.__testAuth?.isEnabled?.() ?? false
    );

    if (testAuthEnabled) {
      await expect(page.getByRole('heading', { name: /authenticated/i })).toBeVisible();
    } else {
      await expect(page.getByRole('button', { name: /sign in with google/i })).toBeVisible();
    }
  });
});
