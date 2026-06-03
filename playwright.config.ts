import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 4 : 2,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-results.json' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
    // Better CI performance
    launchOptions: process.env.CI ? {
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    } : undefined,
  },
  // Run tests in parallel by browser for faster CI
  projects: [
    // Primary test runs - Chromium only for daily development
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    // Cross-browser tests (only run on full CI suite or manually)
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1440, height: 900 },
      },
    },
    // Mobile test
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
      },
    },
  ],
  // Web server configuration
  webServer: process.env.CI ? {
    command: 'pnpm start',
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    timeout: 120000,
    stdout: 'pipe',
    stderr: 'pipe',
  } : {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  // Timeout configurations
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
})
