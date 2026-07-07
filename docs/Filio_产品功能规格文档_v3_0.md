# Filio — 产品功能规格文档

**Product Functional Specification**

> 版本 v3.0 · 2026年4月 · filio.uk
>
> 本文档覆盖 Filio 平台除公开营销网站之外的全部功能页面，包括：**会计师后台（Section A）· 客户端门户（Section B）· 辅助页面（Section C）**
>
> 标注 `[V3]` / `[V4]` 为后续版本规划。本版本在 v2.2 基础上完整整合客户生命周期与 Xero 同步策略补充规格。

---

## 更新日志

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| v1.0 | 2026-03-31 | 初始版本 |
| v1.1 | 2026-03-31 | 注册流程更新；MTD 改为每客户独立配置；新增自动催收提醒、文件清单、客户健康状态视图、审计日志导出；A5 详情面板扩充为 5 Tab |
| v1.2 | 2026-03-31 | A5 客户列表新增完整筛选排序系统；新增会计师手动上传功能；新增 Magic Email 安全校验与拦截日志；新增远程重命名/类别修正；新增批量下载（ZIP 打包）；A10 全局默认新增自动重命名开关与 Magic Email 安全默认值 |
| v1.3 | 2026-04-01 | 新增 A5b 独立客户详情页；重构 A5 右侧滑出预览面板；Onboarding 流程修正；移除客户 Active/Inactive 门户开关，改为套餐限额驱动升级；移除 Xero 关联状态字段；A5b 新增 View in Xero 深链 |
| v2.0 | 2026-04-01 | 重大更新：健康状态优先级、套餐降级策略、Onboarding 整合、全局 Xero 状态指示灯、星标客户、Xero 双轨 API、文件命名规范、中英双语、忘记密码、Magic Email 逻辑、V4 提醒中心 |
| v2.1 | 2026-04-01 | 规则收敛：配置优先级、健康状态决策表、语言默认值、Portal Email 唯一性、导入去重规则、提醒调度时区、危险操作规则、非功能需求 |
| v2.2 | 2026-04-01 | 技术落地：Supabase 方案、UK-first 表述、Storage 直传、jobs 表耐久化任务 |
| v3.0 | 2026-04-04 | **完整整合客户生命周期规格：** 引入 management_status 四状态模型（替换原 Frozen）；新增首次导入预览页、增量同步 diff 规则、手动创建客户流程、Client Activity 页面（Professional+）；A5 管理状态 Tab 与批量操作；A5b 时间线、Dormant 状态下各块行为、状态切换按钮；Portal 暂停专属提示页；Dormant Magic Email 通知逻辑；登录超额 Modal（3 天宽限）；重新激活后提醒恢复规则；Xero ContactID 消失处理；通知中心 Dormant 事件；A9 配额展示更新；试用期方案；数据隔离架构决策；邮件模板 E11–E13；周报功能规划（V3） |

---

## 版本范围说明（v3.0）

### In Scope

- 会计师端 A1–A10、A11（Client Activity）与客户端门户 B1–B3 的当前正式功能
- 客户管理状态模型（active / dormant / archived / deleted）及完整生命周期流转
- Xero 联系人导入、增量同步、回写、ContactID 消失处理
- 手动创建客户与可选 Xero 绑定
- 登录超额 Modal、通知中心 Dormant 事件、Portal 暂停专属页
- Supabase RLS 数据隔离方案

### Out of Scope（不纳入 v3.0 开发）

- Team Members / 多会计师权限体系 `[V3]`
- 客户负责人分配 `[V3]`
- 自定义门户域名 `[V3]`
- API Access `[V3]`
- 周报邮件功能 `[V3]`
- 全局 Reminders Center 独立页面 `[V4]`
- Xero 联系人 Group 标签同步 `[V4 · Firm]`
- 独立 Schema 数据隔离（企业客户需求时评估）
- 试用期绑卡门槛（用户积累后评估）

---

## 页面总览

| 编号 | 页面名称 | URL 路径 | 版本 |
|------|----------|----------|------|
| A1 | 登录页 Login | `/auth/login` | v2.1 |
| A2 | 注册页 Register | `/auth/register` | v2.1 |
| A4 | 会计师主仪表盘 Dashboard | `/dashboard` | v3.0 |
| A5 | 客户管理 Clients | `/dashboard/clients` | v3.0 |
| A5b | 客户详情页 Client Detail | `/dashboard/clients/[id]` | v3.0 |
| A6 | 上传记录 Upload History | `/dashboard/uploads` | v2.1 |
| A7 | 设置：Xero 连接 | `/dashboard/settings/xero` | v2.1 |
| A7a | 设置：个人资料 Profile | `/dashboard/settings/profile` | v2.1 |
| A7b | 设置：通知 Notifications | `/dashboard/settings/notifications` | v3.0 |
| A8 | 设置：品牌定制 Branding | `/dashboard/settings/branding` | v2.1 |
| A9 | 设置：订阅账单 Billing | `/dashboard/settings/billing` | v3.0 |
| A10 | 设置：全局默认 Global Defaults | `/dashboard/settings/defaults` | v2.1 |
| A11 | 客户活跃度 Client Activity | `/dashboard/clients/activity` | v3.0 · Professional+ |
| B1 | 客户门户入口 Portal Entry | `/portal` | v2.1 |
| B2 | 客户文件上传页 Upload | `/upload/[token]` | v3.0 |
| B3 | 客户多文件上传页 Multi-Upload | `/upload/[token]/multiple` | v2.1 |
| C1 | 错误与兜底页面 | `/404`, `/link-expired`, `/portal-paused`, `/error` | v3.0 |
| C2 | 忘记密码与重置 | `/auth/forgot-password`, `/auth/reset-password` | v2.1 |
| V4 | 提醒中心 Reminders Center | `/dashboard/reminders` | V4 |

---

## 全局系统设计与业务规则

### 1. 配置优先级与默认值继承

| 配置类型 | 优先级（高 → 低） | 默认值 |
|----------|-------------------|--------|
| **会计师后台界面语言** | 个人语言偏好（A7a）→ 事务所默认后台语言（A10）→ 系统默认 | English |
| **客户端门户语言** | 客户级语言覆盖（A5b Settings）→ 默认客户端语言（A10）→ 系统默认 | English |
| **客户级截止日 / 提醒 / 文件清单 / Reply-To** | 客户级覆盖（A5b Settings）→ 事务所全局默认（A10）→ 系统默认 | 见各模块 |
| **套餐能力与权限** | 套餐限制始终最高优先级，不可被下级设置覆盖 | — |

### 2. 客户健康状态判定逻辑

系统根据客户当前周期的上传进度与截止日计算健康状态。**健康状态仅对 `management_status = active` 的客户计算；dormant 客户健康状态显示为「—」。**

**状态优先级（从高到低）：**

1. **🔴 Overdue（已逾期）**：任一未完成截止日已过
2. **🟠 Due Soon（即将到期）**：任一未完成截止日在未来 14 天内
3. **🔵 Not Started（未开始）**：未来 15–30 天内存在截止日，且当前周期 0 个已上传文件
4. **🟡 In Progress（进行中）**：已上传部分文件，但仍未满足当前周期要求
5. **🟢 Complete（已完成）**：本周期所有要求的文件均已上传齐全
6. **⚪ No Action（无需操作）**：所有截止日均超过 30 天，或未配置任何截止日 / 文件清单

#### 决策表

| 条件 | 最终状态 |
|------|----------|
| 任一未完成截止日 < today | Overdue |
| 任一未完成截止日在未来 14 天内 | Due Soon |
| 未来 15–30 天内有截止日，且本周期上传数 = 0 | Not Started |
| 已上传 1 个及以上文件，但未完成 | In Progress |
| 当前周期全部完成 | Complete |
| 其他情况 | No Action |

### 3. 客户管理状态模型（management_status）

#### 3.1 状态定义

`management_status` 是独立于健康状态的管理维度，驱动配额计算、Portal 可用性和提醒运行。

| 状态 | 含义 | 占配额 | Portal | 提醒 | 历史记录 |
|------|------|--------|--------|------|---------|
| `active` | 正在服务 | ✅ | 开启 | 正常运行 | 可查可操作 |
| `dormant` | 暂停服务，数据保留 | ❌ | 关闭 | 停止 | 只读可查 |
| `archived` | 不再跟踪 | ❌ | 关闭 | 停止 | 只读可查 |
| `deleted` | 软删除 30 天 | ❌ | 立即失效 | 停止 | 30 天内只读 |

