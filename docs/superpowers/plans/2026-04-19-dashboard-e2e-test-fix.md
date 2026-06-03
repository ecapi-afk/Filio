# Dashboard E2E Tests TDD 修复计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 Dashboard E2E 测试，使所有 P0 测试通过

**Architecture:** 使用 Playwright Page Object Model 模式，通过 TDD RED-GREEN-REFACTOR 循环修复测试

**Tech Stack:** Playwright, TypeScript, Page Object Model

---

## File Structure

**被修改的文件:**
- `tests/e2e/dashboard/dashboard.spec.ts` - Dashboard 测试文件
- `tests/e2e/dashboard/layout.spec.ts` - Layout 测试文件
- `tests/pages/DashboardPage.ts` - Page Object Model (选择器定义)

---

## Task 1: 诊断 Sidebar Navigation 问题

**Files:**
- Modify: `tests/pages/DashboardPage.ts:33-34`
- Test: `tests/e2e/dashboard/dashboard.spec.ts`

**Problem:** `data-testid="sidebar"` 和 `nav[class*="sidebar"]` 选择器在当前 DOM 中不存在

- [ ] **Step 1: 检查实际 Dashboard 页面 HTML 结构**

Run: 在浏览器 DevTools 中检查 `/dashboard` 页面的实际 sidebar 结构
Expected: 找到实际的 sidebar 元素及其属性

- [ ] **Step 2: 更新 DashboardPage.ts 的 sidebar 选择器**

```typescript
// 修改前
this.sidebar = page.locator('[data-testid="sidebar"], nav[class*="sidebar"]')

// 修改后 (根据实际 DOM 结构)
this.sidebar = page.locator('aside, nav[class*="side"], [class*="sidebar"]').first()
```

- [ ] **Step 3: 验证 sidebar 测试**

Run: `E2E_TEST_EMAIL=zhanghaog@icloud.com E2E_TEST_PASSWORD=Admin123 npx playwright test tests/e2e/dashboard/dashboard.spec.ts --grep "sidebar" --reporter=list`
Expected: PASS (chromium, firefox, webkit)

- [ ] **Step 4: Commit**

```bash
git add tests/pages/DashboardPage.ts
git commit -m "fix: update sidebar selector in DashboardPage POM"
```

---

## Task 2: 诊断 Navigation Links 问题

**Files:**
- Modify: `tests/pages/DashboardPage.ts:37-42`
- Test: `tests/e2e/dashboard/dashboard.spec.ts`

**Problem:** `a[href="/dashboard/clients"]` 等选择器找不到元素

- [ ] **Step 1: 检查实际 Dashboard 导航链接结构**

Run: 访问 `/dashboard` 并检查导航链接的实际 href 属性
Expected: 找到实际的 nav 链接及其 href

- [ ] **Step 2: 更新 DashboardPage.ts 的 nav 选择器**

```typescript
// 根据实际 DOM 结构更新，可能需要尝试:
this.clientsNavItem = page.locator('a[href*="/clients"]').first()
this.uploadsNavItem = page.locator('a[href*="/uploads"]').first()
this.settingsNavItem = page.locator('a[href*="/settings"]').first()
```

- [ ] **Step 3: 验证导航测试**

Run: `E2E_TEST_EMAIL=zhanghaog@icloud.com E2E_TEST_PASSWORD=Admin123 npx playwright test tests/e2e/dashboard/dashboard.spec.ts --grep "navigate to" --reporter=list`
Expected: PASS (chromium, firefox, webkit)

- [ ] **Step 4: Commit**

```bash
git add tests/pages/DashboardPage.ts
git commit -m "fix: update navigation selectors in DashboardPage POM"
```

---

## Task 3: 诊断 Logout 问题

**Files:**
- Modify: `tests/pages/DashboardPage.ts:45`
- Test: `tests/e2e/dashboard/dashboard.spec.ts:91`

**Problem:** `button:has-text("Logout")` 或 `button:has-text("Sign out")` 找不到

- [ ] **Step 1: 检查实际 logout button 文本**

Run: 检查 Dashboard 页面的 logout button 实际文本
Expected: 找到实际的 logout 按钮文本或位置

