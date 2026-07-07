# Filio — 产品功能规格文档

**Product Functional Specification**

> 版本 v3.1 · 2026年4月 · filio.uk
>
> 本文档覆盖 Filio 平台除公开营销网站之外的全部功能页面，包括：**会计师后台（Section A）· 客户端门户（Section B）· 辅助页面（Section C）**
>
> 标注 `[V3]` / `[V4]` 为后续版本规划。本版本在 v3.0 基础上整合多专家评审意见，修复 UX、工程与合规问题。

---

## 更新日志

| 版本   | 日期         | 变更内容 |
|------|------------|------|
| v1.0 | 2026-03-31 | 初始版本 |
| v1.1 | 2026-03-31 | 注册流程更新；MTD 改为每客户独立配置；新增自动催收提醒、文件清单、客户健康状态视图、审计日志导出；A5 详情面板扩充为 5 Tab |
| v1.2 | 2026-03-31 | A5 客户列表新增完整筛选排序系统；新增会计师手动上传功能；新增 Magic Email 安全校验与拦截日志；新增远程重命名/类别修正；新增批量下载（ZIP 打包）；A10 全局默认新增自动重命名开关与 Magic Email 安全默认值 |
| v1.3 | 2026-04-01 | 新增 A5b 独立客户详情页；重构 A5 右侧滑出预览面板；Onboarding 流程修正；移除客户 Active/Inactive 门户开关，改为套餐限额驱动升级；移除 Xero 关联状态字段；A5b 新增 View in Xero 深链 |
| v2.0 | 2026-04-01 | 重大更新：健康状态优先级、套餐降级策略、Onboarding 整合、全局 Xero 状态指示灯、星标客户、Xero 双轨 API、文件命名规范、中英双语、忘记密码、Magic Email 逻辑、V4 提醒中心 |
| v2.1 | 2026-04-01 | 规则收敛：配置优先级、健康状态决策表、语言默认值、Portal Email 唯一性、导入去重规则、提醒调度时区、危险操作规则、非功能需求 |
| v2.2 | 2026-04-01 | 技术落地：Supabase 方案、UK-first 表述、Storage 直传、jobs 表耐久化任务 |
| v3.0 | 2026-04-04 | 完整整合客户生命周期规格：引入 management_status 四状态模型；新增首次导入预览页、增量同步 diff 规则、手动创建客户流程、Client Activity 页面（Professional+）；A5 管理状态 Tab 与批量操作；A5b 时间线、Dormant 状态下各块行为、状态切换按钮；Portal 暂停专属提示页；Dormant Magic Email 通知逻辑；登录超额 Modal（3 天宽限）；重新激活后提醒恢复规则；Xero ContactID 消失处理；通知中心 Dormant 事件；A9 配额展示更新；试用期方案；数据隔离架构决策；邮件模板 E11–E13；周报功能规划（V3） |
| **v3.1** | **2026-04-04** | **专家评审修复版：** ① A5 表格列重构（10列→7列，合并管理状态+健康状态列、Portal 状态收入客户列） ② A5 导航重构（双行 Tab 改为主 Tab + 筛选芯片）③ B2 移除自动命名预览（不对客户暴露内部命名规范）④ A5b 顶部操作按钮精简（6个→2个+更多菜单）⑤ 警告横幅优先级规则（多横幅折叠）⑥ Xero OAuth Token 生命周期补充规格 ⑦ 提醒规则边界情况明确 ⑧ dormant_reminded_at 重置策略 ⑨ 批量下载性能方案（异步打包+临时链接）⑩ Dormant 激活后提醒不触发的设计理由 ⑪ Token 续期精确条件 ⑫ GDPR 软删除流程 ⑬ Magic Link 安全权衡声明 ⑭ Starter 套餐批量 Dormant 权限开放 ⑮ Firm 套餐合理使用政策 ⑯ A11 重新定位为分析视图 ⑰ 空状态设计规格 ⑱ 会计师端移动端布局规格 ⑲ 交互状态规范 |

---

## 版本范围说明（v3.1）

### In Scope（v3.1 新增/修改）

- A5 客户列表导航与列结构重构
- A5b 顶部操作区精简与警告横幅优先级规则
- B2 客户上传页客户侧体验修正
- Xero OAuth Token 生命周期规格
- 提醒调度边界情况与 dormant_reminded_at 重置策略
- 批量下载异步方案
- GDPR 软删除完整流程
- A11 重新定位
- 空状态规格
- 移动端响应式补充
- UI 交互状态规范

### Out of Scope（与 v3.0 相同，不纳入当前开发）

- Team Members / 多会计师权限体系 `[V3]`
- 客户负责人分配 `[V3]`
- 自定义门户域名 `[V3]`
- API Access `[V3]`
- 周报邮件功能 `[V3]`
- 全局 Reminders Center 独立页面 `[V4]`
- Xero 联系人 Group 标签同步 `[V4 · Firm]`
- 独立 Schema 数据隔离
- 试用期绑卡门槛

---

## 页面总览

