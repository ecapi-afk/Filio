export const TEST_DATA = {
  users: {
    valid: {
      email: process.env.E2E_TEST_EMAIL || 'test@example.com',
      password: process.env.E2E_TEST_PASSWORD || 'TestPassword123!',
    },
    invalid: {
      email: 'invalid@example.com',
      password: 'wrongpassword',
    },
  },
  client: {
    name: `Test Client ${Date.now()}`,
    email: `client${Date.now()}@example.com`,
    portalEmail: `portal${Date.now()}@example.com`,
  },
  firm: {
    name: `Test Firm ${Date.now()}`,
  },
}

export const NAVIGATION_TIMEOUT = 10000
export const ACTION_TIMEOUT = 5000
export const NETWORK_IDLE_TIMEOUT = 15000
