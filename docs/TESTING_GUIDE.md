# Filio E2E 测试指南

## 目录

- [概述](#概述)
- [快速开始](#快速开始)
- [测试环境配置](#测试环境配置)
- [测试用例分类](#测试用例分类)
- [运行测试](#运行测试)
- [测试数据](#测试数据)
- [常见问题](#常见问题)
- [CI/CD 集成](#cicd-集成)

---

## 概述

Filio 使用 **Playwright** 作为端到端（E2E）测试框架，覆盖以下核心功能：

- 用户认证（登录/注册）
- Dashboard 功能
- 客户管理（CRUD）
- Portal 上传流程
- Xero 集成
- API 端点

🚀 如何使用

  运行测试

  # 运行所有测试
  pnpm test:e2e

  # UI 模式（推荐用于调试）
  pnpm test:e2e:ui

  # 查看测试报告
  pnpm exec playwright show-report

  查看文档

  - 快速参考: docs/TESTING_QUICK_REFERENCE.md
  - 完整指南: docs/TESTING_GUIDE.md
  - 测试用例: docs/TEST_CASES.md






### 测试统计

- **总测试数**: 548 个测试用例
- **浏览器**: Chromium, Firefox, Safari, Mobile Chrome
- **测试覆盖率目标**: 80%+
- **平均执行时间**: 约 15-20 分钟（并行模式）

---

## 快速开始

### 1. 安装依赖

```bash
cd /Users/eric/AI/WebSite/MiniMax\ Filio/Filio-v2
pnpm install
pnpm exec playwright install
```

### 2. 配置环境变量

创建 `.env.local` 文件：

```bash
# 测试用户凭据
E2E_TEST_EMAIL=test@filio.example.com
E2E_TEST_PASSWORD=TestPassword123!

# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Xero 配置（可选，用于 Xero 集成测试）
XERO_CLIENT_ID=your_xero_client_id
XERO_CLIENT_SECRET=your_xero_client_secret
XERO_REDIRECT_URI=http://localhost:3000/api/xero/callback
```

### 3. 启动开发服务器

```bash
pnpm dev
```

### 4. 运行测试

```bash
# 运行所有测试
pnpm test:e2e

# 运行测试并打开 UI
pnpm test:e2e:ui

# 运行烟雾测试（快速验证）
pnpm test:e2e:smoke
```

---

## 测试环境配置

### Playwright 配置 (`playwright.config.ts`)

```typescript
{
  testDir: './tests',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 4 : 2,
  timeout: 30000,
  expect: { timeout: 10000 },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  }
}
```

### 测试配置 (`tests/config.ts`)

```typescript
export const TEST_TIMEOUTS = {
  action: 10000,
  navigation: 30000,
  expect: 5000,
}

export const TEST_PORTAL = {
  verificationCode: '9527',  // Portal 验证码
  testEmail: 'portal-test@example.com',
}

export const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 375, height: 667 },
}
```

---

## 测试用例分类

### 1. 认证测试 (`tests/e2e/auth/`)

#### 登录流程 (`login.spec.ts`)
- ✅ 表单显示和验证
- ✅ 成功登录并重定向到 Dashboard
- ✅ 错误处理（无效凭据）
- ✅ 忘记密码链接
- ⚠️ Xero SSO 按钮（需要修复超时）

#### 注册流程 (`register.spec.ts`)
- ✅ 步骤 1：基本信息表单
- ✅ 步骤 2：密码设置
- ✅ 表单验证（邮箱格式、密码强度）
- ✅ 条款复选框验证
- ⚠️ Xero 注册选项（UI 缺失）

### 2. Dashboard 测试 (`tests/e2e/dashboard/`)

#### Dashboard 主页 (`dashboard.spec.ts`)
- ✅ 统计卡片显示
- ✅ 侧边栏导航
- ✅ 响应式设计（移动端）
- ✅ 页面导航（Clients, Uploads, Settings, Help）
- ✅ 登出功能

#### 认证守卫 (`dashboard.spec.ts`)
- ✅ 未认证用户重定向到登录页
- ✅ 所有受保护路由的访问控制

### 3. 客户管理测试 (`tests/e2e/clients/`)

#### 客户 CRUD (`clients.spec.ts`)
- ✅ 从 Xero 导入客户
- ✅ 手动创建客户
- ✅ 编辑客户信息
- ✅ 更新 Portal 设置
- ✅ 软删除客户
- ✅ 验证软删除后不显示在列表中

#### 客户详情页 (`clients.spec.ts`)
- ✅ 标签页切换（Overview, Documents, Reminders）
- ✅ 发送提醒功能

### 4. Portal 测试 (`tests/e2e/portal/`)

#### Portal 入口流程 (`portal.spec.ts`)
- ✅ 加载 Portal 入口页面
- ✅ 显示邮箱输入和发送验证码按钮
- ✅ 请求验证码
- ✅ 使用正确验证码 `9527` 验证成功
- ✅ 拒绝错误的验证码
- ✅ 移动端响应式

#### Portal 上传页面 (`portal.spec.ts`)
- ✅ 无效 token 重定向到过期页面
- ✅ 缺少 token 重定向回 Portal

#### Magic Link (`portal.spec.ts`)
- ✅ 加载 Magic Link 页面结构
- ✅ 处理无效的 Magic Link 代码

### 5. API 测试 (`tests/e2e/api/`)

#### 公共 API (`api.spec.ts`)
- ✅ GET /api/debug/status（未认证返回错误）
- ✅ GET /api/xero/auth-url（返回授权 URL）

#### 受保护 API (`api.spec.ts`)
- ✅ 未认证请求被拒绝
- ✅ 错误处理（405, 400, 404）

### 6. 其他测试

#### 帮助页面 (`tests/e2e/help/`)
- ✅ 加载帮助页面
- ✅ 显示帮助内容
- ✅ 返回 Dashboard 导航

#### 公共页面 (`tests/e2e/portal/public.spec.ts`)
- ✅ 加载首页内容
- ✅ 无控制台错误

---

## 运行测试

### 基本命令

```bash
# 运行所有测试（Chromium）
pnpm test:e2e

# 运行特定浏览器
pnpm exec playwright test --project=chromium
pnpm exec playwright test --project=firefox
pnpm exec playwright test --project=webkit

# 运行特定测试文件
pnpm exec playwright test tests/e2e/auth/login.spec.ts

# 运行特定测试用例
pnpm exec playwright test -g "should login successfully"

# 调试模式
pnpm exec playwright test --debug

# UI 模式（推荐）
pnpm test:e2e:ui
```

### 高级选项

```bash
# 并行运行（4 个 worker）
pnpm exec playwright test --workers=4

# 仅运行失败的测试
pnpm exec playwright test --last-failed

# 生成测试报告
pnpm exec playwright show-report

# 更新快照
pnpm exec playwright test --update-snapshots

# 运行特定标签的测试
pnpm exec playwright test --grep @smoke
```

### 测试脚本 (`package.json`)

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:smoke": "playwright test --grep @smoke",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug"
  }
}
```

---

## 测试数据

### Portal 验证码

**固定验证码**: `9527`

在 Portal 入口页面测试中使用：

```typescript
// tests/e2e/portal/portal.spec.ts
test('should verify with correct code 9527', async ({ page }) => {
  await portalPage.goto()
  await portalPage.requestVerificationCode('test@example.com')
  await portalPage.verifyCode('9527')
  // 验证成功
})
```

### 测试用户

```typescript
// tests/config.ts
export const TEST_USERS = {
  valid: {
    email: 'test@filio.example.com',
    password: 'TestPassword123!',
  },
  invalid: {
    email: 'invalid@example.com',
    password: 'wrongpassword',
  },
}
```

### 视口尺寸

```typescript
export const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  laptop: { width: 1024, height: 768 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
}
```

---

## 常见问题

### 1. 测试超时

**问题**: 测试在 30 秒后超时

**解决方案**:
- 检查开发服务器是否正常运行
- 使用 `domcontentloaded` 代替 `networkidle`
- 增加特定测试的超时时间：

```typescript
test('slow test', async ({ page }) => {
  test.setTimeout(60000) // 60 秒
  // ...
})
```

### 2. 元素未找到

**问题**: `Error: element(s) not found`

**解决方案**:
- 检查选择器是否正确
- 等待元素可见：

```typescript
await page.locator('button').waitFor({ state: 'visible', timeout: 10000 })
```

- 使用更宽松的选择器：

```typescript
// 不好
page.locator('button.submit-btn')

// 更好
page.locator('button:has-text("Submit")')
```

### 3. 认证失败

**问题**: 测试用户无法登录

**解决方案**:
- 确保 `.env.local` 中配置了正确的测试凭据
- 在 Supabase 中创建测试用户
- 使用 authenticated fixture：

```typescript
// tests/fixtures/authenticated.ts
import { test as base } from '@playwright/test'

export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    // 登录逻辑
    await page.goto('/login')
    await page.fill('input[type="email"]', TEST_USERS.valid.email)
    await page.fill('input[type="password"]', TEST_USERS.valid.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard**')
    await use(page)
  },
})
```

### 4. Portal 验证码测试失败

**问题**: Portal 验证码验证失败

**解决方案**:
- 确保使用固定验证码 `9527`
- 检查 `portal-entry-client.tsx` 中的验证逻辑：

```typescript
if ((e.target as any).otp.value === '9527') {
  toast.success('Verified successfully!')
}
```

### 5. 并行测试冲突

**问题**: 并行运行时测试相互干扰

**解决方案**:
- 使用唯一的测试数据（时间戳）：

```typescript
const uniqueEmail = `test${Date.now()}@example.com`
```

- 使用 `test.describe.configure({ mode: 'serial' })` 串行运行：

```typescript
test.describe('Serial tests', () => {
  test.describe.configure({ mode: 'serial' })
  
  test('test 1', async ({ page }) => { /* ... */ })
  test('test 2', async ({ page }) => { /* ... */ })
})
```

---

## CI/CD 集成

### GitHub Actions 配置

创建 `.github/workflows/e2e.yml`：

```yaml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
          
      - name: Install dependencies
        run: pnpm install
        
      - name: Install Playwright Browsers
        run: pnpm exec playwright install --with-deps
        
      - name: Run E2E tests
        run: pnpm test:e2e
        env:
          CI: true
          E2E_TEST_EMAIL: ${{ secrets.E2E_TEST_EMAIL }}
          E2E_TEST_PASSWORD: ${{ secrets.E2E_TEST_PASSWORD }}
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

### 环境变量配置

在 GitHub Repository Settings > Secrets 中添加：

- `E2E_TEST_EMAIL`
- `E2E_TEST_PASSWORD`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## 测试最佳实践

### 1. 使用 Page Object Model (POM)

```typescript
// tests/pages/LoginPage.ts
export class LoginPage {
  constructor(private page: Page) {}
  
  async goto() {
    await this.page.goto('/login')
  }
  
  async login(email: string, password: string) {
    await this.page.fill('input[type="email"]', email)
    await this.page.fill('input[type="password"]', password)
    await this.page.click('button[type="submit"]')
  }
}
```

### 2. 避免硬编码等待

```typescript
// ❌ 不好
await page.waitForTimeout(5000)

// ✅ 好
await page.waitForSelector('button', { state: 'visible' })
await page.waitForURL('**/dashboard**')
```

### 3. 使用有意义的测试名称

```typescript
// ❌ 不好
test('test 1', async ({ page }) => { /* ... */ })

// ✅ 好
test('should login successfully with valid credentials', async ({ page }) => {
  /* ... */
})
```

### 4. 独立的测试用例

每个测试应该独立运行，不依赖其他测试的状态：

```typescript
test.beforeEach(async ({ page }) => {
  // 每个测试前重置状态
  await page.goto('/')
})
```

### 5. 使用 data-testid

在组件中添加 `data-testid` 属性：

```tsx
<button data-testid="submit-button">Submit</button>
```

在测试中使用：

```typescript
await page.locator('[data-testid="submit-button"]').click()
```

---

## 测试报告

### 查看 HTML 报告

```bash
pnpm exec playwright show-report
```

### 报告内容

- 测试执行时间
- 通过/失败统计
- 失败测试的截图和视频
- 错误堆栈跟踪
- 网络请求日志

### 报告位置

- HTML 报告: `playwright-report/index.html`
- JSON 结果: `playwright-results.json`
- 测试结果: `test-results/`

---

## 维护和更新

### 定期任务

1. **每周**: 运行完整测试套件，检查失败测试
2. **每月**: 更新 Playwright 版本
3. **每季度**: 审查和优化测试用例

### 更新 Playwright

```bash
pnpm update @playwright/test
pnpm exec playwright install
```

### 添加新测试

1. 在 `tests/e2e/` 下创建新的 `.spec.ts` 文件
2. 如需要，在 `tests/pages/` 下创建对应的 POM
3. 更新本文档的测试用例分类部分
4. 运行测试验证

---

## 联系和支持

如有问题或建议，请：

1. 查看 [Playwright 官方文档](https://playwright.dev/)
2. 查看项目 `CLAUDE.md` 文件
3. 提交 GitHub Issue

---

**最后更新**: 2026-04-21
**维护者**: Filio 开发团队