> **原规格 Frozen 状态说明：** v3.0 起，原「Frozen」状态统一替换为 `dormant`。套餐降级触发的自动转换在 UI 显示为「Dormant · Over limit」徽章，底层字段统一为 `dormant`。

#### 3.2 状态流转规则

| 操作 | 触发方 | 条件 | 审计 |
|------|--------|------|------|
| `active → dormant` | 手动 | 无限制 | ✅ |
| `active → dormant` | 系统自动 | 套餐降级超额，按添加时间倒序 | ✅ 记录原因 |
| `dormant → active` | 手动 | 激活后不超出套餐 active 配额 | ✅ |
| `active/dormant → archived` | 手动 | 需二次确认 | ✅ |
| `archived → dormant` | 手动（解除归档） | 无限制 | ✅ |
| `any → deleted` | 手动 | 需二次确认 | ✅ |

#### 3.3 UI 徽章对照

| 状态 | 徽章文字 | 颜色 |
|------|---------|------|
| `active` | Active | `bg-green-100 text-green-700` |
| `dormant`（手动） | Dormant | `bg-gray-100 text-gray-500` |
| `dormant`（系统降级） | Dormant · Over limit | `bg-amber-100 text-amber-700` |
| `archived` | Archived | 灰色淡显 |
| `xero_not_found`（附加标记） | Xero contact not found | `bg-orange-100 text-orange-700` |

#### 3.4 重新激活后的提醒恢复规则

客户从 `dormant` 恢复为 `active` 时：

- 截止日仍在未来：自动按原配置恢复提醒调度，无需手动重开
- 截止日已过（Overdue）：提醒**不自动触发**；A5b 顶部显示警告横幅，由会计师手动决定是否补发

**激活时 Overdue 警告横幅：**

```
⚠ [ClientName] missed [N] deadline(s) while dormant.
  VAT Return · 31 Jan 2026 (overdue 23 days)
  [Send reminder now]  [Dismiss]
```

此横幅不自动消失，必须手动操作后关闭。「Dismiss」操作记录「会计师已知晓」入审计日志。

#### 3.5 Dormant 期间截止日处理

Dormant 期间截止日继续流逝，系统不主动处理。「Dormant 期间错过截止日」事件在客户**重新激活的瞬间**写入活动时间线，不在截止日过期时触发。

#### 3.6 Dormant 沉睡提醒（180 天）

客户进入 `dormant` 超过 180 天，触发一次性通知（通知中心 + E11 邮件）。记录 `dormant_reminded_at` 字段防止重复触发。

### 4. Xero 联系人与 Filio 客户的关系

#### 4.1 三层概念边界

| 层次 | 定义 | 归属 |
|------|------|------|
| Xero 联系人 | Xero 组织中存在的所有联系人，Filio 只读同步 | Xero 控制 |
| Filio 已知客户 | 曾导入 Filio、存有 ContactID 映射的联系人 | Filio `clients` 表 |
| Filio 激活客户 | `management_status = active`，计入套餐配额 | Filio 控制 |

Filio 不要求与 Xero 联系人池保持数量一致。

#### 4.2 ContactID 唯一性

ContactID 唯一性约束为 `UNIQUE(firm_id, xero_contact_id)`——不同事务所可有相同 ContactID，互不干扰。同一客户被两个事务所导入时，各自为独立记录，数据物理共存但逻辑隔离（RLS 保障）。

#### 4.3 字段覆盖边界

**Xero 同步可更新：** `xero_contact_name`、`xero_contact_email`

**Xero 同步不得覆盖（Filio 权威）：** `portal_contact_email`、`management_status`、`client_settings`（截止日、提醒、文件清单、Reply-To、语言）、`portal_token`、所有审计日志与上传记录

#### 4.4 Portal Contact Email 与 Xero Contact Email

- **Xero Contact Email**：来自 Xero，可重复，用于 CRM / 展示
- **Portal Contact Email**：用于 Magic Link、提醒邮件、Portal 身份识别；在**同一事务所内必须唯一**

#### 4.5 去重与关联规则

1. 仅可基于 **ContactID** 或已有映射自动关联
2. 邮箱相同仅作「疑似重复」提示，不自动合并
3. **姓名不得作为自动关联依据**
4. Portal Contact Email 冲突时，客户可被导入，但 Portal 状态标记为 `Email Conflict`

#### 4.6 Xero ContactID 消失处理（含 Merge 场景）

当同步时检测到映射的 ContactID 不再存在（可能因 Xero 合并联系人）：

- 客户保持原 `management_status` 不变，继续占配额
- 附加标记 `xero_not_found = true`
- A5b 顶部显示橙色警告横幅：「🟠 This Xero contact can no longer be found. Uploads will fail until you link a new Xero contact. [Link new Xero contact →]」
- 客户 Portal 仍可访问，文件上传动作可发起，但写入 Xero 会失败，在 A6 记录为「Failed · Xero contact not found」
- 重新绑定后标记清除，待同步文件可重试
- A5 列表在「管理状态」列旁显示橙色 🟠 图标

#### 4.7 Xero 已删除联系人处理

同步时检测到 Xero 侧已删除某 ContactID：

- 不自动删除 Filio 记录
- A5b 顶部显示警告横幅：「⚠ This contact no longer exists in Xero. [Archive] [Dismiss]」
- 健康状态计算不受影响，会计师手动决定处理方式

### 5. 套餐配额与生命周期策略

#### 5.1 各套餐配额上限

| 套餐 | Active 上限 | Dormant 上限 | Archived |
|------|------------|-------------|----------|
| Starter £29/月 | 20 | 40 | 不限 |
| Professional £69/月 | 100 | 200 | 不限 |
| Firm £149/月 | 不限 | 不限 | 不限 |

> 配额仅计算 `management_status = active` 的客户数量。

#### 5.2 试用期策略

- 试用期限：14 天
- 试用期配额：Professional 功能 + 30 个 active 客户上限
- 试用期间可体验文件清单、品牌定制、Magic Email 等 Professional 专属功能
- 试用到期后：按会计师选择的套餐恢复对应限制，超额客户走正常降级流程（登录 Modal）
- 绑卡门槛：初期不设，用户积累后另行评估

#### 5.3 套餐降级策略

- 降级导致超出 active 配额时，系统按添加时间**倒序**自动将超额客户转为 `dormant`
- 触发登录超额 Modal（见第 9 节），给会计师 3 天宽限期
- 3 天到期后自动执行转换，发送 E12 邮件通知
- 被转换客户显示「Dormant · Over limit」徽章

#### 5.4 试用到期策略

- 14 天试用结束后未付费：保留账号与元数据 **60 天**，客户门户失效
- 60 天后未付费：数据按清理策略处理
- 保留期内每次登录显示强提醒；E9 在试用结束前 3 天、1 天、到期当天发送；E10 在到期后 30 天、50 天、58 天发送

#### 5.5 Xero 断开连接

断开 Xero 后：所有客户门户立即停用；所有**尚未成功写入 Xero** 的文件不保留在 Filio 中，重连后不会自动恢复。Filio 内的客户记录、设置与历史数据**不受影响**，断开 Xero 仅影响文件写入能力与 Portal 可用性。

### 6. 文件生命周期与 Xero 上传规则

Filio 支持两种将文件发送至 Xero 的方式，会计师可在 A10 中切换：

- **Attachments API**：文件直接关联到对应客户 Contact
- **Files API**：文件发送到 Xero Files Inbox

#### 统一规则

- 单文件最大 **10MB**
- 前端支持 JPG / JPEG / PNG / PDF / HEIC / DOCX / XLSX
- 图片可在上传前做压缩处理（Attachments API 模式下前端自动压缩至 2MB 以内，质量 0.7）
- 文件处理生命周期：`来源 → 格式与大小校验 → 重复检测（Hash）→ 自动命名 → 发送至 Xero → 记录元数据与审计日志`
- **不保留本地文件实体**：文件成功写入 Xero 后，Filio 仅保留元数据与审计日志
- **不建立离线缓存队列**：Xero 未连接或写入失败时，系统返回失败，不保留待同步文件