| 编号  | 页面名称                    | URL 路径                                              | 版本                   |
|-----|-------------------------|---------------------------------------------------|----------------------|
| A1  | 登录页 Login               | `/auth/login`                                     | v2.1                 |
| A2  | 注册页 Register            | `/auth/register`                                  | v2.1                 |
| A4  | 会计师主仪表盘 Dashboard       | `/dashboard`                                      | v3.0                 |
| A5  | 客户管理 Clients            | `/dashboard/clients`                              | **v3.1**             |
| A5b | 客户详情页 Client Detail     | `/dashboard/clients/[id]`                         | **v3.1**             |
| A6  | 上传记录 Upload History     | `/dashboard/uploads`                              | **v3.1**             |
| A7  | 设置：Xero 连接              | `/dashboard/settings/xero`                        | **v3.1**             |
| A7a | 设置：个人资料 Profile         | `/dashboard/settings/profile`                     | v2.1                 |
| A7b | 设置：通知 Notifications     | `/dashboard/settings/notifications`               | v3.0                 |
| A8  | 设置：品牌定制 Branding        | `/dashboard/settings/branding`                    | v2.1                 |
| A9  | 设置：订阅账单 Billing         | `/dashboard/settings/billing`                     | **v3.1**             |
| A10 | 设置：全局默认 Global Defaults | `/dashboard/settings/defaults`                    | v2.1                 |
| A11 | 客户活跃度 Client Activity   | `/dashboard/clients/activity`                     | **v3.1** · Professional+ |
| B1  | 客户门户入口 Portal Entry     | `/portal`                                         | v2.1                 |
| B2  | 客户文件上传页 Upload          | `/upload/[token]`                                 | **v3.1**             |
| B3  | 客户多文件上传页 Multi-Upload   | `/upload/[token]/multiple`                        | v2.1                 |
| C1  | 错误与兜底页面                 | `/404`, `/link-expired`, `/portal-paused`, `/error` | v3.0                 |
| C2  | 忘记密码与重置                 | `/auth/forgot-password`, `/auth/reset-password`   | v2.1                 |
| V4  | 提醒中心 Reminders Center   | `/dashboard/reminders`                            | V4                   |

---

## 全局系统设计与业务规则

### 1. 配置优先级与默认值继承

（与 v3.0 相同，无变更）

| 配置类型                              | 优先级（高 → 低）                                | 默认值      |
|---------------------------------|------------------------------------------|---------|
| 会计师后台界面语言                         | 个人语言偏好（A7a）→ 事务所默认后台语言（A10）→ 系统默认          | English |
| 客户端门户语言                           | 客户级语言覆盖（A5b Settings）→ 默认客户端语言（A10）→ 系统默认 | English |
| 客户级截止日 / 提醒 / 文件清单 / Reply-To    | 客户级覆盖（A5b Settings）→ 事务所全局默认（A10）→ 系统默认    | 见各模块    |
| 套餐能力与权限                           | 套餐限制始终最高优先级，不可被下级设置覆盖                      | —       |

### 2. 客户健康状态判定逻辑

（与 v3.0 相同，无变更）

系统根据客户当前周期的上传进度与截止日计算健康状态。**健康状态仅对 `management_status = active` 的客户计算；dormant 客户健康状态显示为「—」。**

**状态优先级（从高到低）：**

1. **🔴 Overdue（已逾期）**：任一未完成截止日已过
2. **🟠 Due Soon（即将到期）**：任一未完成截止日在未来 14 天内
3. **🔵 Not Started（未开始）**：未来 15–30 天内存在截止日，且当前周期 0 个已上传文件
4. **🟡 In Progress（进行中）**：已上传部分文件，但仍未满足当前周期要求
5. **🟢 Complete（已完成）**：本周期所有要求的文件均已上传齐全
6. **⚪ No Action（无需操作）**：所有截止日均超过 30 天，或未配置任何截止日 / 文件清单

#### 决策表

| 条件                           | 最终状态        |
|------------------------------|-------------|
| 任一未完成截止日 < today             | Overdue     |
| 任一未完成截止日在未来 14 天内            | Due Soon    |
| 未来 15–30 天内有截止日，且本周期上传数 = 0  | Not Started |
| 已上传 1 个及以上文件，但未完成            | In Progress |
| 当前周期全部完成                     | Complete    |
| 其他情况                         | No Action   |

### 3. 客户管理状态模型（management_status）

#### 3.1 状态定义

（与 v3.0 相同）

| 状态         | 含义        | 占配额 | Portal | 提醒   | 历史记录    |
|----------|---------|-----|------|------|---------|
| `active`   | 正在服务      | ✅   | 开启   | 正常运行 | 可查可操作   |
| `dormant`  | 暂停服务，数据保留 | ❌   | 关闭   | 停止   | 只读可查    |
| `archived` | 不再跟踪      | ❌   | 关闭   | 停止   | 只读可查    |
| `deleted`  | 软删除 30 天  | ❌   | 立即失效 | 停止   | 30 天内只读 |

#### 3.2–3.3 状态流转规则与 UI 徽章

（与 v3.0 相同，无变更）

#### 3.4 重新激活后的提醒恢复规则 `[v3.1 补充设计理由]`

客户从 `dormant` 恢复为 `active` 时：

- 截止日仍在未来：自动按原配置恢复提醒调度，无需手动重开
- 截止日已过（Overdue）：提醒**不自动触发**

