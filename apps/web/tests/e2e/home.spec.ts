import { test, expect } from '@playwright/test';

test.describe('Public pages (no auth required)', () => {
  test('shows marketing page with branding and CTA', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Check title
    await expect(page).toHaveTitle(/Mora/i);
    
    // Check main heading (may have nested spans)
    await expect(
      page.getByRole('heading', { level: 1 })
    ).toContainText('Turn hard moments into trust');
    
    // Check CTA button
    await expect(
      page.getByRole('button', { name: /start unpacking/i })
    ).toBeVisible();
  });

  test('shows sign-in button in header when logged out', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Check for sign-in button in header
    await expect(
      page.getByRole('button', { name: /sign in/i })
    ).toBeVisible();
  });
});
