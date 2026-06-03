/**
 * Dashboard E2E Tests
 *
 * Test Strategy:
 * - Use authenticated fixture for dashboard access
 * - Page Object Model for dashboard interactions
 * - Auth guard tests for unauthenticated access
 *
 * RED: Write failing tests first
 * GREEN: Implement minimal code to pass
 * REFACTOR: Clean up while keeping tests green
 */

import { test, expect } from '../../fixtures/authenticated'
import { DashboardPage } from '../../pages/DashboardPage'

test.describe('Dashboard - Authenticated', () => {
  let dashboard: DashboardPage

  test.beforeEach(async ({ authenticatedPage }) => {
    dashboard = new DashboardPage(authenticatedPage)
    // Ensure sidebar is in clean state before each test
    await dashboard.resetSidebar()
  })

  test.describe.configure({ mode: 'serial' })

  // ========================================
  // Dashboard Home - Core Behavior
  // ========================================

  test('should display stats cards on dashboard home', async ({ authenticatedPage }) => {
    await dashboard.goto()
    await dashboard.expectStatsLoaded()
    const count = await dashboard.getStatsCount()
    expect(count).toBeGreaterThan(0)
  })

  test('should display sidebar navigation', async ({ authenticatedPage }) => {
    await dashboard.goto()
    await dashboard.expectSidebarVisible()
  })

  test('should display header', async ({ authenticatedPage }) => {
    await dashboard.goto()
    await dashboard.expectHeaderVisible()
  })

  test('should be responsive on mobile viewport', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize({ width: 375, height: 667 })
    await dashboard.goto()
    await expect(authenticatedPage.locator('body')).toBeVisible()
  })

  // ========================================
  // Navigation - Click and Navigate
  // ========================================

  test('should navigate to clients page', async ({ authenticatedPage }) => {
    await dashboard.goto()
    await dashboard.navigateToClients()
    await expect(authenticatedPage).toHaveURL(/\/dashboard\/clients/)
  })

  test('should navigate to uploads page', async ({ authenticatedPage }) => {
    await dashboard.goto()
    await dashboard.navigateToUploads()
    await expect(authenticatedPage).toHaveURL(/\/dashboard\/uploads/)
  })

  test('should navigate to settings page', async ({ authenticatedPage }) => {
    await dashboard.goto()
    await dashboard.navigateToSettings()
    await expect(authenticatedPage).toHaveURL(/\/dashboard\/settings/)
  })

  test('should navigate to activity page', async ({ authenticatedPage }) => {
    await dashboard.goto()
    await dashboard.navigateToActivity()
    await expect(authenticatedPage).toHaveURL(/\/dashboard\/clients\/activity/)
  })

  test('should navigate to help center', async ({ authenticatedPage }) => {
    await dashboard.goto()
    await dashboard.navigateToHelp()
    await expect(authenticatedPage).toHaveURL(/\/dashboard\/help/)
  })

  // ========================================
  // User Actions - Logout
  // ========================================

  test('should logout and redirect to login', async ({ authenticatedPage }) => {
    await dashboard.goto()
    await dashboard.logout()
    await expect(authenticatedPage).toHaveURL(/\/login/)
  })
})

// ========================================
// Auth Guards - Redirect Unauthenticated Users
// ========================================

test.describe('Dashboard - Auth Guards', () => {
  test('should redirect /dashboard to login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('should redirect /dashboard/clients to login', async ({ page }) => {
    await page.goto('/dashboard/clients')
    await expect(page).toHaveURL(/\/login/)
  })

  test('should redirect /dashboard/uploads to login', async ({ page }) => {
    await page.goto('/dashboard/uploads')
    await expect(page).toHaveURL(/\/login/)
  })

  test('should redirect /dashboard/settings to login', async ({ page }) => {
    await page.goto('/dashboard/settings')
    await expect(page).toHaveURL(/\/login/)
  })

  test('should redirect /dashboard/clients/activity to login', async ({ page }) => {
    await page.goto('/dashboard/clients/activity')
    await expect(page).toHaveURL(/\/login/)
  })

  test('should redirect /dashboard/reminders to login', async ({ page }) => {
    await page.goto('/dashboard/reminders')
    await expect(page).toHaveURL(/\/login/)
  })

  test('should redirect /dashboard/help to login', async ({ page }) => {
    await page.goto('/dashboard/help')
    await expect(page).toHaveURL(/\/login/)
  })

  test('should allow public pages without auth', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('body')).toBeVisible()
  })
})