**设计理由（v3.1 新增）**：Dormant 期间客户可能已通过其他渠道处理了相关文件，若激活时立即自动发送催收邮件，会给客户造成困扰并损害会计师与客户的关系。正确做法是由会计师在了解实际情况后主动决定是否补发提醒。

**激活时 Overdue 警告横幅：**

```
⚠ [ClientName] missed [N] deadline(s) while dormant.
  VAT Return · 31 Jan 2026 (overdue 23 days)
  [Send reminder now]  [Dismiss]
```

此横幅不自动消失，必须手动操作后关闭。「Dismiss」操作记录「会计师已知晓」入审计日志。

#### 3.5 Dormant 期间截止日处理

（与 v3.0 相同）

#### 3.6 Dormant 沉睡提醒（180 天）

（与 v3.0 相同）

**`dormant_reminded_at` 重置策略（v3.1 新增）**：客户从 `dormant` 恢复为 `active` 再次进入 `dormant` 时，`dormant_reminded_at` 字段**自动重置为 NULL**。确保每次新一轮 dormant 周期均可在 180 天后再次触发提醒，避免永久性静默。

### 4. Xero 联系人与 Filio 客户的关系

（4.1–4.5 与 v3.0 相同）

#### 4.6–4.7 ContactID 消失与已删除联系人处理

（与 v3.0 相同）

### 5. 套餐配额与生命周期策略

#### 5.1 各套餐配额上限

| 套餐                  | Active 上限 | Dormant 上限 | Archived |
|---------------------|---------|----------|--------|
| Starter £29/月        | 20      | 40       | 不限     |
| Professional £69/月   | 100     | 200      | 不限     |
| Firm £149/月          | 不限      | 不限       | 不限     |

#### 5.2–5.4 试用期、套餐降级、试用到期策略

（与 v3.0 相同）

#### 5.5 Firm 套餐合理使用政策（v3.1 新增）

Firm 套餐虽标注「Active 客户不限」，但设有内部合理使用基准：

- **基准阈值**：1,000 个 active 客户
- **超额处理**：超过阈值时，系统自动触发 Anthropic 内部告警，运营团队主动联系该事务所评估企业协议
- **对外表述**：页面不展示此阈值，对外显示「Unlimited」；若客户规模触及限制，通过 1:1 沟通处理，而非自动降级
- **目的**：防止异常使用导致 Xero API 速率限制、邮件发送超额等不可控成本

#### 5.6 Xero 断开连接

（与 v3.0 相同）

### 6. 文件生命周期与 Xero 上传规则

（与 v3.0 相同，新增合规说明）

**文件存档责任声明（v3.1 新增）**：Filio 不是文件存档系统。文件成功写入 Xero 后，Filio 仅保留元数据与审计日志，不保存文件实体。**会计师须自行确保 Xero 端文件完整性**，以满足 HMRC 审查要求。此声明将在 A5b「近期上传」块顶部以信息提示形式展示，并在用户首次使用时通过 Onboarding 说明。

### 7. 文件命名规范与重复检测

（与 v3.0 相同）

### 8. 提醒调度与时区规则

（v3.0 基础上补充边界情况）

- 所有自动提醒、截止日判断、每日摘要统一按**事务所时区**执行
- **24 小时防重复规则**：适用于同一客户、同一截止事项、同一模板的**自动提醒**
- **手动发送不受 24 小时限制**：手动发送是会计师主动决策，不受防重复规则约束；覆盖同一客户同一事项的待发自动计划（标记为 `Superseded by manual send`）
- **自动取消规则**：客户完成上传后相关待发提醒自动取消，标记为 `Cancelled - condition met`

**边界情况明确（v3.1 新增）**：若自动提醒已发出，会计师在 2 小时内手动再次发送同一模板，手动发送正常执行（不受 24 小时限制），自动提醒标记为 `Superseded`。

### 9. 登录超额 Modal

（与 v3.0 相同）

### 10. Token 自动续期机制 `[v3.1 精确化]`

**续期触发条件（精确定义）**：

- 会计师完成登录（Session 建立成功）时，系统批量为该事务所所有 active 客户的 Token 执行续期
- 续期后 Token 有效期重置为从续期时刻起 **30 天**
- 若会计师连续 **30 天**未登录，Token 自动过期，客户将看到「链接已失效」提示

**续期频率限制**：同一会计师在 24 小时内多次登录，Token 仅在第一次登录时执行续期（防止无意义的频繁重置）。

**客户侧过期体验**：Token 过期后，B2 页面显示「链接已过期，请联系您的会计师获取新链接」，会计师重新登录后客户 Token 自动续期，无需手动操作。

### 11. 危险操作与审计原则

（与 v3.0 相同）

### 12. 非功能需求

#### 性能

- Dashboard / Clients / Uploads 首屏可交互目标：p75 < 2.5s
- 客户列表搜索、筛选、排序在 ≤500 客户规模下反馈时间：< 300ms
- 上传动作触发后 1s 内出现可见进度反馈

**批量下载性能方案（v3.1 修订）**：

批量下载不采用内存打包方案，改为**异步任务 + 临时下载链接**：

