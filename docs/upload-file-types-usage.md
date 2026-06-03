# File Types 工具模块使用指南

## 位置

```
lib/file-types.ts
```

## 导入

```tsx
import {
  getExt,
  getExtBadgeBg,
  getFileTypeLabel,
  getFileTypeBadgeColor,
  getCategoryBadgeColor,
  formatFileSize,
  formatUploadedAt,
  getFileIcon,
  DOC_CATEGORIES,
  ALLOWED_MIME_TYPES,
  EXT_TO_MIME,
  MAX_FILE_SIZE,
} from '@/lib/file-types'
```

---

## 函数速查

| 函数 | 入参 | 返回值 | 用途 |
|------|------|--------|------|
| `getExt(name)` | 文件名字符串 | `"PDF"` | 扩展名大写 |
| `getExtBadgeBg(name)` | 文件名字符串 | `"bg-red-100 text-red-700"` | 扩展名图标背景色 |
| `getFileTypeLabel(name)` | 文件名字符串 | `"PDF"` / `"Image"` / `"Spreadsheet"` | 文件类型人类可读标签 |
| `getFileTypeBadgeColor(name)` | 文件名字符串 | Tailwind classes | 文件类型 badge 颜色 |
| `getCategoryBadgeColor(category)` | `"Receipt"` 等分类名 | Tailwind classes（含 hover） | 分类 badge 颜色 |
| `formatFileSize(bytes)` | 字节数 | `"245 KB"` / `"1.2 MB"` | 文件大小格式化 |
| `formatUploadedAt(date)` | ISO 日期字符串 | `"Just now"` / `"5 min ago"` / `"18 Mar 2026"` | 相对时间 |
| `getFileIcon(mimeType)` | MIME type 字符串 | Lucide Icon 组件 | 根据 MIME 类型返回图标 |

---

## 扩展名图标（左侧小方块）

```tsx
<div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${getExtBadgeBg(filename)}`}>
  {getExt(filename)}
</div>
```

输出效果：紫色的 `[ PDF ]` 方块，或蓝色的 `[ PNG ]` 方块。

支持的扩展名及对应颜色：

| 扩展名 | 颜色 |
|--------|------|
| `jpg` `jpeg` `png` `heic` `gif` `webp` `avif` `bmp` `tif` `tiff` | 蓝底白字 |
| `pdf` | 红底白字 |
| `doc` `docx` `odt` `rtf` `txt` | 靛蓝底白字 |
| `xls` `xlsx` `csv` `ods` | 绿底白字 |
| `ppt` `pptx` | 橙底白字 |
| `zip` `rar` `7z` | 黄底白字 |
| `msg` `eml` | 天蓝底白字 |
| 其他 | 灰底白字 |

---

## 文件类型 Badge

用于显示文件类型的标签，如 `PDF`、`Image`、`Spreadsheet`。

```tsx
<span className={`text-xs px-2 py-0.5 rounded-md font-medium border ${getFileTypeBadgeColor(filename)}`}>
  {getFileTypeLabel(filename)}
</span>
```

输出效果：`[ PDF ]` 或 `[ Image ]` 或 `[ Spreadsheet ]`，带对应颜色的浅色背景和边框。

---

## 分类 Badge（用户选择的文档类型）

用于用户从下拉菜单选择的文档分类，显示为彩色标签。

```tsx
<span className={`text-xs px-2 py-0.5 rounded-md font-medium border ${getCategoryBadgeColor('Receipt')}`}>
  Receipt
</span>
```

支持的分类及其颜色：

| 分类 | 颜色 |
|------|------|
| `Receipt` | 翠绿底深绿字 |
| `Invoice` | 紫罗兰底深紫字 |
| `Bank Statement` | 琥珀底深琥珀字 |
| `Payslip` | 青绿底深青字 |
| `Contract` | 玫瑰底深玫瑰字 |
| `Other` | 灰底深灰字 |

`getCategoryBadgeColor` 返回的样式**包含 hover 状态**（如 `hover:bg-emerald-200`），可直接用在 `<select>` 或 `<span>` 上。

---

## 完整使用示例：上传文件列表项

```tsx
import {
  getExt,
  getExtBadgeBg,
  getFileTypeBadgeColor,
  getCategoryBadgeColor,
  formatFileSize,
  formatUploadedAt,
  getFileTypeLabel,
} from '@/lib/file-types'

