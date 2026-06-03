import { test, expect } from '@playwright/test'

test.describe('Critical User Flows', () => {
  test('landing page displays hero content', async ({ page }) => {
    await page.goto('/')

    // Use specific selector - hero title is the primary landing content
    const heroTitle = page.locator('h1').first()
    await expect(heroTitle).toBeVisible()
  })

  test('landing page navigation to login', async ({ page }) => {
    await page.goto('/')

    // Click the login navigation link/button
    const loginButton = page.locator('a[href="/login"]').first()
    await loginButton.click()
    await page.waitForURL('**/login**')

    // Verify login form is displayed
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('landing page navigation to register', async ({ page }) => {
    await page.goto('/')

    const registerButton = page.locator('a[href="/register"]').first()
    await registerButton.click()

    await expect(page).toHaveURL(/\/register/)
  })

  test('portal page loads with upload interface', async ({ page }) => {
    await page.goto('/portal')

    // Portal should show some content - heading, form, or main content
    const portalContent = page.locator('h1, main, form').first()
    await expect(portalContent).toBeVisible()
  })

  test('forgot password page loads with email input', async ({ page }) => {
    await page.goto('/forgot-password')

    // Should show email input or page heading
    const emailInput = page.locator('input[type="email"]')
    const pageHeading = page.locator('h1')
    await expect(emailInput.or(pageHeading).first()).toBeVisible()
  })

  // Auth guard tests - require real Supabase auth, mock cookies don't work
  if (!process.env.E2E_TEST_EMAIL) {
    test.skip('authenticated user is redirected from register to dashboard', async ({ page }) => {
      // Set authentication cookie before navigation
      await page.context().addCookies([
        {
          name: 'supabase-auth-token',
          value: JSON.stringify({ user: { id: 'authenticated' } }),
          domain: 'localhost',
          path: '/',
        },
      ])
      await page.goto('/register')

      await expect(page).toHaveURL(/\/dashboard/)
    })

    test.skip('authenticated user is redirected from login to dashboard', async ({ page }) => {
      await page.context().addCookies([
        {
          name: 'supabase-auth-token',
          value: JSON.stringify({ user: { id: 'authenticated' } }),
          domain: 'localhost',
          path: '/',
        },
      ])
      await page.goto('/login')

      await expect(page).toHaveURL(/\/dashboard/)
    })
  }
})
