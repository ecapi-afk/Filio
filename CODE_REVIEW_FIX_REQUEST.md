# Filio Code Review Fix Request

本文档给 Claude Code 使用。目标是根据产品规格 v3.1 修复当前代码中的高优先级问题。

要求：

- 只做与本文档问题相关的修改。
- 不要重构无关模块。
- 每个修复都要保持现有 Next.js App Router、Supabase、TypeScript 风格。
- 修改后至少运行 `next build` 和可行的 TypeScript/ESLint 检查。
- 如果某项暂时无法完整实现，请明确标注原因，不要用 mock 或静默跳过。

## 背景

Filio 是面向英国会计师事务所的客户文件收集与 Xero 同步 SaaS。

产品规格 v3.1 的关键规则：

- `active` 客户：Portal 开启，提醒正常运行。
- `dormant` 客户：Portal 关闭，提醒停止，历史只读。
- `archived` 客户：Portal 关闭，提醒停止，历史只读。
- `deleted` 客户：Portal 立即失效，30 天内可恢复，30 天后清理并匿名化审计日志。
- Magic Link token 初始有效期 30 天，会计师登录后为 active 客户续期；同一会计师 24 小时内只续期一次。
- Dormant/Deleted 客户不得通过旧链接继续上传。
- 自动提醒不能发给 Dormant/Archived/Deleted 客户。
- 客户上传链接应使用实际存在的入口：当前代码中主要是 `/m/[code]` 或 `/portal/upload?token=...`，不要生成不存在的 `/portal/[token]`。

## P1 修复项

### 1. 阻止 Dormant / Archived / Deleted 客户使用旧上传链接

当前问题：

- `app/portal/upload/page.tsx` 只校验 token 是否存在和未过期，没有检查 `clients.management_status`。
- `app/api/upload/xero-direct/route.ts` 校验 token 后，没有检查客户是否 active。
- `app/api/clients/[id]/send-link/route.ts` 发送 Magic Link 前，没有检查客户是否 active。

需要修复：

- 在所有 Portal token 入口/API 上统一校验客户状态。
- 只有 `management_status === "active"` 时允许访问上传页、签发上传动作、直接上传到 Xero。
- `dormant` 客户访问上传页时跳转或显示 Portal Paused 页面。
- `archived` / `deleted` 客户访问上传页时返回 expired/paused，不允许上传。
- 发送 Magic Link 时，如果客户不是 active，应返回 403 或清晰错误。

建议涉及文件：

- `app/portal/upload/page.tsx`
- `app/api/upload/xero-direct/route.ts`
- `app/api/upload/signed-url/route.ts`
- `app/api/upload/confirm/route.ts`
- `app/api/clients/[id]/send-link/route.ts`
- `app/api/portal/verify-token/route.ts`

验收标准：

- Dormant 客户持有效 token 访问上传页不能看到上传控件。
- Dormant 客户调用上传 API 返回 403。
- Deleted 客户旧 token 不能上传。
- Active 客户上传流程不受影响。

### 2. 修复 Magic Link token 生命周期

当前问题：

- `lib/magic/generator.ts` 把 `portal_tokens.expires_at` 设置为 `2099-12-31T23:59:59Z`。
- 没有找到会计师登录后为 active 客户续期 token 的逻辑。

需要修复：

- 新创建 token 有效期改为 30 天。
- 手动 regenerate token 也应生成 30 天有效 token。
- 实现会计师登录后 token 续期逻辑：
  - 会计师 session 建立成功后，为其 firm 下所有 active 客户续期 token。
  - 同一会计师 24 小时内重复登录不重复续期。
  - 可在 profile/firm 上记录 `last_portal_token_renewed_at` 或等价字段，需要 migration。
- 客户 token 过期后，应显示 expired 页面或明确错误。

建议涉及文件：

- `lib/magic/generator.ts`
- `app/api/clients/[id]/regenerate-token/route.ts`
- `middleware.ts` 或登录成功后的合适 server-side hook/API
- Supabase migration
- `lib/supabase/types.ts`

验收标准：

- 新 token 的 `expires_at` 是当前时间 + 30 天左右。
- 登录后 active 客户 token 延长到 30 天。
- 24 小时内重复登录不重复更新。
- Dormant/Deleted 客户不被自动续期。

### 3. 修复提醒邮件里的上传链接

当前问题：

- `app/api/clients/[id]/send-reminder/route.ts` 生成 `${APP_URL}/portal/${client.portal_token}`。
- `app/api/cron/send-reminders/route.ts` 也生成 `${APP_URL}/portal/${client.portal_token}`。
- 项目没有 `/portal/[token]` 路由。

需要修复：

