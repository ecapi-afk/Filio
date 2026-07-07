# Filio — v0.dev 设计 Prompt 文档 v2

> 版本 v2 · 2026年4月
> 配色基准：filioportal-zvr9kfwb.manus.space 官网风格 + 后台层次感优化

---

## 全局设计系统（Global Design System）

> **使用方法：在 v0.dev 新建 Project 后，将此区块完整粘贴进 Project 的 System Prompt。之后每个页面 prompt 都会自动继承这套规范，无需重复说明颜色和字体。**

```
You are building "Filio" — a UK accountancy SaaS dashboard.
Follow this design system precisely for every component you generate.

VISUAL STYLE:
- Inspired by high-end SaaS products (Linear, Notion). Editorial, clean, restrained.
- Teal is used sparingly — only on the most important CTAs and active states.
- No drop shadows on cards. Use borders instead.
- Generous whitespace. Let content breathe.

COLORS:
- Page background: #F8F9FA (light gray — helps white cards "float")
- Card background: #FFFFFF with border: 1px solid #E5E7EB
- Primary Teal: #1D9E75 (main CTA buttons, active states, progress bars, key icons)
- Sidebar background: #111827 (near-black, neutral dark)
- Heading text: #111827
- Body text: #6B7280
- Small labels / metadata: #9CA3AF
- Links: #1A6FBF
- Xero brand color: #13B5EA (ONLY for Xero-specific buttons/badges)
- Amber warning: #BA7517
- Danger red: #C0392B

HEALTH STATUS BADGES (use exactly):
- Overdue:     bg-red-100    text-red-700
- Due Soon:    bg-amber-100  text-amber-700
- Not Started: bg-blue-100   text-blue-700
- In Progress: bg-yellow-100 text-yellow-700
- Complete:    bg-green-100  text-green-700
- No Action:   bg-gray-100   text-gray-500

MANAGEMENT STATUS BADGES:
- Active:               bg-green-100  text-green-700
- Dormant:              bg-gray-100   text-gray-500
- Dormant · Over limit: bg-amber-100  text-amber-700
- Archived:             text-gray-400, reduced opacity
- Xero contact not found: bg-orange-100 text-orange-700

TYPOGRAPHY:
- Font: Inter (system sans-serif fallback)
- NO script fonts, NO decorative italic serif fonts — prioritise readability
- Page titles: text-2xl font-semibold text-[#111827]
- Section titles: text-base font-semibold text-[#111827]
- Body: text-sm text-[#6B7280]
- Metadata / timestamps: text-xs text-[#9CA3AF]

SHAPE:
- Cards: rounded-lg (8px), no shadow, border border-[#E5E7EB]
- Inputs: rounded-md (6px), border border-[#E5E7EB]
- Badges: rounded-full (999px)
- Buttons (primary): rounded-md, bg-[#1D9E75], text-white
- Buttons (outline): rounded-md, border border-[#E5E7EB], text-[#111827]

LAYOUT:
- Sidebar: 240px, bg-[#111827], fixed left
- Main content: remaining width, bg-[#F8F9FA], px-8 py-6
- Max content width: 1200px
- Desktop target: 1280px+
```

---

## Section A — 会计师后台

---

### A4 — Dashboard（仪表盘）

**设计目的：** 会计师每天打开的首屏。5 秒内看清：今天有几个客户逾期、本月收到多少文件、有没有需要立即处理的事。

**页面逻辑：** 点击客户名 → A5b；点击健康状态分组卡片 → A5（带筛选预设）；点击「View all uploads」→ A6。

