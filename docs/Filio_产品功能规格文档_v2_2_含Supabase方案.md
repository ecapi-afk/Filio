# Filio — 产品功能规格文档

**Product Functional Specification**

> 版本 v2.2 · 2026年4月 · filio.uk
>
> 本文档覆盖 Filio 平台除公开营销网站之外的全部功能页面，包括：**会计师后台（Section A）· 客户端门户（Section B）· 辅助页面（Section C）**
>
> 标注 `[V3]` / `[V4]` 为后续版本规划。原 V1/V2 功能已全部整合至当前版本。

---

## 更新日志

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| v1.0 | 2026-03-31 | 初始版本 |
| v1.1 | 2026-03-31 | 注册流程更新；MTD 改为每客户独立配置；新增自动催收提醒、文件清单、客户健康状态视图、审计日志导出；A5 详情面板扩充为 5 Tab |
| v1.2 | 2026-03-31 | A5 客户列表新增完整筛选排序系统；新增会计师手动上传功能；新增 Magic Email 安全校验与拦截日志；新增远程重命名/类别修正；新增批量下载（ZIP 打包）；A10 全局默认新增自动重命名开关与 Magic Email 安全默认值 |
| v1.3 | 2026-04-01 | 新增 A5b 独立客户详情页；重构 A5 右侧滑出预览面板；Onboarding 流程修正；移除客户 Active/Inactive 门户开关，改为套餐限额驱动升级；移除 Xero 关联状态字段；A5b 新增 View in Xero 深链 |
| v2.0 | 2026-04-01 | **重大更新：**<br>1. 明确健康状态优先级（Due Soon 优先）与多截止日合并逻辑<br>2. 完善套餐降级与试用到期策略（保留 60 天）<br>3. 移除 A3 独立页面，Onboarding 完全整合至 Dashboard 浮层<br>4. 引入全局 Xero 状态指示灯，移除 Dashboard 对应卡片<br>5. 新增星标客户功能及相关筛选<br>6. 明确 Xero Attachments API 与 Files API 双轨支持及全局开关<br>7. 统一文件命名规范 `{ClientName}_{FileType}_{YYYYMMDD}.{ext}`<br>8. 新增中英双语支持<br>9. 补充忘记密码、个人资料、通知设置等页面规格<br>10. 明确 Magic Email 附件处理逻辑（忽略正文，上传后删除）<br>11. 新增 V4 提醒中心全局页面 |
| v2.1 | 2026-04-01 | **规则收敛更新：**<br>1. 新增版本范围说明与配置优先级<br>2. 补充健康状态决策表，新增 Not Started（未开始）状态<br>3. 明确默认后台语言与默认客户端语言均为 English；个人语言偏好仅覆盖当前会计师后台<br>4. 明确 Portal Contact Email 在同一事务所内必须唯一，Xero Contact Email 可重复但不得直接用于 Portal 路由<br>5. 调整客户导入逻辑：禁止按姓名自动关联，仅基于 ContactID / 既有映射自动关联<br>6. 统一提醒调度按事务所时区执行；手动发送覆盖自动计划；客户完成上传后自动取消相关待发提醒<br>7. 明确 Xero 断开连接后不保留未同步文件；新增危险操作与审计规则<br>8. 新增非功能需求（性能 / 安全 / 可观测性） |
| v2.2 | 2026-04-01 | **技术落地补充：**<br>1. 新增 Supabase 方案的 MVP 推荐技术栈与部署边界<br>2. 明确采用“核心持久化数据优先驻留英国（UK-first）”表述，不将使用 Vercel / Stripe / 第三方邮件服务的部署表述为“100% UK-only”<br>3. 明确上传采用 Storage 直传；后台任务采用 `jobs` 表 + Cron 的耐久化模式，不以 `after()` / `waitUntil()` 承载关键业务流程<br>4. 补充 Supabase 方案下的认证、文件、提醒、审计、环境隔离与迁移建议 |

---


## 版本范围说明（v2.2）

### In Scope for v2.2

- 会计师端 A1–A10 与客户端门户 B1–B3 的当前正式功能。
- Portal Contact Email 唯一性、提醒调度规则、危险操作保护、非功能需求等本次收敛规则。
- 当前版本所需的中英双语、Xero 集成、上传、审计、提醒、账单与设置功能。
- Supabase 作为 v2.2 推荐 MVP 技术实现方案。

### Out of Scope（不纳入 v2.2 开发）

- Team Members / 多会计师权限体系 `[V3]`
- 客户负责人分配 `[V3]`
- 自定义门户域名 `[V3]`
- API Access `[V3]`
- 全局 Reminders Center 独立页面 `[V4]`

> 文中标注 `[V3]` / `[V4]` 的内容仅表示未来规划或 UI 预留，不视为 v2.2 当前交付范围。

---

## 页面总览

| 编号 | 页面名称 | URL 路径 | 版本 |
|------|----------|----------|------|
| A1 | 登录页 Login | `/auth/login` | v2.1 |
| A2 | 注册页 Register | `/auth/register` | v2.1 |
| A4 | 会计师主仪表盘 Dashboard | `/dashboard` | v2.1 |
| A5 | 客户管理 Clients | `/dashboard/clients` | v2.1 |
| A5b | 客户详情页 Client Detail | `/dashboard/clients/[id]` | v2.1 |
| A6 | 上传记录 Upload History | `/dashboard/uploads` | v2.1 |
| A7 | 设置：Xero 连接 | `/dashboard/settings/xero` | v2.1 |
| A7a | 设置：个人资料 Profile | `/dashboard/settings/profile` | v2.1 |
| A7b | 设置：通知 Notifications | `/dashboard/settings/notifications` | v2.1 |
| A8 | 设置：品牌定制 Branding | `/dashboard/settings/branding` | v2.1 |
| A9 | 设置：订阅账单 Billing | `/dashboard/settings/billing` | v2.1 |
| A10 | 设置：全局默认 Global Defaults | `/dashboard/settings/defaults` | v2.1 |
| B1 | 客户门户入口 Portal Entry | `/portal` | v2.1 |
| B2 | 客户文件上传页 Upload | `/upload/[token]` | v2.1 |
| B3 | 客户多文件上传页 Multi-Upload | `/upload/[token]/multiple` | v2.1 |
| C1 | 错误与兜底页面 Error Pages | `/404`, `/link-expired`, `/error` | v2.1 |
| C2 | 忘记密码与重置 Password Reset | `/auth/forgot-password`, `/auth/reset-password` | v2.1 |
| V4 | 提醒中心 Reminders Center | `/dashboard/reminders` | V4 |

> **注：** 原 A3 页面已移除，功能整合至 A4 Dashboard 浮层。

---

## 全局系统设计与业务规则

### 1. 配置优先级与默认值继承

为避免不同页面出现“到底听谁的”理解不一致，v2.1 统一采用如下继承规则：

| 配置类型 | 优先级（高 → 低） | 默认值 |
|----------|-------------------|--------|
| **会计师后台界面语言** | 个人语言偏好（A7a） → 事务所默认后台语言（A10） → 系统默认 | **English** |
| **客户端门户语言** | 客户级语言覆盖（A5b Settings） → 默认客户端语言（A10） → 系统默认 | **English** |
| **客户级截止日 / 提醒 / 文件清单 / Reply-To** | 客户级覆盖（A5b Settings） → 事务所全局默认（A10） → 系统默认 | 见各模块 |
| **套餐能力与权限** | 套餐限制始终最高优先级，不可被下级设置覆盖 | — |