// 假设 upload 是从数据库查出的文件记录
const upload = {
  filename: 'invoice_2024.pdf',
  file_size: 245760,
  uploaded_at: '2026-04-17T10:30:00Z',
  file_type: 'Invoice', // 用户选择的分类
}

<div className="flex items-center gap-3">
  {/* 左侧：扩展名图标 */}
  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${getExtBadgeBg(upload.filename)}`}>
    {getExt(upload.filename)}
  </div>

  {/* 中间：文件名 + 文件大小 */}
  <div className="flex-1 min-w-0">
    <p className="text-sm font-semibold truncate">{upload.filename}</p>
    <div className="flex items-center gap-2 mt-1 flex-wrap">
      {/* 文件类型 Badge */}
      <span className={`text-xs px-2 py-0.5 rounded-md font-medium border ${getFileTypeBadgeColor(upload.filename)}`}>
        {getFileTypeLabel(upload.filename)}
      </span>
      {/* 分类 Badge */}
      <span className={`text-xs px-2 py-0.5 rounded-md font-medium border ${getCategoryBadgeColor(upload.file_type)}`}>
        {upload.file_type}
      </span>
    </div>
  </div>

  {/* 右侧：文件大小 + 上传时间 */}
  <div className="text-right shrink-0">
    <p className="text-xs text-gray-500">{formatFileSize(upload.file_size)}</p>
    <p className="text-[10px] text-gray-400">{formatUploadedAt(upload.uploaded_at)}</p>
  </div>
</div>
```

---

## 完整使用示例：下拉分类选择器

```tsx
import { getCategoryBadgeColor, DOC_CATEGORIES } from '@/lib/file-types'

<select
  value={selectedType}
  onChange={(e) => setSelectedType(e.target.value)}
  className={`text-xs font-medium px-2 py-0.5 rounded-full border-none cursor-pointer transition-colors ${getCategoryBadgeColor(selectedType)}`}
>
  <option value="">Select type...</option>
  {DOC_CATEGORIES.map((cat) => (
    <option key={cat} value={cat}>
      {cat}
    </option>
  ))}
</select>
```

`DOC_CATEGORIES` = `['Receipt', 'Invoice', 'Bank Statement', 'Payslip', 'Contract', 'Other']`

---

## 文件大小与时间常量

```tsx
import { MAX_FILE_SIZE } from '@/lib/file-types'

// MAX_FILE_SIZE = 10 * 1024 * 1024 = 10485760 (10MB)
if (file.size > MAX_FILE_SIZE) {
  toast.error('File exceeds 10MB limit')
}
```

---

## MIME 类型校验（上传时用）

```tsx
import { ALLOWED_MIME_TYPES, EXT_TO_MIME } from '@/lib/file-types'

const ext = '.' + file.name.split('.').pop()?.toLowerCase()
const isAllowed = ALLOWED_MIME_TYPES.includes(file.type) || Object.keys(EXT_TO_MIME).includes(ext)
```

---

## Portal Upload 页面的 Drop Zone 状态样式参考

```tsx
const states = {
  disabled: 'opacity-50 cursor-not-allowed border-muted backdrop-grayscale',
  idle: 'border-muted-foreground/25 hover:border-emerald-300 cursor-pointer',
  dragging: 'border-emerald-400 bg-emerald-50 cursor-pointer',
}
```

颜色主题（供参考）：
- 主要强调色：`#059669`（emerald-600）
- 警告色：`#DC2626`（red-600）
- 链接色：`#059669`（emerald-600）
- 进度条蓝：`#3B82F6`（blue-500）