```
Build a Next.js + Tailwind accountant dashboard for "Filio".
Follow the Filio design system defined in the system prompt exactly.

SIDEBAR (240px, bg-[#111827]):
- "Filio" wordmark top-left (white, font-bold text-xl)
- Nav items with lucide-react icons:
    Dashboard (active: teal left border + bg-[#1D9E75]/10 text-[#1D9E75])
    Clients
    Upload History
    Settings
    Help Center
- Bottom of sidebar:
    Xero status pill: green dot + "Xero Connected" (small, gray text)
    Notification bell icon with red badge count "3"

MAIN CONTENT (bg-[#F8F9FA], px-8 py-6):

--- TOP STATS ROW (3 cards) ---

Card 1 "Active clients":
  Large number "18" with "/20" in gray
  Progress bar: 90%, amber color (#BA7517) because >80%
  Subtitle: "4 Dormant · 2 Archived" (text-xs gray)
  Warning label: "Approaching limit" (amber, text-xs)
  Link: "Manage clients →" (teal, text-xs)

Card 2 "Uploads this month":
  Large number "124"
  Subtitle: "files received"
  Mini bar sparkline (7 bars, varying heights, teal bars)

Card 3 "Action required":
  Large number "15" (text-[#C0392B] red)
  Subtitle: "8 overdue · 7 due soon"
  Link: "View all →" (teal, text-xs)

--- UPCOMING DEADLINES TABLE (card) ---
Header: "Upcoming deadlines" (font-semibold) + "Next 30 days" (gray small) + "View all →" right-aligned
Table columns: Client | Deadline Type | Due Date | Upload Status | Action
5 rows of UK mock data:
  - "Sarah Johnson · ABC Solutions" | VAT Return | 31 Jan (red, 3 days) | 🔴 Not uploaded | [Send reminder] teal outline btn
  - "Mark Davis · Davis Consulting" | VAT Return | 7 Feb (amber) | 🟡 2/5 files | [Send reminder]
  - "Emily Chen · Tech Innovations" | Year-End | 28 Feb | 🟢 Complete | —
  - "David Miller · Miller & Assoc" | VAT Return | 14 Feb (amber) | 🔴 Not uploaded | [Send reminder]
  - "Jessica Lee · Global Ent." | Year-End | 31 Mar | ⚪ No action | —

--- HEALTH STATUS GROUPS (6 cards, 3-col grid) ---
Title: "Client health overview"
Cards: Overdue (8, red) · Due Soon (7, amber) · Not Started (5, blue) · In Progress (9, yellow) · Complete (18, green) · No Action (0, gray)
Each: colored left border + status label + large count number. Hover: slight bg tint. Cursor pointer.

--- BOTTOM ROW (2 columns) ---

Left (flex-1): "Recent uploads"
Last 5 rows: initials circle (teal bg) + client name + file type badge + filename (truncated) + relative time + Xero status badge
"View all uploads →" link at bottom

Right (280px): "Quick actions" card
4 stacked outline buttons with icons:
  Sync from Xero
  Send reminder to overdue (8)
  Download audit report
  Manage client slots →
```

---

### A5 — Clients（客户管理）

**设计目的：** 管理所有客户的核心操作页。快速找到特定状态的客户，执行批量操作，看清每个客户的健康状态。

**页面逻辑：** 点击客户行 → 右侧滑出预览面板；点击「Open full details」→ A5b；批量选择 → 顶部批量操作栏出现。

