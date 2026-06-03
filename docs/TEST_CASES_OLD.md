# Filio 测试计划 & 测试案例

**项目**: Filio v2 - UK Accounting SaaS Platform
**文档版本**: 2.0 (Superpowers TDD 优化版)
**更新日期**: 2026-04-18
**测试框架**: Playwright

---

## 目录

1. [测试概述](#测试概述)
2. [测试套件总览](#测试套件总览)
3. [测试案例详细列表](#测试案例详细列表)
4. [测试执行矩阵](#测试执行矩阵)
5. [CI/CD 触发条件](#cicd-触发条件)
6. [环境配置](#环境配置)

---

## 测试概述

### 目标

- **快速反馈**: 2-5 分钟内发现关键问题
- **全面覆盖**: 覆盖所有用户关键路径
- **稳定可靠**: 避免 flaky 测试
- **Superpowers TDD**: 测试真实行为，不测试 mock

### 测试金字塔

```
         ┌─────────────────┐
         │   E2E Tests     │  ← 关键用户路径
         │   (~70 tests)   │
         ├─────────────────┤
         │ Integration     │  ← API 端点测试
         │   (~20 tests)   │
         ├─────────────────┤
         │     Unit        │  ← 工具函数测试
         └─────────────────┘
```

---

## 测试套件总览

| 套件 | 文件 | 测试数 | 运行时间 | 触发条件 |
|------|------|--------|---------|----------|
| **Smoke** | `smoke/critical-flows.spec.ts` | 7 | ~2min | 每次 PR |
| **Auth** | `auth/login.spec.ts`, `auth/register.spec.ts` | 18 | ~3min | 每次 PR |
| **Portal** | `portal/public.spec.ts`, `portal/portal.spec.ts` | 25 | ~3min | 每次 PR |
| **Dashboard** | `dashboard/dashboard.spec.ts`, `dashboard/layout.spec.ts` | 21 | ~5min | 每次 PR |
| **API** | `api/api.spec.ts` | 16 | ~2min | 每次 PR |
| **Visual** | `visual/visual.spec.ts` | 8 | ~5min | PR 时可选 |

**总计**: ~70+ 测试用例

---

## 测试案例详细列表

### 1. Smoke Tests (冒烟测试)

**文件**: `tests/e2e/smoke/critical-flows.spec.ts`

| # | 测试名称 | 描述 | 优先级 |
|---|---------|------|--------|
| 1 | `landing page displays hero content` | 首页 Hero 内容显示 | P0 |
| 2 | `landing page navigation to login` | 首页导航到登录页 | P0 |
| 3 | `landing page navigation to register` | 首页导航到注册页 | P0 |
| 4 | `portal page loads with upload interface` | Portal 页面加载 | P0 |
| 5 | `forgot password page loads with email input` | 忘记密码页面加载 | P1 |
| 6 | `authenticated user is redirected from register to dashboard` | 已认证用户访问注册页重定向 | P1 |
| 7 | `authenticated user is redirected from login to dashboard` | 已认证用户访问登录页重定向 | P1 |

---

### 2. Auth Tests - Login (登录测试)

**文件**: `tests/e2e/auth/login.spec.ts`

#### 2.1 Form Display (表单显示)

| # | 测试名称 | 描述 | 优先级 |
|---|---------|------|--------|
| 8 | `displays email and password inputs and login button` | 显示邮箱、密码输入框和登录按钮 | P0 |
| 9 | `displays forgot password link` | 显示忘记密码链接 | P1 |
| 10 | `displays Xero SSO button` | 显示 Xero SSO 按钮 | P1 |
| 11 | `displays link to register page` | 显示注册页面链接 | P1 |

#### 2.2 Form Validation (表单验证)

| # | 测试名称 | 描述 | 优先级 |
|---|---------|------|--------|
| 12 | `shows invalid state when submitting empty email` | 提交空邮箱时显示无效状态 | P0 |
| 13 | `shows invalid state when submitting malformed email` | 提交格式错误的邮箱时显示无效状态 | P0 |

#### 2.3 Navigation (导航)

| # | 测试名称 | 描述 | 优先级 |
|---|---------|------|--------|
| 14 | `navigates to forgot password page when clicking link` | 点击忘记密码链接跳转 | P1 |
| 15 | `navigates to register page when clicking link` | 点击注册链接跳转 | P1 |
| 16 | `initiates Xero OAuth flow when clicking SSO button` | 点击 Xero SSO 按钮启动 OAuth | P1 |

#### 2.4 Auth Guard (认证守卫)

| # | 测试名称 | 描述 | 优先级 |
|---|---------|------|--------|
| 17 | `redirects authenticated user to dashboard` | 已认证用户访问登录页重定向到 Dashboard | P1 |

#### 2.5 Error Handling (错误处理)

| # | 测试名称 | 描述 | 优先级 |
|---|---------|------|--------|
| 18 | `displays error message when login fails with invalid credentials` | 无效凭据登录失败显示错误 | P0 |

---

### 3. Auth Tests - Register (注册测试)

**文件**: `tests/e2e/auth/register.spec.ts`

#### 3.1 Step 1 Form (步骤1表单)

| # | 测试名称 | 描述 | 优先级 |
|---|---------|------|--------|
| 19 | `displays all required fields and next button` | 显示所有必填字段和下一步按钮 | P0 |
| 20 | `shows invalid state when submitting empty step 1` | 提交空步骤1时显示无效状态 | P0 |
| 21 | `proceeds to step 2 when step 1 is valid` | 步骤1有效时进入步骤2 | P0 |
| 22 | `shows invalid state for malformed email` | 邮箱格式错误时显示无效状态 | P0 |

#### 3.2 Step 2 Form (步骤2表单)

| # | 测试名称 | 描述 | 优先级 |
|---|---------|------|--------|
| 23 | `shows password mismatch error when passwords differ` | 密码不匹配时显示错误 | P0 |
| 24 | `requires terms checkbox to be checked` | 必须勾选条款复选框 | P0 |
| 25 | `shows error for weak password` | 密码强度不足时显示错误 | P0 |

#### 3.3 Navigation (导航)

| # | 测试名称 | 描述 | 优先级 |
|---|---------|------|--------|
| 26 | `displays link to login page` | 显示登录页面链接 | P1 |
| 27 | `navigates to login page when clicking login link` | 点击登录链接跳转 | P1 |
| 28 | `displays Xero signup option` | 显示 Xero 注册选项 | P1 |

#### 3.4 Auth Guard (认证守卫)

| # | 测试名称 | 描述 | 优先级 |
|---|---------|------|--------|
| 29 | `redirects authenticated user to dashboard` | 已认证用户访问注册页重定向 | P1 |

---

### 4. Portal Tests - Public (公共页面)

**文件**: `tests/e2e/portal/public.spec.ts`

#### 4.1 Landing Page (首页)

| # | 测试名称 | 描述 | 优先级 |
|---|---------|------|--------|
| 30 | `loads hero content` | 加载 Hero 内容 | P0 |
| 31 | `has no console errors` | 无控制台错误 | P1 |
| 32 | `navigates to register when clicking Get Started` | 点击开始按钮跳转注册 | P1 |
| 33 | `navigates to login when clicking Login` | 点击登录按钮跳转登录 | P1 |
| 34 | `displays features section` | 显示功能区域 | P1 |
| 35 | `displays hero on mobile viewport` | 移动端显示 Hero | P1 |

#### 4.2 Login Page (登录页)

| # | 测试名称 | 描述 | 优先级 |
|---|---------|------|--------|
| 36 | `displays email and password inputs and login button` | 显示登录表单元素 | P0 |
| 37 | `navigates to forgot password page` | 跳转到忘记密码页 | P1 |
| 38 | `shows invalid state for malformed email` | 邮箱格式错误时显示无效 | P0 |
| 39 | `initiates Xero OAuth flow when clicking SSO button` | 启动 Xero OAuth | P1 |

#### 4.3 Portal Page (Portal页)

| # | 测试名称 | 描述 | 优先级 |
|---|---------|------|--------|
| 40 | `loads successfully` | 加载成功 | P0 |
| 41 | `shows upload interface with drag-drop or button` | 显示上传界面 | P0 |
| 42 | `shows expired message for invalid token` | 无效 Token 显示过期消息 | P0 |
| 43 | `displays welcome message on mobile` | 移动端显示欢迎消息 | P1 |

#### 4.4 Forgot Password Page (忘记密码页)

| # | 测试名称 | 描述 | 优先级 |
|---|---------|------|--------|
| 44 | `loads with email input` | 加载邮箱输入框 | P1 |
| 45 | `shows invalid state when submitting empty email` | 提交空邮箱显示无效状态 | P0 |

#### 4.5 Auth Guards (认证守卫)

| # | 测试名称 | 描述 | 优先级 |
|---|---------|------|--------|
| 46 | `redirects /dashboard to login when unauthenticated` | 未认证访问 Dashboard 重定向 | P0 |
| 47 | `redirects /dashboard/clients to login when unauthenticated` | 未认证访问 Clients 重定向 | P0 |
| 48 | `redirects /dashboard/settings to login when unauthenticated` | 未认证访问 Settings 重定向 | P0 |
| 49 | `redirects /dashboard/uploads to login when unauthenticated` | 未认证访问 Uploads 重定向 | P0 |
| 50 | `allows public pages without authentication` | 公共页面无需认证 | P0 |

#### 4.6 Error Pages (错误页面)

| # | 测试名称 | 描述 | 优先级 |
|---|---------|------|--------|
| 51 | `displays 404 for unknown routes` | 未知路由显示 404 | P1 |

---

### 5. Portal Tests - Upload Flow (上传流程)

**文件**: `tests/e2e/portal/portal.spec.ts`

#### 5.1 Portal Page Load (页面加载)

| # | 测试名称 | 描述 | 优先级 |
|---|---------|------|--------|
| 52 | `should load portal page with upload interface` | 加载 Portal 上传界面 | P0 |
| 53 | `should display deadline information or upload area` | 显示截止日期或上传区域 | P0 |
| 54 | `should be accessible on mobile` | 移动端可访问 | P1 |

#### 5.2 Token Validation (Token 验证)

| # | 测试名称 | 描述 | 优先级 |
|---|---------|------|--------|
| 55 | `should show expired message for invalid token` | 无效 Token 显示过期 | P0 |
| 56 | `should show expired page for missing client` | 缺失客户显示过期页 | P0 |

#### 5.3 File Upload (文件上传)

| # | 测试名称 | 描述 | 优先级 |
|---|---------|------|--------|
| 57 | `should accept file selection (file input exists)` | 文件输入框存在 | P0 |
| 58 | `should show allowed file types` | 显示允许的文件类型 | P1 |
| 59 | `should show max file size information` | 显示最大文件大小 | P1 |

#### 5.4 Magic Link (魔法链接)

| # | 测试名称 | 描述 | 优先级 |
|---|---------|------|--------|
| 60 | `should load magic link page structure` | 加载魔法链接页面 | P0 |
| 61 | `should handle invalid magic link code` | 处理无效魔法链接代码 | P0 |

---

### 6. Dashboard Tests (仪表板测试)

**文件**: `tests/e2e/dashboard/dashboard.spec.ts`

#### 6.1 Dashboard Home - Core Behavior (核心行为)

| # | 测试名称 | 描述 | 优先级 | 需要认证 |
|---|---------|------|--------|----------|
| 62 | `should display stats cards on dashboard home` | 显示统计卡片 | P0 | ✅ |
| 63 | `should display sidebar navigation` | 显示侧边栏导航 | P0 | ✅ |
| 64 | `should display header` | 显示页头 | P0 | ✅ |
| 65 | `should be responsive on mobile viewport` | 移动端响应式 | P1 | ✅ |

#### 6.2 Navigation - Click and Navigate (导航)

| # | 测试名称 | 描述 | 优先级 | 需要认证 |
|---|---------|------|--------|----------|
| 66 | `should navigate to clients page` | 导航到客户页面 | P0 | ✅ |
| 67 | `should navigate to uploads page` | 导航到上传页面 | P0 | ✅ |
| 68 | `should navigate to settings page` | 导航到设置页面 | P0 | ✅ |
| 69 | `should navigate to activity page` | 导航到活动页面 | P1 | ✅ |
| 70 | `should navigate to help center` | 导航到帮助中心 | P1 | ✅ |

#### 6.3 User Actions - Logout (用户操作)

| # | 测试名称 | 描述 | 优先级 | 需要认证 |
|---|---------|------|--------|----------|
| 71 | `should logout and redirect to login` | 登出并重定向到登录 | P0 | ✅ |

#### 6.4 Auth Guards (认证守卫)

| # | 测试名称 | 描述 | 优先级 |
|---|---------|------|--------|
| 72 | `should redirect /dashboard to login` | Dashboard 重定向到登录 | P0 |
| 73 | `should redirect /dashboard/clients to login` | Clients 重定向到登录 | P0 |
| 74 | `should redirect /dashboard/uploads to login` | Uploads 重定向到登录 | P0 |
| 75 | `should redirect /dashboard/settings to login` | Settings 重定向到登录 | P0 |
| 76 | `should redirect /dashboard/clients/activity to login` | Activity 重定向到登录 | P0 |
| 77 | `should redirect /dashboard/reminders to login` | Reminders 重定向到登录 | P0 |
| 78 | `should redirect /dashboard/help to login` | Help 重定向到登录 | P0 |
| 79 | `should allow public pages without auth` | 公共页面允许无认证访问 | P0 |

---

**文件**: `tests/e2e/dashboard/layout.spec.ts`

| # | 测试名称 | 描述 | 优先级 | 需要认证 |
|---|---------|------|--------|----------|
| 80 | `should redirect unauthenticated user to login` | 未认证用户重定向到登录 | P0 |
| 81 | `should redirect unauthenticated user from dashboard/clients` | 未认证访问 Clients 重定向 | P0 |
| 82 | `should redirect unauthenticated user from dashboard/settings` | 未认证访问 Settings 重定向 | P0 |
| 83 | `should render dashboard sidebar for authenticated user` | 已认证用户显示侧边栏 | P1 | ✅ |
| 84 | `should show stats cards on dashboard` | Dashboard 显示统计卡片 | P1 | ✅ |

---

### 7. API Tests (API 测试)

**文件**: `tests/e2e/api/api.spec.ts`

#### 7.1 Public APIs (公共 API)

| # | 测试名称 | 端点 | 描述 | 优先级 |
|---|---------|------|------|--------|
| 85 | `GET /api/debug/status returns 200 with status info` | `/api/debug/status` | 返回 200 和状态信息 | P0 |
| 86 | `GET /api/xero/auth-url returns auth URL` | `/api/xero/auth-url` | 返回认证 URL | P1 |

#### 7.2 Protected APIs (受保护 API)

| # | 测试名称 | 端点 | 描述 | 优先级 | 需要认证 |
|---|---------|------|------|--------|----------|
| 87 | `GET /api/profile returns profile for authenticated user` | `/api/profile` | 返回用户资料 | P0 | ✅ |
| 88 | `GET /api/clients returns clients list for authenticated user` | `/api/clients` | 返回客户列表 | P0 | ✅ |
| 89 | `GET /api/dashboard/stats returns stats for authenticated user` | `/api/dashboard/stats` | 返回统计数据 | P0 | ✅ |

#### 7.3 Portal APIs (Portal API)

| # | 测试名称 | 端点 | 描述 | 优先级 |
|---|---------|------|------|--------|
| 90 | `POST /api/portal/verify-token returns error for invalid token` | `/api/portal/verify-token` | 无效 Token 返回错误 | P0 |

#### 7.4 Upload APIs (上传 API)

| # | 测试名称 | 端点 | 描述 | 优先级 |
|---|---------|------|------|--------|
| 91 | `POST /api/upload/signed-url rejects unauthenticated request` | `/api/upload/signed-url` | 拒绝未认证请求 | P0 |
| 92 | `POST /api/upload/confirm rejects unauthenticated request` | `/api/upload/confirm` | 拒绝未认证请求 | P0 |

#### 7.5 Xero APIs (Xero API)

| # | 测试名称 | 端点 | 描述 | 优先级 |
|---|---------|------|------|--------|
| 93 | `GET /api/xero/settings rejects unauthenticated request` | `/api/xero/settings` | 拒绝未认证请求 | P0 |
| 94 | `POST /api/xero/disconnect rejects unauthenticated request` | `/api/xero/disconnect` | 拒绝未认证请求 | P0 |

#### 7.6 Error Handling (错误处理)

| # | 测试名称 | 描述 | 优先级 |
|---|---------|------|--------|
| 95 | `returns 405 for wrong HTTP method on /api/clients` | PATCH /api/clients 返回 405 | P0 |
| 96 | `returns 400 for invalid JSON payload` | 无效 JSON 返回 400 | P0 |
| 97 | `returns 404 for non-existent route` | 404 路由返回 404 | P1 |

---

### 8. Visual Tests (视觉回归测试)

**文件**: `tests/e2e/visual/visual.spec.ts`

#### 8.1 Landing Page (首页)

| # | 测试名称 | Viewport | 描述 | 优先级 |
|---|---------|----------|------|--------|
| 98 | `hero section matches baseline` | 1440x900 | Hero 区域基线对比 | P1 |
| 99 | `pricing section matches baseline` | 1440x900 | 定价区域基线对比 | P1 |
| 100 | `mobile landing page matches baseline` | 375x667 | 移动端首页基线对比 | P1 |

#### 8.2 Auth Pages (认证页面)

| # | 测试名称 | Viewport | 描述 | 优先级 |
|---|---------|----------|------|--------|
| 101 | `login page matches baseline` | 1440x900 | 登录页基线对比 | P1 |
| 102 | `register page step 1 matches baseline` | 1440x900 | 注册步骤1基线对比 | P1 |

#### 8.3 Dashboard (仪表板)

| # | 测试名称 | Viewport | 描述 | 优先级 | 需要认证 |
|---|---------|----------|------|--------|----------|
| 103 | `dashboard main view matches baseline` | 1440x900 | Dashboard 主视图基线 | P1 | ✅ |
| 104 | `clients page matches baseline` | 1440x900 | Clients 页面基线 | P1 | ✅ |

---

## 测试执行矩阵

### 测试优先级矩阵

| 优先级 | 说明 | 必须通过 | 超时容忍 |
|--------|------|----------|----------|
| **P0** | 核心功能，关键路径 | ✅ CI 必须通过 | 0 |
| **P1** | 重要功能，非关键 | ⚠️ 失败需审查 | 1 次重试 |

### 浏览器支持矩阵

| 浏览器 | 版本 | Smoke | Auth | Portal | Dashboard | API |
|--------|------|-------|------|--------|-----------|-----|
| Chromium | Latest | ✅ | ✅ | ✅ | ✅ | ✅ |
| Firefox | Latest | ✅ | ✅ | ✅ | ✅ | ✅ |
| Webkit | Latest | ✅ | ✅ | ✅ | ✅ | ✅ |
| Mobile Chrome | Latest | ✅ | ✅ | ✅ | ⚠️ | ✅ |

### 测试环境矩阵

| 环境 | Base URL | 认证 | Xero | 用途 |
|------|----------|------|------|------|
| Local | http://localhost:3000 | 可选 | 可选 | 开发调试 |
| CI | http://localhost:3000 | 必须 | 模拟 | PR 验证 |
| Staging | https://staging.filio.co.uk | 必须 | 必须 | 预发布 |
| Production | https://filio.co.uk | 必须 | 必须 | 最终验证 |

---

## CI/CD 触发条件

### GitHub Actions 工作流

| 触发 | 阶段 | 测试套件 | 并行 |
|------|------|---------|------|
| **push (main/develop)** | 1-4 | smoke + auth + portal + dashboard + api | 是 |
| **pull_request (main)** | 1-6 | 所有测试 + 跨浏览器 | 是 |
| **workflow_dispatch** | 可选 | 按选择运行 | - |

### 完整 CI 流程

```
1. typecheck-and-lint
   └── pnpm tsc --noEmit && pnpm lint

2. build
   └── pnpm build

3. e2e-smoke (并行)
   └── pnpm test:e2e:smoke

4. e2e-auth (并行)
   └── pnpm test:e2e:auth

5. e2e-portal (并行)
   └── pnpm test:e2e:portal

6. e2e-dashboard (并行)
   └── pnpm test:e2e:dashboard

7. e2e-api (并行)
   └── pnpm test:e2e:api

8. e2e-cross-browser (可选 PR)
   └── chromium + firefox + webkit + mobile
```

---

## 环境配置

### 本地环境变量

```bash
# .env.local

# E2E 测试凭据 (认证测试必须)
E2E_TEST_EMAIL=zhanghaog@icloud.com
E2E_TEST_PASSWORD=Admin123

# Base URL
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

---

## 测试运行命令

```bash
# 运行所有测试
pnpm test:e2e

# 分模块运行
pnpm test:e2e:smoke      # 冒烟测试
pnpm test:e2e:auth        # 认证测试
pnpm test:e2e:portal      # Portal 测试
pnpm test:e2e:dashboard   # Dashboard 测试
pnpm test:e2e:api         # API 测试
pnpm test:e2e:visual      # 视觉测试

# 单文件运行
pnpm playwright test tests/e2e/auth/login.spec.ts

# 单测试运行
pnpm playwright test tests/e2e/auth/login.spec.ts --grep "should display"

# UI 模式运行
pnpm test:e2e:ui

# 指定浏览器
pnpm playwright test --project=chromium
```

---

## 附录

### 测试标签

| 标签 | 描述 |
|------|------|
| `@p0` | P0 优先级测试 |
| `@auth-required` | 需要认证的测试 |
| `@skip-in-ci` | CI 中跳过的测试 |
| `@slow` | 运行时间较长的测试 |

### 相关文件

| 文件 | 描述 |
|------|------|
| `playwright.config.ts` | Playwright 配置 |
| `.github/workflows/e2e.yml` | CI/CD 配置 |
| `package.json` | 测试脚本 |
| `tests/config.ts` | 测试配置 |
| `tests/helpers.ts` | 测试辅助函数 |
| `tests/pages/*.ts` | Page Object Models |
| `tests/fixtures/*.ts` | 测试 Fixtures |
