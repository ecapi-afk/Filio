import { Page, Locator, expect } from '@playwright/test'

export class LandingPage {
  readonly page: Page
  readonly heroTitle: Locator
  readonly heroSubtitle: Locator
  readonly getStartedButton: Locator
  readonly watchDemoButton: Locator
  readonly loginLink: Locator
  readonly featuresSection: Locator
  readonly pricingSection: Locator
  readonly footer: Locator

  constructor(page: Page) {
    this.page = page
    this.heroTitle = page.locator('h1').first()
    this.heroSubtitle = page.locator('p').first()
    this.getStartedButton = page.locator('a:has-text("Get Started"), button:has-text("Get Started")').first()
    this.watchDemoButton = page.locator('a:has-text("Watch Demo"), button:has-text("Watch Demo")').first()
    this.loginLink = page.locator('a[href="/login"]').first()
    this.featuresSection = page.locator('section, [data-testid="features"]')
    this.pricingSection = page.locator('[data-testid="pricing"], section:has-text("Pricing")')
    this.footer = page.locator('footer')
  }

  async goto() {
    await this.page.goto('/')
    await this.page.waitForLoadState('networkidle')
  }

  async expectHeroLoaded() {
    await expect(this.heroTitle).toBeVisible({ timeout: 10000 })
    await expect(this.heroSubtitle).toBeVisible()
  }

  async clickGetStarted() {
    await this.getStartedButton.click()
    await this.page.waitForURL('**/register**')
  }

  async clickLogin() {
    await this.loginLink.click()
    await this.page.waitForURL('**/login**')
  }

  async expectNoConsoleErrors() {
    const errors: string[] = []
    this.page.on('pageerror', (err) => errors.push(err.message))
    await this.page.waitForTimeout(1000)
    expect(errors.length).toBe(0)
  }
}
