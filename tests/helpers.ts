/**
 * Test helper utilities
 * Common functions for E2E tests
 */

import { Page, Locator, expect, ConsoleMessage } from '@playwright/test'

export type ConsoleError = {
  message: string
  type: string
}

/**
 * Wait for network idle with timeout
 */
export async function waitForNetworkIdle(page: Page, timeout = 30000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout })
}

/**
 * Check for console errors on page
 */
export async function getConsoleErrors(page: Page): Promise<ConsoleError[]> {
  const errors: ConsoleError[] = []
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') {
      errors.push({ message: msg.text(), type: msg.type() })
    }
  })
  await page.waitForTimeout(1000)
  return errors
}

/**
 * Assert no console errors (helper for tests)
 */
export async function expectNoConsoleErrors(page: Page): Promise<void> {
  const errors = await getConsoleErrors(page)
  expect(errors.length).toBe(0)
}

/**
 * Check if element is visible with fallback
 */
export async function isVisible(page: Page, selector: string): Promise<boolean> {
  try {
    return await page.locator(selector).first().isVisible()
  } catch {
    return false
  }
}

/**
 * Retry helper for flaky operations
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: { retries: number; delay: number } = { retries: 3, delay: 1000 }
): Promise<T> {
  let lastError: Error | undefined

  for (let i = 0; i < options.retries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      if (i < options.retries - 1) {
        await page().waitForTimeout(options.delay)
      }
    }
  }

  throw lastError
}

// We can't use page() here since we're in a utility, but tests can use this pattern

/**
 * Navigate and wait for page to load
 */
export async function navigateAndWait(page: Page, url: string): Promise<void> {
  await page.goto(url)
  await waitForNetworkIdle(page)
}

/**
 * Check if URL matches pattern
 */
export async function expectUrlPattern(page: Page, pattern: string | RegExp): Promise<void> {
  await expect(page).toHaveURL(pattern)
}

/**
 * Click element and wait for navigation
 */
export async function clickAndNavigate(page: Page, locator: Locator, urlPattern: string | RegExp): Promise<void> {
  await locator.click()
  await expect(page).toHaveURL(urlPattern)
}

/**
 * Fill form field and check validity
 */
export async function fillAndValidateField(
  page: Page,
  selector: string,
  value: string
): Promise<boolean> {
  await page.locator(selector).fill(value)
  await page.waitForTimeout(100)
  return page.locator(selector).evaluate((el) => (el as HTMLInputElement).validity.valid)
}

/**
 * Take screenshot on failure helper
 */
export async function screenshotOnFailure<T>(
  page: Page,
  fn: () => Promise<T>,
  name: string
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    await page.screenshot({ path: `test-results/failure-${name}.png` })
    throw error
  }
}

/**
 * Auth helper - login and wait for dashboard
 */
export async function loginAsTestUser(page: Page): Promise<void> {
  const email = process.env.E2E_TEST_EMAIL
  const password = process.env.E2E_TEST_PASSWORD

  if (!email || !password) {
    throw new Error('E2E_TEST_EMAIL or E2E_TEST_PASSWORD not configured')
  }

  await page.goto('/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL('**/dashboard**', { timeout: 15000 })
}

/**
 * Auth guard check - verify redirect to login
 */
export async function expectAuthGuard(page: Page, url: string): Promise<void> {
  await page.goto(url)
  await expect(page).toHaveURL(/\/login/)
}

/**
 * Mock auth cookie helper
 */
export function getMockAuthCookie() {
  return [
    {
      name: 'supabase-auth-token',
      value: JSON.stringify({ user: { id: 'test-user-id' } }),
      domain: 'localhost',
      path: '/',
    },
  ]
}

/**
 * API request helper with auth headers
 */
export async function apiRequestWithAuth(
  page: Page,
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const cookies = await page.context().cookies()
  const authCookie = cookies.find((c) => c.name === 'supabase-auth-token')

  if (!authCookie) {
    throw new Error('Not authenticated')
  }

  return page.request.fetch(url, {
    ...options,
    headers: {
      Cookie: `supabase-auth-token=${authCookie.value}`,
      ...options.headers,
    },
  })
}
