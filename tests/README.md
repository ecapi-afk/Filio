# Filio E2E Test Suite

## Overview

Comprehensive E2E test suite using Playwright for the Filio application.

## Test Structure

```
tests/
├── e2e/
│   ├── auth/           # Authentication tests
│   │   ├── login.spec.ts
│   │   └── register.spec.ts
│   ├── dashboard/      # Dashboard tests
│   │   ├── layout.spec.ts
│   │   └── dashboard.spec.ts
│   ├── portal/         # Portal and public pages
│   │   ├── public.spec.ts
│   │   └── portal.spec.ts
│   ├── api/            # API endpoint tests
│   │   └── api.spec.ts
│   ├── smoke/          # Smoke tests (fast, critical paths)
│   │   └── critical-flows.spec.ts
│   └── visual/         # Visual regression tests
│       └── visual.spec.ts
├── pages/              # Page Object Models
│   ├── LandingPage.ts
│   ├── LoginPage.ts
│   ├── RegisterPage.ts
│   ├── DashboardPage.ts
│   ├── ClientsPage.ts
│   └── PortalPage.ts
└── fixtures/           # Test fixtures
    ├── auth.ts
    └── authenticated.ts
```

## Running Tests

### All Tests
```bash
pnpm test:e2e
```

### Specific Suites
```bash
pnpm test:e2e:smoke      # Fast smoke tests
pnpm playwright test tests/e2e/auth
pnpm playwright test tests/e2e/portal
pnpm playwright test tests/e2e/dashboard
pnpm playwright test tests/e2e/api
pnpm playwright test tests/e2e/visual
```

### Interactive Mode
```bash
pnpm test:e2e:ui         # Playwright UI mode
pnpm test:e2e:headed      # Run in headed mode
```

### Single Test File
```bash
pnpm playwright test tests/e2e/auth/login.spec.ts
```

### Single Test
```bash
pnpm playwright test tests/e2e/auth/login.spec.ts --grep "should display login form"
```

## Environment Variables

Required for authenticated tests:
```bash
E2E_TEST_EMAIL=test@example.com
E2E_TEST_PASSWORD=your-password
BASE_URL=http://localhost:3000  # Optional, defaults to localhost:3000
```

## CI/CD

See `.github/workflows/e2e.yml` for the CI/CD pipeline configuration.

### Running in CI
Tests run automatically on:
- Push to `main` or `develop`
- Pull requests to `main`

### Manual Trigger
Use GitHub Actions workflow dispatch to run specific test suites:
- `full` - All tests
- `smoke` - Fast smoke tests only
- `auth` - Authentication tests
- `portal` - Portal tests
- `dashboard` - Dashboard tests

## Test Tags

- `@skip-email` - Tests that send emails (skipped in CI without real credentials)
- Tests requiring authentication automatically skip if `E2E_TEST_EMAIL` is not set

## Visual Regression

Visual tests compare screenshots against baselines in `tests/artifacts/`.

To update baselines locally:
```bash
pnpm playwright test tests/e2e/visual --update-snapshots
```

## Debugging

### View Test Reports
```bash
# Open HTML report
open playwright-report/index.html

# View JSON results
cat playwright-results.json
```

### Debug Specific Test
```bash
pnpm playwright test tests/e2e/auth/login.spec.ts --debug
```

### Trace Viewer
```bash
pnpm playwright show-trace trace.zip
```
