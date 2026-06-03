import { Page, Locator, expect } from '@playwright/test'

export class ClientsPage {
  readonly page: Page
  readonly pageTitle: Locator
  readonly searchInput: Locator
  readonly addClientButton: Locator
  readonly clientTable: Locator
  readonly clientRows: Locator
  readonly filterDropdown: Locator
  readonly sortDropdown: Locator
  readonly syncXeroButton: Locator
  readonly emptyState: Locator
  readonly toast: Locator

  constructor(page: Page) {
    this.page = page
    this.pageTitle = page.locator('h1:has-text("Client")')
    this.searchInput = page.locator('input[placeholder*="Search"], input[type="search"]')
    this.addClientButton = page.locator('button:has-text("Add Client"), a:has-text("Add Client")').first()
    this.clientTable = page.locator('table, [data-testid="client-table"]')
    this.clientRows = page.locator('tbody tr, [data-testid="client-row"]')
    this.filterDropdown = page.locator('[data-testid="filter"], button:has-text("Filter")').first()
    this.sortDropdown = page.locator('[data-testid="sort"], button:has-text("Sort")').first()
    this.syncXeroButton = page.locator('button:has-text("Sync Xero"), button:has-text("Import")').first()
    this.emptyState = page.locator('[data-testid="empty-state"], text=/no clients/i')
    this.toast = page.locator('[data-testid="toast"], [role="status"], [class*="toast"]').first()
  }

  async goto() {
    await this.page.goto('/dashboard/clients')
    await this.page.waitForLoadState('networkidle')
  }

  async expectLoaded() {
    await expect(this.pageTitle.or(this.clientTable).first()).toBeVisible({ timeout: 10000 })
  }

  async searchForClient(name: string) {
    await this.searchInput.fill(name)
    await this.page.waitForTimeout(500) // Wait for debounced search
  }

  async clearSearch() {
    await this.searchInput.clear()
    await this.page.waitForTimeout(500)
  }

  async clickAddClient() {
    await this.addClientButton.click()
    await this.page.waitForURL('**/dashboard/clients/new**')
  }

  async clickFirstClient() {
    await this.clientRows.first().click()
    await this.page.waitForURL('**/dashboard/clients/**')
  }

  async getClientCount(): Promise<number> {
    return await this.clientRows.count()
  }

  async expectClientInList(clientName: string) {
    await expect(this.page.locator(`text=${clientName}`).first()).toBeVisible()
  }

  async expectNoResults() {
    await expect(this.emptyState).toBeVisible()
  }
}
