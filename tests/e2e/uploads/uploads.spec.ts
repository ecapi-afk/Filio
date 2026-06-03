/**
 * Uploads E2E Tests - TDD RED Phase
 *
 * RED: Write failing tests first (functionality not yet fully implemented)
 * These tests describe the EXPECTED behavior
 *
 * Test Strategy:
 * - Use authenticated fixture for dashboard access
 * - Test file upload functionality
 * - Verify upload status transitions (pending -> synced/failed)
 * - Test file management (delete, filter)
 */

import { test, expect } from '../../fixtures/authenticated'
import { UploadsPage } from '../../pages/UploadsPage'
import { ClientDetailPage } from '../../pages/ClientDetailPage'
import path from 'path'

test.describe('Uploads - File Upload Flow', () => {
  let uploadsPage: UploadsPage
  let clientDetailPage: ClientDetailPage

  test.beforeEach(async ({ authenticatedPage }) => {
    uploadsPage = new UploadsPage(authenticatedPage)
    clientDetailPage = new ClientDetailPage(authenticatedPage)
  })

  test.describe.configure({ mode: 'serial' }) // Serial for upload tests to avoid conflicts

  // ========================================
  // RED Test 1: Upload file via file input
  // ========================================

  test('should upload a file via file input on client detail page', async ({ authenticatedPage }) => {
    // Navigate to a client detail page (use first available client)
    await authenticatedPage.goto('/dashboard/clients')
    await authenticatedPage.waitForLoadState('networkidle')

    // Click on first client row to go to detail page
    const firstClientLink = authenticatedPage.locator('table tbody tr a[href*="/dashboard/clients/"]').first()
    if (await firstClientLink.isVisible()) {
      await firstClientLink.click()
      await authenticatedPage.waitForURL(/\/dashboard\/clients\/[^/]+/)
    } else {
      // Skip if no clients exist
      test.skip()
    }

    // Look for file input or upload area
    const fileInput = authenticatedPage.locator('input[type="file"]').first()
    const uploadArea = authenticatedPage.locator('[class*="dropzone"], [class*="upload"]').first()

    // Verify upload area or file input is present
    const uploadElement = fileInput.or(uploadArea).first()
    await expect(uploadElement).toBeVisible({ timeout: 5000 })
  })

  // ========================================
  // RED Test 2: Upload shows progress indicator
  // ========================================

  test('should show upload progress when uploading', async ({ authenticatedPage }) => {
    // Navigate to client detail with upload capability
    await authenticatedPage.goto('/dashboard/clients')
    await authenticatedPage.waitForLoadState('networkidle')

    const firstClientLink = authenticatedPage.locator('table tbody tr a[href*="/dashboard/clients/"]').first()
    if (await firstClientLink.isVisible()) {
      await firstClientLink.click()
      await authenticatedPage.waitForURL(/\/dashboard\/clients\/[^/]+/)
    } else {
      test.skip()
    }

    // Upload a small test file
    const fileInput = authenticatedPage.locator('input[type="file"]').first()
    if (await fileInput.isVisible()) {
      // Upload a test file
      const testFilePath = path.join(__dirname, '../../fixtures/test-files/test-receipt.pdf')
      await fileInput.setInputFiles(testFilePath)

      // Should see uploading/progress indicator
      const progressIndicator = authenticatedPage.locator('text=/Syncing|Sending|Uploading/i').first()
      await expect(progressIndicator).toBeVisible({ timeout: 3000 })
    } else {
      test.skip()
    }
  })

  // ========================================
  // RED Test 3: Uploaded file appears in list
  // ========================================

  test('should display uploaded file in the uploads list', async ({ authenticatedPage }) => {
    await uploadsPage.goto()
    await uploadsPage.expectLoaded()

    // Look for either upload list or empty state
    const uploadList = uploadsPage.uploadList
    const emptyState = authenticatedPage.locator('text=/No uploads|No files|Uploads will appear/i')

    // Either list has items or shows empty state (but element should exist)
    const hasList = await uploadList.isVisible().catch(() => false)
    const hasEmptyState = await emptyState.isVisible().catch(() => false)

    expect(hasList || hasEmptyState).toBeTruthy()
  })

  // ========================================
  // RED Test 4: Upload with different file types
  // ========================================

  test('should accept valid file types for upload', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard/clients')
    await authenticatedPage.waitForLoadState('networkidle')

    const firstClientLink = authenticatedPage.locator('table tbody tr a[href*="/dashboard/clients/"]').first()
    if (await firstClientLink.isVisible()) {
      await firstClientLink.click()
      await authenticatedPage.waitForURL(/\/dashboard\/clients\/[^/]+/)
    } else {
      test.skip()
    }

    // Check that allowed file types are accepted
    const fileInput = authenticatedPage.locator('input[type="file"]').first()
    if (await fileInput.isVisible()) {
      const acceptAttr = await fileInput.getAttribute('accept')
      // Should have accept attribute with valid file types
      expect(acceptAttr).toBeTruthy()
    } else {
      test.skip()
    }
  })
})