> 说明：A7a 的语言偏好仅影响当前登录会计师的后台界面；不会影响其他团队成员，也不会影响客户端门户语言。

### 2. 客户健康状态判定逻辑

系统根据客户当前周期的上传进度与截止日计算健康状态。当客户同时存在 VAT 截止日和年账截止日时，取**优先级更高**的最终状态进行展示与提醒。

**状态优先级（从高到低）：**

1. **🔴 Overdue（已逾期）**：任一未完成截止日已过。
2. **🟠 Due Soon（即将到期）**：任一未完成截止日在未来 14 天内。
3. **🔵 Not Started（未开始）**：未来 15–30 天内存在截止日，且当前周期 0 个已上传文件。
4. **🟡 In Progress（进行中）**：已上传部分文件，但仍未满足当前周期要求。
5. **🟢 Complete（已完成）**：本周期所有要求的文件均已上传齐全。
6. **⚪ No Action（无需操作）**：所有截止日均超过 30 天，或未配置任何截止日 / 文件清单。

#### 决策表

| 条件 | 最终状态 |
|------|----------|
| 任一未完成截止日 < today | Overdue |
| 任一未完成截止日在未来 14 天内 | Due Soon |
| 未来 15–30 天内有截止日，且本周期上传数 = 0 | Not Started |
| 已上传 1 个及以上文件，但未完成 | In Progress |
| 当前周期全部完成 | Complete |
| 其他情况 | No Action |

> **冲突合并示例：** 若 VAT 状态为 Complete，但年账状态为 Overdue，则客户最终健康状态仍为 **Overdue**。

### 3. 套餐生命周期与降级策略

- **试用到期**：14 天免费试用结束后，若用户未付费，系统保留账号与元数据 **60 天**。期间客户门户（上传链接）失效，并在会计师登录时显示强提醒。60 天后若仍未付费，数据按清理策略处理。
- **套餐降级**：当用户从高配套餐降级到低配套餐且超出客户数上限时，系统按添加时间倒序冻结超额客户。被冻结客户 Portal 状态显示为 **Frozen**，门户链接失效，无法继续提醒或接收新文件。
- **Xero 断开连接**：断开 Xero 后，所有客户门户立即停用；所有**尚未成功写入 Xero** 的文件不保留在 Filio 中，也不会在重连后自动恢复。会计师需在重连后重新请求客户上传。

### 4. Portal Contact Email 唯一性与联系人映射

Filio v2.1 将“Xero 联系邮箱”和“门户联系邮箱”拆分处理：

- **Xero Contact Email**：来自 Xero 的联系人邮箱，可重复，用于 CRM / 联系人展示。
- **Portal Contact Email**：用于 `/portal` 请求上传链接、发送 Magic Link、自动/手动提醒、Portal 相关身份识别与发件人校验；在**同一事务所内必须唯一**。

#### 去重与关联规则

1. 仅可基于 **ContactID** 或已有 Filio↔Xero 映射自动关联。
2. 邮箱仅作为“疑似重复”提示，不自动合并。
3. **姓名不得作为自动关联依据**。
4. 当导入联系人后发现 `Portal Contact Email` 与现有客户冲突时，该客户可被导入，但 Portal 状态标记为 **Email Conflict**；在冲突解决前，不可发送 Magic Link、不可启用自动提醒、不可通过 B1 入口请求上传链接。

### 5. 文件生命周期与 Xero 上传规则

Filio 支持两种将文件发送至 Xero 的方式，会计师可在 A10 中切换：

- **Attachments API**：文件直接关联到对应客户 Contact。
- **Files API**：文件发送到 Xero Files Inbox。

#### 统一规则

- 当前产品规格按**单文件最大 10MB**设计。
- 前端支持 JPG / JPEG / PNG / PDF / HEIC / DOCX / XLSX。
- 图片可在上传前做压缩处理，以提高上传成功率；压缩为优化手段，不改变产品对外宣称的 10MB 限制。
- 文件处理生命周期统一为：

`来源（Portal / Magic Email / Manual） → 格式与大小校验 → 重复检测（Hash） → 自动命名 / 重命名 → 发送至 Xero → 记录元数据与审计日志`

- **不保留本地文件实体**：文件一旦成功写入 Xero，Filio 仅保留必要元数据与审计日志。
- **不建立离线缓存队列**：若 Xero 未连接、断开连接或实时写入失败，系统返回失败，不在 Filio 内保留待同步文件。

### 6. 文件命名规范与重复检测

- **统一命名格式**：`{ClientName}_{FileType}_{YYYYMMDD}.{ext}`
  - 示例：`JohnSmith_Receipt_20260318.jpg`
- **同名冲突**：若同一天上传同类型文件，自动追加 `_1`、`_2` 后缀。
- **并发上传**：若客户与会计师同时上传，文件名按顺序递增。
- **重复检测**：系统对上传文件进行 Hash 校验。若发现完全相同的文件，提示“此文件已上传”，但允许用户点击“强制重新上传”。

### 7. 提醒调度与时区规则

- 所有自动提醒、截止日判断、每日摘要发送时间统一按**事务所时区**执行。
- 系统默认对同一客户、同一截止事项、同一模板启用防重复规则：**24 小时内不重复自动发送**。
- **手动发送优先级更高**：会计师手动发送提醒后，系统会覆盖同一客户、同一截止事项、同一模板的待发自动计划，并在 UI 中提醒会计师“已覆盖原自动计划”。
- **自动取消规则**：当客户完成上传并满足当前提醒目标后，相关待发提醒自动取消，并在历史记录中标记为 `Cancelled - condition met`。
- 被手动覆盖的提醒在历史记录中标记为 `Superseded by manual send`。

### 8. Token 自动续期机制

客户专属上传 Token 初始有效期为 30 天。只要会计师账号保持活跃（定期登录系统），平台会自动为其客户 Token 续期。若会计师超过 30 天未登录，Token 过期，客户访问时看到“链接已失效，请联系您的会计师”。

若会计师手动点击“重新生成 Token”，旧 Token **立即失效**；该操作不可撤销，并写入审计日志。

### 9. 危险操作与审计原则

以下操作统一视为危险操作，必须提供额外保护：

| 操作 | 保护方式 | 是否可撤销 | 审计要求 |
|------|----------|------------|----------|
| 断开 Xero | 输入 `DISCONNECT` 二次确认 | 否 | 记录操作者、时间、组织与影响范围 |
| 重新生成 Token | 明确提示旧链接立即失效 | 否 | 记录客户、操作者、时间 |
| Apply to all existing clients | 显示受影响客户数 + 二次确认 | 否（需再次手动覆盖） | 记录前后配置快照 |
| Reset all clients to global defaults | 输入 `RESET` 强确认 | 否（需重新逐项配置） | 记录前后配置快照 |
| Delete client | 二次确认；执行后立即停用 Portal | **30 天内可恢复** | 记录删除者、删除时间、恢复/彻底删除时间 |

> **Delete client 规则：** 删除采用 soft delete。客户 Portal 立即失效，套餐名额立即释放；30 天内可恢复，30 天后永久清理文件元数据以外的可删信息。

### 10. 非功能需求（Non-Functional Requirements）

#### 性能
- Dashboard / Clients / Uploads 页面首屏可交互目标：**p75 < 2.5s**。
- 客户列表搜索、筛选、排序在 **≤500 客户** 规模下反馈时间目标：**< 300ms**。
- 上传动作触发后 **1s 内**应出现可见进度反馈。

