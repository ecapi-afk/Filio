# Filio v2 — 完整实施计划（基于 v3.1 规格 + 代码 Gap 分析）

> **Goal:** 对齐 Filio_Product_Spec_v3.1.md 规格，完成所有未实现功能，修复严重 Bug，补全 E2E 测试覆盖
>
> **Architecture:** Next.js 15 App Router + Supabase + Stripe + Xero OAuth + Postmark/Resend
>
> **Tech Stack:** TypeScript, Tailwind v4, shadcn/ui, Playwright E2E
>
> **规格依据：** `docs/Filio_Product_Spec_v3.1.md`（含 D-01~D-20 决策项）

---

## 严重程度分级

| 级别 | 含义 |
|------|------|
| 🔴 P0 | 安全漏洞 / 核心功能损坏，上线前必须修复 |
| 🟠 P1 | 功能缺失但有后端基础，需补全前端或激活逻辑 |
| 🟡 P2 | 数据用 Mock，需接真实数据库 |
| 🔵 P3 | 规格定义的功能页面未实现（stub） |
| ⚪ P4 | 规格标注 [V3]/[V4] 的未来功能，当前不开发 |

---

## 🔴 P0 — 安全 Bug（立即修复）

### P0-1：OTP 系统待实现（上线前必须完成）

**文件：** `app/m/[code]/otp-client.tsx`

| 问题 | 位置 | 说明 |
|------|------|------|
| `handleSendOTP` 只 sleep，不调用任何 API | 第 35 行 | DEV 占位，上线前需接真实邮件发送 |
| 验证码硬编码 `'9527'` | 第 52 行 | **开发期测试用**，上线前替换为真实 OTP 校验 |

**修复任务：**
- [ ] 创建 `/api/portal/send-otp` — 生成 6 位 OTP，存 Supabase `portal_otps` 表（hash 存储，5 分钟过期，一次性）
- [ ] 创建 `/api/portal/verify-otp` — 校验 OTP，成功后颁发短效 session token
- [ ] 更新 `otp-client.tsx` 调用真实 API，移除硬编码 `'9527'`
- [ ] DB migration：创建 `portal_otps(id, portal_token_id, code_hash, expires_at, used_at)`

### ~~P0-2：批量 ZIP 下载~~ → 已暂缓，移至 Deferred

见下方「Deferred 功能」章节。

---

## 🟠 P1 — 已有后端基础，需激活或补全前端

### P1-1：邮件发送 ✅ 已完整实现（无需修改）

实际检查代码后确认全部已接入 Postmark：

| 文件 | 状态 |
|------|------|
| `lib/email/postmark.ts` | ✅ 完整实现 |
| `app/api/cron/send-reminders/route.ts` | ✅ 已调用 `sendReminderEmail()` |
| `app/api/clients/[id]/send-reminder/route.ts` | ✅ 已调用 `sendReminderEmail()` |
| `app/api/clients/[id]/send-link/route.ts` | ✅ 已调用 `sendMagicLinkEmail()` |
| `app/api/webhooks/inbound-email/route.ts` | ✅ Postmark Inbound 完整实现 |

### P1-2：通知中心（Bell）✅ 完成

- [x] 创建 `supabase/migrations/20260604_add_notifications.sql`（`notifications` 表 + RLS）
- [x] 创建 `app/api/notifications/route.ts`（GET 列表，最近 20 条）
- [x] 创建 `app/api/notifications/[id]/read/route.ts`（POST 标记单条已读）
- [x] 创建 `app/api/notifications/read-all/route.ts`（POST 全部已读）
- [x] 创建 `app/api/notifications/count/route.ts`（GET 未读数，60s 轮询）
- [x] 重写 `components/dashboard/header.tsx`：真实数据 + 已读/未读状态 + Mark all read 按钮

### P1-3：Billing 设置页 ✅ 完成

**规格：** v3.1 A9

- [x] 创建 `app/api/stripe/portal/route.ts`（Stripe Customer Portal session）
- [x] 创建 `app/api/stripe/invoices/route.ts`（Stripe 发票历史，最近 6 张）
- [x] 更新 `settings/page.tsx` 取 `current_period_end` + `stripe_customer_id`
- [x] 重写 `BillingSettings` 组件（在 `settings-client.tsx`）：
  - 使用量卡片（真实数据，进度条颜色随使用率变化）
  - Next Billing 日期（来自 DB `current_period_end`）
  - Upgrade/Downgrade 按钮接 `/api/stripe/checkout`
  - Manage Billing 按钮接 `/api/stripe/portal`
  - 发票历史区块（异步加载 `/api/stripe/invoices`）
  - 底部 GDPR「Request data deletion」入口（v3.1 D-12）