```
Build a Next.js + Tailwind client management page for "Filio".
Follow the Filio design system defined in the system prompt exactly.

Same sidebar as Dashboard.

PAGE HEADER:
Title "Clients" (text-2xl font-semibold)
Right: "Sync from Xero" (outline btn, Xero blue icon) + "Add client manually" (teal primary btn)

SUMMARY CHIPS ROW (below header, horizontal):
  "Active 18/20" chip with mini amber progress bar
  "Dormant 3"
  "Archived 2"
  "124 files this month"

XERO BANNER (blue, dismissible):
"🔵  3 new contacts found in Xero.   [Import now →]   [Dismiss]"
bg-blue-50, border-blue-200, text-blue-700, rounded-lg

FILTER TABS — ROW 1 (health status):
All (47) | 🔴 Overdue (8) | 🟠 Due Soon (7) | 🔵 Not Started (5) | 🟡 In Progress (9) | 🟢 Complete (18) | ⚪ No Action (0)
Active tab: teal underline + teal text. Default: "All"

FILTER TABS — ROW 2 (management status):
Active (18) | Dormant (3) | Archived (2)
Default: Active. When Dormant/Archived selected, Row 1 hides.

SEARCH + FILTER BAR:
Search input with magnifier icon (flex-1) |
Dropdowns: Deadline type · VAT Quarter · Date range · Upload status · Portal status · Xero status · Starred |
Sort dropdown

CLIENT TABLE (card, no shadow, border):
Columns:
  ☐ checkbox
  Client (name font-medium text-[#111827] + email text-xs text-[#9CA3AF] below)
  ★ (toggle, gray/amber)
  Management Status badge
  Health Status badge
  Portal status badge (small)
  Next deadline (type badge + date, red if <7d, amber if <14d)
  Upload progress ("3/5 files" + mini teal progress bar)
  Last upload (relative time, gray)
  Actions: [Send link] [Copy ⧉] [⋯]

8 rows mock data:
  Row 1: Active | Overdue | Portal on | VAT 31 Jan (red) | 0/5 | 45 days ago
  Row 2: Active | Due Soon | Portal on | VAT 7 Feb | 2/5 | 3 days ago
  Row 3: Active | Complete | Portal on | Year-End 28 Feb | 5/5 | 1 day ago
  Row 4: Active | In Progress | Email Conflict | VAT 14 Feb | 3/5 | 7 days ago
  Row 5: Active | Overdue | Portal on | VAT 31 Jan (red) | 0/3 | Never (red)
  Row 6: Dormant (60% opacity, "—" for health+deadline) | — | — | — | — | 203 days ago
  Row 7: Active | Due Soon | Portal on | VAT 7 Feb | 1/5 | 12 days ago
  Row 8: Active | Not Started | Portal on | Year-End 31 Mar | 0/4 | 30 days ago — has orange 🟠 "Xero contact not found" badge

BATCH ACTION BAR (fixed top, appears when rows checked, bg-[#111827] text-white rounded-lg):
"3 selected" | Send reminder | Send upload link | Set to Dormant | Download ZIP | ✕ Deselect

PAGINATION: "Showing 1–8 of 47 clients" + page numbers

RIGHT SLIDE-OUT PREVIEW PANEL (340px, white, border-left, fixed right, show for Row 1):
Header: "Sarah Johnson" (font-semibold) + "sarah@abcsolutions.co.uk" + status badges + "Open full details →" teal link
Status block: red bg-red-50 "Overdue by 5 days · 0 of 5 files uploaded"
Primary CTA: "Send reminder" (teal, full-width)
Recent uploads section: "No uploads yet" (empty state, gray)
Bottom actions: "Send Magic Link" | "Copy link" | "Set to Dormant" (gray text)
```

---

### A5b — Client Detail（客户详情页）

**设计目的：** 单个客户的完整信息中心。发送提醒、查看上传历史、调整配置、追踪该客户全部操作记录。

**页面逻辑：** 单页滚动。点击「Settings」→ 浮空设置层；点击「View in Xero」→ 跳出至 Xero；点击「Set to Dormant」→ 确认 Popover。

```
Build a Next.js + Tailwind client detail page for "Filio".
Follow the Filio design system defined in the system prompt exactly.
Mock client: "Sarah Johnson · ABC Solutions Ltd."

Same sidebar as Dashboard. Breadcrumb: "Clients / Sarah Johnson"

TOP INFO CARD (card, sticky):
Left:
  "Sarah Johnson" (text-2xl font-semibold)
  "sarah@abcsolutions.co.uk" (text-sm gray)
  Badge row: "Active" (green) · "Due Soon" (amber) · "Portal on" (teal outline)
  "Last reminded: 7 days ago" (text-xs gray)
Right (button group):
  ★ Star toggle
  "View in Xero" (border, Xero blue #13B5EA, small Xero icon)
  "Send Magic Link" (teal primary)
  "Copy link" (outline)
  "Settings" (outline)
  "Set to Dormant" (text-only, text-gray-400, small — sits below other buttons)

AMBER WARNING BANNER (below info card):
bg-amber-50 border border-amber-200 rounded-lg px-4 py-3
"⚠  VAT Return deadline in 7 days · Only 2 of 5 files uploaded   [Send reminder now →]"

BLOCK 1 — Current status + Send reminder (card, 2-col layout):
Left col: Health status "Due Soon" badge + "VAT Return · 31 Jan 2026" + upload progress bar (2/5, 40%, teal) + year-end deadline row
Right col: "Send a reminder" section-title + "Last sent 7 days ago" (gray small) + Template dropdown (E2 VAT Reminder) + collapsed email preview + "Send reminder" teal btn (full-width)

BLOCK 2 — Document checklist (card):
Header: "This quarter's documents" + "2 of 5 uploaded" (gray) + progress bar 40%
5 checklist items with status icons:
  ✅ Bank Statement · ✅ Sales Invoices · ⏳ Receipts · ⏳ Purchase Invoices · ⏳ Payslips
Each item: icon + label + optional note in text-xs gray italic

BLOCK 3 — Recent uploads (card):
Controls row: "Recent uploads" title + "Export CSV" + "Export PDF" outline btns (right)
Table: file icon | filename (font-medium + original name text-xs gray below) | type badge | channel badge (Portal/Email/Manual) | size | time | Xero status badge
5 rows, 2 with "Failed" red badge, rest "Synced" green
"Show all 23 uploads ↓" link at bottom

BLOCK 4 — Magic Email (card):
"sarah.abc@inbox.filio.uk" monospace + copy icon
"Sender verification: On · Only from sarah@abcsolutions.co.uk" (green dot)

BLOCK 5 — Stats (card, collapsed by default, show expand chevron):
4 stat tiles: Total uploads 23 · Synced 21 · Failed 2 (red) · Last upload 3 days ago

BLOCK 6 — Activity Timeline (card, collapsed by default):
Reverse-chronological events, grouped by date:
  Today: 📎 Upload received · Receipt · 2.3MB · Portal | 📧 Reminder sent · VAT in 7 days
  March 2026: ⏸ Set to Dormant · ⚠ Missed VAT deadline 31 Jan · ▶ Reactivated
  Feb 2026: 📎 Upload · Bank Statement · Magic Email
Each event: icon + description + timestamp (text-xs gray)
```