### 7. 文件命名规范与重复检测

- **统一命名格式**：`{ClientName}_{FileType}_{YYYYMMDD}.{ext}`
  - 示例：`JohnSmith_Receipt_20260318.jpg`
- **同名冲突**：自动追加 `_1`、`_2` 后缀
- **并发上传**：文件名按顺序递增
- **重复检测**：Hash 校验，发现相同文件提示「此文件已上传」，允许「强制重新上传」

### 8. 提醒调度与时区规则

- 所有自动提醒、截止日判断、每日摘要统一按**事务所时区**执行
- 防重复规则：24 小时内不重复自动发送同一客户同一截止事项同一模板
- **手动发送优先级更高**：覆盖同一客户同一事项同一模板的待发自动计划
- **自动取消规则**：客户完成上传后相关待发提醒自动取消，标记为 `Cancelled - condition met`
- 被手动覆盖的提醒标记为 `Superseded by manual send`

### 9. 登录超额 Modal

#### 9.1 触发条件

套餐降级后，会计师**首次登录**时触发。Modal 覆盖 Dashboard，不可直接跳过，但可选择「Remind me in 3 days」延迟处理。

#### 9.2 Modal 规格

```
┌──────────────────────────────────────────────────────────┐
│  Your active client limit has changed                    │
│                                                          │
│  Your plan now supports 20 active clients.               │
│  You currently have 23 — 3 over the limit.               │
│                                                          │
│  Suggested: set these inactive clients to Dormant        │
│  ──────────────────────────────────────────────────────  │
│  ☑  Old Client Ltd      Last upload: 187 days ago        │
│  ☑  Dormant Co          Last upload: 203 days ago        │
│  ☑  Inactive Services   Never uploaded                   │
│  ──────────────────────────────────────────────────────  │
│  [Upgrade plan]       [Set selected to Dormant]          │
│                                                          │
│  Remind me in 3 days  (auto-dormant after 3 days)        │
└──────────────────────────────────────────────────────────┘
```

建议列表按最后上传时间升序排列（最久没活动排最前），数量等于超额数量。会计师可手动调整勾选。

#### 9.3 3 天宽限期行为

- Dashboard 顶部持续显示琥珀色提示条：「You have [N] clients over your limit. [Resolve now →] · [X days remaining]」
- 3 天内超额客户仍为 active（宽限期）
- 3 天到期后系统自动转换，发送 E12 邮件

### 10. Token 自动续期机制

客户专属上传 Token 初始有效期为 30 天。会计师定期登录系统时，平台自动为客户 Token 续期。超过 30 天未登录则 Token 过期。

手动点击「重新生成 Token」后旧 Token 立即失效，不可撤销，写入审计日志。

### 11. 危险操作与审计原则

| 操作 | 保护方式 | 是否可撤销 | 审计要求 |
|------|----------|------------|----------|
| 断开 Xero | 输入 `DISCONNECT` 二次确认 | 否 | 记录操作者、时间、组织与影响范围 |
| 重新生成 Token | 明确提示旧链接立即失效 | 否 | 记录客户、操作者、时间 |
| Apply to all existing clients | 显示受影响客户数 + 二次确认 | 否 | 记录前后配置快照 |
| Reset all clients to global defaults | 输入 `RESET` 强确认 | 否 | 记录前后配置快照 |
| Delete client | 二次确认；执行后立即停用 Portal | 30 天内可恢复 | 记录删除者、删除时间、恢复/彻底删除时间 |
| Set to Dormant（批量） | 显示受影响数量 + 确认 | 可（Reactivate） | 记录操作者、原因 |
| Archive client | 二次确认 | 可（Unarchive → dormant） | 记录操作者、时间 |

### 12. 非功能需求

#### 性能
- Dashboard / Clients / Uploads 首屏可交互目标：p75 < 2.5s
- 客户列表搜索、筛选、排序在 ≤500 客户规模下反馈时间：< 300ms
- 上传动作触发后 1s 内出现可见进度反馈

#### 可靠性
- 对 Xero API、邮件服务等外部依赖支持最多 3 次指数退避重试
- 批量发送、批量下载、批量更新允许部分失败；任一失败不阻断其余成功项
- 所有失败项必须可见、可定位、可重试或可解释

#### 安全
- 所有 Token 使用高熵随机值
- 登录、忘记密码、Portal Link 请求接口必须限流，使用统一文案，避免账号枚举
- 所有危险操作必须进行权限校验并记录审计日志

#### 数据隔离
- MVP 采用 Supabase Row-level Security（RLS）方案
- ContactID 唯一性约束：`UNIQUE(firm_id, xero_contact_id)`
- 未来企业客户有合规要求时，可迁移至独立 Schema 方案，数据模型保持不变

#### 可观测性
- 系统记录事件（完整列表见审计日志附录）

### 13. 多语言支持

- 系统默认语言：English
- 事务所默认后台语言：可在 A10 设置，默认 English
- 默认客户端语言：可在 A10 设置，默认 English
- 个人后台语言偏好：可在 A7a 设置，仅影响当前会计师后台
- 客户级门户语言覆盖：可在 A5b Settings 单独指定

### 14. 推荐技术实现（Supabase MVP）

#### 推荐技术栈

| 层级 | 推荐技术 | 建议区域 |
|------|----------|----------|
| 前端与应用层 | Next.js（App Router）+ TypeScript + Tailwind | Vercel `lhr1` |
| 数据库 | Supabase Postgres + RLS | `eu-west-2`（London） |
| 身份认证 | Supabase Auth | `eu-west-2`（London） |
| 文件对象存储 | Supabase Storage（私有 Bucket + Signed URL） | `eu-west-2`（London） |
| 定时任务 | Supabase Cron（`pg_cron`） | `eu-west-2`（London） |
| 数据访问层 | `supabase-js` 或 Drizzle ORM | 跟随应用层 |
| 支付与账单 | Stripe | 第三方 |
| 邮件发送 | Resend / Postmark / SES | 第三方 / London 优先 |

#### 关键实现约束

1. **上传必须走直传**：Portal 上传与手动上传均使用 Signed URL 直传 Supabase Storage
2. **后台任务必须耐久化**：Xero 同步、批量提醒、清理任务等必须落入 `jobs` / `reminder_jobs` 表，不使用 `after()` / `waitUntil()`
3. **Storage Bucket 默认私有**：文件下载通过短期 Signed URL 或服务端代理实现
4. **与产品规则保持一致**：Xero 断开后 Portal 立即停用；文件成功同步后尽快删除临时对象

#### 对外合规表述

「Filio 将核心持久化数据优先存储于英国伦敦区域；部分外围服务（如支付、邮件、应用托管）可能涉及受合同与数据处理协议约束的跨境处理。」

---

## Section A — 会计师端功能页面

---

### A1 — 登录页 Login Page

**URL:** `/auth/login` · **访问权限:** 公开

| 功能项 | 说明 |
|--------|------|
| 邮箱 + 密码登录 | 标准表单，含「显示/隐藏密码」切换 |
| 忘记密码 | 「Forgot password?」→ C2 |
| Xero OAuth 登录 | 「Continue with Xero」按钮，Xero 蓝色 `#13B5EA` |
| 错误状态 | 红色 Banner：「Invalid email or password」 |
| 加载状态 | 按钮 Spinner + 禁用 |
| 跳转注册 | 底部「Start free trial」→ `/auth/register` |

---

### A2 — 注册页 Register Page

**URL:** `/auth/register` · **访问权限:** 公开

提供两条并列路径，均开始 14 天免费试用（Professional 功能 + 30 个客户上限）。

**路径一：Sign up with Xero（推荐）**

```
点击「Sign up with Xero」→ Xero OAuth 授权 → 自动填充姓名和邮箱
→ 用户补填事务所名称 → 点击「Create account」→ Dashboard → Onboarding 浮层
```

**路径二：邮箱注册**

```
填写：事务所名称 / 姓名 / 邮箱 / 密码（≥8位，含大小写和数字）/ 确认密码
→ 勾选 ToS & Privacy Policy → 「Create account」→ Dashboard → Onboarding 浮层
```

> 会计师账号邮箱必须唯一。Portal Contact Email 在同一事务所内必须唯一。

