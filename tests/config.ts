/**
 * Test Configuration
 * Shared test settings and constants
 */

export const TEST_TIMEOUTS = {
  action: 10000,
  navigation: 30000,
  networkIdle: 15000,
  expect: 5000,
} as const

export const TEST_USERS = {
  valid: {
    email: process.env.E2E_TEST_EMAIL || 'test@filio.example.com',
    password: process.env.E2E_TEST_PASSWORD || 'TestPassword123!',
  },
  invalid: {
    email: 'invalid@example.com',
    password: 'wrongpassword',
  },
} as const

export const TEST_PORTAL = {
  verificationCode: '9527',
  testEmail: 'portal-test@example.com',
} as const

export const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  laptop: { width: 1024, height: 768 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
} as const

export const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

export const isCI = () => process.env.CI === 'true'
export const hasTestCredentials = () =>
  Boolean(process.env.E2E_TEST_EMAIL && process.env.E2E_TEST_PASSWORD)