#### 可靠性
- 对 Xero API、邮件服务等外部依赖支持最多 **3 次指数退避重试**。
- 批量发送、批量下载、批量更新允许部分失败；任一失败不得阻断其余成功项。
- 所有失败项必须可见、可定位、可重试或可解释。

#### 安全
- 所有 Token 使用高熵随机值。
- 登录、忘记密码、Portal Link 请求接口必须限流，并使用统一文案，避免账号枚举。
- 所有危险操作必须进行权限校验，并记录审计日志。

#### 可观测性
- 系统至少记录以下事件：`upload_started`、`upload_succeeded`、`upload_failed`、`xero_sync_succeeded`、`xero_sync_failed`、`reminder_scheduled`、`reminder_sent`、`reminder_cancelled`、`token_regenerated`、`xero_disconnected`、`client_deleted`、`global_defaults_applied`。

### 11. 多语言支持

系统支持**中文（简体）**与**英文**双语。

- **系统默认语言**：English
- **事务所默认后台语言**：可在 A10 中设置，默认 English
- **默认客户端语言**：可在 A10 中设置，默认 English
- **个人后台语言偏好**：可在 A7a 设置，仅影响当前会计师后台
- **客户级门户语言覆盖**：可在 A5b Settings 中单独指定，覆盖默认客户端语言

### 12. 推荐技术实现与 MVP 部署方案（Supabase）

本章节为 **v2.2 推荐实现方案**，目标是在不显著增加 SaaS 管理负担的前提下，优先满足 Filio 的 MVP 上线速度、核心数据治理、英国区域部署和后续可迁移性。

#### 12.1 方案定位

- **推荐阶段**：MVP / 种子用户 / 小团队快速迭代阶段。
- **核心原则**：将数据库、认证、对象存储、定时任务等**持久化核心数据面**优先收敛到 **Supabase London (`eu-west-2`)**。
- **对外表述要求**：若前端仍托管在 Vercel，且支付、邮件等继续使用第三方服务，则对外应表述为 **“核心持久化数据优先驻留英国（UK-first / UK-resident core data）”**，不表述为 **“100% 英国数据驻留”**。
- **升级方向**：若未来签约客户、审计或法务要求进一步收紧数据驻留边界，可保留 Supabase 数据模型，同时将 Web / API / Worker / 邮件入口逐步迁移至 AWS London。

#### 12.2 推荐技术栈

| 层级 | 推荐技术 | 建议区域 | 说明 |
|------|----------|----------|------|
| 前端与应用层 | Next.js（App Router）+ TypeScript + Tailwind | Vercel `lhr1`（MVP） | 用于会计师后台与客户端 Portal；优先保证开发速度与交付效率。 |
| 数据库 | Supabase Postgres | `eu-west-2`（London） | 作为主业务数据库，存储事务所、客户、上传记录、提醒任务、审计日志、订阅信息等。 |
| 身份认证 | Supabase Auth | `eu-west-2`（London） | 用于会计师账号登录、Session、密码重置等；认证数据与业务数据集中治理。 |
| 文件对象存储 | Supabase Storage | `eu-west-2`（London） | 用于客户上传文件、品牌素材、导出文件等对象存储；采用私有 Bucket + Signed URL。 |
| 定时任务 | Supabase Cron（`pg_cron`） | `eu-west-2`（London） | 用于提醒扫描、试用到期检查、清理任务等。 |
| 数据访问层 | `supabase-js` 或 Drizzle ORM | 跟随应用层 | MVP 阶段可直接使用 `supabase-js`；若后续希望提升 SQL 可维护性，可引入 Drizzle。 |
| 支付与账单 | Stripe | 第三方 | 用于订阅、升级、降级、发票与支付方式管理。 |
| 邮件发送 | Resend / Postmark / SES | 第三方 / London 优先 | 用于 Magic Link、提醒邮件、密码重置；若 Magic Email 入站处理成为正式生产链路，优先评估 SES London。 |

#### 12.3 与 Filio 业务能力的映射关系

| Filio 能力 | 推荐实现 | 说明 |
|-------------|----------|------|
| 会计师注册 / 登录 / 忘记密码 | Supabase Auth + A1 / A2 / C2 页面 | 由 Supabase 承载邮箱登录、密码重置、Session 管理。 |
| 客户 Portal 上传 | Supabase Storage Signed Upload | 客户端文件**直传 Storage**，不经由 Vercel 函数中转，避免 10MB 上传受应用层请求体限制。 |
| 上传元数据与状态 | Supabase Postgres | 记录客户、文件类型、原文件名、规范化文件名、Xero 状态、上传渠道、审计事件。 |
| Xero 同步 | `jobs` 表 + Cron / Worker 轮询 | 将待同步任务持久化到数据库，支持失败重试、重试退避与状态追踪。 |
| 自动提醒 | Cron 扫描截止日 + `reminder_jobs` | 根据事务所时区扫描到期规则，创建并发送提醒任务。 |
| 审计日志 | `audit_logs` 表 | 记录下载、删除、Token 重置、Xero 断开、配置覆盖等敏感动作。 |
| 导出 CSV / PDF / ZIP | 同步或异步任务 | 小型导出可同步处理；大型导出应走后台任务，避免前端请求超时。 |

#### 12.4 关键实现约束

1. **上传必须走直传，不走应用层中转。**
   - Portal 上传与会计师手动上传均应使用 Signed URL 直传 Supabase Storage。
   - 应用层仅负责签发上传权限、校验业务上下文与写入元数据。

2. **后台任务必须耐久化，不使用 `after()` / `waitUntil()` 承载关键链路。**
   - Xero 同步、批量提醒、批量导出、清理任务等必须落入数据库中的 `jobs` / `reminder_jobs` 表。
   - 任务状态至少包含：`queued`、`processing`、`succeeded`、`failed`、`retry_scheduled`、`cancelled`。

3. **Storage Bucket 默认私有。**
   - 文件下载、预览、批量打包均通过短期 Signed URL 或服务端代理权限控制实现。
   - 不允许将客户上传文件放在公开可访问 Bucket。

4. **与产品规则保持一致。**
   - Xero 断开连接后，Portal 应立即停用，系统不保留未同步文件作为待恢复队列。
   - 文件成功同步至 Xero 后，应尽快删除临时对象，仅保留必要元数据与审计记录。
   - 提醒调度、每日摘要、试用到期检查统一按**事务所时区**执行。

#### 12.5 建议的核心数据表（MVP）

- `firms`：事务所主体信息、套餐、时区、品牌配置
- `users`：会计师账号、角色、后台语言偏好
- `clients`：客户基础信息、Portal Contact Email、Xero 关联信息
- `client_settings`：客户级截止日、提醒、文件清单、Reply-To、门户语言
- `portal_tokens`：上传 Token、失效时间、状态、重发历史
- `uploads`：上传记录、文件类型、渠道、Xero 状态、失败原因
- `upload_objects`：Storage 对象键、大小、MIME、删除状态
- `jobs`：通用后台任务（Xero 同步、导出、清理）
- `reminder_jobs`：提醒任务、发送时间、覆盖状态、取消原因
- `audit_logs`：敏感操作审计记录
- `subscriptions`：套餐、试用状态、冻结/降级记录

#### 12.6 环境隔离与迁移建议

