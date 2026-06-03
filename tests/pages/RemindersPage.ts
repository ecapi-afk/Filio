import { Page, Locator, expect } from '@playwright/test'

export class RemindersPage {
  readonly page: Page
  readonly pageTitle: Locator
  readonly reminderList: Locator
  readonly emptyState: Locator

  constructor(page: Page) {
    this.page = page
    this.pageTitle = page.locator('h1:has-text("Reminder")')
    this.reminderList = page.locator('[data-testid="reminder-list"], table')
    this.emptyState = page.locator('[data-testid="empty-state"]')
  }

  async goto() {
    await this.page.goto('/dashboard/reminders')
    await this.page.waitForLoadState('networkidle')
  }

  async expectLoaded() {
    // Check for title, list, or empty state - use a simple visible check
    const titleVisible = await this.pageTitle.isVisible().catch(() => false)
    const listVisible = await this.reminderList.isVisible().catch(() => false)
    const emptyVisible = await this.emptyState.isVisible().catch(() => false)
    expect(titleVisible || listVisible || emptyVisible).toBeTruthy()
  }
}