---

### A6 — Upload History（上传记录）

**设计目的：** 全部客户文件上传的完整记录。日常审查失败项、导出 HMRC 合规报告、重新分类文件。

**页面逻辑：** 独立记录查阅页。失败行可一键重试；点击类型徽章可内联重新分类。

```
Build a Next.js + Tailwind upload history page for "Filio".
Follow the Filio design system defined in the system prompt exactly.

Same sidebar. Page title "Upload History".

STATS ROW (4 inline stat cards):
Total 124 (gray) · Synced 119 (green) · Failed 3 (red) · Pending 2 (amber)
Right: "Export PDF" + "Export CSV" outline btns

FILTER BAR (card):
Search input "Search filename or client" |
Date range: [Last 30 days ▾] |
File type: [All types ▾] |
Sync status: [All ▾] |
Channel: [All ▾] |
Client: [All clients ▾]

UPLOAD TABLE (card):
Columns: ☐ | Preview (thumbnail/icon) | Filename | Client | Type | Channel | Size | Time | Xero Status | Actions

10 rows:
  Rows 1,3,4,5,7,8,9: "Synced" bg-green-100 text-green-700
  Rows 2,6: "Failed" bg-red-100 text-red-700, with retry icon in actions
  Row 10: "Failed · Xero contact not found" (orange)
  Row 1: UNCLASSED type badge (amber) — needs reclassification
  Mix of channels: Portal (link icon), Magic Email (envelope icon), Manual (upload icon)

ROW ACTIONS (⋯): View in Xero · Reclassify · Download · Retry (if failed)

INLINE RECLASSIFY PANEL (expands below row 1, bg-gray-50 rounded):
"Current: UNCLASSED → " New type dropdown (Receipt selected) → Preview: "JohnSmith_Receipt_20260318.jpg" → ☐ "Also update filename in Xero" → [Save] [Cancel]

BATCH: When rows selected: "Download ZIP" teal btn appears in filter bar

PAGINATION: "Showing 1–10 of 124 uploads"
```

---

### A11 — Client Activity（客户活跃度，Professional+）

**设计目的：** 识别长期不活跃的客户并批量设为 Dormant，释放配额。Professional 套餐专属。

**页面逻辑：** 点击客户 → A5b；批量选择 → Set to Dormant / Reactivate；右侧建议卡片有快捷操作。