- [ ] **Step 2: 更新 DashboardPage.ts 的 logout 选择器**

```typescript
// 根据实际文本更新
this.logoutButton = page.locator('button:has-text("Sign out"), button:has-text("Log out"), [aria-label*="logout"]').first()
```

- [ ] **Step 3: 验证 logout 测试**

Run: `E2E_TEST_EMAIL=zhanghaog@icloud.com E2E_TEST_PASSWORD=Admin123 npx playwright test tests/e2e/dashboard/dashboard.spec.ts --grep "logout" --reporter=list`
Expected: PASS (chromium, firefox, webkit)

- [ ] **Step 4: Commit**

```bash
git add tests/pages/DashboardPage.ts
git commit -m "fix: update logout button selector in DashboardPage POM"
```

---

## Task 4: 诊断 Stats Cards 问题

**Files:**
- Modify: `tests/pages/DashboardPage.ts:34`
- Test: `tests/e2e/dashboard/dashboard.spec.ts:30`

**Problem:** `data-testid="stat-card"` 和 `class*="stat"` 选择器找不到元素

- [ ] **Step 1: 检查实际 stats card 结构**

Run: 检查 Dashboard 页面的 stats cards 实际 DOM 结构
Expected: 找到 stats 卡片的实际元素和类名

- [ ] **Step 2: 更新 DashboardPage.ts 的 statsCards 选择器**

```typescript
// 根据实际 DOM 更新
this.statsCards = page.locator('[class*="card"], .grid > div, main > div').filter({ has: page.locator('[class*="text"]') })
```

- [ ] **Step 3: 验证 stats 测试**

Run: `E2E_TEST_EMAIL=zhanghaog@icloud.com E2E_TEST_PASSWORD=Admin123 npx playwright test tests/e2e/dashboard/dashboard.spec.ts --grep "stats" --reporter=list`
Expected: PASS (chromium, firefox, webkit)

- [ ] **Step 4: Commit**

```bash
git add tests/pages/DashboardPage.ts
git commit -m "fix: update stats cards selector in DashboardPage POM"
```

---

## Task 5: 运行完整 Dashboard 测试套件

**Files:**
- Test: `tests/e2e/dashboard/dashboard.spec.ts`
- Test: `tests/e2e/dashboard/layout.spec.ts`

- [ ] **Step 1: 运行完整 Dashboard 测试**

Run: `E2E_TEST_EMAIL=zhanghaog@icloud.com E2E_TEST_PASSWORD=Admin123 npx playwright test tests/e2e/dashboard/ --reporter=list`
Expected: 所有 P0 测试 PASS

- [ ] **Step 2: 分析失败测试**

如果仍有失败:
- 记录失败的选择器
- 返回 Task 1-4 循环修复

- [ ] **Step 3: 验证 Auth Guard 测试**

Auth Guard 测试应该在没有认证的情况下全部 PASS

- [ ] **Step 4: 最终 Commit**

```bash
git add tests/
git commit -m "test: complete Dashboard E2E test fixes"
```

---

## 预期结果

| 测试类别 | 通过率目标 |
|---------|----------|
| Auth Guard Tests | 100% (8/8) ✅ |
| Dashboard Authenticated Tests | 100% (8/8) ✅ |
| Layout Tests | 100% (4/4) ✅ |

---

## 关键命令

```bash
# 运行 Dashboard 测试
E2E_TEST_EMAIL=zhanghaog@icloud.com E2E_TEST_PASSWORD=Admin123 \
pnpm playwright test tests/e2e/dashboard/ --reporter=list

# 运行单个测试文件
E2E_TEST_EMAIL=zhanghaog@icloud.com E2E_TEST_PASSWORD=Admin123 \
pnpm playwright test tests/e2e/dashboard/dashboard.spec.ts --grep "sidebar" --project=chromium

# 调试模式
E2E_TEST_EMAIL=zhanghaog@icloud.com E2E_TEST_PASSWORD=Admin123 \
pnpm playwright test tests/e2e/dashboard/dashboard.spec.ts --debug
```
