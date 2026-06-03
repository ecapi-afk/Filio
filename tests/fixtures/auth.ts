import { test as base } from '@playwright/test'
import { LoginPage } from '../pages/LoginPage'

type AuthFixtures = {
  loggedInPage: { email: string; password: string }
}

const TEST_USERS = {
  valid: {
    email: process.env.E2E_TEST_EMAIL || 'test@filio.example.com',
    password: process.env.E2E_TEST_PASSWORD || 'TestPassword123!',
  },
}

export const test = base.extend<AuthFixtures>({
  loggedInPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(TEST_USERS.valid.email, TEST_USERS.valid.password)
    await page.waitForURL('**/dashboard**')
    await use({ email: TEST_USERS.valid.email, password: TEST_USERS.valid.password })
  },
})

export { expect } from '@playwright/test'
export { TEST_USERS }