1. 用户点击「Download ZIP」后，系统将任务写入 `jobs` 表，返回「正在打包，稍后可下载」提示
2. 后台 Cron Job 依次调用 Xero API 获取文件流，打包为 ZIP 存至 Supabase Storage 私有 Bucket（临时对象，TTL 1 小时）
3. 打包完成后，系统通过通知中心（铃铛）通知会计师，附带 Signed URL 供下载
4. 单次批量下载最多 **50 个文件**；超出时前端提示拆分批次

此方案避免了内存 OOM 风险与 Xero API 速率限制问题。

#### 可靠性

（与 v3.0 相同）

#### 安全

- 所有 Token 使用高熵随机值
- 登录、忘记密码、Portal Link 请求接口必须限流，使用统一文案，避免账号枚举
- 所有危险操作必须进行权限校验并记录审计日志

**Magic Link 安全权衡声明（v3.1 新增）**：

Magic Link 是无密码访问入口，存在以下已知安全权衡：
- 若客户邮件账号被攻击者访问，攻击者可通过 B1 请求新 Magic Link 并上传文件
- 当前版本**不实施** IP 绑定或设备指纹验证，以保持客户上传体验的简洁性（会计师客户群体技术门槛低）
- **缓解措施**：Token 有效期 30 天（而非永久）；会计师可随时手动重新生成 Token 使旧链接失效；Magic Email Sender 验证可防止伪造邮件附件
- 未来版本评估「首次使用后锁定 IP 段」或「敏感操作发送 OTP」选项

#### 数据隔离

（与 v3.0 相同）

#### GDPR 软删除完整流程（v3.1 新增）

| 阶段                  | 时间点        | 系统行为                                      |
|--------------------|------------|-------------------------------------------|
| 软删除触发              | Day 0      | `deleted_at` 写入；Portal 立即失效；会计师仍可查看元数据    |
| 数据导出窗口              | Day 0–30   | 会计师可在 A5（已删除筛选）申请导出该客户所有元数据与审计日志（CSV）     |
| 自动彻底清除              | Day 30     | 系统清除：`clients` 记录、`portal_tokens`、客户设置     |
| 审计日志保留              | Day 30 起   | **审计日志不随客户彻底清除**，以匿名化形式保留（客户姓名替换为「[Deleted Client]`，email 哈希化），用于事务所合规存档，保留期 **7 年**（符合 UK HMRC 要求） |
| 会计师主动申请数据删除（被遗忘权） | 随时         | 会计师可通过 Billing 页面「Request data deletion」申请；处理周期 30 天；审计日志匿名化处理而非彻底删除 |

**UI 展示**：A5 「已删除」Tab 显示软删除客户，倒计时显示「将在 X 天后彻底删除」，提供「Export data」和「Restore」按钮（Restore = 从 deleted 恢复至 dormant）。

#### 可观测性

（与 v3.0 相同）

### 13. 多语言支持

（与 v3.0 相同）

### 14. Xero OAuth Token 生命周期规格（v3.1 新增）

#### 14.1 Token 类型与有效期

| Token 类型         | 有效期      | 获取方式               |
|------------------|----------|--------------------| 
| Access Token     | 30 分钟    | OAuth 授权 / Refresh |
| Refresh Token    | 60 天（活跃使用）| OAuth 授权           |

#### 14.2 自动 Refresh 策略

- 每次调用 Xero API 前，系统检查 Access Token 剩余有效期
- 剩余 < **5 分钟** 时，自动使用 Refresh Token 换取新 Access Token
- 新 Access Token 与新 Refresh Token 原子性写入数据库（防止并发请求使用过期 Token）

#### 14.3 Refresh Token 过期处理

- Refresh Token 失效（60 天无活动或被 Xero 撤销）时：
  1. 所有 Xero API 调用立即失败
  2. Xero 状态指示灯变为 🔴
  3. 通知中心生成「Xero connection expired」事件
  4. 会计师下次登录时，Dashboard 顶部显示红色横幅：「Your Xero connection has expired. [Reconnect →]」
  5. 客户 Portal 文件上传功能暂停（上传 UI 显示，但提交时返回错误提示会计师联系）

#### 14.4 多会计师场景（V3 预留）

OAuth Token 当前为 **firm 级**（绑定到 `firms` 表），不区分发起授权的具体会计师。V3 多会计师功能上线时需评估是否改为 user 级 Token。

### 15. 推荐技术实现（Supabase MVP）

（与 v3.0 相同）

### 16. UI 交互状态规范（v3.1 新增）

所有交互组件须实现以下状态，统一按以下规格执行：

```css
/* Hover — 表格行 */
table row hover: bg-gray-50

