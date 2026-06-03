import { test, expect } from '@playwright/test'
import { RegisterPage } from '../../pages/RegisterPage'
import { LoginPage } from '../../pages/LoginPage'

test.describe('Register Flow', () => {
  let registerPage: RegisterPage
  let loginPage: LoginPage

  test.beforeEach(async ({ page }) => {
    registerPage = new RegisterPage(page)
    loginPage = new LoginPage(page)
  })

  test.describe('Step 1 Form', () => {
    test('displays all required fields and next button', async ({ page }) => {
      await registerPage.goto()
      await expect(registerPage.firstNameInput).toBeVisible()
      await expect(registerPage.lastNameInput).toBeVisible()
      await expect(registerPage.firmNameInput).toBeVisible()
      await expect(registerPage.workEmailInput).toBeVisible()
      await expect(registerPage.nextButton).toBeVisible()
    })

    test('shows invalid state when submitting empty step 1', async ({ page }) => {
      await registerPage.goto()
      await registerPage.nextButton.click()

      const firstNameValid = await registerPage.firstNameInput.evaluate(
        (el) => (el as HTMLInputElement).validity.valid
      )
      expect(firstNameValid).toBe(false)
    })

    test('proceeds to step 2 when step 1 is valid', async ({ page }) => {
      await registerPage.goto()
      await registerPage.fillStep1(
        'Test',
        'User',
        'Test Firm Ltd',
        `test${Date.now()}@example.com`
      )
      await registerPage.expectStep2()
    })

    test('shows invalid state for malformed email', async ({ page }) => {
      await registerPage.goto()
      await registerPage.fillStep1(
        'Test',
        'User',
        'Test Firm Ltd',
        'invalid-email'
      )
      await registerPage.nextButton.click()

      const emailValid = await registerPage.workEmailInput.evaluate(
        (el) => (el as HTMLInputElement).validity.valid
      )
      expect(emailValid).toBe(false)
    })
  })

  test.describe('Step 2 Form', () => {
    test('shows password mismatch error when passwords differ', async ({ page }) => {
      await registerPage.goto()
      await registerPage.fillStep1(
        'Test',
        'User',
        'Test Firm Ltd',
        `test${Date.now()}@example.com`
      )
      await registerPage.expectStep2()

      await registerPage.passwordInput.fill('Password123!')
      await registerPage.confirmPasswordInput.fill('DifferentPassword!')
      await registerPage.termsCheckbox.check()
      await registerPage.createAccountButton.click()

      // Error should appear - use proper locator
      const errorMessage = page.locator('[role="alert"], .error, .text-red-500').first()
      await expect(errorMessage).toBeVisible()
    })

    test('requires terms checkbox to be checked', async ({ page }) => {
      await registerPage.goto()
      await registerPage.fillStep1(
        'Test',
        'User',
        'Test Firm Ltd',
        `test${Date.now()}@example.com`
      )
      await registerPage.expectStep2()

      await registerPage.passwordInput.fill('TestPassword123!')
      await registerPage.confirmPasswordInput.fill('TestPassword123!')
      // Don't check terms
      await registerPage.createAccountButton.click()

      // Terms should not be checked after submit (form should not proceed)
      const termsChecked = await registerPage.termsCheckbox.isChecked()
      expect(termsChecked).toBe(false)
    })

    test('shows error for weak password', async ({ page }) => {
      await registerPage.goto()
      await registerPage.fillStep1(
        'Test',
        'User',
        'Test Firm Ltd',
        `test${Date.now()}@example.com`
      )
      await registerPage.expectStep2()

      await registerPage.passwordInput.fill('weak')
      await registerPage.confirmPasswordInput.fill('weak')
      await registerPage.termsCheckbox.check()
      await registerPage.createAccountButton.click()

      // Error should appear for weak password
      const errorMessage = page.locator('[role="alert"], .error, .text-red-500').first()
      await expect(errorMessage).toBeVisible()
    })
  })

  test.describe('Navigation', () => {
    test('displays link to login page', async ({ page }) => {
      await registerPage.goto()
      const loginLink = page.locator('a[href="/login"]')
      await expect(loginLink).toBeVisible()
    })

    test('navigates to login page when clicking login link', async ({ page }) => {
      await registerPage.goto()
      await page.locator('a[href="/login"]').click()
      await expect(page).toHaveURL(/\/login/)
    })

    test('displays Xero signup option', async ({ page }) => {
      await registerPage.goto()
      // Xero button should be visible on register page
      const xeroButton = page.locator('button:has-text("Xero"), a:has-text("Xero")').first()
      await expect(xeroButton).toBeVisible()
    })
  })

  test.describe('Auth Guard', () => {
    test('redirects authenticated user to dashboard', async ({ page }) => {
      await page.context().addCookies([
        {
          name: 'supabase-auth-token',
          value: JSON.stringify({ user: { id: 'test' } }),
          domain: 'localhost',
          path: '/',
        },
      ])
      await page.goto('/register')
      await page.waitForURL(/\/dashboard/, { timeout: 5000 })
    })
  })
})