- **环境隔离**：至少区分 `local` / `staging` / `production` 三套环境；数据库、Storage Bucket、邮件域名、Stripe Key 必须隔离。
- **数据迁移**：MVP 阶段允许接受一定程度的平台绑定；但表结构、对象命名、任务状态字段应保持平台中立，便于未来迁移至 AWS London。
- **监控与日志**：MVP 阶段可使用 Supabase 与 Vercel 自带日志；进入付费客户阶段后，应补充集中监控、错误告警与访问留痕。
- **对外合规模板**：对销售、法务、隐私政策和 FAQ 的标准表述应统一为：**“Filio 将核心持久化数据优先存储于英国伦敦区域；部分外围服务（如支付、邮件、应用托管）可能涉及受合同与数据处理协议约束的跨境处理。”**

---

## Section A — 会计师端功能页面（Accountant-Facing Pages）

---

### A1 — 登录页 Login Page

**URL:** `/auth/login` · **访问权限:** 公开（未登录用户）

#### 核心功能

| 功能项 | 说明 |
|--------|------|
| 邮箱 + 密码登录 | 标准表单登录，含「显示/隐藏密码」切换 |
| 忘记密码 | 提供「Forgot password?」链接，跳转至 C2 页面 |
| Xero OAuth 登录 | 「Continue with Xero」按钮，Xero 蓝色 (#13B5EA) 风格，OAuth2 授权后自动登录 |
| 错误状态 | 红色 Banner：「Invalid email or password」 |
| 加载状态 | 按钮 Spinner + 禁用，防止重复提交 |
| 跳转注册 | 底部「Start free trial」链接 → `/auth/register` |

---

### A2 — 注册页 Register Page

**URL:** `/auth/register` · **访问权限:** 公开

注册页提供**两条并列路径**，均可开始 14 天免费试用。

#### 路径一：Sign up with Xero（推荐）

```
点击「Sign up with Xero」
  → 跳转 Xero OAuth 授权页
  → Xero 返回：姓名、邮箱
  → 自动填充姓名和邮箱
  → 用户补填：事务所名称（最大 100 字符，允许字母/数字/空格/&/'-/.）
  → 点击「Create account」
  → 进入 Dashboard
  → 触发 Onboarding 浮层（见 A4）
```

#### 路径二：Create account（邮箱注册）

```
填写：事务所名称 / 姓名 / 邮箱 / 密码 / 确认密码
  → 密码要求：最少 8 位，至少包含 1 个大写字母、1 个小写字母和 1 个数字
  → 勾选同意 ToS & Privacy Policy
  → 点击「Create account」
  → 进入 Dashboard
  → 触发 Onboarding 浮层（见 A4）
```

> **注意：** 会计师账号邮箱必须唯一。客户的 `Portal Contact Email` 在同一事务所内必须唯一；Xero Contact Email 可重复，但不得直接作为 Portal 路由依据。

---

### A4 — 会计师主仪表盘 Dashboard

**URL:** `/dashboard` · **布局:** 固定左侧导航栏（240px 深海蓝）+ 主内容区

#### 全局导航栏（顶部或左侧固定位置）

- **Xero 状态指示灯**：常驻显示的小圆点。
  - 🟢 绿色：已连接。点击展开浮窗显示租户名称、最后同步时间、「Sync now」按钮、「Go to Xero settings」链接。
  - 🔴 红色：未连接或 Token 过期。点击展开浮窗提示重新连接。

#### Onboarding 浮层（仅在客户列表为空时触发）

覆盖在 Dashboard 之上的 Modal 浮层，引导用户导入客户。用户可随时点击「Skip」关闭浮层，不强制操作。

- **状态一（未连接 Xero）**：提示「Connect your Xero account to import clients」+「Connect Xero」主按钮 +「Skip」跳过按钮。
- **状态二（已连接 Xero，客户为空）**：提示「Import your clients from Xero to get started」+「Import clients」主按钮 +「Skip」跳过按钮。

#### 主内容区 — 顶部数据卡片（三卡片）

| 卡片 | 说明 |
|------|------|
| 活跃客户数 | 当前已开通门户的客户数，进度条显示套餐用量（>80% 变琥珀色警告） |
| 本月上传量 | 本月收到的文件数，含每日迷你折线图 |
| 待处理项 | 处于 Overdue 和 Due Soon 状态的客户总数，突出紧急程度 |

#### 即将到期面板

显示**未来 30 天内**有截止日的所有客户，按日期升序排列，两种截止类型均包含：

| 列名 | 说明 |
|------|------|
| 客户名称 | 点击跳转至客户详情 |
| 截止类型 | 「VAT Return」或「Year-End Accounts」徽章 |
| 截止日期 | 具体日期，7 天内变红色，14 天内变琥珀色 |
| 上传状态 | 🔴 未上传 · 🟡 部分完成 · 🟢 已完成 |
| 快捷操作 | 「Send reminder」按钮（未上传时显示） |

空状态：「No deadlines in the next 30 days. You're all caught up.」

#### 客户健康状态分组视图

仪表盘中部以分组卡片展示所有客户当前状态（Overdue / Due Soon / Not Started / In Progress / Complete / No Action）。点击任意分组可跳转至 A5 客户列表并自动应用对应状态筛选。

#### 最近上传记录表格

显示最近 8 条上传记录，「View all uploads →」跳转 A6。列：客户 | 文件类型 | 文件名 | 上传时间 | Xero 状态

#### 快捷操作面板（右侧 280px）

- Sync clients from Xero
- Send reminder to all overdue clients
- Download audit report

---

### A5 — 客户管理 Client Management

**URL:** `/dashboard/clients` · **访问权限:** 已登录会计师

#### 页面头部

| 元素 | 说明 |
|------|------|
| 主要操作 | 「Sync from Xero」+ 「Add client manually」 |
| 汇总卡片 | 总客户数 / 套餐上限 · 已激活门户数 · 本月上传文件数 |
| 搜索框 | 按姓名或邮箱实时过滤，结果高亮匹配文字 |

> **客户导入去重逻辑：** 从 Xero 同步联系人时，若 ContactID 已存在于 Filio，则自动更新其信息；若为新增，则显示为待确认列表供会计师勾选导入。系统仅允许基于 ContactID 或既有映射自动关联；邮箱仅作为疑似重复提示，**姓名不得作为自动关联依据**。手动添加客户时，若 Xero 中已有同名或同邮箱联系人，仅展示为候选项供会计师确认，不自动合并。若 `Portal Contact Email` 与现有客户冲突，则该客户 Portal 状态记为 `Email Conflict`，需先处理冲突后方可启用门户。

#### 第一层：快速状态栏（Tab 切换）

页面顶部固定 Tab 栏，每个 Tab 实时显示客户数量徽章，点击即切换视图：
`全部 (47) | 🔴 已逾期 (8) | 🟠 即将到期 (12) | 🔵 未开始 (9) | 🟡 进行中 (6) | 🟢 已完成 (21) | ⚪ 无需操作`

#### 第二层：多维筛选面板

点击「筛选」按钮展开，支持多条件同时生效（AND 逻辑）：

| 筛选维度 | 选项 |
|----------|------|
| **截止类型** | 全部 · 仅 VAT 季度申报 · 仅年账结算 |
| **VAT 季度组** | 全部 · 组 A（1/4/7/10月）· 组 B（2/5/8/11月）· 组 C（3/6/9/12月） |
| **截止时间范围** | 7 天内 · 14 天内 · 30 天内 · 已逾期 · 自定义日期范围 |
| **上传状态** | 全部 · 未上传 · 部分完成 · 已完成 |
| **门户状态** | 全部 · Active · Frozen · Email Conflict |
| **星标客户** | 全部 · 已星标 |
| **负责会计师** `[V3]` | 按团队成员筛选 |

#### 第三层：排序

下拉菜单选择，默认「截止日最近」（最快到期排前，逾期客户置顶）。支持按状态、最近上传、姓名 A-Z 等排序。

#### 客户列表表格

| 列名 | 说明 |
|------|------|
| 客户信息 | 姓名（粗体）+ 邮箱（灰色小字） |
| 星标 | ⭐ 星标图标，点击切换（用于标记重点关注客户） |
| 负责会计师 `[V3]` | 显示分配的团队成员头像/姓名 |
| 健康状态 | 彩色圆点 + 状态文字 |
| 门户状态 | Active · Frozen · Email Conflict 徽章 |
| 下次截止日 | 类型徽章（VAT / Year-End）+ 日期；7 天内红色，14 天内琥珀色 |
| 上传进度 | 「3 / 5 files」+ 迷你进度条；未配置清单时显示「—」|
| 最近上传 | 相对时间（「3 days ago」）或「Never」（灰色） |
| 操作 | 发送链接 · 复制链接 · 更多（⋯） |

#### 批量操作

选中复选框后顶部出现批量操作栏：发送催收提醒（部分失败时支持重试）· 发送上传链接 · 重新生成 Token · 批量下载文件（ZIP 打包）。其中 `Email Conflict` 客户不可执行发送上传链接与自动提醒相关操作。

#### 客户快速预览面板（右侧滑出）

点击客户姓名打开，定位为**快速行动面板**。

- **固定顶部**：客户姓名 + Portal Contact Email、健康状态徽章、Portal 状态徽章、「Open full details →」跳转 A5b。
- **动态状态区**：根据健康状态显示逾期天数、缺少文件，提供「Send reminder」或「Send upload link」主按钮。
- **近期上传记录**：最近 3–5 条记录。
- **底部快捷操作**：「Send Magic Link」·「Copy link」。

---

### A5b — 客户详情页 Client Detail Page

**URL:** `/dashboard/clients/[id]` · **访问权限:** 已登录会计师
**布局：** 单页滚动，内容分块排列；设置统一入口为顶部「Settings」按钮，打开客户设置浮空页。

#### 顶部信息卡（固定）

| 元素 | 说明 |
|------|------|
| 客户姓名 | 大字粗体 |
| Portal Contact Email | 灰色小字；用于 Magic Link、提醒邮件与 `/portal` 入口识别 |
| Xero Contact Email | 若与 Portal Contact Email 不同，则单独显示为次级信息 |
| 健康状态徽章 | 当前状态 |
| Portal 状态 | Active / Frozen / Email Conflict |
| 上次提醒时间 | 「Last reminded: X days ago」 |
| View in Xero | 深链按钮，直接跳转至 Xero 中的 Contact 页面 |
| 星标 | 点击切换标记状态 |
| 快速操作 | 「Send Magic Link」·「Copy link」·「Settings」·「Delete client」 |

#### 块 1 — 当前状态 + 发送提醒 Current Status & Reminder

- **状态区**：健康状态说明、上传进度条、下次 VAT 截止日 + 下次年账截止日。
- **提醒区**：上次提醒时间、模板选择（季度截止提醒 / 催发票 / 催银行对账单 / 催收据 / 自定义）、邮件预览、「Send」确认按钮。手动发送后，如存在同一客户 / 同一事项 / 同一模板的待发自动提醒，则自动覆盖并给出提示。

#### 块 2 — 文件清单 Document Checklist

- 本期每类文件完成状态：✅ 已上传（含时间戳）· ⏳ 待上传。
- 每条文件右侧可点击修改类型 → 打开分类修改浮窗（选择新类别 → 预览新文件名 → 同步至 Xero）。
- **注意：** 此功能仅在 Professional 及以上套餐提供。Starter 套餐显示模糊样式及升级引导。

#### 块 3 — 近期上传 Recent Uploads

- **块顶部右侧操作：**「Export CSV」·「Export PDF」·「展开 / 收起」。
- **默认收起（紧凑）：** 最近 5 条记录，失败记录红色高亮。
- **展开后：** 显示全部记录（分页），支持复选框批量下载 ZIP，支持内联重命名/重新分类。

#### 块 4 — Magic Email

- 当前专属邮箱地址 + 复制按钮（支持在 Settings 中更换地址以防滥用）。
- Sender 验证状态：开启 / 关闭（只读，修改入 Settings）。

#### 块 5 — 统计数据 Stats（可折叠，默认收起）

- 总上传文件数 · Xero 同步成功数 · 同步失败数（红色）· 最后上传时间。

#### 客户设置浮空页（点击顶部「Settings」打开）

单页滚动，分块排列：

**Deadline & Reminders**

| 设置项 | 说明 |
|--------|------|
| VAT 季度组 | 组 A / B / C，继承全局可单独覆盖；与全局不同时显示「Custom」琥珀色徽章 |
| 财年结算日 | 月份 + 日期选择器（如 31 March） |
| 未来 12 个月截止日预览 | VAT + 年账截止日自动计算列表 |
| 自动提醒开关 | 开启 / 关闭此客户的自动催收邮件 |
| 提醒节点 | 截止日前 30 / 14 / 7 / 1 天（可多选） |
| Reply-To 邮箱 | 可单独覆盖全局设置的回复邮箱 |
| 自定义邮件文案 | 支持 HTML/富文本，支持 `[ClientName]`、`[DeadlineDate]`、`[FirmName]` 变量 |
| 提醒发送历史 | 时间 · 触发节点 · 发送状态（已送达 / 失败） |

**Document Checklist**（Professional+）

| 设置项 | 说明 |
|--------|------|
| 清单模式 | 继承全局模板 / 自定义（Toggle 切换） |
| 文件类型勾选 | 收据 · 发票 · 银行对账单 · 合同 · 工资单 · 其他 |
| 每类文件备注 | 显示在客户上传页的说明文字 |


**Portal Access**

| 设置项 | 说明 |
|--------|------|
| Portal Contact Email | 客户门户联系邮箱；在同一事务所内必须唯一 |
| Portal 状态 | Active · Frozen · Email Conflict（只读展示系统状态） |
| 客户端语言 | 继承默认客户端语言，或单独覆盖为 English / 简体中文 |
| 发送上传链接 | 立即发送 Magic Link；若为 Email Conflict 状态则禁用 |
| 重新生成 Token | 旧 Token 立即失效，写入审计日志 |

**Magic Email**（Professional+）

| 设置项 | 说明 |
|--------|------|
| 更换 Magic Email 地址 | 重新生成专属邮箱地址（旧地址立即失效，防止地址被滥用） |
| Sender 验证开关 | 开启：仅接受 `Portal Contact Email` 发送的附件；关闭：接受任意来源 |
| 发送自动转发教程 | 「Send setup guide to client」，发送 Outlook / Gmail 自动转发配置指南 |

`[V3]` 增加「负责会计师」下拉分配选项。

---

### A6 — 上传记录 Upload History

**URL:** `/dashboard/uploads`

#### 筛选与统计

| 功能项 | 说明 |
|--------|------|
| 日期范围选择器 | 最近 7 天 / 30 天 / 90 天 / 自定义 |
| 审计日志导出 | 「Export PDF」和「Export CSV」，含完整上传元数据，可用于 HMRC MTD 合规存档 |
| 汇总指标 | 总上传数 · 成功同步数 · 失败数（红色）· 上传客户数（唯一值） |

#### 高级筛选

- 按文件名或客户名搜索
- 文件类型过滤：全部 / 收据 / 发票 / 银行对账单 / 合同 / 工资单 / UNCLASSED / 其他
- 同步状态过滤：全部 / 已同步 / 失败 / 待处理
- 上传渠道过滤：全部 / Portal / Magic Email / Manual
- 按客户筛选（下拉框）

#### 上传记录表格

| 列名 | 说明 |
|------|------|
| 文件预览 | 图片缩略图 或 PDF 图标 |
| 文件名 | 重命名后（粗体）+ 原始文件名（灰色） |
| 客户 | 姓名 + 头像字母圆圈 |
| 文件类型 | 彩色徽章；UNCLASSED 显示琥珀色，提示需要处理 |
| 上传渠道 | Portal · Magic Email · Manual 图标徽章 |
| 文件大小 | KB / MB |
| 上传时间 | 相对时间，悬停显示完整时间 |
| Xero 状态 | 绿色「Synced」/ 红色「Failed」/ 琥珀色「Pending」（仅表示当前处理中的瞬时状态，不代表 Filio 保留离线待同步文件） |
| 操作 | 在 Xero 中查看 · 重命名/重新分类 · 重试（失败时）· 下载 |

#### 重命名 / 重新分类

点击文件类别徽章或操作栏「Reclassify」打开内联编辑：

| 步骤 | 说明 |
|------|------|
| 选择新类别 | 下拉选择文件类型，系统自动更新「预期文件名」预览 |
| 手动覆盖文件名 | 可直接编辑文件名输入框；手动修改后显示「手动覆盖」⚠️ 图标提示 |
| 同步至 Xero | 默认勾选「Also update filename in Xero」，自动保留原始扩展名 |
| 确认 | 点击「Save」，成功后徽章更新，记录入审计日志 |

#### 批量下载

复选框多选文件（支持「全选当前页」）→ 点击「Download ZIP」：

1. Filio 调用 Xero API 逐一获取文件内容流
2. 内存中打包为 ZIP（Filio 本地不留存文件实体）
3. 自动下载，命名：`Filio_Download_ClientName_YYYYMMDD.zip`（多客户时命名 `Filio_Download_Selection_YYYYMMDD.zip`）
4. 下载动作记录入审计日志：下载者 · 时间 · 文件清单

#### 失败处理

顶部红色横幅显示失败数量，失败行带红色左边框。

---

### A7 — 设置：Xero 连接

**URL:** `/dashboard/settings/xero`

#### 设置侧边导航

**Profile** · **Xero Connection** · **Notifications** · Branding · Team Members `[V3]` · Billing · Global Defaults · API Access `[V3]`

#### 状态一：未连接

「Connect with Xero」按钮 + 三条核心价值说明 + 权限清单。

#### 状态二：已连接

| 元素 | 说明 |
|------|------|
| 连接状态卡片 | Xero 组织名称、连接日期、最后同步时间、「Sync now」 |
| 已授权权限 | 列出 OAuth Scope（openid, profile, email, accounting.contacts, accounting.attachments, files, offline_access） |
| 断开连接（危险区） | 输入「DISCONNECT」确认。断开后所有客户门户立即停用；尚未成功写入 Xero 的文件不保留在 Filio 中，重连后不会自动恢复 |

---

### A7a — 设置：个人资料 Profile

**URL:** `/dashboard/settings/profile`

| 功能项 | 说明 |
|--------|------|
| 头像上传 | 允许上传 JPG/PNG，最大 2MB |
| 个人信息 | 姓名、邮箱（不可修改，需联系客服）、职位 |
| 密码修改 | 输入当前密码、新密码、确认新密码 |
| 语言偏好 | 界面语言切换：English / 简体中文；默认继承事务所默认后台语言，仅影响当前会计师后台 |

---

### A7b — 设置：通知 Notifications

**URL:** `/dashboard/settings/notifications`

| 功能项 | 说明 |
|--------|------|
| 每日摘要邮件 | 开启/关闭：每天早上 8 点按**事务所时区**发送前一日上传汇总 |
| 同步失败警告 | 开启/关闭：当文件同步至 Xero 失败时立即发送邮件 |
| 客户逾期提醒 | 开启/关闭：当有客户进入 Overdue 状态时发送通知 |

---

### A8 — 设置：品牌定制 Branding

**URL:** `/dashboard/settings/branding` · **可用套餐:** Professional / Firm

| 功能项 | 说明 |
|--------|------|
| Logo 上传 | PNG/SVG/JPG，最大 2MB，建议 200x60px |
| 品牌色选择器 | 颜色选择器 + Hex 输入，实时预览客户上传页 |
| 门户欢迎语 | 最多 200 字，支持换行和基础格式（粗体/斜体），显示在客户上传页顶部 |
| 自定义域名 `[V3]` | Firm 专属：`portal.yourfirm.co.uk`，含 DNS 配置助手 |
| 实时预览面板 | 右侧 300px，所有改动即时反映 |

---

### A9 — 设置：订阅账单 Billing

**URL:** `/dashboard/settings/billing`

#### 套餐对比

| 功能 | Starter £29/月 | Professional £69/月 | Firm £149/月 |
|------|----------------|---------------------|--------------|
| 最多客户数 | 20 | 100 | 不限 |
| 会计师账号 | 1 | 3 | 不限 |
| Xero 自动同步 | ✓ | ✓ | ✓ |
| Magic Link 访问 | ✓ | ✓ | ✓ |
| 自动催收提醒 | ✓ | ✓ | ✓ |
| 客户健康状态视图 | ✓ | ✓ | ✓ |
| 审计日志导出 | ✓ | ✓ | ✓ |
| 文件清单 | — | ✓ | ✓ |
| 品牌定制 | — | ✓ | ✓ |
| Magic Email | — | ✓ | ✓ |
| 完全白标 | — | — | ✓ |
| 自定义门户域名 | — | — | ✓ |
| 支持方式 | 邮件 | 优先邮件 | 电话 + 邮件 |

- **月付/年付切换**（年付省约 17%）
- **支付方式管理**（Stripe 账单门户）
- **账单历史**（最近 6 张发票，含下载）
- **取消订阅**（触发留存挽回弹窗）

---

### A10 — 设置：全局默认 Global Defaults

**URL:** `/dashboard/settings/defaults`

为事务所设置全局默认参数，新客户自动继承，各客户详情面板可单独覆盖。

#### Section 0 — 语言默认值 Language Defaults

| 设置项 | 说明 |
|--------|------|
| 默认后台语言 | English / 简体中文；默认 **English**。供新会计师默认继承，个人可在 A7a 覆盖 |
| 默认客户端语言 | English / 简体中文；默认 **English**。供新客户 Portal 默认继承，客户级可覆盖 |

#### Section 1 — MTD / VAT 默认季度组

默认 VAT 季度组三选一：组 A（1/4/7/10月）· 组 B（2/5/8/11月）· 组 C（3/6/9/12月）

#### Section 2 — 默认文件清单模板（Professional+）

文件类型勾选 + 每类文件默认备注文字。新客户继承此模板，现有客户不受影响。

#### Section 3 — 默认自动提醒设置

| 设置项 | 说明 |
|--------|------|
| 自动提醒总开关 | 开启 / 关闭所有客户的自动催收邮件（可被每客户覆盖） |
| 默认提醒节点 | 截止日前 30 / 14 / 7 / 1 天（可多选） |
| 提醒邮件发件人名称 | 如「Smith & Co Accountants via Filio」 |
| Reply-To 邮箱地址 | 客户回复提醒邮件时，直接进入此会计师真实邮箱 |
| 调度时区 | 统一按事务所时区执行 |
| 默认提醒邮件正文 | 可编辑模板，支持 HTML/富文本，支持 `[ClientName]`、`[DeadlineDate]`、`[FirmName]` 变量 |
| 自动取消规则 | 当客户完成相关上传后，取消待发提醒 |

#### Section 4 — 文件处理默认值

| 设置项 | 说明 |
|--------|------|
| Xero 上传方式 | 切换：Attachments API（直接关联客户）/ Files API（上传至 Inbox） |
| 自动重命名开关 | 修改文件类别时，是否默认同步更新 Xero 文件名（默认：开启） |
| Magic Email 发件人校验 | 新客户 Magic Email 是否默认开启发件人校验（默认：开启） |
| 单文件大小上限 | 统一按 10MB 处理 |

#### Section 5 — 全局覆盖操作

| 操作 | 说明 |
|------|------|
| 「Apply to all existing clients」 | 显示受影响客户数与覆盖项摘要；二次确认后执行，并记录前后配置快照 |
| 「Reset all clients to global defaults」 | 清除所有客户自定义覆盖，需输入「RESET」强确认；执行后不可撤销，仅可再次手动配置 |

---

### V4 — 提醒中心 Reminders Center `[V4]`

**URL:** `/dashboard/reminders` · **访问权限:** 已登录会计师

全局页面，集中管理所有客户的提醒任务。

#### 视图一：待发队列 (Scheduled)

显示即将自动触发的提醒任务列表。
- 列：客户姓名 | 触发节点（如"截止日前 7 天"）| 预计发送时间 | 邮件模板 | 状态（等待中）
- 操作：暂停单条提醒、立即发送、编辑文案。

#### 视图二：已发记录 (History)

显示所有客户的历史提醒发送记录。
- 列：客户姓名 | 发送时间 | 触发节点 | 状态（已送达 / 失败 / 已打开）
- 筛选：按日期范围、按客户、按状态。

---

## Section B — 客户端门户页面（Client-Facing Pages）

---

### B1 — 客户门户入口 Client Portal Entry

**URL:** `/portal` · **访问权限:** 公开

客户找不到上传链接时的备用入口，输入邮箱后系统即时发送安全链接。系统仅基于 `Portal Contact Email` 识别客户，不直接使用重复的 Xero Contact Email 做 Portal 路由。

| 元素 | 说明 |
|------|------|
| 品牌展示 | 默认「Powered by Filio」；Firm 套餐可替换为事务所 Logo |
| 邮箱输入 + 发送按钮 | 「Send my upload link」，Teal 全宽按钮 |
| 成功状态 | 统一反馈文案：「If the email is eligible, a secure link has been sent.」 |
| 无匹配 / 冲突 / 不可用 | 前端均不暴露具体原因；后台不发送链接，并引导会计师在后台处理 Portal Email 问题 |

---

### B2 — 客户文件上传页 Client Upload Page

**URL:** `/upload/[token]` · **访问权限:** 持有有效 Token 的客户（无需注册）

Filio 最核心的客户端页面，零账号、零门槛，30 秒完成上传。页面默认语言继承 `默认客户端语言`，也可由客户级设置单独覆盖。

#### 页面头部

| 元素 | 说明 |
|------|------|
| 事务所品牌 | 会计师 Logo 或事务所名称 |
| 安全徽章 | 「Secure upload · Encrypted · Powered by Filio」 |
| 欢迎语 | 「Hi [ClientName], upload your documents for [FirmName]」 |

#### 文件清单进度（Professional+）

若会计师为此客户配置了文件清单，页面顶部显示本期进度：

```
This quarter's documents — 2 of 5 uploaded
━━━━━━░░░░░░░░░  40%

✅ Bank Statement    ✅ Sales Invoices
⏳ Receipts          ⏳ Purchase Invoices    ⏳ Payslips
```

每种文件类型点击后显示会计师设置的备注说明（如有）。

#### 文件类型选择

上传前需选择文件类型（用于自动重命名）：
Receipt · Invoice · Bank Statement · Contract · Payslip · Other

#### 文件上传区域

| 功能项 | 说明 |
|--------|------|
| 拖拽上传 | 虚线边框，hover 变 Teal 背景 |
| 点击上传 | 触发文件选择器，移动端支持相机直拍 |
| 文件预览 | 图片缩略图 / PDF 图标，显示文件名和大小 |
| 文件限制 | 最大 10MB；支持 JPG/JPEG/PNG/PDF/HEIC/DOCX/XLSX |
| 自动压缩 | 若开启 Attachments API 模式，前端自动将图片压缩至 2MB 以内（质量 0.7） |
| 自动命名预览 | `JohnSmith_Receipt_20260318.jpg` |

#### 上传结果

| 状态 | 说明 |
|------|------|
| 上传中 | 进度条 + 百分比 |
| 成功 | 绿色对勾 + 「Document sent to [FirmName].」+ 更新文件清单进度 |
| 重复文件 | 提示「此文件已上传」，提供「强制重新上传」按钮 |
| 继续上传 | 「Upload another document」重置表单 |

#### 错误状态

| 类型 | 样式 |
|------|------|
| Token 已过期 | 红色，提示「链接已失效，请联系您的会计师」 |
| 上传失败 | 红色 + 重试按钮 |
| 文件过大 | 琥珀色「Maximum size is 10MB」 |
| 文件类型不支持 | 琥珀色 |

#### 页脚

> 「Your documents are encrypted and only shared with [FirmName]. Powered by Filio · filio.uk」

---

### B3 — 客户多文件上传页 Multi-Upload

**URL:** `/upload/[token]/multiple` · **可用套餐:** Professional / Firm

页面语言规则与 B2 相同，默认继承 `默认客户端语言`，支持客户级覆盖。

| 功能项 | 说明 |
|--------|------|
| 季度指示器 | 「Q1 2026 · Deadline: 31 January 2026」，14 天内显示琥珀色倒计时 |
| 文件清单进度 | 同 B2，显示本期已上传 / 待上传文件类型 |
| 多文件拖拽区 | 支持一次选择多文件 |
| 上传队列 | 每文件：缩略图 · 可编辑文件名 · 类型下拉框 · 状态 · 移除 |
| 批量上传按钮 | 「Send [N] documents to [FirmName]」，显示每文件独立进度 |
| 完成状态 | 「All [N] documents sent successfully!」 |

---

## Section C — 辅助与系统页面（Supporting Pages）

---

### C1 — 错误与兜底页面

**URL:** `/404` · `/link-expired` · `/error`

| 页面 | 核心元素 | 引导操作 |
|------|----------|----------|
| 404 | 大号「404」Teal 数字 | 已登录→Dashboard，未登录→filio.uk |
| 链接已过期 | 灰色锁形图标 | 提示「链接已失效，请联系您的会计师」 |
| 通用错误 | Warning 图标 | 「Retry」+ 「Contact support」 |

---

### C2 — 忘记密码与重置 Password Reset

**URL:** `/auth/forgot-password` · `/auth/reset-password`

| 步骤 | 说明 |
|------|------|
| 1. 输入邮箱 | 在 `/auth/forgot-password` 输入注册邮箱，点击「Send reset link」 |
| 2. 邮件发送 | 系统发送包含安全 Token 的重置链接（有效期 1 小时） |
| 3. 设置新密码 | 点击链接进入 `/auth/reset-password`，输入新密码并确认 |
| 4. 成功提示 | 提示密码修改成功，提供「Return to login」按钮 |

---

## 附录：设计系统摘要

### 品牌色彩

| Token | Hex | 用途 |
|-------|-----|------|
| Primary Teal | `#1D9E75` | 按钮、激活状态、重要徽章（Logo 与按钮主题色） |
| Navy | `#0F2744` | 侧边栏背景、标题文字 |
| Accent Blue | `#1A6FBF` | 链接、Xero 相关 UI |
| Amber | `#BA7517` | 警告、即将到期 |
| Danger Red | `#C0392B` | 错误、失败同步、删除操作 |
| Xero Blue | `#13B5EA` | 仅用于 Xero 品牌按钮 |

### 健康状态色彩规范

| 状态 | 颜色 | Tailwind |
|------|------|----------|
| Overdue | 红色 | `bg-red-100 text-red-700` |
| Due Soon | 琥珀色 | `bg-amber-100 text-amber-700` |
| Not Started | 蓝色 | `bg-blue-100 text-blue-700` |
| In Progress | 黄色 | `bg-yellow-100 text-yellow-700` |
| Complete | 绿色 | `bg-green-100 text-green-700` |
| No Action | 灰色 | `bg-gray-100 text-gray-500` |

### 排版与形状

| 属性 | 值 |
|------|----|
| 字体 | Inter 或系统 sans-serif |
| 卡片圆角 | 8px |
| 输入框圆角 | 6px |
| 徽章圆角 | 999px |
| 卡片阴影 | `0 1px 3px rgba(0,0,0,0.08)` |
| 页面背景 | `#F8F9FA` |
| 卡片背景 | `#FFFFFF` |

### 响应式断点

| 断点 | 宽度 | 优先用于 |
|------|------|----------|
| 移动端 | 375px+ | 客户页 B1/B2（所有界面位置设计可按 Manus 风格调整） |
| 平板 | 768px+ | — |
| 桌面 | 1280px+ | 会计师页 A4–A10 |

### 通用 UI 规范

- 所有 API 调用按钮：Loading Spinner · 禁用状态 · 错误处理
- 所有列表/表格：空状态（图标 + 说明 + 行动按钮）
- 占位数据：英式姓名、GBP 金额、`DD/MM/YYYY` 日期
- VAT 截止日：每季度末（取决于客户所属季度组）
- 财年结算：每客户独立配置，无统一默认

---

## 附录：Magic Email 附件处理逻辑

Magic Email 允许客户通过发送邮件的方式上传文件。处理逻辑如下：

1. **附件提取**：系统仅提取邮件中的附件，**完全忽略邮件正文内容**。
2. **格式与大小校验**：附件必须符合 Portal 上传的格式限制（JPG/JPEG/PNG/PDF/HEIC/DOCX/XLSX）和大小限制（10MB）。
3. **失败处理**：不支持的附件格式或超大附件将**不被上传**，并在 A6 上传记录中标记为失败（Failed），记录入拦截日志。
4. **多附件处理**：若一封邮件包含多个合法附件，系统将**全部上传**至 Xero。
5. **数据清理**：附件成功上传至 Xero 后，系统将**立即从 Filio 服务器删除**该附件实体，不留存本地副本。

---

## 附录：邮件模板清单

系统中所有自动或手动发送的邮件均使用以下模板。所有邮件的发件人显示格式为「{FirmName} via Filio」，Reply-To 设为会计师在 Settings 中配置的真实邮箱地址，客户回复将直接进入会计师收件箱。

| 模板编号 | 模板名称 | 触发方式 | 可用变量 | 说明 |
|----------|----------|----------|----------|------|
| E1 | Magic Link 发送 | 手动/自动 | `[ClientName]`, `[FirmName]`, `[UploadLink]` | 向客户发送专属上传链接 |
| E2 | 季度截止提醒 | 自动/手动 | `[ClientName]`, `[FirmName]`, `[DeadlineDate]`, `[UploadLink]` | 提醒客户即将到来的 VAT 截止日 |
| E3 | 催发票 | 手动 | `[ClientName]`, `[FirmName]`, `[UploadLink]` | 催促客户上传发票 |
| E4 | 催银行对账单 | 手动 | `[ClientName]`, `[FirmName]`, `[UploadLink]` | 催促客户上传银行对账单 |
| E5 | 催收据 | 手动 | `[ClientName]`, `[FirmName]`, `[UploadLink]` | 催促客户上传收据 |
| E6 | 自定义提醒 | 手动 | `[ClientName]`, `[FirmName]`, `[DeadlineDate]`, `[UploadLink]` | 会计师自定义内容 |
| E7 | 密码重置 | 自动 | `[AccountantName]`, `[ResetLink]` | 发送密码重置链接（有效期 1 小时） |
| E8 | 上传链接请求 | 自动 | `[ClientName]`, `[FirmName]`, `[UploadLink]` | 客户通过 B1 Portal 入口请求链接 |
| E9 | 试用到期提醒 | 自动 | `[AccountantName]`, `[FirmName]`, `[DaysRemaining]` | 试用期结束前 3 天、1 天、到期当天发送 |
| E10 | 数据保留警告 | 自动 | `[AccountantName]`, `[FirmName]`, `[DaysRemaining]` | 试用到期后 30 天、50 天、58 天发送，提醒即将清理数据 |

所有邮件模板均支持 HTML/富文本格式。

---

## 附录：HEIC 文件处理

iPhone 默认拍照格式为 HEIC。系统在客户上传 HEIC 格式文件时，自动在前端将其转换为 JPG 格式后再上传至 Xero，确保与 Xero 的文件格式兼容。转换过程对客户透明，无需手动操作。

---

## 附录：批量提醒发送失败处理

当会计师通过 A5 客户管理页面批量发送催收提醒时，若部分邮箱发送失败：

1. 系统在操作完成后显示结果摘要：「已成功发送 X 封，Y 封发送失败」。
2. 失败的客户以红色高亮标记，显示失败原因（如邮箱无效、邮件服务商拒收等）。
3. 提供「Retry failed」按钮，支持一键重试所有失败的发送。
4. 所有发送记录（成功与失败）均写入审计日志。

---

## 附录：V3 版本规划预览

以下功能计划在 V3 版本中实现，当前版本中相关 UI 位置已预留占位：

| 功能 | 影响页面 | 说明 |
|------|----------|------|
| 多会计师团队管理 | A7 Team Members | 完整的团队成员邀请、角色分配、权限管理 |
| 客户分配 | A5 客户列表、A5b 客户详情 | 新增「负责会计师」列和筛选，客户详情页增加分配下拉 |
| 自定义门户域名 | A8 品牌定制 | Firm 套餐专属：`portal.yourfirm.co.uk` + DNS 配置助手 |
| API Access | A7 设置 | 开放 API 接口供第三方集成 |

---

*Filio 产品功能规格文档 v2.2 · filio.uk · 2026年4月*
