import { Page, Locator, expect } from '@playwright/test'

export class NewClientPage {
  readonly page: Page
  readonly pageTitle: Locator
  readonly submitButton: Locator
  readonly formInputs: Locator

  // Mode selection buttons
  readonly addManuallyButton: Locator
  readonly importFromXeroButton: Locator

  constructor(page: Page) {
    this.page = page
    this.pageTitle = page.locator('h1:has-text("Add Client"), h1:has-text("New Client"), h2:has-text("Add Client Manually")')
    this.submitButton = page.locator('button:has-text("Add Client"), button:has-text("Create"), button:has-text("Save"), button:has-text("Next")').first()
    this.formInputs = page.locator('input[type="text"], input[type="email"], input[type="tel"], textarea')

    // Mode selection buttons
    this.addManuallyButton = page.locator('button:has-text("Add Manually"), h3:has-text("Add Manually")').first()
    this.importFromXeroButton = page.locator('button:has-text("Import from Xero"), h3:has-text("Import from Xero")').first()
  }

  async goto() {
    await this.page.goto('/dashboard/clients/new')
    await this.page.waitForLoadState('networkidle')
  }

  async expectLoaded() {
    await expect(this.addManuallyButton.or(this.importFromXeroButton).first()).toBeVisible({ timeout: 10000 })
  }

  async selectManualMode() {
    // If we're on the choose screen, click Add Manually
    const addManually = this.addManuallyButton
    if (await addManually.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addManually.click()
      await this.page.waitForTimeout(300)
    }
  }

  async selectXeroMode() {
    // If we're on the choose screen, click Import from Xero
    const importXero = this.importFromXeroButton
    if (await importXero.isVisible({ timeout: 2000 }).catch(() => false)) {
      await importXero.click()
      await this.page.waitForTimeout(300)
    }
  }

  async fillInput(labelOrPlaceholder: string, value: string) {
    const input = this.page.locator(`input[placeholder*="${labelOrPlaceholder}"], input[aria-label*="${labelOrPlaceholder}"], :text("${labelOrPlaceholder}") + input`).first()
    await input.fill(value)
  }

  async submit() {
    await this.submitButton.click()
  }
}
