import { test, expect } from '@playwright/test'
import { LandingPage } from '../../pages/LandingPage'
import { LoginPage } from '../../pages/LoginPage'
import { PortalPage } from '../../pages/PortalPage'

test.describe('Public Pages', () => {
  let landingPage: LandingPage
  let loginPage: LoginPage
  let portalPage: PortalPage

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page)
    loginPage = new LoginPage(page)
    portalPage = new PortalPage(page)
  })

  test.describe('Landing Page', () => {
    test('loads hero content', async ({ page }) => {
      await landingPage.goto()
      await landingPage.expectHeroLoaded()
    })

    test('has no console errors', async ({ page }) => {
      await landingPage.goto()
      await landingPage.expectNoConsoleErrors()
    })

    test('navigates to register when clicking Get Started', async ({ page }) => {
      await landingPage.goto()
      await landingPage.clickGetStarted()
      await expect(page).toHaveURL(/\/register/)
    })

    test('navigates to login when clicking Login', async ({ page }) => {
      await landingPage.goto()
      await landingPage.clickLogin()
      await expect(page).toHaveURL(/\/login/)
    })

    test('displays features section', async ({ page }) => {
      await landingPage.goto()
      await expect(landingPage.featuresSection.first()).toBeVisible()
    })

    test('displays hero on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await landingPage.goto()
      await expect(landingPage.heroTitle).toBeVisible()
    })
  })

  test.describe('Login Page', () => {
    test('displays email and password inputs and login button', async ({ page }) => {
      await loginPage.goto()
      await expect(loginPage.emailInput).toBeVisible()
      await expect(loginPage.passwordInput).toBeVisible()
      await expect(loginPage.loginButton).toBeVisible()
    })

    test('navigates to forgot password page', async ({ page }) => {
      await loginPage.goto()
      await loginPage.forgotPasswordLink.click()
      await expect(page).toHaveURL(/\/forgot-password/)
    })

    test('shows invalid state for malformed email', async ({ page }) => {
      await loginPage.goto()
      await loginPage.emailInput.fill('invalid-email')
      await loginPage.passwordInput.fill('password123')
      await loginPage.loginButton.click()
      const isValid = await loginPage.emailInput.evaluate(
        (el) => (el as HTMLInputElement).validity.valid
      )
      expect(isValid).toBe(false)
    })

    test('initiates Xero OAuth flow when clicking SSO button', async ({ page }) => {
      await loginPage.goto()
      await loginPage.xeroButton.click()
      await page.waitForLoadState('networkidle')
    })
  })

  test.describe('Portal Page', () => {
    test('loads successfully', async ({ page }) => {
      await portalPage.goto()
      await portalPage.expectLoaded()
    })

    test('shows upload interface with drag-drop or button', async ({ page }) => {
      await portalPage.goto()
      await expect(portalPage.dragDropArea.or(portalPage.uploadButton).first()).toBeVisible()
    })

    test('shows expired message for invalid token', async ({ page }) => {
      await portalPage.gotoWithToken('invalid-token-12345')
      await portalPage.expectExpired()
    })

    test('displays welcome message on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await portalPage.goto()
      await expect(portalPage.welcomeMessage).toBeVisible()
    })
  })

  test.describe('Forgot Password Page', () => {
    test('loads with email input', async ({ page }) => {
      await page.goto('/forgot-password')
      await expect(page.locator('input[type="email"], h1')).toBeVisible()
    })

    test('shows invalid state when submitting empty email', async ({ page }) => {
      await page.goto('/forgot-password')
      await page.locator('button[type="submit"]').click()
      const emailInput = page.locator('input[type="email"]')
      const isValid = await emailInput.evaluate(
        (el) => (el as HTMLInputElement).validity.valid
      )
      expect(isValid).toBe(false)
    })
  })

  test.describe('Auth Guards', () => {
    test('redirects /dashboard to login when unauthenticated', async ({ page }) => {
      await page.goto('/dashboard')
      await expect(page).toHaveURL(/\/login/)
    })

    test('redirects /dashboard/clients to login when unauthenticated', async ({ page }) => {
      await page.goto('/dashboard/clients')
      await expect(page).toHaveURL(/\/login/)
    })

    test('redirects /dashboard/settings to login when unauthenticated', async ({ page }) => {
      await page.goto('/dashboard/settings')
      await expect(page).toHaveURL(/\/login/)
    })

    test('redirects /dashboard/uploads to login when unauthenticated', async ({ page }) => {
      await page.goto('/dashboard/uploads')
      await expect(page).toHaveURL(/\/login/)
    })

    test('allows public pages without authentication', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('body')).toBeVisible()
    })
  })

  test.describe('Error Pages', () => {
    test('displays 404 for unknown routes', async ({ page }) => {
      await page.goto('/this-does-not-exist')
      await expect(page.locator('text=/404|Not Found/i').first()).toBeVisible()
    })
  })
})