```
Build a Next.js + Tailwind client activity page for "Filio".
Follow the Filio design system defined in the system prompt exactly.

Same sidebar. Page title "Client Activity" + subtitle "Identify inactive clients and manage your active slots" (text-sm gray)

TOP STATS (4 cards):
  Active clients: 18/20, progress bar amber (90%)
  Dormant clients: 3/40, progress bar gray (8%)
  No uploads in 90+ days: 5 (text-[#C0392B] large, actionable red)
  Upcoming deadlines: 7 clients next 30 days

FILTER + SORT BAR:
Tabs: Active | Dormant | All
Filters: Activity dropdown · Deadline status dropdown
Sort: "Last upload (oldest first)" default

MAIN LAYOUT (2-col: table flex-1 + right panel 280px):

LEFT — CLIENT TABLE (card):
Columns: ☐ | Client name | Mgmt status | Last upload | Total uploads | Next deadline | Quick action

10 rows:
  3 rows: active, last upload 90-180 days ago (amber text)
  2 rows: active, "Never" last upload (red text)
  2 rows: active, recent uploads + upcoming deadline badges
  3 rows: dormant (60% opacity), "Reactivate" teal outline btn in actions

BATCH BAR (on selection): Set to Dormant · Reactivate · Archive

RIGHT — SUGGESTIONS PANEL (card, collapsible):
Title "💡 Suggested actions"
Card 1: "5 clients haven't uploaded in 90+ days. Consider setting them to Dormant. [Review →]"
Card 2 (teal accent): "You're at 90% of your active limit (18/20). [Upgrade to Professional →]"

PAGINATION: "Showing 1–10 of 21 clients"
```

---

### Settings（A9 Billing 示例）

**设计目的：** 事务所级配置中心。Settings 专属子导航 + 内容区。

**页面逻辑：** 左侧子导航切换各设置页。Billing 页展示配额、套餐对比、支付方式、账单历史。

```
Build a Next.js + Tailwind settings page (Billing view) for "Filio".
Follow the Filio design system defined in the system prompt exactly.

LAYOUT:
Main sidebar (240px, #111827) + Settings sub-nav (200px, white, border-r border-[#E5E7EB]) + content area

SETTINGS SUB-NAV items:
Profile · Xero Connection · Notifications · Branding · Billing (active) · Global Defaults
Active: bg-[#F0FDF4] text-[#1D9E75] border-l-2 border-[#1D9E75]
Hover: bg-gray-50

BILLING CONTENT:

Section "Current usage" (card):
3 progress rows:
  Active clients   18/20   [████████████████░░]  90%  amber bar + "Approaching limit" amber label
  Dormant clients  3/40    [███░░░░░░░░░░░░░░░]   8%  gray bar
  Archived clients  2      No limit
Teal CTA: "Upgrade to Professional →" (full-width, shown because >80%)

Section "Current plan" (card):
"Starter · £29/month"  |  "Renews 1 May 2026"
Buttons: "Switch to annual (save 17%)" outline | "Upgrade plan" teal

Section "Plan comparison" (card):
3-column table: Starter £29 | Professional £69 (teal border, "Most Popular" badge) | Firm £149
Rows: Active limit | Dormant limit | Accountants | File Checklist | Branding | Magic Email | Client Activity | White-label
✓ teal for included, — gray for not included
"Upgrade" button below Professional column (teal)

Section "Payment method" (card):
Visa card icon + "Visa ending 4242 · Expires 12/27" + "Manage payment →" link

Section "Billing history" (card):
3 invoice rows: Date | Amount | "Paid" green badge | "Download PDF" link

"Cancel subscription" text-[#C0392B] small link at very bottom
```

---

## Section B — 客户端门户

---

### B2 — Client Upload Page（客户文件上传页）

**设计目的：** 客户收到 Magic Link 后看到的页面。对非技术型客户极度友好——清晰告知「上传什么」「上传到哪里」「有没有成功」。

**页面逻辑：** 完全独立于后台。上传成功后原地显示成功状态，可继续上传。移动端优先。

```
Build a Next.js + Tailwind client-facing file upload page for "Filio".
Follow the Filio design system defined in the system prompt exactly.
This is the CLIENT portal — NOT the accountant dashboard. Target: non-technical users on mobile.

LAYOUT: Centered, max-w-lg, white card on bg-[#F8F9FA]. Padding px-6 py-8.

TOP BAR:
Left: "Smith & Co Accountants" (font-semibold text-[#111827])
Right: lock icon + "Secure · Encrypted" (text-xs text-[#9CA3AF])

WELCOME:
"Hi Sarah," (text-2xl font-semibold text-[#111827])
"Upload your documents for Smith & Co" (text-sm text-[#6B7280])
Thin teal underline accent below name.

DOCUMENT CHECKLIST CARD (bg-white border rounded-lg):
"This quarter's documents" + "2 of 5 uploaded" (gray small)
Teal progress bar 40%
Checklist:
  ✅ Bank Statement  ✅ Sales Invoices  ⏳ Receipts  ⏳ Purchase Invoices  ⏳ Payslips

FILE TYPE SELECTOR:
"What type of document is this?" label (text-sm font-medium)
6 pill buttons: Receipt · Invoice · Bank Statement · Contract · Payslip · Other
Selected: bg-[#1D9E75] text-white. Unselected: border border-[#E5E7EB] text-[#6B7280]

UPLOAD ZONE:
Dashed border, rounded-xl, padding py-10
Teal upload icon (center)
"Drag & drop your file here" (font-medium)
"or" divider (gray)
"Choose file" teal button
"JPG, PNG, PDF, HEIC · Max 10MB" (text-xs gray)

FILE PREVIEW STATE (after file chosen):
Thumbnail + "receipt-march.jpg" + "2.1 MB" + auto-name preview "SarahJohnson_Receipt_20260404.jpg" (text-xs teal)
"Upload to Smith & Co" full-width teal button

SUCCESS STATE:
Large green checkmark circle (animated scale-in)
"Document sent to Smith & Co ✓" (font-semibold green)
Checklist updates to 3/5
"Upload another document" outline button

FOOTER: "Powered by Filio · filio.uk" (text-xs text-[#9CA3AF] centered)

Mobile-first. No sidebar. Clean and reassuring.
```

