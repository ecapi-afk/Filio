import { Page, Locator } from '@playwright/test'

export class LoginPage {
  readonly page: Page
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly loginButton: Locator
  readonly forgotPasswordLink: Locator
  readonly errorMessage: Locator
  readonly xeroButton: Locator

  constructor(page: Page) {
    this.page = page
    this.emailInput = page.locator('input[type="email"], input[name="email"]')
    this.passwordInput = page.locator('input[type="password"]')
    this.loginButton = page.locator('button[type="submit"]')
    this.forgotPasswordLink = page.locator('a[href*="forgot-password"]')
    this.errorMessage = page.locator('[data-testid="error-message"], [class*="error"]')
    this.xeroButton = page.locator('button:has-text("Xero")')
  }

  async goto() {
    await this.page.goto('/login')
    await this.page.waitForLoadState('domcontentloaded')
    await this.emailInput.waitFor({ state: 'visible', timeout: 10000 })
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.loginButton.click()
    await this.page.waitForLoadState('domcontentloaded')
  }

  async expectToBeRedirectedToDashboard() {
    await this.page.waitForURL('**/dashboard**', { timeout: 10000 })
  }

  async expectErrorMessage() {
    await this.errorMessage.waitFor({ state: 'visible', timeout: 5000 })
  }
}
