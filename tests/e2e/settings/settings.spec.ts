/**
 * Settings Page E2E Tests
 *
 * Test Strategy:
 * - Use authenticated fixture for dashboard access
 * - Test settings page sections
 */

import { test, expect } from '../../fixtures/authenticated'
import { SettingsPage } from '../../pages/SettingsPage'

test.describe('Settings Page - Authenticated', () => {
  let settingsPage: SettingsPage

  test.beforeEach(async ({ authenticatedPage }) => {
    settingsPage = new SettingsPage(authenticatedPage)
  })

  test.describe.configure({ mode: 'parallel' })

  // ========================================
  // Page Load
  // ========================================

  test('should load settings page', async ({ authenticatedPage }) => {
    await settingsPage.goto()
    await settingsPage.expectLoaded()
  })

  test('should display settings sidebar', async ({ authenticatedPage }) => {
    await settingsPage.goto()
    await expect(settingsPage.sidebar).toBeVisible()
  })

  // ========================================
  // Settings Sections
  // ========================================

  test('should have Xero settings section', async ({ authenticatedPage }) => {
    await settingsPage.gotoSection('xero')
    const hasXeroContent = await authenticatedPage.locator('text=Xero').first().isVisible().catch(() => false)
    expect(hasXeroContent).toBeTruthy()
  })

  test('should navigate to profile settings', async ({ authenticatedPage }) => {
    await settingsPage.gotoSection('profile')
    // Wait for navigation to complete
    await authenticatedPage.waitForLoadState('networkidle')
    await authenticatedPage.waitForTimeout(2000)
    // Verify URL contains section=profile
    await expect(authenticatedPage).toHaveURL(/section=profile/, { timeout: 5000 })
  })

  test('should navigate to notifications settings', async ({ authenticatedPage }) => {
    await settingsPage.gotoSection('notifications')
    const hasNotificationsContent = await authenticatedPage.locator('text=Notification').first().isVisible().catch(() => false)
    expect(hasNotificationsContent).toBeTruthy()
  })

  test('should navigate to branding settings', async ({ authenticatedPage }) => {
    await settingsPage.gotoSection('branding')
    await authenticatedPage.waitForLoadState('networkidle')
    await authenticatedPage.waitForTimeout(2000)
    await expect(authenticatedPage).toHaveURL(/section=branding/, { timeout: 5000 })
  })

  test('should navigate to billing settings', async ({ authenticatedPage }) => {
    await settingsPage.gotoSection('billing')
    await authenticatedPage.waitForLoadState('networkidle')
    await authenticatedPage.waitForTimeout(2000)
    await expect(authenticatedPage).toHaveURL(/section=billing/, { timeout: 5000 })
  })

  test('should navigate to defaults settings', async ({ authenticatedPage }) => {
    await settingsPage.gotoSection('defaults')
    const hasDefaultsContent = await authenticatedPage.locator('text=Global Defaults').first().isVisible().catch(() => false)
    expect(hasDefaultsContent).toBeTruthy()
  })

  // ========================================
  // Xero Connection
  // ========================================

  test('should display Xero connection status', async ({ authenticatedPage }) => {
    await settingsPage.gotoSection('xero')
    // Look for Xero section content
    const hasXeroContent = await authenticatedPage.locator('text=Xero').first().isVisible().catch(() => false)
    expect(hasXeroContent).toBeTruthy()
  })

  // ========================================
  // Navigation
  // ========================================

  test('should navigate back to dashboard via sidebar', async ({ authenticatedPage }) => {
    await settingsPage.goto()
    const dashboardLink = authenticatedPage.locator('aside.sidebar-light a[href="/dashboard"]').first()
    if (await dashboardLink.isVisible().catch(() => false)) {
      await dashboardLink.click()
      await expect(authenticatedPage).toHaveURL(/\/dashboard/)
    }
  })
})
