import { test, expect } from '@playwright/test';

test.describe('Super Admin Auth', () => {
  test('login as super admin redirects to platform dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@shashvat.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('invalid login stays on login page with error', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'wrong@test.com');
    await page.fill('input[type="password"]', 'wrong');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('text=Invalid email or password')).toBeVisible();
  });

  test('deep-link /companies unauthenticated redirects to login', async ({ page }) => {
    await page.goto('/companies');
    await expect(page).toHaveURL(/\/login/);
  });

  test('deep-link /companies after login redirects back', async ({ page }) => {
    await page.goto('/companies');
    await expect(page).toHaveURL(/\/login/);
    await page.fill('input[type="email"]', 'admin@shashvat.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/companies');
    await expect(page.locator('text=Companies')).toBeVisible();
  });
});