---

### A1 — Login Page

**设计目的：** 会计师登录入口。Xero OAuth（推荐路径）+ 邮箱密码登录。

```
Build a Next.js + Tailwind login page for "Filio".
Follow the Filio design system defined in the system prompt exactly.

Split layout: Left 45% + Right 55%.

LEFT PANEL (bg-[#111827], text-white, flex flex-col justify-between p-12):
Top:
  "Filio" wordmark (white, font-bold text-2xl)
  Large heading (mt-16): "The smarter way to collect client documents." (text-3xl font-semibold leading-tight)
  Subtitle: "Purpose-built for UK accounting firms." (text-[#9CA3AF] mt-3)
Middle: 3 value props (teal check icons):
  "Magic Link uploads — no passwords for clients"
  "Auto-sync to Xero, perfectly named"
  "UK-hosted · GDPR-compliant"
Bottom:
  "Xero Certified App" badge (small, Xero blue outline)

RIGHT PANEL (bg-white, flex items-center justify-center):
Card max-w-sm w-full:
  Title: "Sign in" (text-2xl font-semibold)
  Subtitle: "Welcome back." (text-sm text-[#6B7280])

  "Continue with Xero" button (full-width, bg-[#13B5EA] text-white, Xero logo icon left, "Recommended" small label right)
  
  "— or sign in with email —" divider (text-xs text-[#9CA3AF])
  
  Email input (label + input)
  Password input (label + input + show/hide eye icon)
  "Forgot password?" (text-xs teal, right-aligned below password)
  
  "Sign in" teal primary button (full-width)
  
  Divider line
  "New to Filio? Start your free 14-day trial →" (text-sm, teal link)

ERROR STATE variant (show red banner above form):
bg-red-50 border border-red-200 rounded-md px-4 py-2 text-sm text-red-700
"Invalid email or password. Please try again."
```

---

## 使用说明

### 第一步：新建 v0 Project

1. 打开 [v0.dev](https://v0.dev)，点击右上角「New Project」
2. 选择 **Next.js + Tailwind** 模板
3. 在 Project 设置里找到 **System Prompt**（或 Instructions）输入框
4. 把本文档最顶部「全局设计系统」区块里的代码块**完整粘贴进去**，保存

> 做完这一步，后面所有页面生成时都不需要再重复说颜色和字体了。

### 第二步：逐页生成

在对话框里直接粘贴对应页面的英文 prompt，发送，等待生成。

**建议顺序：**
1. A4 Dashboard（定基调，最重要）
2. A5 Clients（核心操作页）
3. A5b Client Detail（最复杂，验证设计系统完整性）
4. B2 Upload Page（客户侧，风格不同，单独验证）
5. A6 Upload History
6. Settings / A9 Billing
7. A1 Login

### 第三步：调整细节

生成后如果某个部分不满意，直接在 v0 的对话框描述修改点，例如：
- "把顶部三个卡片改成横向排列，间距加大"
- "侧边栏的 active 状态改用 teal 背景而不是边框"
- "把表格行高增加，让内容更透气"

### 第四步：导出代码

满意后点击 v0 右上角「Export」，下载 Next.js 组件代码，替换 Antigravity 项目里对应的文件。

---

*Filio v0 Design Prompts · v2.0 · 2026年4月*
