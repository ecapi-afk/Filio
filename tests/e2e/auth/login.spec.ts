import { test, expect } from '@playwright/test'
import { LoginPage } from '../../pages/LoginPage'

test.describe('Login Flow', () => {
  let loginPage: LoginPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    await loginPage.goto()
  })

  test.describe('Form Display', () => {
    test('displays email and password inputs and login button', async ({ page }) => {
      await expect(loginPage.emailInput).toBeVisible()
      await expect(loginPage.passwordInput).toBeVisible()
      await expect(loginPage.loginButton).toBeVisible()
    })

    test('displays forgot password link', async ({ page }) => {
      await expect(loginPage.forgotPasswordLink).toBeVisible()
    })

    test('displays Xero SSO button', async ({ page }) => {
      await expect(loginPage.xeroButton).toBeVisible()
    })

    test('displays link to register page', async ({ page }) => {
      const registerLink = page.locator('a[href="/register"]')
      await expect(registerLink).toBeVisible()
    })
  })

  test.describe('Form Validation', () => {
    test('shows invalid state when submitting empty email', async ({ page }) => {
      await loginPage.passwordInput.fill('somepassword')
      await loginPage.loginButton.click()

      const emailValid = await loginPage.emailInput.evaluate(
        (el) => (el as HTMLInputElement).validity.valid
      )
      expect(emailValid).toBe(false)
    })

    test('shows invalid state when submitting malformed email', async ({ page }) => {
      await loginPage.emailInput.fill('not-an-email')
      await loginPage.passwordInput.fill('somepassword')
      await loginPage.loginButton.click()

      const emailValid = await loginPage.emailInput.evaluate(
        (el) => (el as HTMLInputElement).validity.valid
      )
      expect(emailValid).toBe(false)
    })
  })

  test.describe('Navigation', () => {
    test('navigates to forgot password page when clicking link', async ({ page }) => {
      await loginPage.forgotPasswordLink.click()
      await expect(page).toHaveURL(/\/forgot-password/)
    })

    test('navigates to register page when clicking link', async ({ page }) => {
      await page.locator('a[href="/register"]').click()
      await expect(page).toHaveURL(/\/register/)
    })

    test('initiates Xero OAuth flow when clicking SSO button', async ({ page }) => {
      await loginPage.xeroButton.click()
      // OAuth navigation may go to Xero or show auth UI - just ensure navigation starts
      await expect(page).not.toHaveURL(/\/login/)
    })
  })

  test.describe('Auth Guard', () => {
    // Auth guard tests require real Supabase auth, mock cookies don't work
    if (!process.env.E2E_TEST_EMAIL) {
      test.skip('redirects authenticated user to dashboard', async ({ page }) => {
        await page.context().addCookies([
          {
            name: 'supabase-auth-token',
            value: JSON.stringify({ user: { id: 'test' } }),
            domain: 'localhost',
            path: '/',
          },
        ])
        await page.goto('/login')
        await page.waitForURL(/\/dashboard/, { timeout: 5000 })
      })
    }
  })

  test.describe('Error Handling', () => {
    test('displays error message when login fails with invalid credentials', async ({ page }) => {
      await loginPage.login('invalid@example.com', 'wrongpassword')
      // Wait for error alert to appear - use proper expectation
      const errorAlert = page.locator('[role="alert"], .error, .text-red-500')
      await expect(errorAlert.first()).toBeVisible({ timeout: 5000 })
    })
  })
})