---

### A4 — 会计师主仪表盘 Dashboard

**URL:** `/dashboard` · **布局:** 固定左侧导航栏（240px 深海蓝）+ 主内容区

#### 全局导航

**Xero 状态指示灯**（常驻）：
- 🟢 已连接：点击展开浮窗显示租户名称、最后同步时间、「Sync now」、「Go to Xero settings」
- 🔴 未连接或 Token 过期：点击展开提示重新连接

**通知铃铛**（常驻右上角）：显示未读通知数，点击展开通知列表（见通知中心规格）。

#### Onboarding 浮层（客户列表为空时触发）

- 状态一（未连接 Xero）：「Connect your Xero account to import clients」+「Connect Xero」+「Skip」
- 状态二（已连接，客户为空）：「Import your clients from Xero to get started」+「Import clients」+「Skip」

#### 顶部数据卡片（三卡片）

**卡片一：Active clients（修改）**

```
Active clients
18 / 20  ████████████████░░  90%
4 Dormant · 2 Archived
[Manage clients →]
```

- 进度条 > 80%：琥珀色警告
- 进度条 = 100%：红色，副标题「Limit reached · Upgrade or set clients to Dormant」

**卡片二：本月上传量** — 本月收到的文件数，含每日迷你折线图

**卡片三：待处理项** — 处于 Overdue 和 Due Soon 状态的客户总数

#### 即将到期面板

显示未来 30 天内有截止日的所有客户，按日期升序：

| 列名 | 说明 |
|------|------|
| 客户名称 | 点击跳转 A5b |
| 截止类型 | VAT Return · Year-End Accounts 徽章 |
| 截止日期 | 7 天内红色，14 天内琥珀色 |
| 上传状态 | 🔴 未上传 · 🟡 部分完成 · 🟢 已完成 |
| 快捷操作 | 「Send reminder」（未上传时显示） |

#### 客户健康状态分组视图

以分组卡片展示 Overdue / Due Soon / Not Started / In Progress / Complete / No Action。点击跳转 A5 并自动应用对应筛选。

#### 最近上传记录

最近 8 条，「View all uploads →」跳转 A6。列：客户 | 文件类型 | 文件名 | 上传时间 | Xero 状态

#### 快捷操作面板（右侧 280px）

- Sync clients from Xero
- Send reminder to all overdue clients
- Download audit report
- **Manage client slots →**（跳转 A5 并聚焦管理状态 Tab）

#### 通知中心（铃铛展开列表）

**通知事件类型：**

| 事件 | 默认开启 | 置顶规则 |
|------|---------|---------|
| Active 配额 80% 警告 | ✅ | 置顶，不可被批量清除 |
| Active 达到上限 | ✅ | 置顶，不可被批量清除 |
| 客户自动转 Dormant（降级） | ✅ | 普通 |
| Dormant 沉睡提醒（180天） | ✅ | 普通 |
| Dormant 客户 Magic Email 上传尝试 | ✅ | 普通 |
| 同步失败警告 | ✅ | 普通 |
| 客户逾期 | ✅ | 普通 |

通知示例：

```
🟠  Active client limit warning                       刚刚
    You're using 18 of 20 active slots.
    [Manage clients →]
────────────────────────────────────────────────────
⚪  3 clients set to Dormant                         2 hours ago
    Plan change: John Smith and 2 others auto-dormanted.
    [Review →]
────────────────────────────────────────────────────
📎  Upload attempt from dormant client               3 hours ago
    Sarah Chen tried to upload while dormant.
    [Reactivate →]  [View client →]
```

---

### A5 — 客户管理 Client Management

**URL:** `/dashboard/clients` · **访问权限:** 已登录会计师

#### 页面头部

| 元素 | 说明 |
|------|------|
| 主要操作 | 「Sync from Xero」+「Add client manually」 |
| 汇总卡片 | Active: 18/20 · Dormant: 3/40 · 进度条（仅 active 占比）· 本月上传文件数 |
| 搜索框 | 按姓名或邮箱实时过滤，结果高亮匹配文字 |

#### Xero 新增联系人 Banner（同步后检测到新联系人时显示）

```
🔵  [N] new contacts found in Xero.   [Import now →]   [Dismiss]
```

#### 导入去重逻辑

从 Xero 同步联系人时，若 ContactID 已存在于 Filio 则自动更新；若为新增则显示 Banner 供会计师选择性导入。仅允许基于 ContactID 或既有映射自动关联；**姓名不得作为自动关联依据**。手动添加客户时，若 Xero 中已有同名或同邮箱联系人，仅展示为候选项供确认，不自动合并。

#### 第一层：快速状态栏（双行 Tab）

**第一行（健康状态）：**
`全部 (47) | 🔴 已逾期 (8) | 🟠 即将到期 (12) | 🔵 未开始 (9) | 🟡 进行中 (6) | 🟢 已完成 (21) | ⚪ 无需操作`

**第二行（管理状态）：**
`Active (18) | Dormant (3) | Archived (2)`

- 默认显示 Active Tab
- 切换至 Dormant / Archived 时，第一行健康状态 Tab 自动隐藏
- Dormant 客户行视觉降低对比度（整行 60% 透明度），仍可点击进入详情

#### 第二层：多维筛选面板

| 筛选维度 | 选项 |
|----------|------|
| **管理状态** | 全部 · Active · Dormant · Archived |
| **截止类型** | 全部 · 仅 VAT 季度申报 · 仅年账结算 |
| **VAT 季度组** | 全部 · 组 A · 组 B · 组 C |
| **截止时间范围** | 7 天内 · 14 天内 · 30 天内 · 已逾期 · 自定义 |
| **上传状态** | 全部 · 未上传 · 部分完成 · 已完成 |
| **门户状态** | 全部 · Portal on · Email Conflict |
| **Xero 状态** | 全部 · Linked · Filio-only · Contact not found |
| **星标客户** | 全部 · 已星标 |
| **负责会计师** `[V3]` | 按团队成员筛选 |

#### 第三层：排序

默认「截止日最近」。支持按管理状态、最近上传、姓名 A-Z、加入时间等排序。

#### 客户列表表格

| 列名 | 说明 |
|------|------|
| 客户信息 | 姓名（粗体）+ 邮箱（灰色小字） |
| 星标 | ⭐ 点击切换 |
| 管理状态 | Active / Dormant / Dormant · Over limit / Archived 徽章；`xero_not_found` 时显示 🟠 图标 |
| 健康状态 | 彩色圆点 + 状态文字；Dormant 显示「—」 |
| 门户状态 | Portal on · Email Conflict 徽章 |
| 下次截止日 | 类型徽章 + 日期；Dormant 显示「—」 |
| 上传进度 | 「3 / 5 files」+ 迷你进度条；未配置清单显示「—」 |
| 最近上传 | 相对时间或「Never」（灰色） |
| 操作 | 发送链接 · 复制链接 · 更多（⋯） |

**负责会计师** `[V3]` 列预留。

#### 批量操作栏

选中复选框后顶部出现批量操作栏：

| 操作 | 适用状态 | 说明 |
|------|---------|------|
| 发送催收提醒 | active | 部分失败时支持重试 |
| 发送上传链接 | active | Email Conflict 客户不可执行 |
| 重新生成 Token | active | — |
| 批量下载文件（ZIP） | 全部 | — |
| **Set to Dormant** | active | 显示受影响数量，需确认 |
| **Reactivate** | dormant | 超配额时提示选择或升级 |
| **Archive** | dormant | 需二次确认 |

**批量激活超配额处理：**

> 「You can activate [M] of [N] selected clients. The remaining [N-M] will stay Dormant. [Activate [M]] [Upgrade plan] [Cancel]」

#### 客户快速预览面板（右侧滑出）

点击客户姓名打开：

- **固定顶部**：客户姓名 + Portal Email、管理状态徽章、健康状态徽章、「Open full details →」
- **动态状态区**：根据状态显示逾期天数、缺少文件，提供主操作按钮（active：「Send reminder」；dormant：「Reactivate」）
- **近期上传记录**：最近 3–5 条
- **底部快捷操作**：「Send Magic Link」·「Copy link」（active 时）/ 「Set to Dormant / Reactivate」（状态切换）

---