---

## 🟡 P2 — Mock 数据替换为真实 DB

### P2-1：Reminders 页面 → 真实 `reminder_jobs` 数据

**文件：** `app/dashboard/reminders/page.tsx`

- [ ] 创建 `app/api/reminders/route.ts`（读 `reminder_jobs` 表，支持分页与状态过滤）
- [ ] 替换 `mockReminders` 数组为 API 调用
- [ ] 实现状态过滤（Delivered / Pending / Failed）
- [ ] **注意：** Reminders Center 独立页面是 V4 规格，当前只展示数据列表即可

### P2-2：Activity 页面 → 真实活动数据

**文件：** `app/dashboard/clients/activity/page.tsx`

**规格 v3.1 A11：** 定位为分析视图，操作跳转 A5，不在 A11 内直接操作

- [ ] 扩展 `app/api/clients/activity-stats/route.ts`（添加 `last_upload_at`、`upload_total` 等字段）
- [ ] 创建 `supabase/migrations/0031_activity_logs.sql`（`activity_logs` 表，若尚未存在）
- [ ] 替换 mock 数据为 API 数据
- [ ] 实现右侧建议区（「5 clients haven't uploaded in 90+ days」）
- [ ] Starter 套餐升级引导页

---

## 🔵 P3 — 规格功能页面实现

### P3-1：A5 客户列表 UX 重构（v3.1 D-01, D-02, D-15）

**规格变更（代码当前可能未完全实现）：**

| 规格要求 | 说明 |
|---------|------|
| 7 列表格（非原 10 列） | 合并「管理状态+健康状态」→「状态」列；Portal 状态降级为附属行 |
| 主 Tab（管理状态）+ 筛选芯片（健康状态） | 替换原双行 Tab 结构 |
| 高级筛选面板（可折叠） | 按截止类型、VAT 季度、时间范围、门户状态等 8 个维度 |
| 批量 Dormant 对所有套餐开放 | 原为 Professional+ 专属（v3.1 D-15） |
| 空状态规格 | 无客户、筛选无结果、Dormant Tab 空 |
| Deleted Tab | 软删除客户倒计时显示（v3.1 D-12） |

- [ ] 审查 `app/dashboard/clients/clients-client.tsx` 对照 v3.1 规格逐项检查
- [ ] 实现主 Tab + 筛选芯片两层结构
- [ ] 修复表格列结构至 7 列
- [ ] 实现 Deleted Tab（软删除客户 + 倒计时 + Export/Restore 按钮）
- [ ] 添加各空状态 UI

### P3-2：A5b 客户详情 UX 修订（v3.1 D-04, D-05）

**规格变更：**

| 规格要求 | 说明 |
|---------|------|
| 顶部 2 主按钮 + 更多菜单（⋯） | 原 6 个按钮（v3.1 D-04）；「Copy Link」「View in Xero」移入 ⋯ 菜单 |
| 警告横幅优先级规则 | 最多显示 1 条，次级折叠（v3.1 D-05）；4 级优先级 |
| 块 3 合规提示 | 右侧 ℹ 图标「Files are stored in Xero, not Filio」 |
| 空状态：块 3 无上传 | 「No uploads yet. Send [ClientName] their upload link.」 |
| 「Feature coming soon」按钮需实现 | 发送请求、发送提醒、文件重分类 |

- [ ] 精简顶部操作区
- [ ] 实现警告横幅优先级折叠逻辑
- [ ] 修复 `client-detail-client.tsx` / `client-detail-v3.tsx` 中的 "Feature coming soon" 按钮
- [ ] 添加块 3 合规提示
- [ ] 实现文件重新分类（连接 `/api/uploads/[id]/reclassify`）

### P3-3：A7a Profile 设置（stub → 实现）

**规格 v3.1 A7a：**

- [ ] 头像上传（JPG/PNG ≤2MB，存 Supabase Storage）
- [ ] 个人信息展示（姓名、邮箱只读、职位）
- [ ] 密码修改表单
- [ ] 语言偏好（English / 简体中文）

### P3-4：A7b Notifications 设置（stub → 实现）

**规格 v3.1 A7b：** 8 个通知开关，保存到 `firms` 或 `user_preferences` 表

- [ ] 创建通知偏好 API（GET/PATCH）
- [ ] 实现 8 个开关 UI：每日摘要、同步失败、客户逾期、配额 80%、自动 Dormant、沉睡提醒、上传尝试、周报[V3]
- [ ] 开关状态持久化到 DB

### P3-5：A8 Branding 设置（stub → 实现，Professional+）

**规格 v3.1 A8：**

