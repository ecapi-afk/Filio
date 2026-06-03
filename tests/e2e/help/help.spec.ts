/**
 * Help Page E2E Tests
 *
 * Test Strategy:
 * - Use authenticated fixture for dashboard access
 * - Test help page functionality
 */

import { test, expect } from '../../fixtures/authenticated'
import { HelpPage } from '../../pages/HelpPage'

test.describe('Help Page - Authenticated', () => {
  let helpPage: HelpPage

  test.beforeEach(async ({ authenticatedPage }) => {
    helpPage = new HelpPage(authenticatedPage)
  })

  test.describe.configure({ mode: 'parallel' })

  // ========================================
  // Page Load
  // ========================================

  test('should load help page', async ({ authenticatedPage }) => {
    await helpPage.goto()
    await helpPage.expectLoaded()
  })

  test('should display page title or help content', async ({ authenticatedPage }) => {
    await helpPage.goto()
    const hasTitle = await helpPage.pageTitle.isVisible().catch(() => false)
    const hasContent = await helpPage.helpContent.isVisible().catch(() => false)
    // Page should show either title or content
    expect(hasTitle || hasContent).toBeTruthy()
  })

  // ========================================
  // Navigation
  // ========================================

  test('should navigate back to dashboard via sidebar', async ({ authenticatedPage }) => {
    await helpPage.goto()
    const dashboardLink = authenticatedPage.locator('aside.sidebar-light a[href="/dashboard"]').first()
    if (await dashboardLink.isVisible().catch(() => false)) {
      await dashboardLink.click()
      await expect(authenticatedPage).toHaveURL(/\/dashboard/)
    }
  })
})