- 统一提醒邮件链接生成逻辑。
- 优先使用 active `short_links.short_code`，生成 `/m/[shortCode]`。
- 如果没有 short code，可生成或恢复一个有效 short code。
- 不要再生成 `/portal/${token}`。

建议涉及文件：

- `app/api/clients/[id]/send-reminder/route.ts`
- `app/api/cron/send-reminders/route.ts`
- 可抽一个小 helper 到 `lib/magic/generator.ts` 或新文件，避免重复。

验收标准：

- 手动提醒邮件中的链接是 `/m/[code]` 或实际存在的上传入口。
- 自动提醒邮件中的链接同样正确。
- 链接能正常进入上传页。

### 4. Dormant 后取消提醒，发送前重新检查客户状态

当前问题：

- `app/api/clients/[id]/set-dormant/route.ts` 设置 dormant 后没有取消 `reminder_jobs`。
- `app/api/cron/send-reminders/route.ts` 发送时没有检查 `management_status`。

需要修复：

- 客户进入 dormant、archived、deleted 时，取消未发送的 reminder jobs。
- `send-reminders` 查询或发送前必须确认客户仍为 active。
- 如果客户不是 active，将 reminder job 标记为 cancelled，`cancel_reason` 写明原因。

建议涉及文件：

- `app/api/clients/[id]/set-dormant/route.ts`
- `app/api/clients/[id]/route.ts`
- `app/api/clients/[id]/activate/route.ts`
- `app/api/cron/send-reminders/route.ts`
- 其他 archive/delete 状态切换入口

验收标准：

- active -> dormant 后，scheduled reminders 变为 cancelled。
- cron 不会给 dormant/archived/deleted 客户发邮件。
- active 客户提醒仍正常发送。

### 5. 恢复 TypeScript 检查

当前问题：

- `next.config.mjs` 设置了 `typescript.ignoreBuildErrors: true`。
- `tsconfig.json` include 了 `.next/types/**/*.ts`，但 `tsc --noEmit` 当前因缺失 `.next/types/...` 文件失败。
- `next build` 成功是因为跳过了类型校验。

需要修复：

- 让 `tsc --noEmit` 可以稳定通过。
- 移除或关闭 `ignoreBuildErrors`。
- 不要依赖 stale `.next/types`。
- 如需保留 Next 生成类型，请确保构建/类型检查流程合理。

建议涉及文件：

- `next.config.mjs`
- `tsconfig.json`
- 相关类型错误源文件

验收标准：

- `./node_modules/.bin/tsc --noEmit` 通过。
- `./node_modules/.bin/next build` 在不跳过类型检查的情况下通过。

## P2 修复项

### 6. 给 Client PATCH 加字段白名单

当前问题：

- `app/api/clients/[id]/route.ts` 的 PATCH 只删除 `id`、`firm_id`、`created_at`，然后直接 update body。
- 这允许修改危险字段，例如 `management_status`、`deleted_at`、`portal_token`、`xero_contact_id`、`xero_not_found`。

需要修复：

- 对 PATCH body 使用字段白名单。
- 只允许普通客户资料字段，例如 `name`、`email`、`portal_email`、`internal_notes`、`is_starred` 等安全字段。
- 状态流转、token、Xero 绑定、删除必须走专用 API。

建议涉及文件：

- `app/api/clients/[id]/route.ts`

验收标准：

- 构造 PATCH 修改 `management_status` 不生效。
- 构造 PATCH 修改 `portal_token` 不生效。
- 普通资料更新仍正常。

### 7. 修复 Cron 使用普通 Supabase client 的问题

当前问题：

- `app/api/cron/schedule-reminders/route.ts` 使用 `createClient()`。
- `app/api/cron/purge-deleted-clients/route.ts` 使用 `createClient()`。
- Cron 没有登录用户，RLS 下可能查不到数据。

需要修复：

- Cron 使用 `createAdminClient()`。
- 保留 `CRON_SECRET` 校验。
- `schedule-reminders` 必须按客户所属 firm 获取默认提醒配置和时区，不能用 `firms?.[0]`。

建议涉及文件：

- `app/api/cron/schedule-reminders/route.ts`
- `app/api/cron/purge-deleted-clients/route.ts`

验收标准：

- Cron 在无用户 cookie 的情况下能处理跨 firm 数据。
- 每个客户使用自己 firm 的默认提醒配置。
- 仍不会泄露数据到响应体。

### 8. `/portal` 入口不能继续使用 mock OTP

当前问题：

- `app/portal/portal-entry-client.tsx` 模拟发送验证码。
- 验证码写死为 `9527`。
- 验证成功后不跳转。

需要修复：

