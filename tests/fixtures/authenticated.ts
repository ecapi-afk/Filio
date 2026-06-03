/**
 * Authenticated Test Fixture
 * Provides pre-authenticated page for dashboard tests
 *
 * Uses /api/test-login to set a known password, then logs in via UI
 */

import { test as base, Page } from '@playwright/test'
import { BASE_URL } from '../config'

type AuthFixtures = {
  authenticatedPage: Page
  testUser: { email: string; password: string }
}

// Test credentials for zhanghaog@icloud.com
const TEST_EMAIL = 'zhanghaog@icloud.com'
const TEST_PASSWORD = 'TestPassword123!'

/**
 * Test user with credentials
 */
export const test = base.extend<AuthFixtures>({
  testUser: { email: TEST_EMAIL, password: TEST_PASSWORD },

  authenticatedPage: async ({ page }, use) => {
    // Retry the API call a few times in case of transient failures
    let retries = 3
    let lastError = ''

    while (retries > 0) {
      const response = await page.request.post(`${BASE_URL}/api/test-login`, {
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok()) {
        break
      }
      lastError = await response.text()
      retries--
      if (retries > 0) {
        await page.waitForTimeout(1000)
      }
    }

    if (retries === 0) {
      throw new Error(`Test login failed after retries: ${lastError}`)
    }

    // Wait longer for password update to propagate (especially with parallel workers)
    await page.waitForTimeout(5000)

    // Navigate to login page
    await page.goto(`${BASE_URL}/login`)

    // Wait for page to be ready (domcontentloaded is more reliable than networkidle in dev)
    await page.waitForLoadState('domcontentloaded')

    // Wait for form elements to be ready
    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]')
    const submitButton = page.locator('button[type="submit"]')

    // Ensure elements exist before filling
    await emailInput.waitFor({ state: 'visible', timeout: 10000 })
    await passwordInput.waitFor({ state: 'visible', timeout: 5000 })
    await submitButton.waitFor({ state: 'visible', timeout: 5000 })

    // Fill credentials using JavaScript to properly interact with React controlled inputs
    await emailInput.click()
    await emailInput.fill(TEST_EMAIL)

    await passwordInput.click()
    await passwordInput.fill(TEST_PASSWORD)

    // Wait a bit for React to process
    await page.waitForTimeout(200)

    // Submit form
    await submitButton.click()

    // Wait for dashboard redirect with extended timeout
    try {
      await page.waitForURL('**/dashboard**', { timeout: 45000 })
    } catch (e) {
      // Check current URL to help debug (page might be closed)
      try {
        const currentUrl = page.url()
        console.log('Login redirect debug - Current URL:', currentUrl)
        console.log('Page title:', await page.title())
        // Check for error messages on page
        const errorLocator = page.locator('[class*="error"], [class*="alert"], [role="alert"]')
        if (await errorLocator.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log('Error message:', await errorLocator.first().textContent())
        }
      } catch (debugError) {
        console.log('Could not get debug info - page may be closed:', debugError)
      }
      throw e
    }

    // Verify we're actually on the dashboard
    await page.waitForLoadState('domcontentloaded')

    await use(page)
  },
})

export { expect } from '@playwright/test'