- [ ] Logo 上传（PNG/SVG/JPG ≤2MB，存 `firms.logo_url`）
- [ ] 品牌色选择器 + Hex 输入
- [ ] 门户欢迎语（最多 200 字）
- [ ] 实时预览面板（右侧 300px，模拟客户门户外观）
- [ ] Starter 套餐降级提示

### P3-6：A6 Upload History 功能补全

**规格 v3.1 A6 + TODO 注释：**

- [ ] 实现上传重试逻辑（连接 `/api/uploads/process-pending`）
- [ ] 实现 CSV 导出（上传记录，含完整元数据，用于 HMRC MTD 合规存档）
- [ ] 实现 PDF 导出（审计日志）
- [ ] 验证「重命名/重新分类」内联编辑功能

### P3-7：A7 Xero 设置 — Token 状态展示（v3.1 §14）

- [ ] 在已连接状态卡片中显示 Refresh Token 剩余天数
- [ ] < 7 天时显示琥珀色警告「Reconnect soon to avoid interruption」

### P3-8：B2 客户上传页 — 移除自动命名预览（v3.1 D-03）

**规格：** 客户端不展示 `JohnSmith_Receipt_20260318.jpg` 预览，只显示原始文件名

- [ ] 检查 `app/portal/` 上传 UI，移除客户侧自动命名预览

### P3-9：移动端响应式布局（v3.1 §响应式断点）

**规格新增：**

| 页面 | 移动端规格 |
|------|---------|
| A4 Dashboard | 侧边栏 → 汉堡菜单；三卡片 → 单列；健康状态 → 横向滚动 chips |
| A5 Clients | 表格 → 卡片列表；筛选面板 → 底部 Sheet |
| A5b Client Detail | 单列布局；Send Magic Link 固定底部 |

- [ ] 实现 A4、A5、A5b 移动端适配

### P3-10：全局 UI 交互状态规范（v3.1 §16）

**规格 D-20：** 统一 hover/focus/disabled/loading/active 状态

- [ ] 审查全局按钮、输入框、Tab 组件是否符合规格：
  - focus: `ring-2 ring-[#1D9E75] ring-offset-1`
  - disabled: `opacity-40 cursor-not-allowed`
  - loading: `Loader2 animate-spin` + 按钮禁用
  - tab active: `border-b-2 border-[#1D9E75]`

---

## 🔵 P3 — 客户管理状态功能完整性检查

### P3-11：management_status 完整流转

**规格 v3.1 §3：** 检查以下流程是否完整实现

- [ ] active → dormant（手动：Set to Dormant 按钮 + confirm popover）
- [ ] dormant → active（Reactivate 按钮，超配额拦截弹窗）
- [ ] 激活时 Overdue 警告横幅（不自动消失，Dismiss 写审计日志）
- [ ] dormant_reminded_at 在 dormant→active→dormant 时自动 RESET 为 NULL
- [ ] any → deleted（软删除，Portal 立即失效，30 天倒计时）
- [ ] deleted → dormant（Restore 按钮）

### P3-12：Xero 连接状态异常处理

- [ ] `xero_not_found = true` 时 A5 列表显示 🟠 图标
- [ ] A5b 警告横幅：「This Xero contact can no longer be found. Uploads will fail.」
- [ ] A5b 警告横幅优先级：xero_not_found > xero_deleted > dormant_overdue > filio_only

---

## 🚫 Deferred — 暂缓开发

### 批量 ZIP 下载

**原因：** ZIP 打包过程需要在服务端临时暂存用户文件，涉及数据处置和合规问题，待方案确定后再开发。

**现状：**
- `app/api/uploads/download-batch/route.ts` — 已禁用，返回 501，原代码注释保留
- `app/api/cron/process-download-jobs/route.ts` — 已禁用，cron 调用直接返回，原代码注释保留

**恢复条件（满足其一）：**
- 设计出服务端流式 ZIP 方案（无需临时存储，边读边打包边推流）
- 或制定明确的临时文件安全存储 + 自动清除策略

---

## ⚪ P4 — 规格标注 [V3]/[V4]，当前不实现

| 功能 | 规格标注 | 说明 |
|------|---------|------|
| Team Settings / 多会计师 | [V3] | 页面保留 stub 即可 |
| 自定义门户域名 | [V3] | Firm 套餐专属 |
| API Access | [V3] | 开放 API |
| 周报邮件 | [V3] | 每周一发送 |
| 全局 Reminders Center 独立页 | [V4] | 当前只展示列表 |
| Xero 联系人 Group 标签同步 | [V4·Firm] | — |

---

## 测试规划

### 现有 E2E 测试（12 个文件，已有 Page Object Model）