### A5b — 客户详情页 Client Detail Page

**URL:** `/dashboard/clients/[id]` · **布局:** 单页滚动，设置统一入口为顶部「Settings」按钮

#### 顶部信息卡（固定）

| 元素 | 说明 |
|------|------|
| 客户姓名 | 大字粗体 |
| Portal Contact Email | 灰色小字 |
| Xero Contact Email | 若与 Portal Email 不同则单独显示 |
| 管理状态徽章 | Active / Dormant / Dormant · Over limit / Archived |
| 健康状态徽章 | 当前状态；Dormant 显示「—」 |
| Portal 状态 | Portal on / Email Conflict |
| 上次提醒时间 | 「Last reminded: X days ago」 |
| View in Xero | 深链按钮（有 ContactID 时显示） |
| 星标 | 点击切换 |
| 快速操作 | 「Send Magic Link」·「Copy link」·「Settings」·「Delete client」 |
| **状态切换按钮** | active 时显示「Set to Dormant」（灰色文字）；dormant 时显示「Reactivate」（Teal 主按钮）；archived 时显示「Unarchive」 |

**Set to Dormant Confirm Popover：**

> 「Set [ClientName] to Dormant? Their Portal will be paused and they won't count toward your active limit. All history and settings are preserved.」
> [Cancel] [Set to Dormant]

**Reactivate 超配额拦截：**

> 「Active client limit reached (20/20). Upgrade your plan or set another client to Dormant first.」
> [Upgrade plan →] [Manage clients →] [Cancel]

#### 警告横幅（条件显示，顶部信息卡下方）

| 条件 | 横幅内容 |
|------|---------|
| Dormant 期间有截止日错过（激活瞬间） | 「⚠ [ClientName] missed [N] deadline(s) while dormant. [Send reminder now] [Dismiss]」 |
| Xero 联系人已删除 | 「⚠ This contact no longer exists in Xero. [Archive] [Dismiss]」 |
| Xero ContactID 消失 | 「🟠 This Xero contact can no longer be found. Uploads will fail until you link a new contact. [Link new Xero contact →]」 |
| Filio-only 客户（无 ContactID） | 「This client is not linked to Xero. [Link Xero contact →]」 |

#### 块 1 — 当前状态 + 发送提醒

**Active 状态：**
- 状态区：健康状态说明、上传进度条、下次 VAT 截止日 + 年账截止日
- 提醒区：上次提醒时间、模板选择、邮件预览、「Send」按钮

**Dormant 状态：**
- 替换为灰色提示块：「This client is dormant. Reactivate to send reminders or receive uploads.」
- 隐藏提醒发送区域

#### 块 2 — 文件清单（Professional+）

- Active：本期每类文件完成状态，可修改类型
- Dormant：只读展示，显示「Dormant」水印，不可编辑
- Starter 套餐显示模糊样式及升级引导

#### 块 3 — 近期上传

- **默认收起：** 最近 5 条，失败记录红色高亮
- **展开后：** 全部记录（分页），支持批量下载 ZIP，支持内联重命名/重新分类
- **Dormant 状态下：正常展示**，历史记录完整只读可查
- 顶部右侧：「Export CSV」·「Export PDF」

#### 块 4 — Magic Email（Professional+）

- Active：当前专属邮箱地址 + 复制按钮；Sender 验证状态（只读，修改入 Settings）
- Dormant：显示为已停用状态，不可操作

#### 块 5 — 统计数据（可折叠，默认收起）

总上传文件数 · Xero 同步成功数 · 同步失败数（红色）· 最后上传时间

#### 块 6 — Activity Timeline（新增，默认收起）

时间线以倒序记录该客户所有关键事件：

```
── 今天 ──────────────────────────────────────────
  14:23  📎 Upload received · Receipt · 2.3MB · Portal
  09:11  📧 Reminder sent · VAT deadline in 7 days

── 2026年3月 ─────────────────────────────────────
  Mar 15  ⏸  Set to Dormant by [AccountantName]
  Mar 15  ⚠  Missed VAT deadline (31 Jan 2026) while dormant
  Feb 28  ▶  Reactivated by [AccountantName]
  Feb 10  📎 Upload received · Bank Statement · Magic Email
  Jan 05  ⏸  Set to Dormant by [AccountantName]
```

| 图标 | 事件类型 |
|------|---------|
| 📎 | 文件上传（成功） |
| ❌ | 文件上传（失败） |
| 📧 | 提醒发送 |
| ⏸ | 设为 Dormant |
| ▶ | 重新激活 |
| 🗄 | 归档 / 解除归档 |
| ⚠ | 截止日逾期（含 Dormant 期间错过） |
| 🔗 | Xero 联系人绑定 / 解绑 |
| ✏️ | 客户信息变更 |
| ↗ | 回写 Xero |

> 时间线是对现有审计日志的前端呈现，不增加额外数据存储。

#### 客户设置浮空页（点击顶部「Settings」打开）

**Portal Access（修改）**

| 设置项 | 说明 |
|--------|------|
| **Client status** | Toggle 开关：Active（开）/ Dormant（关）。与顶部按钮行为一致，两入口同步。 |
| Portal Contact Email | 事务所内唯一 |
| Portal 状态 | Active / Email Conflict（只读） |
| 客户端语言 | 继承默认 / 单独覆盖 |
| 发送上传链接 | 立即发送 Magic Link；Email Conflict 时禁用 |
| 重新生成 Token | 旧 Token 立即失效，写入审计日志 |

**Deadline & Reminders（不变）**

| 设置项 | 说明 |
|--------|------|
| VAT 季度组 | 组 A / B / C，继承全局可单独覆盖 |
| 财年结算日 | 月份 + 日期选择器 |
| 未来 12 个月截止日预览 | 自动计算列表 |
| 自动提醒开关 | 开启 / 关闭此客户的自动催收邮件 |
| 提醒节点 | 截止日前 30 / 14 / 7 / 1 天（可多选） |
| Reply-To 邮箱 | 可单独覆盖全局设置 |
| 自定义邮件文案 | 支持 HTML/富文本，支持变量 |
| 提醒发送历史 | 时间 · 触发节点 · 发送状态 |

**Document Checklist（Professional+，不变）**

| 设置项 | 说明 |
|--------|------|
| 清单模式 | 继承全局模板 / 自定义 |
| 文件类型勾选 | 收据 · 发票 · 银行对账单 · 合同 · 工资单 · 其他 |
| 每类文件备注 | 显示在客户上传页 |

**Magic Email（Professional+，不变）**

| 设置项 | 说明 |
|--------|------|
| 更换 Magic Email 地址 | 旧地址立即失效 |
| Sender 验证开关 | 开启：仅接受 Portal Contact Email 发送的附件 |
| 发送自动转发教程 | 向客户发送 Outlook / Gmail 自动转发配置指南 |

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
- 文件类型：全部 / 收据 / 发票 / 银行对账单 / 合同 / 工资单 / UNCLASSED / 其他
- 同步状态：全部 / 已同步 / 失败 / 待处理
- 上传渠道：全部 / Portal / Magic Email / Manual
- 按客户筛选

#### 上传记录表格

| 列名 | 说明 |
|------|------|
| 文件预览 | 图片缩略图 或 PDF 图标 |
| 文件名 | 重命名后（粗体）+ 原始文件名（灰色） |
| 客户 | 姓名 + 头像字母圆圈 |
| 文件类型 | 彩色徽章；UNCLASSED 显示琥珀色 |
| 上传渠道 | Portal · Magic Email · Manual 图标徽章 |
| 文件大小 | KB / MB |
| 上传时间 | 相对时间，悬停显示完整时间 |
| Xero 状态 | 绿色「Synced」/ 红色「Failed」/ 琥珀色「Pending」/ 红色「Failed · Xero contact not found」 |
| 操作 | 在 Xero 中查看 · 重命名/重新分类 · 重试（失败时）· 下载 |

#### 重命名 / 重新分类

点击文件类别徽章或「Reclassify」打开内联编辑：选择新类别 → 预览新文件名 → 可手动覆盖 → 勾选「Also update filename in Xero」→ 「Save」

#### 批量下载

选中文件 → 「Download ZIP」→ Filio 调用 Xero API 获取文件流 → 内存打包 → 自动下载，命名：`Filio_Download_ClientName_YYYYMMDD.zip`

