import { Page, Locator, expect } from '@playwright/test'

export class PortalPage {
  readonly page: Page
  readonly emailInput: Locator
  readonly sendCodeButton: Locator
  readonly otpInput: Locator
  readonly verifyButton: Locator
  readonly uploadTitle: Locator
  readonly dragDropArea: Locator
  readonly uploadButton: Locator
  readonly fileInput: Locator
  readonly deadlineInfo: Locator
  readonly requiredDocs: Locator
  readonly uploadedDocs: Locator
  readonly errorMessage: Locator
  readonly successMessage: Locator

  constructor(page: Page) {
    this.page = page
    // Portal entry page elements
    this.emailInput = page.locator('input[type="email"]#email')
    this.sendCodeButton = page.locator('button:has-text("Send Verification Code")')
    this.otpInput = page.locator('input[name="otp"]')
    this.verifyButton = page.locator('button:has-text("Verify")')
    this.uploadTitle = page.locator('text=Upload Your Documents')
    // Upload page elements
    this.dragDropArea = page.locator('[data-testid="dropzone"], [class*="dropzone"], input[type="file"]').first()
    this.uploadButton = page.locator('button:has-text("Upload"), button:has-text("Select Files")').first()
    this.fileInput = page.locator('input[type="file"]')
    this.deadlineInfo = page.locator('[data-testid="deadline"], [class*="deadline"]')
    this.requiredDocs = page.locator('[data-testid="required-docs"], [class*="required"]')
    this.uploadedDocs = page.locator('[data-testid="uploaded-docs"], [class*="uploaded"]')
    this.errorMessage = page.locator('[data-testid="error"], [class*="error"]')
    this.successMessage = page.locator('[data-testid="success"], [class*="success"]')
  }

  async goto() {
    await this.page.goto('/portal')
    await this.page.waitForLoadState('domcontentloaded')
    await this.uploadTitle.waitFor({ state: 'visible', timeout: 10000 })
  }

  async gotoWithToken(token: string) {
    await this.page.goto(`/portal/upload?token=${token}`)
    await this.page.waitForLoadState('domcontentloaded')
  }

  async requestVerificationCode(email: string) {
    await this.emailInput.fill(email)
    await this.sendCodeButton.click()
    await this.otpInput.waitFor({ state: 'visible', timeout: 5000 })
  }

  async verifyCode(code: string) {
    await this.otpInput.fill(code)
    await this.verifyButton.click()
  }

  async expectLoaded() {
    await expect(this.uploadTitle).toBeVisible({ timeout: 10000 })
  }

  async expectVerificationStep() {
    await expect(this.otpInput).toBeVisible({ timeout: 10000 })
  }

  async expectExpired() {
    await expect(this.page.locator('text=/expired|invalid|expired/i')).toBeVisible({ timeout: 5000 })
  }

  async uploadFile(filePath: string) {
    await this.fileInput.setInputFiles(filePath)
    await this.page.waitForTimeout(2000) // Wait for upload processing
  }

  async expectUploadSuccess() {
    await expect(this.successMessage.or(this.uploadedDocs).first()).toBeVisible({ timeout: 10000 })
  }

  async expectUploadError() {
    await expect(this.errorMessage).toBeVisible({ timeout: 5000 })
  }
}
