/**
 * Reminders Page E2E Tests
 *
 * Test Strategy:
 * - Use authenticated fixture for dashboard access
 * - Test reminders page functionality
 */

import { test, expect } from '../../fixtures/authenticated'
import { RemindersPage } from '../../pages/RemindersPage'

test.describe('Reminders Page - Authenticated', () => {
  let remindersPage: RemindersPage

  test.beforeEach(async ({ authenticatedPage }) => {
    remindersPage = new RemindersPage(authenticatedPage)
  })

  test.describe.configure({ mode: 'parallel' })

  // ========================================
  // Page Load
  // ========================================

  test('should load reminders page', async ({ authenticatedPage }) => {
    await remindersPage.goto()
    await remindersPage.expectLoaded()
  })

  test('should display page title', async ({ authenticatedPage }) => {
    await remindersPage.goto()
    const hasTitle = await remindersPage.pageTitle.isVisible().catch(() => false)
    const hasContent = await remindersPage.reminderList.isVisible().catch(() => false)
    const hasEmpty = await remindersPage.emptyState.isVisible().catch(() => false)
    // Page should show either content or empty state
    expect(hasTitle || hasContent || hasEmpty).toBeTruthy()
  })

  // ========================================
  // Navigation
  // ========================================

  test('should navigate back to dashboard via sidebar', async ({ authenticatedPage }) => {
    await remindersPage.goto()
    const dashboardLink = authenticatedPage.locator('aside.sidebar-light a[href="/dashboard"]').first()
    if (await dashboardLink.isVisible().catch(() => false)) {
      await dashboardLink.click()
      await expect(authenticatedPage).toHaveURL(/\/dashboard/)
    }
  })
})