---

### A7 — 设置：Xero 连接

**URL:** `/dashboard/settings/xero`

**设置侧边导航：** Profile · Xero Connection · Notifications · Branding · Team Members `[V3]` · Billing · Global Defaults · API Access `[V3]`

**状态一：未连接** — 「Connect with Xero」+ 核心价值说明 + 权限清单

**状态二：已连接**

| 元素 | 说明 |
|------|------|
| 连接状态卡片 | 组织名称、连接日期、最后同步时间、「Sync now」 |
| 已授权权限 | OAuth Scope 列表 |
| 断开连接（危险区） | 输入「DISCONNECT」确认；断开后所有 Portal 立即停用，未同步文件不保留 |

---

### A7a — 设置：个人资料 Profile

**URL:** `/dashboard/settings/profile`

| 功能项 | 说明 |
|--------|------|
| 头像上传 | JPG/PNG，最大 2MB |
| 个人信息 | 姓名、邮箱（不可修改）、职位 |
| 密码修改 | 当前密码 + 新密码 + 确认 |
| 语言偏好 | English / 简体中文；仅影响当前会计师后台 |

---

### A7b — 设置：通知 Notifications

**URL:** `/dashboard/settings/notifications`

| 通知项 | 默认 | 说明 |
|--------|------|------|
| 每日摘要邮件 | 开 | 每天 8 点按事务所时区发送前一日上传汇总 |
| 同步失败警告 | 开 | 文件同步至 Xero 失败时立即发送 |
| 客户逾期提醒 | 开 | 有客户进入 Overdue 状态时发送 |
| **Active 配额 80% 警告** | 开 | 首次超过 80% 时发送邮件 |
| **客户自动转 Dormant** | 开 | 套餐降级超额时立即发送，含受影响客户名单 |
| **Dormant 客户沉睡提醒（180天）** | 开 | 每客户仅发一次 |
| **Dormant 客户上传尝试** | 开 | Dormant 期间 Magic Email 收到附件时通知 |
| **周报邮件** `[V3]` | 开 | 每周一按事务所时区发送 |

---

### A8 — 设置：品牌定制 Branding

**URL:** `/dashboard/settings/branding` · **可用套餐:** Professional / Firm

| 功能项 | 说明 |
|--------|------|
| Logo 上传 | PNG/SVG/JPG，最大 2MB，建议 200x60px |
| 品牌色选择器 | 颜色选择器 + Hex 输入，实时预览 |
| 门户欢迎语 | 最多 200 字，支持粗体/斜体 |
| 自定义域名 `[V3]` | Firm 专属：`portal.yourfirm.co.uk` |
| 实时预览面板 | 右侧 300px |

---

### A9 — 设置：订阅账单 Billing

**URL:** `/dashboard/settings/billing`

#### 当前使用情况卡片

```
Current usage
─────────────────────────────────────────
Active clients      18 / 20   ████████████████░░  90%
Dormant clients      3 / 40   ███░░░░░░░░░░░░░░░   8%
Archived clients     2 / —
─────────────────────────────────────────
[Upgrade to Professional →]   ← Active ≥ 80% 时变为 Teal 强调按钮
```

#### 套餐对比

| 功能 | Starter £29/月 | Professional £69/月 | Firm £149/月 |
|------|----------------|---------------------|--------------|
| Active 客户上限 | 20 | 100 | 不限 |
| Dormant 客户上限 | 40 | 200 | 不限 |
| Archived 客户 | 不限 | 不限 | 不限 |
| 会计师账号 | 1 | 3 | 不限 |
| Xero 自动同步 | ✓ | ✓ | ✓ |
| Magic Link 访问 | ✓ | ✓ | ✓ |
| 自动催收提醒 | ✓ | ✓ | ✓ |
| 客户健康状态视图 | ✓ | ✓ | ✓ |
| 审计日志导出 | ✓ | ✓ | ✓ |
| 周报邮件 `[V3]` | ✓ | ✓ | ✓ |
| 文件清单 | — | ✓ | ✓ |
| 品牌定制 | — | ✓ | ✓ |
| Magic Email | — | ✓ | ✓ |
| **Client Activity 页面** | — | ✓ | ✓ |
| **批量 Dormant 管理** | — | ✓ | ✓ |
| 完全白标 | — | — | ✓ |
| 自定义门户域名 `[V3]` | — | — | ✓ |
| Xero 联系人标签同步 `[V4]` | — | — | ✓ |
| 支持方式 | 邮件 | 优先邮件 | 电话 + 邮件 |

- 月付/年付切换（年付省约 17%）
- 支付方式管理（Stripe 账单门户）
- 账单历史（最近 6 张发票，含下载）
- 取消订阅（触发留存挽回弹窗）

---

### A10 — 设置：全局默认 Global Defaults

**URL:** `/dashboard/settings/defaults`

#### Section 0 — 语言默认值

| 设置项 | 说明 |
|--------|------|
| 默认后台语言 | English / 简体中文；默认 English |
| 默认客户端语言 | English / 简体中文；默认 English |

#### Section 1 — MTD / VAT 默认季度组

默认 VAT 季度组三选一：组 A（1/4/7/10月）· 组 B（2/5/8/11月）· 组 C（3/6/9/12月）

#### Section 2 — 默认文件清单模板（Professional+）

文件类型勾选 + 每类文件默认备注文字。新客户继承此模板，现有客户不受影响。

#### Section 3 — 默认自动提醒设置

| 设置项 | 说明 |
|--------|------|
| 自动提醒总开关 | 开启 / 关闭所有客户的自动催收邮件（可被每客户覆盖） |
| 默认提醒节点 | 截止日前 30 / 14 / 7 / 1 天（可多选） |
| 提醒邮件发件人名称 | 如「Smith & Co via Filio」 |
| Reply-To 邮箱地址 | 客户回复直接进入此邮箱 |
| 调度时区 | 统一按事务所时区执行 |
| 默认提醒邮件正文 | 可编辑模板，支持变量 |
| 自动取消规则 | 客户完成相关上传后取消待发提醒 |

#### Section 4 — 文件处理默认值

| 设置项 | 说明 |
|--------|------|
| Xero 上传方式 | Attachments API / Files API |
| 自动重命名开关 | 修改文件类别时是否默认同步更新 Xero 文件名（默认：开启） |
| Magic Email 发件人校验 | 新客户是否默认开启发件人校验（默认：开启） |
| 单文件大小上限 | 统一按 10MB 处理 |

#### Section 5 — 全局覆盖操作

| 操作 | 说明 |
|------|------|
| 「Apply to all existing clients」 | 显示受影响客户数与覆盖项摘要；二次确认后执行 |
| 「Reset all clients to global defaults」 | 需输入「RESET」强确认；执行后不可撤销 |

---

### A11 — 客户活跃度 Client Activity（Professional+）

**URL:** `/dashboard/clients/activity` · **可用套餐:** Professional / Firm

#### 页面定位

集中展示所有客户活跃度数据，支持批量管理 Active/Dormant 状态。Starter 套餐点击入口后显示升级引导页。

#### 顶部汇总卡片（四卡片）

| 卡片 | 内容 |
|------|------|
| Active clients | 18 / 20，进度条 |
| Dormant clients | 3 / 40 |
| No uploads in 90+ days | N 个 active 客户（红色数字） |
| Upcoming deadlines | 未来 30 天内有截止日的 active 客户数 |

#### 筛选与排序

| 筛选项 | 选项 |
|--------|------|
| 管理状态 | Active · Dormant · All |
| 活跃度 | 全部 · 90天无上传 · 180天无上传 · 从未上传 |
| 截止日状态 | 全部 · 有即将到期截止日 · 已逾期 |

排序：最后上传时间（默认，最久没动排前）· 客户名 A-Z · 加入时间

#### 客户列表表格

| 列名 | 说明 |
|------|------|
| 客户姓名 | 点击跳转 A5b |
| 管理状态 | Active / Dormant 徽章 |
| 最后上传 | 相对时间；90天以上显示琥珀色；从未上传显示「Never」红色 |
| 上传总数 | 历史总上传文件数 |
| 下次截止日 | 类型 + 日期；Dormant 显示「—」 |
| 操作 | Set to Dormant / Reactivate 单行快捷操作 |