选择一种产品一致方案：

1. 按 v3.1 B1，实现邮箱请求 Magic Link：
   - 前端调用真实 API。
   - 后端用统一文案，避免账号枚举。
   - Dormant/Deleted 客户不发送链接。
2. 或者如果决定用 OTP，则完整接入已有 `/api/portal/send-otp` 和 `/api/portal/verify-otp`，并在成功后跳转真实上传入口。

不要保留硬编码 `9527`。

建议涉及文件：

- `app/portal/portal-entry-client.tsx`
- `app/api/portal/send-otp/route.ts`
- `app/api/portal/verify-otp/route.ts`
- 如采用 Magic Link 请求，需要新增或调整 API。

验收标准：

- `/portal` 不再是模拟流程。
- 不存在硬编码验证码。
- 无匹配邮箱、Dormant、Deleted 都不暴露具体原因。

### 9. 批量 ZIP 下载功能缺失

当前问题：

- `app/api/uploads/download-batch/route.ts` 直接返回 501。

需要修复：

- 如果 UI 有入口，则实现 v3.1 的异步批量下载：
  - 最多 50 个文件。
  - 创建 download job。
  - 后台处理。
  - 完成后通知中心生成通知。
  - Signed URL 有效期 1 小时。
- 如果暂不实现，则前端必须隐藏或禁用入口，并给出清晰说明。

建议涉及文件：

- `app/api/uploads/download-batch/route.ts`
- `app/api/cron/process-download-jobs/route.ts`
- `app/dashboard/uploads/uploads-client.tsx`
- notifications 相关 API/UI

验收标准：

- 用户不会点击到一个突然 501 的功能。
- 若实现，超过 50 个文件返回明确错误。

### 10. GDPR 删除和审计日志保留要统一

当前问题：

- 自动清理和手动永久删除逻辑不完全一致。
- 自动清理可能受 RLS 影响。
- 审计日志匿名化可能丢失上下文。

需要修复：

- 建议集中一个 helper 或 RPC 来处理 deleted 客户清理。
- Day 30 清理范围符合 v3.1：
  - 删除 client 记录、portal tokens、客户设置等。
  - 审计日志匿名化保留 7 年。
- 审计日志不要因删除 client 被级联删除。
- 确认 FK 行为，必要时添加 migration。

建议涉及文件：

- `app/api/cron/purge-deleted-clients/route.ts`
- `app/api/clients/[id]/permanent-delete/route.ts`
- Supabase migrations

验收标准：

- 软删除 30 天后客户实体被清理。
- `audit_logs` 仍保留匿名化记录。
- 手动永久删除和 cron 自动删除行为一致。

## P3 清理项

### 11. 处理 `/api/test-login`

当前问题：

- `app/api/test-login/route.ts` 会通过 admin API 重置固定用户密码。
- 只在 `NODE_ENV === "production"` 时禁用，preview/staging 仍可能可用。
- 固定账号与测试配置、真实测试账号不一致。

需要修复：

- 不要在可联网环境暴露可改密码接口。
- 至少要求额外测试 secret，且只允许本地环境。
- E2E 登录应使用环境变量提供的账号，不要重置真实账号密码。

建议涉及文件：

- `app/api/test-login/route.ts`
- `tests/fixtures/authenticated.ts`
- `tests/config.ts`

### 12. 清理 Xero 生产日志

当前问题：

- `lib/xero/client.ts` 有较多 `console.log`，输出 token refresh、tenant、请求 URL、响应信息。

需要修复：

- 生产环境减少日志。
- 不要打印敏感上下文。
- 保留必要错误日志即可。

建议涉及文件：

- `lib/xero/client.ts`

## 验证建议

完成修改后请运行：

```bash
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/next build
```

如果 ESLint 配置已修好，也运行：

```bash
./node_modules/.bin/eslint .
```

建议补充或更新测试：

- Active 客户 token 可访问上传页。
- Dormant 客户 token 访问上传页被拦截。
- Deleted 客户 token 访问上传页被拦截。
- Dormant 后 scheduled reminders 被取消。
- send-reminders 不发送给非 active 客户。
- Magic Link token 默认 30 天过期。
- `/portal` 入口不暴露邮箱是否存在。
- PATCH 不能修改危险字段。

## 注意事项

- 不要把 `/portal/[token]` 当作新入口补回来，除非产品明确决定。当前代码和 UI 已经围绕 `/m/[code]` 和 `/portal/upload?token=...`。
- 不要为了让 build 通过重新开启 `ignoreBuildErrors`。
- 不要用 mock 替代真实流程。
- 不要删除用户已有数据或运行会重置真实账号密码的测试接口。
