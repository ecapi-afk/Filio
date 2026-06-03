import { Page, Locator, expect } from '@playwright/test'

export class ClientDetailPage {
  readonly page: Page
  readonly pageTitle: Locator
  readonly clientName: Locator
  readonly sendReminderButton: Locator
  readonly editButton: Locator
  readonly backButton: Locator
  readonly uploadArea: Locator

  constructor(page: Page) {
    this.page = page
    this.pageTitle = page.locator('h1:has-text("Client")')
    this.clientName = page.locator('[data-testid="client-name"], h1')
    this.sendReminderButton = page.locator('button:has-text("Send Reminder"), button:has-text("Remind")').first()
    this.editButton = page.locator('button:has-text("Edit"), a:has-text("Edit")').first()
    this.backButton = page.locator('a:has-text("Back"), button:has-text("Back")').first()
    this.uploadArea = page.locator('[data-testid="upload-area"], input[type="file"]')
  }

  async goto(clientId: string) {
    await this.page.goto(`/dashboard/clients/${clientId}`)
    await this.page.waitForLoadState('networkidle')
  }

  async expectLoaded() {
    await expect(this.pageTitle.or(this.clientName).first()).toBeVisible({ timeout: 10000 })
  }

  async expectClientName(name: string) {
    await expect(this.page.locator(`text=${name}`).first()).toBeVisible()
  }
}
