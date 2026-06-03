import { Page, Locator, expect } from '@playwright/test'

export class HelpPage {
  readonly page: Page
  readonly pageTitle: Locator
  readonly helpContent: Locator
  readonly searchInput: Locator

  constructor(page: Page) {
    this.page = page
    this.pageTitle = page.locator('h1:has-text("Help")')
    this.helpContent = page.locator('[data-testid="help-content"], article')
    this.searchInput = page.locator('input[placeholder*="Search"], input[type="search"]')
  }

  async goto() {
    await this.page.goto('/dashboard/help')
    await this.page.waitForLoadState('networkidle')
  }

  async expectLoaded() {
    await expect(this.pageTitle.or(this.helpContent).first()).toBeVisible({ timeout: 10000 })
  }
}
