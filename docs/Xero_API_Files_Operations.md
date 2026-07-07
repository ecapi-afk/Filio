# Xero 文件操作文档

## 概述

Xero 提供两种方式管理文件附件：
1. **Accounting API - Attachments**：联系人(Contacts)和发票(Invoices)下的附件
2. **Files API**：文件库中的文件（Inbox/文件夹）

---

## 一、Accounting API - Attachments（联系人/发票附件）

### 文档地址
https://developer.xero.com/documentation/api/accounting/attachments

### API 端点

| 操作 | 方法 | URL |
|------|------|-----|
| 下载联系人附件 | GET | `https://api.xero.com/api.xro/2.0/Contacts/{ContactID}/Attachments/{FileName}` |
| 上传联系人附件 | POST | `https://api.xero.com/api.xro/2.0/Contacts/{ContactID}/Attachments/{FileName}` |
| 下载发票附件 | GET | `https://api.xero.com/api.xro/2.0/Invoices/{InvoiceID}/Attachments/{FileName}` |
| 上传发票附件 | POST | `https://api.xero.com/api.xro/2.0/Invoices/{InvoiceID}/Attachments/{FileName}` |

### 请求格式

**上传要求：**
- 直接发送原始二进制流（Raw Binary Body）
- 不使用 `multipart/form-data`
- Header 必须设置 `Content-Type`（如 `application/pdf`）
- 文件名需 URL 编码（如 `encodeURIComponent(fileName)`）

**请求示例：**
```typescript
const url = `https://api.xero.com/api.xro/2.0/Contacts/${contactId}/Attachments/${encodeURIComponent(fileName)}`

const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'xero-tenant-id': tenantId,
    'Content-Type': mimeType,  // 例如 application/pdf
    'Accept': 'application/json'
  },
  body: fileBuffer  // 原始二进制流，不是 FormData
})
```

### 响应格式

成功时返回 JSON：
```json
{
  "Attachments": [
    {
      "AttachmentID": "xxx-xxx-xxx",
      "FileName": "invoice.pdf",
      "ContentType": "application/pdf",
      "Size": 12345,
      "Url": "https://api.xero.com/files.xro/1.0/Files/xxx"
    }
  ]
}
```

### 所需 OAuth Scopes

| 操作 | 所需 Scope |
|------|-----------|
| 读取联系人附件 | `accounting.contacts.read` |
| 上传联系人附件 | `accounting.attachments` |
| 读取发票附件 | `accounting.transactions.read` |
| 上传发票附件 | `accounting.attachments` |

---

## 二、Files API（文件库）

### 文档地址
https://developer.xero.com/documentation/api/files

### API 端点

| 操作 | 方法 | URL |
|------|------|-----|
| 获取 Inbox ID | GET | `https://api.xero.com/files.xro/1.0/Inbox` |
| 上传文件到 Inbox | POST | `https://api.xero.com/files.xro/1.0/Files/{InboxId}` |
| 下载文件内容 | GET | `https://api.xero.com/api.xro/2.0/Files/{FileId}/Content` |
| 获取文件元数据 | GET | `https://api.xero.com/files.xro/1.0/Files/{FileId}` |
| 重命名文件 | PUT | `https://api.xero.com/files.xro/1.0/Files/{FileId}` |
| 删除文件 | DELETE | `https://api.xero.com/files.xro/1.0/Files/{FileId}` |

### 请求格式

**上传到 Inbox：**
```typescript
const inboxRes = await fetch('https://api.xero.com/files.xro/1.0/Inbox', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'xero-tenant-id': tenantId
  }
})
const inbox = await inboxRes.json()
const inboxId = inbox.Id || inbox.id

const formData = new FormData()
formData.append(fileName, new Blob([fileBuffer]), fileName)

const uploadRes = await fetch(`https://api.xero.com/files.xro/1.0/Files/${inboxId}`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'xero-tenant-id': tenantId
  },
  body: formData
})
```

**下载文件内容：**
```typescript
const response = await fetch('https://api.xero.com/api.xro/2.0/Files/{FileId}/Content', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'xero-tenant-id': tenantId
  }
})
const buffer = await response.arrayBuffer()
```

### 所需 OAuth Scopes

| 操作 | 所需 Scope |
|------|-----------|
| 访问文件库 | `files` |

---

## 三、常见问题

### 1. 文件名特殊字符
文件名包含空格或特殊字符时必须 URL 编码：
```typescript
encodeURIComponent(fileName)
// 例如: "invoice (1).pdf" -> "invoice%20%281%29.pdf"
```

### 2. 禁止的字符
Xero 不接受以下字符：`< > : " / \ | ? * @ # ^ & + = ( )`

### 3. 文件大小限制
- 单个文件最大 10MB

### 4. Contact 附件数量限制
每个 Contact 最多 10 个附件

### 5. Content-Type 设置
必须正确设置 Content-Type header，否则 Xero 可能拒绝文件

### 6. Rate Limits
参考 Xero API 速率限制文档

---

## 四、当前实现状态

### 已实现
- ✅ 上传到 Contact（Attachments API）
- ✅ 上传到 Inbox（Files API）
- ✅ Fallback 机制（Contact 失败自动尝试 Inbox）

### 未实现
- ❌ 下载 Xero 中的文件
- ❌ 删除 Xero 中的文件
- ❌ 重命名 Xero 中的文件（Files API 支持，Accounting API 不支持）
- ❌ 关联 Inbox 文件到 Contact

---

*文档创建日期：2026-04-17*
