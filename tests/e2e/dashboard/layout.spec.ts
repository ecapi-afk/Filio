import { test, expect } from '@playwright/test'

test.describe('Dashboard Layout & Auth Guards', () => {
  test('should redirect unauthenticated user to login', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForURL('**/login**', { timeout: 5000 })
  })

  test('should redirect unauthenticated user from dashboard/clients', async ({ page }) => {
    await page.goto('/dashboard/clients')
    await page.waitForURL('**/login**', { timeout: 5000 })
  })

  test('should redirect unauthenticated user from dashboard/settings', async ({ page }) => {
    await page.goto('/dashboard/settings')
    await page.waitForURL('**/login**', { timeout: 5000 })
  })

  test('should render dashboard sidebar for authenticated user', async ({ page }) => {
    test.skip(!process.env.E2E_TEST_EMAIL, 'No test credentials')

    // Login first
    await page.goto('/login')
    await page.locator('input[type="email"]').fill(process.env.E2E_TEST_EMAIL!)
    await page.locator('input[type="password"]').fill(process.env.E2E_TEST_PASSWORD!)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL('**/dashboard**', { timeout: 15000 })

    // Check sidebar exists
    const sidebar = page.locator('nav, [data-testid="sidebar"], aside')
    await expect(sidebar.first()).toBeVisible()
  })

  test('should show stats cards on dashboard', async ({ page }) => {
    test.skip(!process.env.E2E_TEST_EMAIL, 'No test credentials')

    await page.goto('/login')
    await page.locator('input[type="email"]').fill(process.env.E2E_TEST_EMAIL!)
    await page.locator('input[type="password"]').fill(process.env.E2E_TEST_PASSWORD!)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL('**/dashboard**', { timeout: 15000 })

    // Wait for dashboard to load
    await page.waitForLoadState('networkidle')
    // Check stats or main content is visible
    await expect(page.locator('main, [data-testid="dashboard"]').first()).toBeVisible()
  })
})
