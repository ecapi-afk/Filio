import { test, expect } from '@playwright/test'

/**
 * Visual regression tests capture screenshots of key pages
 * and compare them against baseline images.
 *
 * These tests require Playwright's visual comparisons feature.
 * Run with: pnpm playwright test tests/e2e/visual
 */

// Threshold for visual diff (0 = exact match, 1 = completely different)
const VISUAL_THRESHOLD = 0.1

test.describe('Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test.describe.configure({ mode: 'parallel' })

  // ============================================
  // Landing Page Visuals
  // ============================================
  test.describe('Landing Page', () => {
    test('hero section matches baseline', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      const hero = page.locator('section, main').first()
      await expect(hero).toHaveScreenshot('landing-hero.png', {
        maxDiffPixelRatio: VISUAL_THRESHOLD,
      })
    })

    test('pricing section matches baseline', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // Scroll to pricing
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(500)

      const pricing = page.locator('[data-testid="pricing"], section:has-text("Pricing")')
      await expect(pricing).toHaveScreenshot('landing-pricing.png', {
        maxDiffPixelRatio: VISUAL_THRESHOLD,
      })
    })

    test('mobile landing page matches baseline', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      const main = page.locator('main')
      await expect(main).toHaveScreenshot('landing-mobile.png', {
        maxDiffPixelRatio: VISUAL_THRESHOLD,
      })
    })
  })

  // ============================================
  // Auth Page Visuals
  // ============================================
  test.describe('Auth Pages', () => {
    test('login page matches baseline', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.goto('/login')
      await page.waitForLoadState('networkidle')

      const form = page.locator('form')
      await expect(form).toHaveScreenshot('login-page.png', {
        maxDiffPixelRatio: VISUAL_THRESHOLD,
      })
    })

    test('register page step 1 matches baseline', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.goto('/register')
      await page.waitForLoadState('networkidle')

      const form = page.locator('form')
      await expect(form).toHaveScreenshot('register-step1.png', {
        maxDiffPixelRatio: VISUAL_THRESHOLD,
      })
    })
  })

  // ============================================
  // Dashboard Visuals (requires auth - skipped in CI without creds)
  // ============================================
  test.describe('Dashboard', () => {
    test.describe.configure({ mode: 'serial' })
    test.skip(!process.env.E2E_TEST_EMAIL, 'Requires test credentials')

    test('dashboard main view matches baseline', async ({ page }) => {
      // Login first
      await page.goto('/login')
      await page.locator('input[type="email"]').fill(process.env.E2E_TEST_EMAIL!)
      await page.locator('input[type="password"]').fill(process.env.E2E_TEST_PASSWORD!)
      await page.locator('button[type="submit"]').click()
      await page.waitForURL('**/dashboard**', { timeout: 15000 })

      await page.setViewportSize({ width: 1440, height: 900 })
      await page.waitForLoadState('networkidle')

      const dashboard = page.locator('main')
      await expect(dashboard).toHaveScreenshot('dashboard-main.png', {
        maxDiffPixelRatio: VISUAL_THRESHOLD,
      })
    })

    test('clients page matches baseline', async ({ page }) => {
      // Login first
      await page.goto('/login')
      await page.locator('input[type="email"]').fill(process.env.E2E_TEST_EMAIL!)
      await page.locator('input[type="password"]').fill(process.env.E2E_TEST_PASSWORD!)
      await page.locator('button[type="submit"]').click()
      await page.waitForURL('**/dashboard**', { timeout: 15000 })

      await page.setViewportSize({ width: 1440, height: 900 })
      await page.goto('/dashboard/clients')
      await page.waitForLoadState('networkidle')

      const main = page.locator('main')
      await expect(main).toHaveScreenshot('clients-page.png', {
        maxDiffPixelRatio: VISUAL_THRESHOLD,
      })
    })
  })
})
