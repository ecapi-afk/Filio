import { test, expect } from '@playwright/test'

test('debug dashboard stats', async ({ page }) => {
  // Check if we can access the dashboard with auth
  // This will redirect to login if not authenticated
  await page.goto('http://localhost:3000/login')
  await page.waitForLoadState('networkidle')

  // Check the login page renders correctly
  const emailInput = page.locator('input[type="email"]')
  const passwordInput = page.locator('input[type="password"]')
  const loginButton = page.locator('button[type="submit"]')

  if (await emailInput.isVisible()) {
    console.log('Login page visible - need auth')
  }

  // Just check that landing page works
  await page.goto('http://localhost:3000/')
  await page.waitForLoadState('networkidle')
  const h1 = page.locator('h1').first()
  await expect(h1).toBeVisible()
  console.log('Landing page works, H1:', await h1.textContent())
})
