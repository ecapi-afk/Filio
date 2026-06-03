import { Page, Locator, expect } from '@playwright/test'

export class UploadsPage {
  readonly page: Page
  readonly pageTitle: Locator
  readonly uploadArea: Locator
  readonly statsCards: Locator
  readonly uploadList: Locator

  constructor(page: Page) {
    this.page = page
    this.pageTitle = page.locator('h1:has-text("Upload")')
    this.uploadArea = page.locator('[data-testid="upload-area"], [class*="dropzone"], input[type="file"]')
    this.statsCards = page.locator('[data-testid="stat-card"], .grid > div')
    this.uploadList = page.locator('[data-testid="upload-list"], table')
  }

  async goto() {
    await this.page.goto('/dashboard/uploads')
    await this.page.waitForLoadState('networkidle')
  }

  async expectLoaded() {
    await expect(this.pageTitle.or(this.uploadArea).first()).toBeVisible({ timeout: 10000 })
  }

  async getStatsCount(): Promise<number> {
    return await this.statsCards.count()
  }
}