/* Focus — 所有输入框 */
input focus: ring-2 ring-[#1D9E75] ring-offset-1 outline-none

/* Disabled */
button/input disabled: opacity-40 cursor-not-allowed

/* Loading — 按钮内 Spinner */
使用 lucide-react Loader2，animate-spin，text-[#1D9E75]
按钮文字替换为 Spinner + 「Loading...」，同时 disabled

/* Active — 主 Tab 选中 */
tab active: border-b-2 border-[#1D9E75] text-[#1D9E75] font-medium

/* Chip 筛选选中 */
chip active: bg-[#1D9E75]/10 text-[#1D9E75] border border-[#1D9E75]/30

/* 错误状态 — 输入框 */
input error: border-red-400 ring-1 ring-red-400
```

---

## Section A — 会计师端功能页面

---

### A1 — 登录页 Login Page

（与 v3.0 相同）

---

### A2 — 注册页 Register Page

（与 v3.0 相同）

---

### A4 — 会计师主仪表盘 Dashboard

（与 v3.0 相同）

---

### A5 — 客户管理 Client Management `[v3.1 重构]`

**URL:** `/dashboard/clients` · **访问权限:** 已登录会计师

#### 页面头部

| 元素   | 说明                                                                         |
|-----|----------------------------------------------------------------------------|
| 主要操作 | 「Sync from Xero」+「Add client manually」                                     |
| 汇总卡片 | Active: 18/20 · Dormant: 3/40 · 进度条（仅 active 占比）· 本月上传文件数                |
| 搜索框  | 按姓名或邮箱实时过滤，结果高亮匹配文字                                                        |

#### Xero 新增联系人 Banner

（与 v3.0 相同）

#### 导入去重逻辑

（与 v3.0 相同）

#### 导航结构重构（v3.1 修订）

**将原「双行 Tab」改为「主 Tab + 筛选芯片」两层结构，解决认知层级混乱问题。**

**第一层：主 Tab（管理状态，页面级）**

```
[ Active (18) ]  [ Dormant (3) ]  [ Archived (2) ]  [ Deleted (0) ]
```

- 默认选中 Active
- Tab 切换时，下方列表与筛选芯片同步更新
- Deleted Tab 仅在有软删除客户时显示

**第二层：筛选芯片（健康状态，仅在 Active Tab 下显示）**

```
All  ·  🔴 Overdue (8)  ·  🟠 Due Soon (12)  ·  🔵 Not Started (9)  ·  🟡 In Progress (6)  ·  🟢 Complete (21)  ·  ⚪ No Action
```

- 芯片横排，可多选（用于同时查看 Overdue + Due Soon）
- Dormant / Archived Tab 下健康状态芯片整行隐藏（Dormant 客户健康状态无意义）
- Dormant 行整体 60% 透明度，仍可点击进入详情

**第三层：高级筛选面板（可折叠，搜索栏右侧「Filters」按钮展开）**

| 筛选维度            | 选项                                           |
|----------------|----------------------------------------------|
| 截止类型            | 全部 · 仅 VAT 季度申报 · 仅年账结算                      |
| VAT 季度组         | 全部 · 组 A · 组 B · 组 C                         |
| 截止时间范围          | 7 天内 · 14 天内 · 30 天内 · 已逾期 · 自定义             |
| 上传状态            | 全部 · 未上传 · 部分完成 · 已完成                        |
| 门户状态            | 全部 · Portal on · Email Conflict              |
| Xero 状态         | 全部 · Linked · Filio-only · Contact not found |
| 星标客户            | 全部 · 已星标                                     |
| 负责会计师 `[V3]`    | 按团队成员筛选                                      |

**第四层：排序**

默认「截止日最近」。支持按最近上传、姓名 A-Z、加入时间等排序。

#### 客户列表表格（v3.1 列结构重构）

**将原 10 列压缩为 7 列**，具体合并策略：
- 「管理状态」+「健康状态」合并为「状态」列（Dormant 时健康状态永远为「—」，两列无意义共存）
- 「Portal 状态」移入「客户信息」列作为第三行小徽章（从表格列降级为附属信息）
- 删除独立「星标」列，移至客户姓名左侧内联

| 列名    | 宽度      | 说明                                                                                     |
|-----|---------|----------------------------------------------------------------------------------------|
| ☐   | 40px    | 批量选择复选框                                                                                |
| 客户信息  | flex    | 行 1：⭐ 姓名（粗体）；行 2：邮箱（灰色小字）；行 3：Portal on / Email Conflict 徽章（text-xs）                |
| 状态    | 160px   | 上：管理状态徽章（Active/Dormant/etc）；下：健康状态圆点+文字（Dormant 时显示「—」）；xero_not_found 时右侧显示 🟠 图标  |
| 下次截止日 | 140px   | 类型徽章 + 日期；Dormant 显示「—」；7 天内红色                                                        |
| 上传进度  | 120px   | 「3/5 files」+ 迷你进度条；未配置清单显示「—」                                                          |
| 最近上传  | 100px   | 相对时间或「Never」（灰色）                                                                       |
| 操作    | 120px   | 发送链接 · 复制链接 · 更多（⋯）                                                                   |

**负责会计师** `[V3]` 列预留位置，默认隐藏。

#### 批量操作栏

（与 v3.0 相同，含以下 v3.1 修订）

**批量 Dormant 管理权限（v3.1 修订）**：

原「批量 Dormant 管理是 Professional+ 专属」调整为**所有套餐开放**。理由：批量设为 Dormant 是基础的账号管理能力，不是分析能力；若 Starter 用户因套餐降级超额，却没有批量工具处理，会造成高摩擦并推向流失而非升级。

**Client Activity 页面**（含活跃度分析、建议面板）仍维持 Professional+ 专属，作为两个套餐的实际差异点。

#### 客户快速预览面板（右侧滑出）

（与 v3.0 相同）

#### 空状态规格（v3.1 新增）

**Active Tab 无客户（首次使用 / 全部 Dormant）：**

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│   👥                                                 │
│   No active clients yet                              │
│   Import from Xero to get started, or add            │
│   clients manually.                                  │
│                                                      │
│   [Import from Xero]   [Add manually]                │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**筛选后无结果：**

```
No clients match your filters.
[Clear filters]
```

**Dormant Tab 为空：**

```
No dormant clients.
Clients you pause will appear here.
```

---

### A5b — 客户详情页 Client Detail Page `[v3.1 修订]`

**URL:** `/dashboard/clients/[id]`

#### 顶部信息卡（v3.1 精简操作区）

**操作按钮从 6 个精简为主操作区 2 个 + 更多菜单：**

| 位置        | 元素                                                                    |
|---------|-----------------------------------------------------------------------|
| 左侧信息区   | 客户姓名（大字粗体）、Portal Contact Email、Xero Contact Email（若不同则单独显示）、上次提醒时间 |
| 右侧徽章区   | 管理状态徽章、健康状态徽章、Portal 状态、⭐ 星标                                          |
| 操作按钮区   | 主按钮：**「Send Magic Link」**（Teal）；次按钮：**「Settings」**（outline）；更多菜单（⋯）  |
| 更多菜单（⋯）| 「Copy link」· 「View in Xero」（有 ContactID 时）· 「Regenerate token」         |
| 状态切换按钮  | active 时：「Set to Dormant」（text-only，text-gray-400，右下角）；dormant 时：「Reactivate」（Teal 按钮，顶部显眼位置）；archived 时：「Unarchive」 |

**设计理由（v3.1 新增）**：「Copy link」和「View in Xero」是低频操作，不应占据顶部按钮组的视觉权重；「Set to Dormant」是极低频且危险的操作，使用 text-only 降级并移至右下角，防止误触。

#### 警告横幅优先级规则（v3.1 新增）

当多个警告条件同时满足时，**最多显示 1 条最高优先级横幅**，其余折叠进「N issues to resolve」展开按钮。

**优先级排序（高→低）：**

1. 🟠 Xero ContactID 消失（`xero_not_found = true`）——上传会失败，影响核心功能
2. ⚠ Xero 联系人已删除——数据状态异常
3. ⚠ Dormant 激活时的逾期警告——需会计师主动决策
4. ℹ Filio-only 客户未绑定 Xero——功能受限提示

**展示逻辑：**

```
[最高优先级横幅]（始终展示）
[1 more issue to resolve ▼]（有次级问题时展示折叠行）
```

点击折叠行展开显示所有次级横幅。

#### 块 1—5

（与 v3.0 相同）

**块 3 — 近期上传（v3.1 补充合规提示）**：

块顶部右侧增加信息提示图标（ℹ），悬停显示：「Files are stored in Xero, not Filio. Ensure your Xero account is maintained for HMRC compliance purposes.」

#### 块 6 — Activity Timeline

（与 v3.0 相同）

#### 客户设置浮空页

（与 v3.0 相同）

#### A5b 空状态规格（v3.1 新增）

**块 3 近期上传为空：**

```
No uploads yet.
Send [ClientName] their upload link to get started.
[Send Magic Link →]
```

---

### A6 — 上传记录 Upload History `[v3.1 补充批量下载说明]`

（大部分与 v3.0 相同）

#### 批量下载（v3.1 修订）

选中文件 → 「Download ZIP」→

- 系统创建异步打包任务，写入 `jobs` 表
- 页面提示：「Preparing your download… We'll notify you when it's ready.」
- 打包完成后通知中心生成通知，附带 Signed URL（有效期 1 小时）
- 单次最多选中 **50 个文件**；超出时显示：「You can download up to 50 files at once. [Deselect some files]」
- ZIP 命名：`Filio_Download_ClientName_YYYYMMDD.zip`（单客户）或 `Filio_Download_YYYYMMDD.zip`（多客户）

---

### A7 — 设置：Xero 连接 `[v3.1 补充 Token 生命周期说明]`

**URL:** `/dashboard/settings/xero`

**状态二：已连接**（新增内容）

| 元素         | 说明                                                                       |
|-----------|--------------------------------------------------------------------------|
| 连接状态卡片    | 组织名称、连接日期、最后同步时间、「Sync now」                                              |
| **Token 状态** | 显示 Refresh Token 剩余有效天数；< 7 天时显示琥珀色警告「Reconnect soon to avoid interruption」 |
| 已授权权限     | OAuth Scope 列表                                                            |
| 断开连接（危险区）| 输入「DISCONNECT」确认；断开后所有 Portal 立即停用，未同步文件不保留                              |

---

### A7a — 设置：个人资料 Profile

（与 v3.0 相同）

---

### A7b — 设置：通知 Notifications

（与 v3.0 相同）

---

### A8 — 设置：品牌定制 Branding

（与 v3.0 相同）

---

### A9 — 设置：订阅账单 Billing `[v3.1 补充软删除入口]`

（大部分与 v3.0 相同，新增以下内容）

**数据与隐私区（v3.1 新增，页面底部）：**

```
Data & Privacy
──────────────────────────────────────────────────────
Request data deletion (Right to be Forgotten)
If you wish to permanently delete your firm's data from Filio,
submit a request below. Processing takes up to 30 days.

[Request data deletion →]
```

---

### A10 — 设置：全局默认 Global Defaults

（与 v3.0 相同）

---

### A11 — 客户活跃度 Client Activity（Professional+）`[v3.1 重新定位]`

**URL:** `/dashboard/clients/activity` · **可用套餐:** Professional / Firm

#### 页面重新定位（v3.1 修订）

**A11 定位为「分析视图」（Insight-driven），而非操作视图。**

**与 A5 的分工：**
- A5 = 操作中心（查看状态、发链接、发提醒、管理单个客户）
- A11 = 分析中心（活跃度趋势、批量决策建议、槽位管理）

**改变的交互原则**：A11 中的「Set to Dormant」等操作通过**跳转至 A5 并预选对应客户**完成，而不在 A11 内直接操作。这样避免了两套相似操作 UI 的维护负担，也让用户形成清晰的功能心智：「想看分析来 A11，想操作去 A5」。

#### 顶部汇总卡片（四卡片）

| 卡片                     | 内容                       |
|----------------------|--------------------------|
| Active clients       | 18 / 20，进度条              |
| Dormant clients      | 3 / 40                   |
| No uploads in 90+ days | N 个 active 客户（红色数字）      |
| Upcoming deadlines   | 未来 30 天内有截止日的 active 客户数  |

#### 筛选与排序

（与 v3.0 相同）

#### 客户活跃度列表（v3.1 调整操作列）

| 列名    | 说明                                               |
|-----|--------------------------------------------------|
| 客户姓名  | 点击跳转 A5b                                         |
| 管理状态  | Active / Dormant 徽章                              |
| 最后上传  | 相对时间；90 天以上显示琥珀色；从未上传显示「Never」红色                  |
| 上传总数  | 历史总上传文件数                                         |
| 下次截止日 | 类型 + 日期；Dormant 显示「—」                            |
| 操作    | 「View details →」跳转 A5b；不直接提供 Dormant/Reactivate 操作 |

#### 批量操作（v3.1 修订）

选中后显示批量操作栏，点击操作时**跳转至 A5 并自动预选对应客户**，提示：「Review these [N] clients in Clients page to manage their status.」

#### 页面右侧建议区（保留，v3.1 增强）

```
💡 Suggested actions
──────────────────────────────────────────────
5 clients haven't uploaded in 90+ days.
They could be moved to Dormant to free up slots.
[Review in Clients →]   ← 跳转 A5，预筛选这 5 个客户

You're at 90% of your active limit.
[Upgrade to Professional →]
```

#### 空状态规格（v3.1 新增）

**无不活跃客户：**

```
🟢  All your active clients have uploaded recently.
    No clients have been inactive for 90+ days.
```

**Starter 套餐升级引导页**

（与 v3.0 相同）

---

### V4 — 提醒中心 Reminders Center `[V4]`

（与 v3.0 相同）

---

## Section B — 客户端门户页面

---

### B1 — 客户门户入口 Client Portal Entry

（与 v3.0 相同）

---

### B2 — 客户文件上传页 Client Upload Page `[v3.1 修订]`

**URL:** `/upload/[token]`

**Dormant 客户访问时：** 跳转至 Portal 暂停页（C1）。

#### 正常状态页面头部

（与 v3.0 相同）

#### 文件清单进度（Professional+）

（与 v3.0 相同）

#### 文件类型选择

（与 v3.0 相同）

#### 文件上传区域（v3.1 修订）

| 功能项    | 说明                                      |
|------|----------------------------------------|
| 拖拽上传   | 虚线边框，hover 变 Teal 背景                    |
| 点击上传   | 触发文件选择器，移动端支持相机直拍                       |
| 文件预览   | 图片缩略图 / PDF 图标                          |
| 文件限制   | 最大 10MB；JPG/JPEG/PNG/PDF/HEIC/DOCX/XLSX |
| 自动压缩   | Attachments API 模式下前端压缩至 2MB（质量 0.7）    |
| **自动命名** | **不对客户展示自动命名预览**。内部命名规范（如 `JohnSmith_Receipt_20260318.jpg`）仅在会计师后台（A5b 块 3、A6）可见；客户侧只显示其原始文件名 |

**修改理由（v3.1）**：自动命名预览是面向会计师的内部命名规范，对普通客户（小企业主、个体户）展示会造成「我的文件名被改了？」的困惑与不安，降低上传体验。

#### 上传结果

（与 v3.0 相同）

#### 空状态规格（v3.1 新增）

**文件清单未配置（Starter 套餐客户）：**

不显示文件清单进度条，直接呈现上传区域，无「清单」相关 UI。

**所有清单项已完成：**

```
✅  All done for this quarter!
    You've submitted all required documents.
    You can still upload additional files below if needed.
```

---

### B3 — 客户多文件上传页 Multi-Upload

（与 v3.0 相同；同样移除自动命名预览）

---

## Section C — 辅助与系统页面

（与 v3.0 相同）

---

## 附录一：设计系统摘要

（颜色、排版、形状与 v3.0 相同）

### 响应式断点（v3.1 补充会计师端移动布局）

| 断点  | 宽度       | 优先用于           |
|---|----------|----------------|
| 移动端 | 375px+   | 客户页 B1/B2；会计师端简化视图 |
| 平板  | 768px+   | —              |
| 桌面  | 1280px+  | 会计师页 A4–A11    |

**会计师端移动布局规格（v3.1 新增）**：

A4 Dashboard（移动端）：
- 240px 侧边栏收起为顶部汉堡菜单
- 三卡片变单列堆叠
- 「即将到期面板」保留，以卡片形式展示
- 健康状态分组视图改为横向滚动 chips + 下方列表

A5 Clients（移动端）：
- 主 Tab 保留（管理状态）
- 表格退化为**卡片列表**：每张卡片显示客户名、状态徽章、下次截止日、快捷操作按钮
- 多维筛选面板改为底部 Sheet（从底部滑出）

A5b Client Detail（移动端）：
- 顶部信息卡单列布局
- Block 1–3 顺序展示，其余 Block 默认收起
- 「Send Magic Link」悬浮在底部（Fixed bottom bar）

---

## 附录二–四

（与 v3.0 相同）

---

## 附录五：数据表核心字段（clients 表）`[v3.1 补充字段注释]`

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
dormant_reminded_at      TIMESTAMPTZ
  -- [v3.1] 180 天提醒字段；客户从 dormant 恢复 active 再次进入 dormant 时
  -- 系统自动 RESET 为 NULL，确保新一轮 dormant 周期可再次触发提醒
archived_at              TIMESTAMPTZ
deleted_at               TIMESTAMPTZ
  -- [v3.1] 软删除；Day 30 执行彻底清除，审计日志以匿名化形式保留 7 年
```

---

## 附录六–七

（与 v3.0 相同）

---

## 附录八：版本规划

（与 v3.0 相同）

---

## 附录九：v3.1 修订决策记录

| 编号   | 问题来源      | 问题描述                     | 决策                                        |
|------|-----------|--------------------------|-------------------------------------------|
| D-01 | UX 专家     | A5 表格 10 列过多，桌面端无法正常渲染    | 合并「管理状态+健康状态」为「状态」列，Portal 状态降级为客户信息附属行，7 列 |
| D-02 | UX 专家     | 双行 Tab 认知层级混乱            | 改为主 Tab（管理状态）+ 筛选芯片（健康状态）两层结构              |
| D-03 | UX 专家     | B2 自动命名预览对客户造成困惑         | 移除客户侧命名预览，内部命名仅在会计师后台可见                     |
| D-04 | UX 专家     | A5b 顶部 6 个操作按钮过多         | 精简为 2 主按钮 + 更多菜单（⋯）                        |
| D-05 | UX 专家     | 多警告横幅并存无优先级              | 定义 4 级优先级，最多显示 1 条，次级折叠                     |
| D-06 | 后端工程师     | Xero OAuth Token 管理未规格化  | 新增第 14 节完整规格（类型/有效期/Refresh 策略/过期处理）        |
| D-07 | 后端工程师     | 提醒规则边界情况不明确              | 补充：手动发送不受 24 小时限制                          |
| D-08 | 后端工程师     | dormant_reminded_at 重置未定义 | 明确：active→dormant 转换时自动 RESET 为 NULL        |
| D-09 | 后端工程师     | 批量下载内存打包有性能风险            | 改为异步任务 + 临时 Signed URL，单次上限 50 个文件          |
| D-10 | 产品架构师     | Dormant 激活后提醒不触发缺少设计理由   | 补充：避免激活时自动邮件引发客户困扰，设计选择主动权归会计师             |
| D-11 | 产品架构师     | Token 续期「定期」定义模糊         | 精确化：会计师登录时触发，24 小时内重复登录仅续期一次               |
| D-12 | 安全/合规顾问   | GDPR 软删除流程未定义            | 新增完整流程：30 天窗口、彻底清除范围、审计日志匿名化保留 7 年         |
| D-13 | 安全/合规顾问   | Magic Link 安全权衡未声明       | 新增安全权衡声明（已知风险 + 现有缓解措施）                     |
| D-14 | 安全/合规顾问   | 文件不保留本地的 HMRC 合规风险      | 新增合规声明；A5b 块 3 增加 Xero 文件完整性提示             |
| D-15 | 商业分析师     | Starter 批量 Dormant 受限导致摩擦 | 批量 Dormant 对所有套餐开放；Client Activity 分析视图维持 Professional+ |
| D-16 | 商业分析师     | Firm 套餐「不限」有成本风险         | 新增内部合理使用政策（1000 active 客户内部阈值，1:1 协商机制）      |
| D-17 | 产品架构师/UX  | A11 与 A5 功能重叠             | A11 重新定位为分析视图，操作跳转至 A5，不在 A11 内重复实现        |
| D-18 | UX 专家     | 多处空状态缺失规格                | 新增 A5、A5b、B2、A11 空状态设计规格                   |
| D-19 | UX 专家     | 会计师端移动端布局未定义             | 新增 A4、A5、A5b 移动端布局规格                       |
| D-20 | UX 专家     | 交互状态（hover/focus 等）无统一规范  | 新增第 16 节 UI 交互状态规范                         |

---

*Filio 产品功能规格文档 v3.1 · filio.uk · 2026年4月*

*本版本为多专家评审修复版，在 v3.0 基础上整合产品架构师、UX 设计师、后端工程师、安全合规顾问及商业分析师评审意见，共处理 20 项决策项（D-01 至 D-20）。*
