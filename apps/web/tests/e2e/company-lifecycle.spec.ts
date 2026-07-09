import { test, expect } from '@playwright/test';

test.describe('Company Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@shashvat.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
  });

  test('create company → appears in list', async ({ page }) => {
    await page.goto('/companies');
    await page.click('text=+ New Company');
    await page.fill('input[placeholder="Company name"]', 'E2E Test Co');
    await page.click('button:has-text("Create company")');
    await page.waitForURL('**/companies');
    await expect(page.locator('text=E2E Test Co')).toBeVisible();
  });

  test('suspend company → status badge updates', async ({ page }) => {
    // First create a company
    await page.goto('/companies/new');
    await page.fill('input[placeholder="Company name"]', 'Suspend Test');
    await page.click('button:has-text("Create company")');
    await page.waitForURL('**/companies');

    // Navigate to the company detail and suspend
    await page.click('text=Suspend Test');
    await page.click('text=Suspend');
    // Verify status changed
    await expect(page.locator('text=SUSPENDED')).toBeVisible();
  });

  test('audit log shows company actions', async ({ page }) => {
    // Create a company
    await page.goto('/companies/new');
    await page.fill('input[placeholder="Company name"]', 'Audit E2E');
    await page.click('button:has-text("Create company")');
    await page.waitForURL('**/companies');

    // Check audit log
    await page.goto('/audit-log');
    await expect(page.locator('text=COMPANY_CREATED')).toBeVisible();
  });
});
