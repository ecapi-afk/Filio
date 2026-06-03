import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import path from 'path';

test.describe('Upload Test', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
  });

  test('should upload a file and check uploads count', async ({ page }) => {
    // Login
    await loginPage.goto();
    await loginPage.login('zhanghaog@icloud.com', 'Admin123');
    await dashboardPage.waitForDashboard();

    // Get initial uploads count
    const initialCount = await page.locator('text=/Uploads This Month/').locator('..').locator('text=/\\d+/').first().textContent();
    console.log('Initial uploads count:', initialCount);

    // Navigate to a client
    await page.click('text=Office Supplies Company');
    await page.waitForURL(/\/dashboard\/clients\//);

    // Get the portal link
    const portalLink = await page.locator('input[readonly]').first().inputValue();
    console.log('Portal link:', portalLink);

    // Open portal in new page
    const portalPage = await page.context().newPage();
    await portalPage.goto(portalLink);

    // Wait for upload interface
    await portalPage.waitForSelector('input[type="file"]', { timeout: 10000 });

    // Upload a test file
    const testFilePath = path.join(__dirname, '..', 'fixtures', 'test-document.pdf');
    const fileInput = portalPage.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);

    // Wait for upload to complete
    await portalPage.waitForSelector('text=/uploaded successfully|Upload complete/i', { timeout: 30000 });
    console.log('✅ File uploaded');

    // Close portal page
    await portalPage.close();

    // Refresh dashboard
    await page.reload();
    await dashboardPage.waitForDashboard();

    // Check uploads count increased
    const newCount = await page.locator('text=/Uploads This Month/').locator('..').locator('text=/\\d+/').first().textContent();
    console.log('New uploads count:', newCount);

    expect(parseInt(newCount || '0')).toBeGreaterThan(parseInt(initialCount || '0'));
  });
});