#### 批量操作

选中后显示批量操作栏：Set to Dormant · Reactivate · Archive

#### 页面右侧建议区（可折叠）

系统根据活跃度数据自动展示建议：

```
💡 Suggested actions
──────────────────────────────
5 clients haven't uploaded in 90+ days.
Consider setting them to Dormant.
[Review these clients →]

You're at 90% of your active limit.
[Upgrade to Professional →]
```

#### Starter 套餐升级引导页

```
Client Activity is available on Professional and above.
You can still manage clients individually from the Clients page.
[Upgrade to Professional →]   [Back]
```

---

### V4 — 提醒中心 Reminders Center `[V4]`

**URL:** `/dashboard/reminders`

#### 视图一：待发队列

列：客户姓名 | 触发节点 | 预计发送时间 | 邮件模板 | 状态

#### 视图二：已发记录

列：客户姓名 | 发送时间 | 触发节点 | 状态（已送达 / 失败 / 已打开）

---

## Section B — 客户端门户页面

---

### B1 — 客户门户入口 Client Portal Entry

**URL:** `/portal` · **访问权限:** 公开

| 元素 | 说明 |
|------|------|
| 品牌展示 | 默认「Powered by Filio」；Firm 套餐可替换为事务所 Logo |
| 邮箱输入 + 发送按钮 | 「Send my upload link」，Teal 全宽按钮 |
| 成功状态 | 「If the email is eligible, a secure link has been sent.」 |
| 无匹配 / 冲突 / 不可用 | 前端均不暴露具体原因；后台不发送链接 |

> 系统仅基于 `Portal Contact Email` 识别客户，不直接使用 Xero Contact Email 做 Portal 路由。**Dormant 客户**通过 B1 入口请求链接时，系统不发送链接，前端显示通用「If the email is eligible」文案（不暴露 Dormant 状态）。

---

### B2 — 客户文件上传页 Client Upload Page

**URL:** `/upload/[token]` · **访问权限:** 持有有效 Token 的客户

**Dormant 客户访问时：** 不显示通用「链接已失效」页面，而是显示专属暂停页（见 C1）。

#### 正常状态页面头部

| 元素 | 说明 |
|------|------|
| 事务所品牌 | Logo 或事务所名称 |
| 安全徽章 | 「Secure upload · Encrypted · Powered by Filio」 |
| 欢迎语 | 「Hi [ClientName], upload your documents for [FirmName]」 |

#### 文件清单进度（Professional+）

```
This quarter's documents — 2 of 5 uploaded
━━━━━━░░░░░░░░░  40%
✅ Bank Statement    ✅ Sales Invoices
⏳ Receipts          ⏳ Purchase Invoices    ⏳ Payslips
```

#### 文件类型选择

Receipt · Invoice · Bank Statement · Contract · Payslip · Other

#### 文件上传区域

| 功能项 | 说明 |
|--------|------|
| 拖拽上传 | 虚线边框，hover 变 Teal 背景 |
| 点击上传 | 触发文件选择器，移动端支持相机直拍 |
| 文件预览 | 图片缩略图 / PDF 图标 |
| 文件限制 | 最大 10MB；JPG/JPEG/PNG/PDF/HEIC/DOCX/XLSX |
| 自动压缩 | Attachments API 模式下前端压缩至 2MB（质量 0.7） |
| 自动命名预览 | `JohnSmith_Receipt_20260318.jpg` |

#### 上传结果

| 状态 | 说明 |
|------|------|
| 上传中 | 进度条 + 百分比 |
| 成功 | 绿色对勾 + 「Document sent to [FirmName].」 |
| 重复文件 | 提示「此文件已上传」+ 「强制重新上传」 |
| 继续上传 | 「Upload another document」重置表单 |

#### 错误状态

| 类型 | 样式 |
|------|------|
| Token 已过期 | 红色，「链接已失效，请联系您的会计师」 |
| 上传失败 | 红色 + 重试按钮 |
| 文件过大 | 琥珀色「Maximum size is 10MB」 |
| 文件类型不支持 | 琥珀色 |

---

### B3 — 客户多文件上传页 Multi-Upload

**URL:** `/upload/[token]/multiple` · **可用套餐:** Professional / Firm

| 功能项 | 说明 |
|--------|------|
| 季度指示器 | 「Q1 2026 · Deadline: 31 January 2026」，14 天内显示琥珀色倒计时 |
| 文件清单进度 | 同 B2 |
| 多文件拖拽区 | 支持一次选择多文件 |
| 上传队列 | 每文件：缩略图 · 可编辑文件名 · 类型下拉框 · 状态 · 移除 |
| 批量上传按钮 | 「Send [N] documents to [FirmName]」 |
| 完成状态 | 「All [N] documents sent successfully!」 |

---

## Section C — 辅助与系统页面

---

### C1 — 错误与兜底页面

**URL:** `/404` · `/link-expired` · `/portal-paused` · `/error`

| 页面 | 核心元素 | 引导操作 |
|------|----------|----------|
| 404 | 大号「404」Teal 数字 | 已登录→Dashboard，未登录→filio.uk |
| 链接已过期 | 灰色锁形图标 | 「链接已失效，请联系您的会计师」 |
| **Portal 已暂停（新增）** | 事务所品牌 + 暂停说明 | 「Contact [FirmName] →」mailto 链接 |
| 通用错误 | Warning 图标 | 「Retry」+「Contact support」 |

#### Portal 暂停页规格（`/portal-paused` 或 `/upload/[token]` 当客户为 Dormant 时）

```
┌─────────────────────────────────────────────┐
│  [FirmName] Logo                            │
│                                             │
│  Your upload portal is currently paused.   │
│                                             │
│  Please contact [FirmName] if you need      │
│  to submit documents.                       │
│                                             │
│  [Contact [FirmName] →]                     │
│                                             │
│  Powered by Filio · filio.uk                │
└─────────────────────────────────────────────┘
```

- 「Contact [FirmName] →」：`mailto:` 指向会计师 Reply-To 邮箱
- 不显示任何技术原因或内部状态
- 页面展示事务所品牌，与正常上传页视觉一致

---

### C2 — 忘记密码与重置

**URL:** `/auth/forgot-password` · `/auth/reset-password`

| 步骤 | 说明 |
|------|------|
| 1. 输入邮箱 | 点击「Send reset link」 |
| 2. 邮件发送 | 包含安全 Token 的重置链接（有效期 1 小时） |
| 3. 设置新密码 | 输入新密码并确认 |
| 4. 成功提示 | 提示修改成功，提供「Return to login」按钮 |

---

## 附录一：设计系统摘要

### 品牌色彩

| Token | Hex | 用途 |
|-------|-----|------|
| Primary Teal | `#1D9E75` | 按钮、激活状态、重要徽章 |
| Navy | `#0F2744` | 侧边栏背景、标题文字 |
| Accent Blue | `#1A6FBF` | 链接、Xero 相关 UI |
| Amber | `#BA7517` | 警告、即将到期 |
| Danger Red | `#C0392B` | 错误、失败同步、删除操作 |
| Xero Blue | `#13B5EA` | 仅用于 Xero 品牌按钮 |

### 健康状态色彩

| 状态 | Tailwind |
|------|----------|
| Overdue | `bg-red-100 text-red-700` |
| Due Soon | `bg-amber-100 text-amber-700` |
| Not Started | `bg-blue-100 text-blue-700` |
| In Progress | `bg-yellow-100 text-yellow-700` |
| Complete | `bg-green-100 text-green-700` |
| No Action | `bg-gray-100 text-gray-500` |

### 管理状态色彩

| 状态 | Tailwind |
|------|----------|
| Active | `bg-green-100 text-green-700` |
| Dormant | `bg-gray-100 text-gray-500` |
| Dormant · Over limit | `bg-amber-100 text-amber-700` |
| Archived | 灰色淡显 |
| Xero contact not found | `bg-orange-100 text-orange-700` |

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
| 移动端 | 375px+ | 客户页 B1/B2 |
| 平板 | 768px+ | — |
| 桌面 | 1280px+ | 会计师页 A4–A11 |

---

## 附录二：Magic Email 附件处理逻辑

