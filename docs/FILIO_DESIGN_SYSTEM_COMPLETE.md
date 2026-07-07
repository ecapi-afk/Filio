# Filio 网站完整设计系统与配图提示词文档

**文档版本**：v1.0 | **日期**：2026-03-31  
**网站**：Filio — Document Collection Portal for UK Accountants  
**设计风格**：Trust Architecture (Nordic Minimalism)  
**技术栈**：React 18 + TypeScript + Tailwind CSS 4 + Vite

---

## 目录

1. [设计哲学与核心原则](#设计哲学与核心原则)
2. [色彩系统](#色彩系统)
3. [排版系统](#排版系统)
4. [间距与布局](#间距与布局)
5. [组件库规范](#组件库规范)
6. [SVG 图标库](#svg-图标库)
7. [页面架构](#页面架构)
8. [配图生成提示词](#配图生成提示词)
9. [响应式设计](#响应式设计)
10. [动画与交互](#动画与交互)

---

## 设计哲学与核心原则

### 设计运动
**Trust Architecture — Neo-Corporate Scandinavian Minimalism**

灵感来源：Notion、Vercel、Linear 等企业级 SaaS 产品

### 核心设计原则

1. **极简主义与留白**：大量的负空间和极简的排版，让内容呼吸。避免过度装饰。
2. **翡翠绿唯一强调色**：#1D9E75（oklch 0.60 0.14 162）是全站唯一的品牌强调色，所有其他颜色都是中性的。
3. **无 Emoji 图标**：全站使用 40 个自定义 SVG 图标，不使用任何 Emoji。
4. **左对齐非对称布局**：首页采用左对齐的编辑风格，配合大型章节号作为视觉锚点。
5. **衬线体用于标题，无衬线体用于正文**：Instrument Serif 用于 h1/h2，Instrument Sans 用于正文和 h3-h6。
6. **信任信号密集部署**：在关键转化点周围部署 ICO、UK GDPR、Xero 认证等信任徽章。

---

## 色彩系统

### 品牌核心色

| 用途 | 颜色名称 | 十六进制 | OKLCH | 说明 |
|:---|:---|:---|:---|:---|
| 主强调色 | Filio Emerald | #1D9E75 | oklch(0.60 0.14 162) | 所有 CTA、链接、强调元素 |
| 强调色悬停 | Emerald Hover | #1A8F6A | oklch(0.54 0.14 162) | 按钮悬停状态 |
| 强调色浅色 | Emerald Light | #E8F7F2 | oklch(0.96 0.04 162) | 背景、徽章背景 |
| 强调色柔和 | Emerald Muted | #6B9B87 | oklch(0.42 0.12 162) | 文本、图标柔和状态 |
| 深色背景 | Navy Dark | #0F2744 | oklch(0.20 0.05 240) | 深色 Banner、页脚背景 |
| 深色中等 | Navy Mid | #1F3A52 | oklch(0.28 0.04 240) | 深色文本 |
| 浅灰背景 | Light Gray | #F8F9FA | oklch(0.985 0.001 240) | 微妙的背景分隔 |
| 边框灰 | Border Gray | #E5E7EB | oklch(0.92 0.002 240) | 卡片边框、分割线 |
| 文本主色 | Text Primary | #0F1419 | oklch(0.13 0.01 240) | 标题、主要文本 |
| 文本次色 | Text Secondary | #6B7280 | oklch(0.40 0.01 240) | 副标题、说明文本 |
| 文本柔和 | Text Muted | #9CA3AF | oklch(0.55 0.01 240) | 辅助文本、时间戳 |
| 警告色 | Amber Warning | #D97706 | oklch(0.62 0.12 65) | MTD 警告、紧迫感 |
| 警告色浅 | Amber Light | #FEF3C7 | oklch(0.97 0.04 65) | 警告背景 |

### 色彩使用规则

- **翡翠绿**：所有 CTA 按钮、链接、强调图标、悬停状态、活跃状态
- **深色（Navy）**：页脚、深色 Banner、深色文本
- **灰色**：边框、背景分隔、中性元素
- **琥珀色**：仅用于 MTD 相关的紧迫感提示和警告面板

---

## 排版系统

### 字体栈

| 用途 | 字体 | 权重 | 加载源 |
|:---|:---|:---|:---|
| 标题（h1/h2） | Instrument Serif | 400 (normal) | Google Fonts |
| 标题（h3-h6） | Instrument Sans | 600 (semibold) | Google Fonts |
| 正文 | Instrument Sans | 400 (normal) | Google Fonts |
| 系统兜底 | system-ui, sans-serif | — | 系统字体 |

### 排版层级

| 元素 | 字号 | 行高 | 权重 | 用途 |
|:---|:---|:---|:---|:---|
| h1 (Hero) | clamp(2.6rem, 5.5vw, 4rem) | 1.1 | 400 | 首页主标题、页面 Hero 标题 |
| h2 (Section) | clamp(1.8rem, 3.5vw, 2.6rem) | 1.2 | 400 | 章节标题 |
| h3 (Card/Step) | 1.5rem (text-2xl) | 1.3 | 600 | 卡片标题、步骤标题 |
| h4 | 1.25rem (text-xl) | 1.3 | 600 | 子标题 |
| h5 | 1.125rem (text-lg) | 1.4 | 600 | 小标题 |
| h6 | 1rem (text-base) | 1.4 | 600 | 标签 |
| 正文 (Body) | 1rem (text-base) | 1.65 | 400 | 段落文本 |
| 小文本 | 0.875rem (text-sm) | 1.5 | 400 | 说明、脚注 |
| 极小文本 | 0.75rem (text-xs) | 1.4 | 500 | 标签、徽章 |

### 排版示例

```css
/* Hero 标题 */
h1 {
  font-family: 'Instrument Serif', 'Georgia', serif;
  font-size: clamp(2.6rem, 5.5vw, 4rem);
  font-weight: 400;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: oklch(0.13 0.01 240);
}

/* 卡片标题 */
h3 {
  font-family: 'Instrument Sans', system-ui, sans-serif;
  font-size: 1.5rem; /* text-2xl */
  font-weight: 600;
  line-height: 1.3;
  color: oklch(0.13 0.01 240);
}

/* 正文 */
body {
  font-family: 'Instrument Sans', 'Inter', system-ui, sans-serif;
  font-size: 1rem;
  line-height: 1.65;
  color: oklch(0.40 0.01 240);
}
```

---

## 间距与布局

### 间距系统（基于 Tailwind）

| 单位 | 像素 | 用途 |
|:---|:---|:---|
| xs | 0.25rem (4px) | 极小间距 |
| sm | 0.5rem (8px) | 小间距 |
| md | 1rem (16px) | 标准间距 |
| lg | 1.5rem (24px) | 大间距 |
| xl | 2rem (32px) | 特大间距 |
| 2xl | 2.5rem (40px) | 超大间距 |

### 容器与宽度

```css
.container {
  width: 100%;
  margin-left: auto;
  margin-right: auto;
  padding-left: 1rem;    /* 移动端 */
  padding-right: 1rem;
}

@media (min-width: 640px) {
  .container {
    padding-left: 1.5rem;
    padding-right: 1.5rem;
  }
}

@media (min-width: 1024px) {
  .container {
    padding-left: 2rem;
    padding-right: 2rem;
    max-width: 1280px;
  }
}
```

### 章节间距

```css
.section-gap {
  padding-top: 5rem;      /* 移动端 */
  padding-bottom: 5rem;
}

@media (min-width: 768px) {
  .section-gap {
    padding-top: 7rem;    /* 桌面端 */
    padding-bottom: 7rem;
  }
}

.section-gap-sm {
  padding-top: 3rem;
  padding-bottom: 3rem;
}

@media (min-width: 768px) {
  .section-gap-sm {
    padding-top: 4rem;
    padding-bottom: 4rem;
  }
}
```

### 布局模式

**左对齐非对称布局（首页）**
- 左侧：文案与 CTA（60% 宽度）
- 右侧：视觉元素（40% 宽度）
- 大型章节号作为左侧视觉锚点

**居中对称布局（功能页）**
- 最大宽度 48rem (768px)
- 水平居中
- 顶部信任徽章
- 下方 Hero 图片

**网格布局**
- 卡片网格：3 列（桌面）→ 2 列（平板）→ 1 列（移动）
- 间距：gap-6 (1.5rem)

---

## 组件库规范

### 按钮

**主按钮（Primary CTA）**
```css
.btn-primary {
  background-color: oklch(0.60 0.14 162);  /* Emerald */
  color: white;
  padding: 0.875rem 1.5rem;                /* py-3.5 px-6 */
  font-size: 0.875rem;                     /* text-sm */
  font-weight: 500;
  border-radius: 0.5rem;
  transition: background-color 0.15s ease;
}

.btn-primary:hover {
  background-color: oklch(0.54 0.14 162); /* Emerald Hover */
}
```

**次按钮（Secondary）**
```css
.btn-secondary {
  background-color: transparent;
  color: oklch(0.35 0.01 240);
  border: 1px solid oklch(0.85 0.002 240);
  padding: 0.875rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0.5rem;
  transition: border-color 0.15s ease;
}

.btn-secondary:hover {
  border-color: oklch(0.70 0.002 240);
}
```

### 卡片

**特征卡片（Feature Card）**
```css
.card-feature {
  background-color: white;
  border: 1px solid oklch(0.92 0.002 240);
  border-radius: 0.5rem;
  padding: 1.5rem;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.card-feature:hover {
  border-color: oklch(0.60 0.14 162);
  box-shadow: 0 2px 12px oklch(0.60 0.14 162 / 0.08);
}
```

**定价卡片（Pricing Card）**
```css
.card-pricing {
  background-color: white;
  border: 1px solid oklch(0.92 0.002 240);
  border-radius: 0.5rem;
  padding: 2rem;
}

.card-pricing.popular {
  border: 2px solid oklch(0.60 0.14 162);
}
```

### 徽章与标签

**信任徽章（Trust Badge）**
```css
.badge-trust {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  background-color: oklch(0.96 0.04 162);
  color: oklch(0.42 0.12 162);
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 9999px;
}
```

**警告面板（Warning Panel）**
```css
.panel-warning {
  background-color: oklch(0.97 0.04 65);
  border: 1px solid oklch(0.88 0.08 65);
  border-radius: 0.5rem;
  padding: 1.5rem;
}
```

### 分割线与装饰

**点阵背景（Dot Grid）**
```css
.dot-grid {
  background-image: radial-gradient(
    circle,
    oklch(0.85 0.002 240) 1px,
    transparent 1px
  );
  background-size: 24px 24px;
}
```

**章节号（Section Number）**
```css
.section-number {
  font-family: 'Instrument Serif', serif;
  font-size: clamp(3.5rem, 8vw, 6rem);
  font-weight: 400;
  color: oklch(0.92 0.002 240);
  line-height: 1;
  user-select: none;
}
```

---

## SVG 图标库

### 图标总数与设计规范

**总数**：40 个自定义 SVG 图标

**设计规范**：
- 笔画宽度：1.75px
- 笔画端点：rounded linecap
- 笔画连接：rounded linejoin
- 视图框：24x24
- 默认填充：none（仅笔画）
- 颜色：currentColor（继承父元素颜色）

### 图标列表与用途

| 图标名称 | 用途 | 颜色 | 大小 |
|:---|:---|:---|:---|
| IconMagicLink | Magic Link 功能标记 | Emerald | 16-24px |
| IconXeroIntegration | Xero 集成标记 | Emerald | 16-24px |
| IconMagicEmail | Magic Email 功能标记 | Emerald | 16-24px |
| IconMTD | MTD 合规标记 | Emerald | 16-24px |
| IconClientPortal | 客户门户标记 | Emerald | 16-24px |
| IconSecurity | 安全标记 | Emerald | 16-24px |
| IconEncryption | 加密标记 | Emerald | 16-24px |
| IconUKData | UK 数据标记 | Emerald | 16-24px |
| IconCompliance | 合规标记 | Emerald | 16-24px |
| IconAuditTrail | 审计追踪标记 | Emerald | 16-24px |
| IconZeroStorage | 零存储标记 | Emerald | 16-24px |
| IconNoPassword | 无密码标记 | Emerald | 16-24px |
| IconRevocable | 可撤销标记 | Emerald | 16-24px |
| IconAutoRoute | 自动路由标记 | Emerald | 16-24px |
| IconSmartRename | 智能重命名标记 | Emerald | 16-24px |
| IconClock | 时间标记 | Emerald | 11-24px |
| IconCheck | 检查标记 | Emerald | 16-24px |
| IconCross | 叉标记 | Gray | 16-24px |
| IconArrowRight | 右箭头 | Emerald | 14-16px |
| IconMenu | 菜单（移动端） | Navy | 24px |
| IconClose | 关闭（移动端） | Navy | 24px |
| IconWhiteLabel | 白标标记 | Emerald | 22px |
| IconDomain | 域名标记 | Emerald | 22px |
| IconMobile | 移动设备标记 | Emerald | 22px |
| IconEmbed | 嵌入标记 | Emerald | 22px |
| IconDashboard | 仪表板标记 | Emerald | 22px |
| ... | ... | ... | ... |

### 图标使用示例

```tsx
import { IconMagicLink, IconCheck, IconArrowRight } from "@/components/icons/FilioIcons";

// 在卡片中使用
<div className="text-emerald mb-4">
  <IconMagicLink size={24} />
</div>

// 在按钮中使用
<button className="flex items-center gap-2">
  Start Free Trial
  <IconArrowRight size={16} />
</button>

// 在列表项中使用
<li className="flex items-center gap-3">
  <IconCheck size={20} className="text-emerald" />
  <span>No password required</span>
</li>
```

---

## 页面架构

### 网站信息架构

| 页面编号 | 页面名称 | URL 路径 | 核心职责 |
|:---|:---|:---|:---|
| P0 | 首页 (Homepage) | `/` | 完整成交流程：痛点 → 方案 → 信任 → 转化 |
| P1 | 定价 (Pricing) | `/pricing` | 透明展示固定月费模式 |
| P2 | 安全与合规 (Security) | `/security` | 详述零存储架构、加密标准 |
| P3 | Magic Link 功能页 | `/features/magic-link` | 无需密码的专属上传体验 |
| P4 | Xero 集成功能页 | `/features/xero-integration` | 与 Xero 的无缝对接能力 |
| P5 | Magic Email 功能页 | `/features/magic-email` | 邮件自动收集功能 |
| P6 | MTD 合规功能页 | `/features/mtd-compliance` | MTD 季度追踪与提醒 |
| P7 | 竞品对比 | `/compare/filio-vs-contentsnare` | 拦截竞品搜索流量 |
| P8 | 常见问题 (FAQ) | `/faq` | 消除决策疑虑 |
| P9 | 博客 (Blog) | `/blog` | 静态博客（预留 Sanity CMS 接入） |

### 首页章节结构

1. **Hero 区域** — 问题陈述 + CTA
2. **社会证明栏** — 信任信号（500+ 事务所、15min 平均响应时间、零存储、99.9% 正常运行时间）
3. **问题激化** — 4 张痛点卡片
4. **工作原理** — 4 步流程（30秒、2分钟、60秒、自动）
5. **核心功能** — 6 张功能卡片
6. **Magic Link 聚焦** — 关键差异化卖点
7. **安全 Banner** — 深色 Navy 背景
8. **定价预览** — 3 个定价方案
9. **最终 CTA** — 转化闭环

### 功能页面模板

所有功能页（Magic Link、Xero Integration、Magic Email、MTD Compliance）遵循统一模板：

1. **Hero 区域**
   - 信任徽章（内联 Flex）
   - 衬线体主标题（clamp 字号）
   - 副标题（正文大小）
   - 主/次 CTA 按钮
   - 居中布局，最大宽度 48rem

2. **Hero 图片**
   - 全宽圆角图片（rounded-2xl）
   - 细灰色边框（1px）
   - 阴影（shadow-xl）
   - 最大宽度 80rem（桌面）

3. **功能网格**
   - 3 列（桌面）→ 2 列（平板）→ 1 列（移动）
   - 卡片：白色背景、细灰色边框、圆角、悬停边框变翡翠绿

4. **深色 CTA 区域**
   - Navy 背景（oklch(0.20 0.05 240)）
   - 白色文本
   - 居中对齐

---

## 配图生成提示词

### 总体配图风格指南

**视觉美学**：
- **风格**：现代企业级 SaaS 界面截图与概念插画混合
- **色调**：高亮度、清爽、专业、信任感强
- **构图**：对称或略微非对称，留白充足
- **人物**：如出现，应为多元化、专业的商务人士或会计师
- **文本**：清晰可读，使用英文，避免虚假数据或模糊文本
- **品牌色**：翡翠绿 (#1D9E75) 作为强调色出现，但不过度使用

### 已生成的配图及其提示词

#### 1. 首页 Hero Dashboard Mockup
**文件名**：`filio-dashboard-mockup.png`  
**CDN URL**：`https://d2xsxph8kpxj0f.cloudfront.net/310519663473795953/ZVR9kFwB5KnvFLNrEGdt4F/filio-dashboard-mockup_b2293c52.png`

**提示词**：
```
Modern SaaS dashboard interface for UK accounting firm document management portal. 
Clean, minimalist design with emerald green (#1D9E75) accents. 
Shows client list with status indicators (green checkmarks for "Documents Received", 
orange circles for "Pending", red X for "Overdue"). 
Left sidebar with navigation menu (Dashboard, Clients, Templates, Reports, Settings, Help Center). 
Header shows "Filio" branding and client overview stats (47 active, 12 pending, 3 overdue). 
Table displays client names, company names, last upload dates, Magic Link status, and action buttons. 
Professional, trustworthy aesthetic. High-key lighting, white background, subtle gray accents. 
No people visible. Photorealistic UI rendering. 4K quality.
```

**设计特点**：
- 左侧深灰导航栏
- 中央客户列表表格
- 绿色成功状态、橙色待处理、红色逾期
- 右上角客户概览统计
- 清晰的数据层级

#### 2. Magic Link Portal Mockup
**文件名**：`filio-magic-link-mockup.png`  
**CDN URL**：`https://d2xsxph8kpxj0f.cloudfront.net/310519663473795953/ZVR9kFwB5KnvFLNrEGdt4F/filio-magic-link-mockup_7eefb498.png`

**提示词**：
```
Minimalist file upload portal interface for clients. Clean, white background with emerald green 
accents (#1D9E75). Shows a drag-and-drop upload area with a large upload icon in the center. 
Text reads "Drag files here or click to browse". Below the upload area is a list of previously 
uploaded files with timestamps and file sizes. Each file has a green checkmark icon. 
Top of page shows "Filio" logo and a welcome message "Sarah Johnson's Document Portal". 
Professional, trustworthy, zero-friction design. High-key, bright aesthetic. 
No people visible. Photorealistic UI. 4K quality.
```

**设计特点**：
- 中央拖拽上传区域
- 大型上传图标
- 已上传文件列表（带时间戳）
- 绿色检查标记表示成功
- 极简、无摩擦的用户体验

#### 3. Security Page Hero Image
**文件名**：`hero-security.png`  
**CDN URL**：`https://d2xsxph8kpxj0f.cloudfront.net/310519663473795953/ZVR9kFwB5KnvFLNrEGdt4F/hero-security_72ccf3cc.png`

**提示词**：
```
Abstract security and data protection concept illustration. Modern, minimalist design with 
emerald green (#1D9E75) as primary accent color. Shows layered security metaphor: 
a shield icon in the center with concentric circles around it representing encryption layers. 
Subtle lock icons, padlock symbols, and data flow lines in emerald green. 
Clean white background with very subtle light gray geometric patterns. 
Professional, trustworthy, enterprise-grade aesthetic. 
High-key lighting, bright, clean. No people. Conceptual, not photorealistic. 4K quality.
```

**设计特点**：
- 盾牌图标作为中心焦点
- 同心圆代表加密层级
- 锁和数据流线条
- 翡翠绿强调色
- 抽象、概念化风格

#### 4. Magic Link Feature Page Hero
**文件名**：`hero-magic-link.png`  
**CDN URL**：`https://d2xsxph8kpxj0f.cloudfront.net/310519663473795953/ZVR9kFwB5KnvFLNrEGdt4F/hero-magic-link.png`

**提示词**：
```
Modern, minimalist illustration of a passwordless authentication flow. Shows a chain link icon 
with a sparkle/magic wand effect in emerald green (#1D9E75). Surrounding the link are subtle 
icons representing: no password symbol, mobile device, clock (time-limited), and a checkmark. 
Clean white background with very light gray accent lines. Professional, trustworthy aesthetic. 
High-key, bright lighting. No people. Conceptual illustration style. 4K quality.
```

**设计特点**：
- 链接图标带魔法效果
- 周围环绕相关概念图标
- 翡翠绿强调
- 高亮度、清爽

#### 5. Xero Integration Feature Page Hero
**文件名**：`hero-xero.png`  
**CDN URL**：`https://d2xsxph8kpxj0f.cloudfront.net/310519663473795953/ZVR9kFwB5KnvFLNrEGdt4F/hero-xero.png`

**提示词**：
```
Integration concept illustration showing two systems connecting seamlessly. 
Left side shows a Filio portal icon, right side shows Xero accounting software icon, 
connected by a flowing arrow or bridge in emerald green (#1D9E75). 
Surrounding elements include: file icons, checkmarks, and data flow lines. 
Clean white background with subtle geometric patterns. 
Professional, enterprise-grade aesthetic. High-key, bright. No people. 
Conceptual illustration. 4K quality.
```

**设计特点**：
- 两个系统的连接桥梁
- 数据流动的视觉表现
- 翡翠绿连接线
- 企业级专业感

#### 6. Magic Email Feature Page Hero
**文件名**：`hero-magic-email.png`  
**CDN URL**：`https://d2xsxph8kpxj0f.cloudfront.net/310519663473795953/ZVR9kFwB5KnvFLNrEGdt4F/hero-magic-email.png`

**提示词**：
```
Email automation concept illustration. Shows an envelope icon with a magic wand or sparkle 
effect in emerald green (#1D9E75). Inside the envelope, files are being extracted and 
automatically organized. Surrounding elements include: file icons, folder icons, 
checkmarks, and automation arrows. Clean white background with subtle light gray patterns. 
Professional, trustworthy, automated-process aesthetic. High-key, bright. No people. 
Conceptual illustration. 4K quality.
```

**设计特点**：
- 信封图标带魔法效果
- 文件自动提取与整理
- 自动化流程的视觉表现
- 翡翠绿强调

#### 7. MTD Compliance Feature Page Hero
**文件名**：`hero-mtd.png`  
**CDN URL**：`https://d2xsxph8kpxj0f.cloudfront.net/310519663473795953/ZVR9kFwB5KnvFLNrEGdt4F/hero-mtd.png`

**提示词**：
```
MTD (Making Tax Digital) compliance concept illustration. Shows a calendar icon with 
deadline markers, combined with a checkmark and clock icon in emerald green (#1D9E75). 
Surrounding elements: quarterly timeline markers, alert bells, checkmarks for completed tasks. 
Subtle amber/orange accent for urgency (not overused). Clean white background with 
subtle geometric patterns. Professional, deadline-focused aesthetic. High-key, bright. 
No people. Conceptual illustration. 4K quality.
```

**设计特点**：
- 日历与截止日期标记
- 琥珀色用于紧迫感（适度）
- 季度时间线
- 任务完成检查标记

### 配图生成最佳实践

#### 一般原则

1. **色彩一致性**
   - 翡翠绿 (#1D9E75) 作为唯一强调色
   - 白色或浅灰色背景
   - 避免其他鲜艳颜色（除非特殊需要，如 MTD 的琥珀色）

2. **风格一致性**
   - 所有图片应采用现代 SaaS 美学
   - 高亮度、清爽、专业
   - 混合界面截图与概念插画
   - 避免过度装饰或复杂的 3D 效果

3. **排版与文本**
   - 如包含文本，应清晰可读
   - 使用英文
   - 避免虚假或模糊的文本
   - 保持专业的字体选择

4. **人物与多样性**
   - 如出现人物，应为多元化的专业人士
   - 避免刻板印象
   - 优先考虑抽象或概念化的表现

5. **尺寸与分辨率**
   - 最小宽度：1200px
   - 推荐分辨率：4K (3840x2160) 或至少 2K (2560x1440)
   - 宽高比：16:9 或 4:3（根据页面需求调整）

#### 特定页面的配图需求

**首页 Hero 图片**
- 类型：Dashboard Mockup（已有）
- 用途：展示产品核心功能
- 尺寸：1200px+ 宽度
- 风格：界面截图

**功能页 Hero 图片**
- 类型：概念插画 + 功能演示混合
- 用途：快速传达功能价值
- 尺寸：1200px+ 宽度
- 风格：现代插画

**深色 Banner 背景**
- 类型：纹理或几何图案（可选）
- 用途：视觉分隔
- 风格：极简、不分散注意力

---

## 响应式设计

### 断点定义

| 断点名称 | 宽度 | 用途 |
|:---|:---|:---|
| Mobile | 0-639px | 手机竖屏 |
| Tablet | 640-1023px | 平板 |
| Desktop | 1024px+ | 桌面 |

### 响应式布局规则

**导航栏**
- 移动端：汉堡菜单（已实现）
- 平板：简化菜单
- 桌面：完整导航

**卡片网格**
- 移动端：1 列
- 平板：2 列
- 桌面：3 列

**Hero 布局**
- 移动端：单列堆叠
- 桌面：左右分栏

**字号缩放**
- 使用 `clamp()` 函数实现流体排版
- 示例：`clamp(1.8rem, 3.5vw, 2.6rem)`

### 移动端优化

- 最小触摸目标：44x44px
- 按钮间距：至少 8px
- 文本行长：最大 65 字符
- 视口设置：`width=device-width, initial-scale=1.0`

---

## 动画与交互

### 过渡效果

**标准过渡时间**：150ms (0.15s)  
**缓动函数**：ease

```css
transition: border-color 0.15s ease, 
            box-shadow 0.15s ease, 
            background-color 0.15s ease;
```

### 滚动显示动画

**Fade-in-up 动画**
```css
.fade-in-up {
  opacity: 0;
  transform: translateY(16px);
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.fade-in-up.visible {
  opacity: 1;
  transform: translateY(0);
}
```

### 悬停效果

**卡片悬停**
- 边框颜色：灰色 → 翡翠绿
- 阴影：subtle → 更明显
- 变换：无（保持稳定）

**按钮悬停**
- 背景色：主色 → 深主色
- 文本：无变化
- 光标：pointer

**链接悬停**
- 下划线：透明 → 翡翠绿

### 微交互

**加载状态**
- 按钮内显示加载旋转器
- 禁用状态：opacity 降低

**成功反馈**
- 绿色检查标记
- 短暂的成功提示

**错误反馈**
- 红色边框或背景
- 错误消息提示

---

## 全局样式常量

### CSS 变量（OKLCH 色彩空间）

```css
:root {
  /* 品牌色 */
  --filio-emerald: oklch(0.60 0.14 162);
  --filio-emerald-hover: oklch(0.54 0.14 162);
  --filio-emerald-light: oklch(0.96 0.04 162);
  --filio-emerald-muted: oklch(0.42 0.12 162);
  
  /* 中性色 */
  --filio-navy: oklch(0.20 0.05 240);
  --filio-navy-mid: oklch(0.28 0.04 240);
  --filio-navy-light: oklch(0.92 0.002 240);
  
  /* 文本色 */
  --filio-text-primary: oklch(0.13 0.01 240);
  --filio-text-secondary: oklch(0.40 0.01 240);
  --filio-text-muted: oklch(0.55 0.01 240);
  
  /* 背景色 */
  --filio-bg: oklch(1 0 0);
  --filio-bg-subtle: oklch(0.985 0.001 240);
  --filio-border: oklch(0.92 0.002 240);
  
  /* 警告色 */
  --filio-amber: oklch(0.62 0.12 65);
  --filio-amber-light: oklch(0.97 0.04 65);
}
```

### 阴影定义

```css
/* 微妙阴影 */
box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

/* 标准阴影 */
box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);

/* 强阴影 */
box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);

/* 超强阴影（Hero 图片） */
box-shadow: 0 20px 25px rgba(0, 0, 0, 0.15);
```

---

## 品牌资产

### Logo 与徽章

- **Logo**：Filio（衬线体，黑色）
- **徽章**：Xero Certified（绿色背景，白色文本）
- **信任徽章**：ICO Registered、UK GDPR Compliant、AWS London

### 字体许可

- Instrument Serif：Google Fonts（开源）
- Instrument Sans：Google Fonts（开源）
- 许可证：Open Font License (OFL)

### 图标许可

- 所有 40 个 SVG 图标：自定义设计，Filio 所有

---

## 维护与更新指南

### 添加新页面

1. 在 `src/pages/` 中创建新组件
2. 遵循现有的排版和间距规范
3. 使用现有的 SVG 图标库
4. 在 `App.tsx` 中注册路由
5. 在导航栏中添加链接

### 生成新配图

1. 参考上述"配图生成提示词"部分
2. 确保颜色与现有配图一致
3. 使用相同的风格和美学
4. 上传到 CDN，获取 URL
5. 在页面中使用 CDN URL（不要本地存储）

### 更新色彩系统

1. 在 `index.css` 中的 `:root` 更新 CSS 变量
2. 在所有页面中搜索并替换旧的 OKLCH 值
3. 测试所有页面的视觉一致性
4. 更新本文档的色彩系统表

### 字体更新

1. 在 `index.html` 中更新 Google Fonts 链接
2. 在 `index.css` 中更新 `font-family` 声明
3. 调整行高和字号以适应新字体
4. 测试所有页面的排版

---

## 常见问题与故障排除

### Q: 为什么我的卡片标题看起来还是很小？
**A**: 确保您使用的是 `text-2xl` (1.5rem) 而不是 `text-xl` (1.25rem)。检查 HTML 中的 `className` 属性，确保没有被其他 CSS 覆盖。

### Q: 如何添加新的强调色？
**A**: 不建议添加新的强调色。Filio 的设计哲学是翡翠绿作为唯一的强调色。如果需要表达不同的含义（如警告），使用琥珀色，但应谨慎使用。

### Q: 我可以使用其他字体吗？
**A**: 不建议。Instrument Serif 和 Instrument Sans 是精心选择的，以匹配 Trust Architecture 的美学。如果需要更改，请更新所有页面并确保视觉一致性。

### Q: 如何处理深色模式？
**A**: 当前网站采用浅色模式。深色模式支持需要在 `index.css` 中定义 `.dark` 类的样式，并在 `ThemeProvider` 中实现切换逻辑。

### Q: 配图应该多大？
**A**: 推荐最小宽度 1200px，分辨率至少 2K (2560x1440)，最好 4K (3840x2160)。文件大小应优化到 200-500KB。

---

## 版本历史

| 版本 | 日期 | 变更 |
|:---|:---|:---|
| v1.0 | 2026-03-31 | 初始版本，包含完整的设计系统、色彩规范、排版、配图提示词 |

---

**文档维护者**：Manus AI  
**最后更新**：2026-03-31  
**下一次审查**：2026-06-30

