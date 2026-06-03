/**
 * Dashboard Page Object Model
 * Encapsulates dashboard page interactions with clear, testable methods
 */

import { Page, Locator, expect } from '@playwright/test'

export class DashboardPage {
  private readonly page: Page

  // Header elements
  readonly header: Locator
  readonly sidebar: Locator
  readonly statsCards: Locator

  // Navigation items
  readonly clientsNavItem: Locator
  readonly uploadsNavItem: Locator
  readonly settingsNavItem: Locator
  readonly activityNavItem: Locator
  readonly helpNavItem: Locator
  readonly remindersNavItem: Locator
  readonly dashboardNavItem: Locator

  // User actions
  readonly logoutButton: Locator
  readonly notificationsBell: Locator

  constructor(page: Page) {
    this.page = page

    // Header
    this.header = page.locator('header')
    this.sidebar = page.locator('aside.sidebar-light')
    this.statsCards = page.locator('[data-testid="stat-card"], [class*="stat"]')

    // Navigation items - scoped to sidebar
    this.dashboardNavItem = page.locator('aside.sidebar-light a[href="/dashboard"]').first()
    this.clientsNavItem = page.locator('aside.sidebar-light a[href="/dashboard/clients"]').first()
    this.uploadsNavItem = page.locator('aside.sidebar-light a[href="/dashboard/uploads"]').first()
    this.settingsNavItem = page.locator('aside.sidebar-light button:has-text("Settings")').first()
    this.activityNavItem = page.locator('aside.sidebar-light a[href="/dashboard/clients/activity"]').first()
    this.helpNavItem = page.locator('aside.sidebar-light a[href="/dashboard/help"]').first()
    this.remindersNavItem = page.locator('aside.sidebar-light a[href="/dashboard/reminders"]').first()

    // User actions
    this.logoutButton = page.locator('button.sidebar-user-logout').first()
    this.notificationsBell = page.locator('button[aria-label*="notification"], button:has-text("Notifications")').first()
  }

  /**
   * Close settings dropdown if open by clicking the Settings button again (toggle)
   */
  private async closeSettingsDropdown(): Promise<void> {
    // Check if settings button has 'active' class indicating dropdown is open
    const settingsButton = this.page.locator('aside.sidebar-light button:has-text("Settings")')
    const isActive = await settingsButton.getAttribute('class').catch(() => '')

    if (isActive && isActive.includes('active')) {
      // Click the Settings button again to close the dropdown
      await settingsButton.click()
      await this.page.waitForTimeout(500) // Wait for dropdown animation to complete
    }
  }

  async goto(): Promise<void> {
    await this.page.goto('/dashboard')
    await this.page.waitForLoadState('networkidle')
  }

  async navigateToClients(): Promise<void> {
    await this.closeSettingsDropdown()
    await this.clientsNavItem.click()
    await expect(this.page).toHaveURL(/\/dashboard\/clients/)
  }

  async navigateToUploads(): Promise<void> {
    // Always close settings dropdown first (it may be blocking nav items)
    await this.closeSettingsDropdown()
    await this.uploadsNavItem.click()
    await this.page.waitForTimeout(500) // Wait for navigation
    await expect(this.page).toHaveURL(/\/dashboard\/uploads/)
  }

  async navigateToSettings(): Promise<void> {
    // Click settings button to open dropdown
    await this.settingsNavItem.click()
    await this.page.waitForTimeout(200)
    // Click Xero settings link (first one in the dropdown)
    await this.page.locator('aside.sidebar-light a[href*="/dashboard/settings"]').first().click()
    await expect(this.page).toHaveURL(/\/dashboard\/settings/)
  }

  async navigateToActivity(): Promise<void> {
    await this.closeSettingsDropdown()
    await this.activityNavItem.click()
    await expect(this.page).toHaveURL(/\/dashboard\/clients\/activity/)
  }

  async navigateToReminders(): Promise<void> {
    await this.closeSettingsDropdown()
    await this.remindersNavItem.click()
    await expect(this.page).toHaveURL(/\/dashboard\/reminders/)
  }

  async navigateToHelp(): Promise<void> {
    await this.closeSettingsDropdown()
    await this.helpNavItem.click()
    await expect(this.page).toHaveURL(/\/dashboard\/help/)
  }

  async navigateToDashboard(): Promise<void> {
    await this.closeSettingsDropdown()
    await this.dashboardNavItem.click()
    await expect(this.page).toHaveURL(/\/dashboard/)
  }

  async logout(): Promise<void> {
    await this.logoutButton.click()
    await expect(this.page).toHaveURL(/\/login/)
  }

  async expectStatsLoaded(): Promise<void> {
    await expect(this.statsCards.first()).toBeVisible({ timeout: 10000 })
    const count = await this.statsCards.count()
    expect(count).toBeGreaterThan(0)
  }

  async expectSidebarVisible(): Promise<void> {
    await expect(this.sidebar).toBeVisible()
  }

  async expectHeaderVisible(): Promise<void> {
    await expect(this.header).toBeVisible()
  }

  async getStatsCount(): Promise<number> {
    return this.statsCards.count()
  }

  async isAuthenticated(): Promise<boolean> {
    return this.page.url().includes('/dashboard')
  }

  /**
   * Reset sidebar to clean state - close any open dropdowns
   */
  async resetSidebar(): Promise<void> {
    await this.closeSettingsDropdown()
  }
}