1. **附件提取**：仅提取邮件附件，**完全忽略邮件正文**
2. **格式与大小校验**：同 Portal 上传限制
3. **失败处理**：不支持的格式或超大附件不被上传，在 A6 标记为失败
4. **多附件处理**：一封邮件多个合法附件，全部上传至 Xero
5. **数据清理**：成功上传至 Xero 后立即从 Filio 服务器删除附件实体
6. **Dormant 客户处理**：附件不上传，不向客户发送任何回复，在会计师通知中心生成通知

---

## 附录三：邮件模板清单

所有邮件发件人显示格式为「{FirmName} via Filio」，Reply-To 为会计师在 Settings 中配置的真实邮箱。

| 编号 | 名称 | 触发 | 可用变量 | 说明 |
|------|------|------|---------|------|
| E1 | Magic Link 发送 | 手动/自动 | `[ClientName]`, `[FirmName]`, `[UploadLink]` | 向客户发送专属上传链接 |
| E2 | 季度截止提醒 | 自动/手动 | `[ClientName]`, `[FirmName]`, `[DeadlineDate]`, `[UploadLink]` | 提醒客户即将到来的 VAT 截止日 |
| E3 | 催发票 | 手动 | `[ClientName]`, `[FirmName]`, `[UploadLink]` | 催促客户上传发票 |
| E4 | 催银行对账单 | 手动 | `[ClientName]`, `[FirmName]`, `[UploadLink]` | 催促客户上传银行对账单 |
| E5 | 催收据 | 手动 | `[ClientName]`, `[FirmName]`, `[UploadLink]` | 催促客户上传收据 |
| E6 | 自定义提醒 | 手动 | `[ClientName]`, `[FirmName]`, `[DeadlineDate]`, `[UploadLink]` | 会计师自定义内容 |
| E7 | 密码重置 | 自动 | `[AccountantName]`, `[ResetLink]` | 有效期 1 小时 |
| E8 | 上传链接请求 | 自动 | `[ClientName]`, `[FirmName]`, `[UploadLink]` | 客户通过 B1 请求链接 |
| E9 | 试用到期提醒 | 自动 | `[AccountantName]`, `[FirmName]`, `[DaysRemaining]` | 结束前 3 天、1 天、到期当天 |
| E10 | 数据保留警告 | 自动 | `[AccountantName]`, `[FirmName]`, `[DaysRemaining]` | 到期后 30 天、50 天、58 天 |
| E11 | Dormant 沉睡提醒 | 自动（180天，每客户一次） | `[AccountantName]`, `[ClientName]`, `[FirmName]`, `[ReactivateLink]`, `[ArchiveLink]` | 提醒会计师处理长期沉睡客户 |
| E12 | 客户自动转 Dormant | 自动（套餐降级超额） | `[AccountantName]`, `[FirmName]`, `[AffectedClients]`, `[UpgradeLink]` | 降级通知，含受影响客户列表 |
| E13 | Active 配额 80% 警告 | 自动（首次超 80%） | `[AccountantName]`, `[FirmName]`, `[ActiveCount]`, `[ActiveLimit]`, `[UpgradeLink]` | 升单触达邮件 |

所有邮件模板均支持 HTML/富文本格式。

---

## 附录四：审计日志事件清单

| 事件 | 说明 |
|------|------|
| `upload_started` | 上传开始 |
| `upload_succeeded` | 上传成功 |
| `upload_failed` | 上传失败，记录原因 |
| `xero_sync_succeeded` | Xero 同步成功 |
| `xero_sync_failed` | Xero 同步失败 |
| `xero_sync_completed` | 增量同步完成，记录新增待导入数、更新数、消失数 |
| `xero_push_succeeded` | 回写 Xero 成功，记录变更字段、操作者 |
| `xero_push_failed` | 回写 Xero 失败，记录原因 |
| `xero_contact_not_found` | 同步时检测到 ContactID 消失 |
| `xero_contact_linked` | 手动绑定 ContactID |
| `reminder_scheduled` | 提醒已排期 |
| `reminder_sent` | 提醒已发送 |
| `reminder_cancelled` | 提醒已取消（含取消原因） |
| `token_regenerated` | Token 重新生成，记录客户、操作者 |
| `xero_disconnected` | 断开 Xero，记录操作者、时间、影响范围 |
| `client_imported` | 导入客户，记录来源（xero_import / manual_create）、ContactID、操作者 |
| `client_activated` | 转为 active，记录操作者、触发方式 |
| `client_dormanted` | 转为 dormant，记录操作者、原因（manual / plan_downgrade） |
| `client_archived` | 转为 archived |
| `client_unarchived` | 从 archived 恢复 |
| `client_deleted` | 软删除，记录删除者与时间 |
| `client_reactivated_overdue_acknowledged` | 激活时会计师确认已知晓逾期警告 |
| `dormant_upload_attempted` | Dormant 客户 Magic Email 收到附件 |
| `dormant_reminder_sent` | 180 天沉睡提醒发送 |
| `global_defaults_applied` | 全局默认应用至所有客户，记录前后配置快照 |

---

## 附录五：数据表核心字段（clients 表）

```sql
-- 主键与事务所关联
id                       UUID    PRIMARY KEY DEFAULT gen_random_uuid()
firm_id                  UUID    NOT NULL REFERENCES firms(id)

-- 客户管理状态
management_status        TEXT    NOT NULL DEFAULT 'active'
                                 -- 枚举: active | dormant | archived | deleted
management_status_reason TEXT    NULLABLE
                                 -- 枚举: manual | plan_downgrade | auto_archived
xero_not_found           BOOLEAN DEFAULT FALSE
                                 -- ContactID 在 Xero 消失时置 true

-- Xero 侧字段（只读，由同步更新）
xero_contact_id          TEXT    NULLABLE
                                 -- UNIQUE(firm_id, xero_contact_id)
xero_contact_name        TEXT    NULLABLE
xero_contact_email       TEXT    NULLABLE

-- Filio 自管字段
portal_contact_email     TEXT    NULLABLE  -- 事务所内唯一
is_filio_only            BOOLEAN DEFAULT FALSE  -- 手动创建且未绑定 Xero

-- 来源与时间戳
import_source            TEXT    NOT NULL DEFAULT 'manual_create'
                                 -- 枚举: xero_import | manual_create
imported_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
activated_at             TIMESTAMPTZ
dormanted_at             TIMESTAMPTZ
dormant_reminded_at      TIMESTAMPTZ  -- 180 天提醒，防重复
archived_at              TIMESTAMPTZ
deleted_at               TIMESTAMPTZ
```

---

## 附录六：HEIC 文件处理

iPhone 默认拍照格式为 HEIC。系统在客户上传 HEIC 文件时，自动在前端将其转换为 JPG 格式后再上传至 Xero。转换过程对客户透明。

---

## 附录七：批量提醒发送失败处理

1. 操作完成后显示结果摘要：「已成功发送 X 封，Y 封失败」
2. 失败的客户以红色高亮标记，显示失败原因
3. 提供「Retry failed」按钮支持一键重试
4. 所有发送记录（成功与失败）写入审计日志

---

## 附录八：版本规划

### V3 规划预览

| 功能 | 影响页面 | 说明 |
|------|----------|------|
| 多会计师团队管理 | A7 Team Members | 团队成员邀请、角色分配、权限管理 |
| 客户分配 | A5、A5b | 新增「负责会计师」列和筛选 |
| 自定义门户域名 | A8 品牌定制 | Firm 套餐专属 |
| API Access | A7 设置 | 开放 API 接口供第三方集成 |
| 周报邮件 | A7b 通知设置 | 每周一按事务所时区发送；Professional+ 含 Dormant 客户截止日摘要 |
| 邮件通知系统 | 全局 | 统一设计所有邮件通知规则与模板 |
| 试用期绑卡门槛 | A2 注册 | 用户积累后另行评估 |

### V4 规划预览

| 功能 | 影响页面 | 说明 |
|------|----------|------|
| 全局提醒中心 | V4 `/dashboard/reminders` | 待发队列与历史记录 |
| Xero 联系人 Group 标签同步 | A7 Xero 设置 | Firm 套餐专属，将 Filio Active 客户在 Xero 自动打标签 |

---

*Filio 产品功能规格文档 v3.0 · filio.uk · 2026年4月*