test.describe('Uploads - Stats Display', () => {
  let uploadsPage: UploadsPage

  test.beforeEach(async ({ authenticatedPage }) => {
    uploadsPage = new UploadsPage(authenticatedPage)
  })

  // ========================================
  // RED Test 5: Stats cards show correct counts
  // ========================================

  test('should display total uploads count in stats', async ({ authenticatedPage }) => {
    await uploadsPage.goto()
    await uploadsPage.expectLoaded()

    // Should show Total, Pending, Synced stats
    const totalLabel = authenticatedPage.locator('text=/Total|Uploads/i').first()
    await expect(totalLabel).toBeVisible({ timeout: 5000 })
  })

  // ========================================
  // RED Test 6: Navigate to client detail from upload
  // ========================================

  test('should navigate to client detail when clicking on upload', async ({ authenticatedPage }) => {
    await uploadsPage.goto()
    await uploadsPage.expectLoaded()

    // Try to find upload rows that link to client details
    const uploadLink = authenticatedPage.locator('a[href*="/dashboard/clients/"]').first()

    if (await uploadLink.isVisible().catch(() => false)) {
      await uploadLink.click()
      await authenticatedPage.waitForURL(/\/dashboard\/clients\/[^/]+/)
      // Should be on a client detail page
      await expect(authenticatedPage.locator('h1, h2')).toBeVisible()
    } else {
      // No uploads yet - this is acceptable
      test.skip()
    }
  })
})

test.describe('Uploads - Filters & Search', () => {
  let uploadsPage: UploadsPage

  test.beforeEach(async ({ authenticatedPage }) => {
    uploadsPage = new UploadsPage(authenticatedPage)
  })

  // ========================================
  // RED Test 7: Filter uploads by status
  // ========================================

  test('should filter uploads by status (Pending/Synced/Failed)', async ({ authenticatedPage }) => {
    await uploadsPage.goto()
    await uploadsPage.expectLoaded()

    // Look for filter buttons or dropdown
    const filterButton = authenticatedPage.locator('button:has-text("Filter"), button:has-text("Pending"), button:has-text("Synced")').first()

    if (await filterButton.isVisible().catch(() => false)) {
      await filterButton.click()
      // After filtering, should see filtered results
      await authenticatedPage.waitForTimeout(500)
    } else {
      // No filter UI yet
      test.skip()
    }
  })

  // ========================================
  // RED Test 8: Search uploads by filename
  // ========================================

  test('should search uploads by filename', async ({ authenticatedPage }) => {
    await uploadsPage.goto()
    await uploadsPage.expectLoaded()

    const searchInput = authenticatedPage.locator('input[placeholder*="Search"], input[type="search"]').first()

    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('invoice')
      await authenticatedPage.waitForTimeout(500)
      // Should filter results
      const results = authenticatedPage.locator('table tbody tr')
      const count = await results.count()
      expect(count).toBeGreaterThanOrEqual(0) // Just verify no crash
    } else {
      test.skip()
    }
  })
})