| 文件 | 状态 | 问题 |
|------|------|------|
| `smoke/critical-flows.spec.ts` | ✅ 有效 | — |
| `auth/login.spec.ts` | ✅ 有效 | — |
| `auth/register.spec.ts` | ✅ 有效 | — |
| `dashboard/dashboard.spec.ts` | ⚠️ 需凭据 | `E2E_TEST_EMAIL` 未配置则大量 skip |
| `dashboard/layout.spec.ts` | ⚠️ 需凭据 | 同上 |
| `clients/clients.spec.ts` | ⚠️ 部分实现 | TDD RED phase，部分测试依赖未实现功能 |
| `portal/portal.spec.ts` | ❌ 依赖硬编码 | OTP 验证码写死 `'9527'`，OTP 修复后需同步更新 |
| `portal/public.spec.ts` | ✅ 有效 | — |
| `uploads/uploads.spec.ts` | ⚠️ 需凭据 | — |
| `reminders/reminders.spec.ts` | ⚠️ mock 数据 | 测试的是 mock 而非真实数据 |
| `settings/settings.spec.ts` | ⚠️ stub 页 | 当前 settings 多为 stub |
| `visual/visual.spec.ts` | ✅ 有基准截图 | UI 变更后需更新快照 |

### 需要新增的测试

| 测试文件 | 覆盖内容 | 优先级 |
|---------|---------|--------|
| `portal/otp.spec.ts` | 真实 OTP 发送 → 验证完整流程（修复 P0-1 后） | 🔴 P0 |
| `settings/billing.spec.ts` | Stripe 订阅状态、套餐对比、checkout 跳转 | 🟠 P1 |
| `notifications/notifications.spec.ts` | Bell 图标、未读计数、标记已读 | 🟠 P1 |
| `clients/management-status.spec.ts` | Dormant/Reactivate/Archive/Delete 完整流程 | 🔵 P3 |
| `clients/bulk-actions.spec.ts` | 批量操作（Dormant、提醒、ZIP 下载） | 🔵 P3 |
| `uploads/retry.spec.ts` | 上传重试逻辑 | 🟡 P2 |
| `uploads/export.spec.ts` | CSV/PDF 导出 | 🔵 P3 |
| `settings/profile.spec.ts` | 头像上传、密码修改 | 🔵 P3 |
| `settings/notifications.spec.ts` | 通知开关保存 | 🔵 P3 |
| `settings/branding.spec.ts` | Logo 上传、品牌色、预览 | 🔵 P3 |
| `reminders/real-data.spec.ts` | 真实 reminder_jobs 数据（修复 P2-1 后） | 🟡 P2 |
| `activity/activity.spec.ts` | 真实活动数据、建议区 | 🟡 P2 |
| `api/otp.spec.ts` | OTP API 端点（发送/验证/过期） | 🔴 P0 |
| `api/notifications.spec.ts` | 通知 API CRUD | 🟠 P1 |

### 测试基础设施修复

| 问题 | 修复方案 |
|------|---------|
| `E2E_TEST_EMAIL` 未设置导致大量 skip | 在 `.env.local.example` 明确说明；CI secrets 配置文档 |
| `portal.spec.ts` 硬编码 `'9527'` | OTP 修复后，使用测试模式 API 返回固定 OTP |
| 视觉测试快照过期 | 主要 UI 变更后运行 `pnpm playwright test --update-snapshots` |
| GitHub Actions 缺少 `.github/workflows/e2e.yml` | 按 `docs/TESTING_PLAN.md` 创建 CI 配置 |

---

## 实施顺序建议

```
Week 1:  P0 (OTP + ZIP) → 修复安全漏洞
Week 2:  P1 (邮件激活 + 通知中心 + Billing UI) → 接通后端基础
Week 3:  P2 (Reminders + Activity 真实数据) → 去掉 Mock
Week 4:  P3-1 to P3-6 (Settings 页面 + 客户列表重构)
Week 5:  P3-7 to P3-12 (UX 细节 + 状态管理完整性)
Week 6:  测试补全 + CI 配置 + 视觉回归更新
```

---

## 进度跟踪

| 阶段 | 状态 | 负责 | 完成日期 |
|------|------|------|---------|
| P0: OTP + ZIP | 🔲 pending | — | — |
| P1: 邮件/通知/Billing | 🔲 pending | — | — |
| P2: Mock 数据替换 | 🔲 pending | — | — |
| P3: Settings 实现 | 🔲 pending | — | — |
| P3: A5/A5b UX 重构 | 🔲 pending | — | — |
| P3: 移动端适配 | 🔲 pending | — | — |
| 测试补全 | 🔲 pending | — | — |
| CI/CD 配置 | 🔲 pending | — | — |
