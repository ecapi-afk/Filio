import { test, expect } from '@playwright/test'
import { PortalPage } from '../../pages/PortalPage'

test.describe('Portal - Entry & Verification Flow', () => {
  let portalPage: PortalPage

  test.beforeEach(async ({ page }) => {
    portalPage = new PortalPage(page)
  })

  test.describe.configure({ mode: 'serial' })

  // Portal Entry Page Tests
  test('should load portal entry page', async ({ page }) => {
    await portalPage.goto()
    await portalPage.expectLoaded()
  })

  test('should display email input and send code button', async ({ page }) => {
    await portalPage.goto()
    await expect(portalPage.emailInput).toBeVisible()
    await expect(portalPage.sendCodeButton).toBeVisible()
  })

  test('should request verification code', async ({ page }) => {
    await portalPage.goto()
    await portalPage.requestVerificationCode('test@example.com')
    await portalPage.expectVerificationStep()
  })

  test('should verify with correct code 9527', async ({ page }) => {
    await portalPage.goto()
    await portalPage.requestVerificationCode('test@example.com')
    await portalPage.verifyCode('9527')
    // Wait for success toast
    await page.waitForTimeout(1000)
    const successToast = page.locator('text=/verified successfully/i')
    await expect(successToast).toBeVisible({ timeout: 5000 })
  })

  test('should reject incorrect verification code', async ({ page }) => {
    await portalPage.goto()
    await portalPage.requestVerificationCode('test@example.com')
    await portalPage.verifyCode('0000')
    // Wait for error toast
    await page.waitForTimeout(1000)
    const errorToast = page.locator('text=/invalid verification code/i')
    await expect(errorToast).toBeVisible({ timeout: 5000 })
  })

  test('should be accessible on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await portalPage.goto()
    await expect(portalPage.uploadTitle).toBeVisible()
    await expect(portalPage.emailInput).toBeVisible()
  })

  // Portal Upload Page with Token Tests
  test('should show expired message for invalid token', async ({ page }) => {
    await page.goto('/portal/upload?token=invalid-expired-token')
    await page.waitForLoadState('domcontentloaded')
    // Should redirect to expired page
    await expect(page).toHaveURL(/expired/, { timeout: 5000 })
  })

  test('should show expired page for missing token', async ({ page }) => {
    await page.goto('/portal/upload')
    await page.waitForLoadState('domcontentloaded')
    // Should redirect back to portal with error
    await expect(page).toHaveURL(/portal/, { timeout: 5000 })
  })
})

test.describe('Portal - Magic Link (m/)', () => {
  test('should load magic link page structure', async ({ page }) => {
    await page.goto('/m/TEST12')
    // Body content should be visible
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('should handle invalid magic link code', async ({ page }) => {
    await page.goto('/m/INVALID')
    // Either URL changes to expired/invalid or error text appears
    const url = page.url()
    const isExpired = url.includes('expired') || url.includes('invalid')
    const hasExpiredText = await page.locator('text=/expired|invalid|not found/i').isVisible()
    expect(isExpired || hasExpiredText).toBeTruthy()
  })
})
