# Filio E2E 测试方案

**项目**: Filio v2 - UK Accounting SaaS Platform
**文档版本**: 1.0
**更新日期**: 2026-04-18
**测试框架**: Playwright

---

## 目录

1. [测试概述](#测试概述)
2. [测试架构](#测试架构)
3. [测试分类](#测试分类)
4. [测试用例](#测试用例)
5. [运行命令](#运行命令)
6. [CI/CD 流水线](#cicd-流水线)
7. [环境配置](#环境配置)
8. [测试最佳实践](#测试最佳实践)
9. [故障排查](#故障排查)

---

## 测试概述

### 目标

- **快速反馈**: 2-5 分钟内发现关键问题
- **全面覆盖**: 覆盖所有用户关键路径
- **稳定可靠**: 避免 flaky 测试
- **易于维护**: 使用 Page Object Model 模式

### 测试金字塔

```
         ┌─────────────────┐
         │   E2E Tests     │  ← 关键用户路径 (smoke, auth, portal)
         │   (~50 tests)   │
         ├─────────────────┤
         │ Integration     │  ← API 端点测试
         │   (~30 tests)   │
         ├─────────────────┤
         │     Unit        │  ← 工具函数测试 (如需要)
         │   (~10 tests)   │
         └─────────────────┘
```

---

## 测试架构

### 目录结构

```
tests/
├── e2e/                      # E2E 测试
│   ├── auth/
│   │   ├── login.spec.ts     # 登录测试
│   │   └── register.spec.ts  # 注册测试
│   ├── dashboard/
│   │   ├── layout.spec.ts    # 布局测试
│   │   └── dashboard.spec.ts # 仪表板测试
│   ├── portal/
│   │   ├── public.spec.ts    # 公共页面测试
│   │   └── portal.spec.ts    # Portal 上传测试
│   ├── api/
│   │   └── api.spec.ts       # API 端点测试
│   ├── smoke/
│   │   └── critical-flows.spec.ts  # 冒烟测试
│   └── visual/
│       └── visual.spec.ts   # 视觉回归测试
├── pages/                    # Page Object Models
│   ├── LandingPage.ts
│   ├── LoginPage.ts
│   ├── RegisterPage.ts
│   ├── DashboardPage.ts
│   ├── ClientsPage.ts
│   └── PortalPage.ts
├── fixtures/                  # 测试 fixtures
│   ├── auth.ts               # 基础 auth fixture
│   └── authenticated.ts       # 认证用户 fixture
├── helpers.ts                # 测试辅助函数
├── config.ts                 # 测试配置
└── README.md                 # 本文档
```

### Page Object Model 模式

```typescript
// 页面对象封装页面交互
export class DashboardPage {
  readonly page: Page

  readonly clientsNavItem: Locator
  readonly statsCards: Locator

  async goto(): Promise<void> {
    await this.page.goto('/dashboard')
    await this.page.waitForLoadState('networkidle')
  }

  async navigateToClients(): Promise<void> {
    await this.clientsNavItem.click()
    await expect(this.page).toHaveURL(/\/dashboard\/clients/)
  }
}
```

### 测试 Fixtures

```typescript
// fixtures/authenticated.ts
export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // 自动登录
    await page.goto('/login')
    await page.locator('input[type="email"]').fill(TEST_EMAIL)
    await page.locator('input[type="password"]').fill(TEST_PASSWORD)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL('**/dashboard**', { timeout: 15000 })
    await use(page)
  },
})
```

---

## 测试分类

### 1. 冒烟测试 (Smoke Tests)

**运行时间**: ~2 分钟
**目标**: 验证关键路径不崩溃
**触发**: 每次 PR push

| 测试文件 | 测试项 | 描述 |
|---------|--------|------|
| `critical-flows.spec.ts` | Landing 页面加载 | 首页正确显示 |
| | 导航到登录 | 登录按钮工作正常 |
| | Portal 页面加载 | Portal 可访问 |
| | Forgot password | 密码重置页面可访问 |

### 2. 认证测试 (Auth Tests)

**运行时间**: ~3 分钟
**目标**: 登录/注册流程完整性

| 测试文件 | 测试项 | 描述 |
|---------|--------|------|
| `login.spec.ts` | 表单显示 | 邮箱/密码/登录按钮可见 |
| | 表单验证 | 邮箱格式校验 |
| | 导航链接 | Forgot password/Register 链接 |
| | Auth Guard | 已登录用户重定向到 dashboard |
| `register.spec.ts` | Step 1 表单 | 基本信息表单 |
| | Step 2 表单 | 密码设置表单 |
| | 密码验证 | 密码匹配/强度校验 |
| | 条款复选框 | 必须同意条款 |

### 3. Portal 测试 (Portal Tests)

**运行时间**: ~3 分钟
**目标**: 文档上传 Portal 功能

| 测试文件 | 测试项 | 描述 |
|---------|--------|------|
| `portal.spec.ts` | Portal 加载 | 上传界面显示 |
| | 截止日期显示 |  Deadline 信息可见 |
| | Token 过期 | 无效 Token 显示过期页 |
| | 文件选择 | 文件输入存在 |
| `public.spec.ts` | Auth Guards | 未认证访问 dashboard 重定向 |

### 4. Dashboard 测试 (Dashboard Tests)

**运行时间**: ~5 分钟
**目标**: 仪表板功能完整性
**需要**: 测试凭据

| 测试文件 | 测试项 | 描述 |
|---------|--------|------|
| `dashboard.spec.ts` | Stats 加载 | 统计卡片显示 |
| | 侧边栏导航 | 导航链接可点击 |
| | 页面导航 | Clients/Uploads/Settings 导航正常 |
| | 登出功能 | 登出后重定向到登录页 |
| | Auth Guards | 未认证用户重定向 |
| `layout.spec.ts` | 侧边栏可见 | 侧边栏内容显示 |
| | Header 可见 | Header 内容显示 |

### 5. API 测试 (API Tests)

**运行时间**: ~2 分钟
**目标**: API 端点返回正确状态码

| 测试组 | 测试项 | 描述 |
|--------|--------|------|
| Public APIs | `/api/debug/status` | 返回状态 |
| | `/api/xero/auth-url` | 返回认证 URL |
| Protected APIs | `/api/profile` | 需要认证 |
| | `/api/clients` | 需要认证 |
| Portal APIs | `/api/portal/verify-token` | Token 验证 |
| Upload APIs | `/api/upload/signed-url` | 需要认证 |
| Xero APIs | `/api/xero/settings` | 需要认证 |
| Error Handling | 405 Method Not Allowed | 正确 HTTP 状态码 |
| | 404 Not Found | 错误路由处理 |
| | 400 Bad Request | 无效 JSON 处理 |

### 6. 视觉回归测试 (Visual Tests)

**运行时间**: ~5 分钟
**触发**: PR 时可选运行

| 页面 | 描述 |
|------|------|
| Landing Hero | Desktop/Mobile |
| Pricing Section | 定价页面 |
| Login Page | 登录表单 |
| Register Step 1 | 注册第一步 |

---

## 测试用例

### Auth Guard 测试用例

```typescript
test.describe('Dashboard - Auth Guards', () => {
  test('should redirect /dashboard to login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('should redirect /dashboard/clients to login', async ({ page }) => {
    await page.goto('/dashboard/clients')
    await expect(page).toHaveURL(/\/login/)
  })

  test('should redirect /dashboard/uploads to login', async ({ page }) => {
    await page.goto('/dashboard/uploads')
    await expect(page).toHaveURL(/\/login/)
  })
})
```

### Login 测试用例

```typescript
test.describe('Login Flow', () => {
  test('should display login form elements', async ({ page }) => {
    await loginPage.goto()
    await expect(loginPage.emailInput).toBeVisible()
    await expect(loginPage.passwordInput).toBeVisible()
    await expect(loginPage.loginButton).toBeVisible()
  })

  test('should navigate to forgot password page', async ({ page }) => {
    await loginPage.goto()
    await loginPage.forgotPasswordLink.click()
    await expect(page).toHaveURL(/\/forgot-password/)
  })
})
```

### Dashboard 测试用例

```typescript
test.describe('Dashboard - Authenticated', () => {
  let dashboard: DashboardPage

  test.beforeEach(async ({ authenticatedPage }) => {
    dashboard = new DashboardPage(authenticatedPage)
  })

  test('should display stats cards on dashboard home', async ({ authenticatedPage }) => {
    await dashboard.goto()
    await dashboard.expectStatsLoaded()
    const count = await dashboard.getStatsCount()
    expect(count).toBeGreaterThan(0)
  })

  test('should navigate to clients page', async ({ authenticatedPage }) => {
    await dashboard.goto()
    await dashboard.navigateToClients()
    await expect(authenticatedPage).toHaveURL(/\/dashboard\/clients/)
  })
})
```

### API 测试用例

```typescript
test.describe('API Routes', () => {
  test('GET /api/debug/status should return status', async ({ request }) => {
    const response = await request.get('/api/debug/status')
    expect(response.status()).toBeLessThan(500)
  })

  test('POST /api/upload/signed-url should require authentication', async ({ request }) => {
    const response = await request.post('/api/upload/signed-url', {
      data: { filename: 'test.pdf', contentType: 'application/pdf' },
    })
    expect([401, 400, 500]).toContain(response.status())
  })
})
```

---

## 运行命令

### 基础命令

```bash
# 运行所有 E2E 测试
pnpm test:e2e

# 使用 Playwright UI 运行
pnpm test:e2e:ui

# 使用有头模式运行
pnpm test:e2e:headed
```

### 分模块命令

```bash
# 冒烟测试 (快速)
pnpm test:e2e:smoke

# 认证测试
pnpm test:e2e:auth

# Portal 测试
pnpm test:e2e:portal

# Dashboard 测试
pnpm test:e2e:dashboard

# API 测试
pnpm test:e2e:api

# 视觉回归测试
pnpm test:e2e:visual
```

### 单文件/单测试运行

```bash
# 运行单个测试文件
pnpm playwright test tests/e2e/auth/login.spec.ts

# 运行单个测试 (grep)
pnpm playwright test tests/e2e/auth/login.spec.ts --grep "should display login form"

# 运行指定浏览器的测试
pnpm playwright test tests/e2e/smoke --project=chromium
```

### 调试命令

```bash
# 打开 Playwright 报告
open playwright-report/index.html

# 跟踪调试
pnpm playwright test tests/e2e/auth/login.spec.ts --debug

# 查看 trace
pnpm playwright show-trace trace.zip
```

---

## CI/CD 流水线

### GitHub Actions 配置

文件: `.github/workflows/e2e.yml`

```yaml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  workflow_dispatch:
    inputs:
      test_suite:
        default: 'full'

env:
  CI: true

jobs:
  # 1. Type Check & Lint
  typecheck-and-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm tsc --noEmit
      - run: pnpm lint

  # 2. Build
  build:
    runs-on: ubuntu-latest
    needs: typecheck-and-lint
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm build

  # 3. Smoke Tests (快速反馈)
  e2e-smoke:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm playwright install --with-deps chromium
      - run: pnpm test:e2e:smoke

  # 4. Auth Tests
  e2e-auth:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm playwright install --with-deps chromium
      - run: pnpm test:e2e:auth

  # 5. Portal Tests
  e2e-portal:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm playwright install --with-deps chromium
      - run: pnpm test:e2e:portal
```

### 触发条件

| 事件 | 触发内容 |
|------|---------|
| Push to main/develop | 完整测试 + Build |
| PR to main | 完整测试 + 跨浏览器 |
| workflow_dispatch | 可选择测试套件 |

### 手动触发

在 GitHub Actions 页面选择 `E2E Tests` workflow，选择 `Run workflow`:

- `full` - 所有测试
- `smoke` - 仅冒烟测试
- `auth` - 仅认证测试
- `portal` - 仅 Portal 测试
- `dashboard` - 仅 Dashboard 测试

---

## 环境配置

### 本地环境变量

创建 `.env.local`:

```bash
# E2E 测试凭据 (必需用于认证测试)
E2E_TEST_EMAIL=test@example.com
E2E_TEST_PASSWORD=your-password

# Base URL (可选，默认 localhost:3000)
BASE_URL=http://localhost:3000
```

### GitHub Secrets

| Secret | 描述 | 必需 |
|--------|------|------|
| `E2E_TEST_EMAIL` | 测试账号邮箱 | 是 |
| `E2E_TEST_PASSWORD` | 测试账号密码 | 是 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL | 是 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key | 是 |
| `XERO_CLIENT_ID` | Xero Client ID | 否 |
| `XERO_CLIENT_SECRET` | Xero Client Secret | 否 |

### Playwright 配置

文件: `playwright.config.ts`

```typescript
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

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
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
```

---

## 测试最佳实践

### 1. Page Object Model

```typescript
// ✅ GOOD: 封装页面交互
export class LoginPage {
  async login(email: string, password: string) {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.loginButton.click()
  }
}

// ❌ BAD: 在测试中直接操作 DOM
test('should login', async ({ page }) => {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill('test@example.com')
  await page.locator('input[type="password"]').fill('password')
  await page.locator('button[type="submit"]').click()
})
```

### 2. 使用 Fixtures 进行认证

```typescript
// ✅ GOOD: 使用 fixture 自动处理登录
test.beforeEach(async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/dashboard')
})

// ❌ BAD: 在每个测试中重复登录逻辑
test.beforeEach(async ({ page }) => {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.locator('button[type="submit"]').click()
})
```

### 3. 避免硬编码超时

```typescript
// ✅ GOOD: 使用配置的超时时间
await expect(page.locator('h1')).toBeVisible({ timeout: 10000 })

// ❌ BAD: 硬编码超时
await page.waitForTimeout(5000)
```

### 4. 测试名称清晰

```typescript
// ✅ GOOD: 描述行为
test('should redirect to login when unauthenticated')

// ❌ BAD: 模糊名称
test('auth test')
```

### 5. 等待网络空闲

```typescript
// ✅ GOOD: 等待网络空闲
await page.goto('/dashboard')
await page.waitForLoadState('networkidle')

// ❌ BAD: 盲目等待
await page.waitForTimeout(2000)
```

### 6. 并行测试

```typescript
test.describe('Dashboard', () => {
  test.describe.configure({ mode: 'parallel' })  // 并行运行

  test('should load dashboard', ...)
  test('should show stats', ...)
})
```

### 7. Skipping 测试

```typescript
// 按条件跳过
test.skip(!process.env.E2E_TEST_EMAIL, 'Requires test credentials')

// 按标签跳过
test('should send email @skip-email', ...)

// 始终跳过
test.skip(true, 'Reason for skipping')
```

---

## 故障排查

### 常见问题

| 问题 | 解决方案 |
|------|---------|
| `Cannot find module '../fixtures/authenticated'` | 检查导入路径是否正确 |
| `Test timeout exceeded` | 增加 `timeout` 或检查页面加载 |
| `Element not visible` | 检查选择器是否正确，等待元素加载 |
| `Auth cookie not set` | 检查 Supabase 配置是否正确 |
| `Flaky tests` | 使用 `retry` 或增加 `expect` 超时 |

### 调试步骤

1. **查看 Playwright 报告**
   ```bash
   open playwright-report/index.html
   ```

2. **运行单个测试**
   ```bash
   pnpm playwright test tests/e2e/auth/login.spec.ts --debug
   ```

3. **检查截图**
   ```bash
   ls test-results/
   ```

4. **查看 trace**
   ```bash
   pnpm playwright show-trace trace.zip
   ```

### Flaky 测试处理

```typescript
// 使用 retry
test.setTimeout(60000)
test.retries(3)

// 或使用 helper 函数
async function retry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch {
      if (i === retries - 1) throw
      await page.waitForTimeout(1000)
    }
  }
  throw new Error('All retries failed')
}
```

---

## 测试报告

### 查看报告

```bash
# HTML 报告
open playwright-report/index.html

# JSON 结果
cat playwright-results.json

# 查看失败测试
grep -A 5 '"status":"failed"' playwright-results.json
```

### CI 报告

测试结果会上传到 GitHub Actions Artifacts:

- `playwright-report-{suite}` - HTML 报告
- `playwright-results-{suite}` - JSON 结果
- `playwright-screenshots-{suite}` - 失败截图

---

## 附录

### 测试标签

| 标签 | 描述 |
|------|------|
| `@skip-email` | 需要发送邮件的测试 |
| `@slow` | 运行时间较长的测试 |
| `@auth-required` | 需要认证的测试 |

### 相关文件

| 文件 | 描述 |
|------|------|
| `playwright.config.ts` | Playwright 配置 |
| `.github/workflows/e2e.yml` | CI/CD 配置 |
| `package.json` | 测试脚本 |
| `tests/config.ts` | 测试配置 |
| `tests/helpers.ts` | 测试辅助函数 |
