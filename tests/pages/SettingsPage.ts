import { Page, Locator, expect } from '@playwright/test'

export class SettingsPage {
  readonly page: Page
  readonly pageTitle: Locator
  readonly sidebar: Locator
  readonly saveButton: Locator
  readonly toast: Locator

  // Settings sections
  readonly xeroSection: Locator
  readonly profileSection: Locator
  readonly notificationsSection: Locator
  readonly brandingSection: Locator
  readonly billingSection: Locator
  readonly defaultsSection: Locator

  constructor(page: Page) {
    this.page = page

    this.pageTitle = page.locator('h1:has-text("Settings")')
    this.sidebar = page.locator('aside.sidebar-light')
    this.saveButton = page.locator('button:has-text("Save")').first()
    this.toast = page.locator('[data-testid="toast"], [role="status"], [class*="toast"]').first()

    // Settings navigation tabs
    this.xeroSection = page.locator('[href*="section=xero"]')
    this.profileSection = page.locator('[href*="section=profile"]')
    this.notificationsSection = page.locator('[href*="section=notifications"]')
    this.brandingSection = page.locator('[href*="section=branding"]')
    this.billingSection = page.locator('[href*="section=billing"]')
    this.defaultsSection = page.locator('[href*="section=defaults"]')
  }

  async goto() {
    await this.page.goto('/dashboard/settings')
    await this.page.waitForLoadState('networkidle')
  }

  async gotoSection(section: string) {
    await this.page.goto(`/dashboard/settings?section=${section}`)
    await this.page.waitForLoadState('networkidle')
  }

  async expectLoaded() {
    await expect(this.pageTitle.or(this.sidebar).first()).toBeVisible({ timeout: 10000 })
  }

  async clickSave() {
    await this.saveButton.click()
  }
}
