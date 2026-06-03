import { Page, Locator } from '@playwright/test'

export class RegisterPage {
  readonly page: Page
  readonly firstNameInput: Locator
  readonly lastNameInput: Locator
  readonly firmNameInput: Locator
  readonly workEmailInput: Locator
  readonly nextButton: Locator
  readonly passwordInput: Locator
  readonly confirmPasswordInput: Locator
  readonly termsCheckbox: Locator
  readonly createAccountButton: Locator
  readonly step1Fields: Locator[]
  readonly step2Fields: Locator[]

  constructor(page: Page) {
    this.page = page
    this.firstNameInput = page.locator('input[placeholder="Sarah"]')
    this.lastNameInput = page.locator('input[placeholder="Clarke"]')
    this.firmNameInput = page.locator('input[placeholder="Smith & Co Accountants"]')
    this.workEmailInput = page.locator('input[placeholder="sarah@smith.co.uk"]')
    this.nextButton = page.locator('button:has-text("Continue")')
    this.passwordInput = page.locator('input[type="password"]').first()
    this.confirmPasswordInput = page.locator('input[type="password"]').nth(1)
    this.termsCheckbox = page.locator('input[type="checkbox"]')
    this.createAccountButton = page.locator('button:has-text("Create Account")')
    this.step1Fields = [this.firstNameInput, this.lastNameInput, this.firmNameInput, this.workEmailInput]
    this.step2Fields = [this.passwordInput, this.confirmPasswordInput]
  }

  async goto() {
    await this.page.goto('/register')
    // Wait for the form to be visible instead of networkidle
    await this.firstNameInput.waitFor({ state: 'visible', timeout: 10000 })
  }

  async fillStep1(firstName: string, lastName: string, firmName: string, email: string) {
    await this.firstNameInput.fill(firstName)
    await this.lastNameInput.fill(lastName)
    await this.firmNameInput.fill(firmName)
    await this.workEmailInput.fill(email)
    await this.nextButton.click()
  }

  async fillStep2(password: string) {
    await this.passwordInput.fill(password)
    await this.confirmPasswordInput.fill(password)
    await this.termsCheckbox.check()
    await this.createAccountButton.click()
  }

  async expectToBeRedirectedToDashboard() {
    await this.page.waitForURL('**/dashboard**', { timeout: 10000 })
  }

  async expectStep2() {
    await this.passwordInput.waitFor({ state: 'visible', timeout: 5000 })
  }
}
