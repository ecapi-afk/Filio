# Xero 在 Manus 平台上的完整部署指南

**文档版本：** 1.0  
**最后更新：** 2026年3月16日  
**适用平台：** Manus Web App Template（React 19 + Express 4 + tRPC 11 + MySQL）  
**维护人：** Manus AI  

---

## 概述

本文档详细记录了如何在 Manus 平台上从零开始集成 Xero API，包括 OAuth 2.0 认证、发票查询、文件上传（MTD Digital Link 合规）等完整功能。文档基于 AQXI 项目的实际部署经验，涵盖了所有常见的陷阱和解决方案。

**完整流程耗时：** 约 2-3 小时（首次部署）  
**技术栈：** Xero Node.js SDK v14.0.0+、xero-node OAuth 2.0、AES-256-GCM 加密、tRPC 11、React 19  
**成本：** 完全免费（Xero 免费层支持所有功能）

---

## 第一部分：前置准备

### 1.1 所需账户和凭证

在开始部署前，请确保您已准备好以下资源：

| 资源 | 说明 | 获取方式 |
| :--- | :--- | :--- |
| **Xero 账户** | 免费或付费 Xero 账户 | https://www.xero.com/signup |
| **Xero Developer App** | OAuth 2.0 应用凭证 | https://developer.xero.com/app/manage |
| **Manus 项目** | 已初始化的 web-db-user 项目 | 使用 `webdev_init_project` 创建 |
| **数据库** | MySQL 8.0+ 或 TiDB | Manus 自动提供 |
| **Node.js** | v18+ | 项目环境已包含 |

### 1.2 Xero Developer App 创建步骤

**步骤 1：登录 Xero Developer Portal**

访问 https://developer.xero.com，使用您的 Xero 账户登录。

**步骤 2：创建新应用**

1. 点击 "My Apps" → "Create an app"
2. 输入应用名称（例如 "AQXI Accounting Portal"）
3. 选择应用类型：**Web app**
4. 点击 "Create app"

**步骤 3：获取应用凭证**

应用创建后，您将看到以下信息：

```
Client ID:     <your-client-id>
Client Secret: <your-client-secret>
```

**立即保存这两个值**，后续需要配置到环境变量。

**步骤 4：配置 OAuth 2.0 Redirect URI**

这是**最关键的一步**，错误配置会导致 OAuth 回调失败。

1. 在应用设置中找到 "OAuth 2.0 redirect URIs" 部分
2. 添加您的 Redirect URI，格式为：

```
https://<your-domain>/api/xero/callback
```

**Manus 平台上的 Redirect URI 示例：**

```
https://aqxaccounting-tl6jaap7.manus.space/api/xero/callback
```

或者如果使用自定义域名：

```
https://aqxi.mooo.com/api/xero/callback
```

**重要提示：** 
- 必须使用 **HTTPS**（不支持 HTTP）
- 路径必须完全匹配 `/api/xero/callback`
- 如果您有多个部署环境（开发、测试、生产），需要为每个环境添加一个 Redirect URI

### 1.3 环境变量配置

在 Manus 项目中，使用 `webdev_request_secrets` 添加以下环境变量：

```bash
XERO_CLIENT_ID=<your-client-id>
XERO_CLIENT_SECRET=<your-client-secret>
XERO_REDIRECT_URI=https://aqxaccounting-tl6jaap7.manus.space/api/xero/callback
XERO_TOKEN_ENCRYPTION_KEY=<64-char-hex-string>
```

**生成 XERO_TOKEN_ENCRYPTION_KEY：**

```bash
# 在本地终端执行
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

这将生成一个 64 字符的十六进制字符串，用于 AES-256-GCM 加密。

---

## 第二部分：数据库 Schema 设计

### 2.1 创建三张核心表

Xero 集成需要三张表来存储用户连接、Token 和审计日志。在 `drizzle/schema.ts` 中添加以下表定义：

```typescript
import { mysqlTable, varchar, text, timestamp, int, bigint, index } from "drizzle-orm/mysql-core";

// ─── Xero Tokens Table ────────────────────────────────────────────────────────
export const xeroTokens = mysqlTable(
  "xero_tokens",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull(),
    tenantId: varchar("tenant_id", { length: 255 }).notNull(),
    tenantName: varchar("tenant_name", { length: 255 }).notNull(),
    // Encrypted TokenSet JSON (AES-256-GCM)
    encryptedTokens: text("encrypted_tokens").notNull(),
    // Metadata for debugging
    connectedAt: timestamp("connected_at").defaultNow().notNull(),
    lastRefreshedAt: timestamp("last_refreshed_at").defaultNow().notNull(),
  },
  (table) => ({
    userTenantIdx: index("idx_user_tenant").on(table.userId, table.tenantId),
  })
);

// ─── Xero Upload Logs Table (MTD Digital Link Audit Trail) ──────────────────
export const xeroUploadLogs = mysqlTable(
  "xero_upload_logs",
  {
    id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
    userId: int("user_id").notNull(),
    tenantId: varchar("tenant_id", { length: 255 }).notNull(),
    xeroEntityType: varchar("xero_entity_type", { length: 50 }).notNull(), // "Inbox", "Invoice", etc.
    xeroEntityId: varchar("xero_entity_id", { length: 255 }).notNull(),
    fileName: varchar("file_name", { length: 256 }).notNull(),
    mimeType: varchar("mime_type", { length: 50 }).notNull(),
    fileSizeBytes: int("file_size_bytes").notNull(),
    uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("idx_upload_user").on(table.userId),
    tenantIdIdx: index("idx_upload_tenant").on(table.tenantId),
  })
);
```

**运行迁移：**

```bash
pnpm db:push
```

### 2.2 表字段说明

**xero_tokens 表：**

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | INT | 主键 |
| `user_id` | INT | 关联的用户 ID（来自 users 表） |
| `tenant_id` | VARCHAR(255) | Xero 组织 ID（由 Xero 生成） |
| `tenant_name` | VARCHAR(255) | Xero 组织名称（用于展示） |
| `encrypted_tokens` | TEXT | 加密的 TokenSet JSON（包含 access_token、refresh_token、expires_at） |
| `connected_at` | TIMESTAMP | 首次连接时间 |
| `last_refreshed_at` | TIMESTAMP | 最后一次 Token 刷新时间 |

**xero_upload_logs 表：**

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | BIGINT | 主键 |
| `user_id` | INT | 上传用户 ID |
| `tenant_id` | VARCHAR(255) | 上传到的 Xero 组织 ID |
| `xero_entity_type` | VARCHAR(50) | 实体类型（"Inbox"、"Invoice" 等） |
| `xero_entity_id` | VARCHAR(255) | 实体 ID（例如 Inbox Folder ID） |
| `file_name` | VARCHAR(256) | 上传的文件名 |
| `mime_type` | VARCHAR(50) | MIME 类型（application/pdf、image/png 等） |
| `file_size_bytes` | INT | 文件大小（字节） |
| `uploaded_at` | TIMESTAMP | 上传时间（MTD 审计证据） |

---

## 第三部分：后端集成

### 3.1 Token 加密/解密层（xeroTokenCrypto.ts）

创建 `server/xeroTokenCrypto.ts` 文件，实现 AES-256-GCM 加密：

```typescript
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;
const IV_LENGTH = 12;

export function encryptToken(tokenJson: string, encryptionKey: string): string {
  const key = Buffer.from(encryptionKey, "hex");
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(tokenJson, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Format: iv + authTag + encrypted
  return iv.toString("hex") + authTag.toString("hex") + encrypted;
}

export function decryptToken(encryptedData: string, encryptionKey: string): string {
  const key = Buffer.from(encryptionKey, "hex");

  const iv = Buffer.from(encryptedData.slice(0, IV_LENGTH * 2), "hex");
  const authTag = Buffer.from(encryptedData.slice(IV_LENGTH * 2, IV_LENGTH * 2 + TAG_LENGTH * 2), "hex");
  const encrypted = encryptedData.slice(IV_LENGTH * 2 + TAG_LENGTH * 2);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
```

### 3.2 数据库操作层（xeroDb.ts）

创建 `server/xeroDb.ts` 文件，实现 Token 的保存和读取：

```typescript
import { db } from "./db";
import { xeroTokens, xeroUploadLogs } from "../drizzle/schema";
import { encryptToken, decryptToken } from "./xeroTokenCrypto";
import { eq, and } from "drizzle-orm";

const ENCRYPTION_KEY = process.env.XERO_TOKEN_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  throw new Error("XERO_TOKEN_ENCRYPTION_KEY environment variable is not set");
}

export async function saveXeroTokens(
  userId: number,
  tenantId: string,
  tenantName: string | undefined,
  tokenSet: any
): Promise<void> {
  const tokenJson = JSON.stringify(tokenSet);
  const encryptedTokens = encryptToken(tokenJson, ENCRYPTION_KEY);

  // Upsert: if exists, update; otherwise, insert
  const existing = await db
    .select()
    .from(xeroTokens)
    .where(and(eq(xeroTokens.userId, userId), eq(xeroTokens.tenantId, tenantId)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(xeroTokens)
      .set({
        encryptedTokens,
        lastRefreshedAt: new Date(),
      })
      .where(and(eq(xeroTokens.userId, userId), eq(xeroTokens.tenantId, tenantId)));
  } else {
    await db.insert(xeroTokens).values({
      userId,
      tenantId,
      tenantName: tenantName || "Unknown",
      encryptedTokens,
    });
  }
}

export async function getXeroTokens(userId: number, tenantId: string): Promise<any | null> {
  const rows = await db
    .select()
    .from(xeroTokens)
    .where(and(eq(xeroTokens.userId, userId), eq(xeroTokens.tenantId, tenantId)))
    .limit(1);

  if (rows.length === 0) return null;

  const encrypted = rows[0].encryptedTokens;
  const tokenJson = decryptToken(encrypted, ENCRYPTION_KEY);
  return JSON.parse(tokenJson);
}

export async function getUserXeroConnections(userId: number): Promise<any[]> {
  return db.select().from(xeroTokens).where(eq(xeroTokens.userId, userId));
}

export async function deleteXeroTokens(userId: number, tenantId: string): Promise<void> {
  await db
    .delete(xeroTokens)
    .where(and(eq(xeroTokens.userId, userId), eq(xeroTokens.tenantId, tenantId)));
}

export async function logXeroUpload(data: {
  userId: number;
  tenantId: string;
  xeroEntityType: string;
  xeroEntityId: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
}): Promise<void> {
  await db.insert(xeroUploadLogs).values(data);
}

export async function getUserUploadLogs(userId: number): Promise<any[]> {
  return db
    .select()
    .from(xeroUploadLogs)
    .where(eq(xeroUploadLogs.userId, userId))
    .orderBy((table) => table.uploadedAt);
}
```

### 3.3 Express 回调路由（xeroCallback.ts）

创建 `server/xeroCallback.ts` 文件，处理 OAuth 2.0 回调：

```typescript
import type { Express, Request, Response } from "express";
import { XeroClient, TokenSet } from "xero-node";
import { sdk } from "./_core/sdk";
import { saveXeroTokens } from "./xeroDb";

function createXeroClient(): XeroClient {
  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET;
  const redirectUri = process.env.XERO_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Missing Xero credentials in environment.");
  }

  return new XeroClient({
    clientId,
    clientSecret,
    redirectUris: [redirectUri],
    scopes: [
      "openid",
      "profile",
      "email",
      "accounting.banktransactions.read",
      "accounting.invoices",
      "accounting.contacts",
      "accounting.settings.read",
      "accounting.attachments",
      "files",
      "offline_access",
    ],
  });
}

export function registerXeroCallbackRoute(app: Express) {
  app.get("/api/xero/callback", async (req: Request, res: Response) => {
    const code = req.query["code"];
    const error = req.query["error"];

    // Handle Xero-side errors
    if (error) {
      const desc = req.query["error_description"] ?? error;
      console.error("[Xero Callback] Xero returned error:", desc);
      res.redirect(302, `/portal?xero_error=${encodeURIComponent(String(desc))}`);
      return;
    }

    if (!code || typeof code !== "string") {
      res.redirect(302, "/portal?xero_error=missing_code");
      return;
    }

    // Authenticate user via session cookie
    let user;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      res.redirect(302, "/portal?xero_error=not_authenticated");
      return;
    }

    if (!user) {
      res.redirect(302, "/portal?xero_error=not_authenticated");
      return;
    }

    // Exchange code for tokens
    try {
      const xero = createXeroClient();

      const protocol = req.headers["x-forwarded-proto"] ?? req.protocol ?? "https";
      const host = req.headers["x-forwarded-host"] ?? req.headers["host"];
      const callbackUrl = `${protocol}://${host}${req.originalUrl}`;

      const tokenSet = (await xero.apiCallback(callbackUrl)) as TokenSet & { expires_in?: number };

      // Fetch connected organisations
      await xero.updateTenants();
      const tenants = xero.tenants;

      if (!tenants || tenants.length === 0) {
        res.redirect(302, "/portal?xero_error=no_organisations");
        return;
      }

      // Persist encrypted tokens for each tenant
      for (const tenant of tenants) {
        await saveXeroTokens(
          user.id,
          tenant.tenantId,
          tenant.tenantName,
          {
            ...tokenSet,
            expires_at: Math.floor(Date.now() / 1000) + (tokenSet.expires_in ?? 1800),
          }
        );
      }

      console.log(
        `[Xero Callback] User ${user.id} connected ${tenants.length} organisation(s)`
      );

      res.redirect(302, "/portal?xero_connected=true");
    } catch (err) {
      console.error("[Xero Callback] Token exchange failed:", err);
      const msg = err instanceof Error ? err.message : "token_exchange_failed";
      res.redirect(302, `/portal?xero_error=${encodeURIComponent(msg)}`);
    }
  });
}
```

**在 `server/_core/index.ts` 中注册路由：**

```typescript
import { registerXeroCallbackRoute } from "../xeroCallback";

// ... 其他代码 ...

registerXeroCallbackRoute(app);
```

### 3.4 tRPC Router（xeroRouter.ts）

创建 `server/xeroRouter.ts` 文件，实现 tRPC 过程：

```typescript
import { z } from "zod";
import { XeroClient, TokenSet } from "xero-node";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "./_core/trpc";
import {
  saveXeroTokens,
  getXeroTokens,
  getUserXeroConnections,
  deleteXeroTokens,
  logXeroUpload,
  getUserUploadLogs,
} from "./xeroDb";

function createXeroClient(): XeroClient {
  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET;
  const redirectUri = process.env.XERO_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Missing Xero credentials.");
  }

  return new XeroClient({
    clientId,
    clientSecret,
    redirectUris: [redirectUri],
    scopes: [
      "openid",
      "profile",
      "email",
      "accounting.banktransactions.read",
      "accounting.invoices",
      "accounting.contacts",
      "accounting.settings.read",
      "accounting.attachments",
      "files",
      "offline_access",
    ],
  });
}

const REFRESH_BUFFER_SECONDS = 60;

async function getValidTokenSet(userId: number, tenantId: string): Promise<TokenSet> {
  const stored = await getXeroTokens(userId, tenantId);
  if (!stored) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Xero not connected.",
    });
  }

  const tokenSet = stored as TokenSet & { expires_at?: number };
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = tokenSet.expires_at ?? 0;

  // Auto-refresh if within buffer
  if (expiresAt - now < REFRESH_BUFFER_SECONDS) {
    const xero = createXeroClient();
    xero.setTokenSet(tokenSet as TokenSet);
    const refreshed = await xero.refreshToken();

    await saveXeroTokens(userId, tenantId, undefined, {
      ...refreshed,
      expires_at: Math.floor(Date.now() / 1000) + (refreshed.expires_in ?? 1800),
    });

    return refreshed;
  }

  return tokenSet as TokenSet;
}

export const xeroRouter = router({
  getAuthUrl: protectedProcedure.query(async () => {
    const xero = createXeroClient();
    const url = await xero.buildConsentUrl();
    return { url };
  }),

  handleCallback: protectedProcedure
    .input(z.object({ callbackUrl: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      const xero = createXeroClient();
      const tokenSet = await xero.apiCallback(input.callbackUrl);
      await xero.updateTenants();
      const tenants = xero.tenants;

      if (!tenants || tenants.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No Xero organisations found.",
        });
      }

      for (const tenant of tenants) {
        await saveXeroTokens(ctx.user.id, tenant.tenantId, tenant.tenantName, {
          ...tokenSet,
          expires_at: Math.floor(Date.now() / 1000) + (tokenSet.expires_in ?? 1800),
        });
      }

      return {
        success: true,
        connectedOrganisations: tenants.map((t) => ({
          tenantId: t.tenantId,
          tenantName: t.tenantName,
        })),
      };
    }),

  getConnections: protectedProcedure.query(async ({ ctx }) => {
    const connections = await getUserXeroConnections(ctx.user.id);
    return connections.map((c) => ({
      tenantId: c.tenantId,
      tenantName: c.tenantName,
      connectedAt: c.connectedAt,
    }));
  }),

  disconnect: protectedProcedure
    .input(z.object({ tenantId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await deleteXeroTokens(ctx.user.id, input.tenantId);
      return { success: true };
    }),

  getInvoices: protectedProcedure
    .input(z.object({ tenantId: z.string(), page: z.number().int().min(1).default(1) }))
    .query(async ({ ctx, input }) => {
      const tokenSet = await getValidTokenSet(ctx.user.id, input.tenantId);
      const xero = createXeroClient();
      xero.setTokenSet(tokenSet);

      const response = await xero.accountingApi.getInvoices(
        input.tenantId,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        input.page,
        false,
        false,
        undefined,
        false
      );

      return response.body.invoices ?? [];
    }),

  uploadAttachment: protectedProcedure
    .input(
      z.object({
        tenantId: z.string(),
        fileName: z.string().max(256),
        mimeType: z.enum(["application/pdf", "image/jpeg", "image/png"]),
        fileBase64: z.string().max(10 * 1024 * 1024),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tokenSet = await getValidTokenSet(ctx.user.id, input.tenantId);
      const xero = createXeroClient();
      xero.setTokenSet(tokenSet);

      const fileBuffer = Buffer.from(input.fileBase64, "base64");

      // Get Inbox folder ID
      const inboxResponse = await xero.filesApi.getInbox(input.tenantId);
      const inbox = inboxResponse.body as any;
      const inboxFolderId = inbox.id ?? inbox.Id ?? inbox.folderId;

      if (!inboxFolderId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve Inbox folder ID",
        });
      }

      // Upload via axios + form-data (SDK bug workaround)
      try {
        const FormData = (await import("form-data")).default;
        const form = new FormData();
        form.append(input.fileName, fileBuffer, {
          filename: input.fileName,
          contentType: input.mimeType,
        });

        const accessToken = (tokenSet as any).access_token;
        const uploadUrl = `https://api.xero.com/files.xro/1.0/Files/${encodeURIComponent(inboxFolderId)}`;

        const axios = (await import("axios")).default;
        const uploadResp = await axios.post(uploadUrl, form, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "xero-tenant-id": input.tenantId,
            ...form.getHeaders(),
          },
        });

        const uploaded = uploadResp.data as any;
        const uploadedFileId = uploaded.Id ?? uploaded.id;

        // Log for MTD audit trail
        await logXeroUpload({
          userId: ctx.user.id,
          tenantId: input.tenantId,
          xeroEntityType: "Inbox",
          xeroEntityId: inboxFolderId,
          fileName: input.fileName,
          mimeType: input.mimeType,
          fileSizeBytes: fileBuffer.length,
        });

        return {
          success: true,
          fileId: uploadedFileId,
          fileName: input.fileName,
          fileSize: fileBuffer.length,
        };
      } catch (err: any) {
        const xeroError = err?.response?.data ?? err?.message ?? String(err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Xero upload failed: ${JSON.stringify(xeroError)}`,
        });
      }
    }),

  getUploadLogs: protectedProcedure.query(async ({ ctx }) => {
    return getUserUploadLogs(ctx.user.id);
  }),
});
```

**在 `server/routers.ts` 中注册：**

```typescript
import { xeroRouter } from "./xeroRouter";

export const appRouter = router({
  xero: xeroRouter,
  // ... 其他路由 ...
});
```

---

## 第四部分：前端集成

### 4.1 Xero Portal 页面（XeroPortal.tsx）

创建 `client/src/pages/XeroPortal.tsx` 文件，实现完整的 UI：

```typescript
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Link2, Upload, Loader2, Building2, AlertCircle } from "lucide-react";

export default function XeroPortal() {
  const { user } = useAuth();
  const [selectedTenant, setSelectedTenant] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const getAuthUrl = trpc.xero.getAuthUrl.useQuery(undefined, { enabled: false });
  const { data: connections } = trpc.xero.getConnections.useQuery();
  const handleCallback = trpc.xero.handleCallback.useMutation();
  const uploadFile = trpc.xero.uploadAttachment.useMutation();

  const handleConnect = async () => {
    const result = await getAuthUrl.refetch();
    if (result.data?.url) {
      window.location.href = result.data.url;
    }
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!selectedTenant) {
        toast.error("Please select a Xero organisation first");
        return;
      }

      for (const file of acceptedFiles) {
        setUploading(true);
        try {
          const buffer = await file.arrayBuffer();
          const base64 = Buffer.from(buffer).toString("base64");

          await uploadFile.mutateAsync({
            tenantId: selectedTenant,
            fileName: file.name,
            mimeType: file.type as any,
            fileBase64: base64,
          });

          toast.success(`${file.name} uploaded successfully`);
        } catch (err: any) {
          toast.error(`Upload failed: ${err.message}`);
        } finally {
          setUploading(false);
        }
      }
    },
    [selectedTenant, uploadFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  if (!connections || connections.length === 0) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-bold mb-2">Connect Xero</h2>
            <p className="text-gray-500 mb-6">Link your Xero account to upload documents</p>
            <Button onClick={handleConnect} disabled={getAuthUrl.isFetching}>
              {getAuthUrl.isFetching ? <Loader2 className="mr-2 animate-spin" /> : <Link2 className="mr-2" />}
              Connect with Xero
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Tabs defaultValue="upload">
        <TabsList>
          <TabsTrigger value="upload">Upload Document</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="logs">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>Upload to Xero</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Select Organisation</label>
                <select
                  value={selectedTenant}
                  onChange={(e) => setSelectedTenant(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">-- Choose --</option>
                  {connections.map((c) => (
                    <option key={c.tenantId} value={c.tenantId}>
                      {c.tenantName}
                    </option>
                  ))}
                </select>
              </div>

              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
                  isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="font-medium">Drag files here or click to select</p>
                <p className="text-sm text-gray-500">PDF, PNG, JPEG (max 10MB)</p>
              </div>

              {uploading && (
                <div className="mt-4 flex items-center text-blue-600">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Uploading...
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <InvoiceTable tenantId={selectedTenant} />
        </TabsContent>

        <TabsContent value="logs">
          <AuditLogTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InvoiceTable({ tenantId }: { tenantId: string }) {
  const { data: invoices, isLoading } = trpc.xero.getInvoices.useQuery({ tenantId }, { enabled: !!tenantId });

  if (isLoading) return <div>Loading...</div>;
  if (!invoices) return <div>No invoices</div>;

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b">
          <th className="text-left p-2">Invoice #</th>
          <th className="text-left p-2">Contact</th>
          <th className="text-left p-2">Amount</th>
          <th className="text-left p-2">Status</th>
        </tr>
      </thead>
      <tbody>
        {invoices.map((inv: any) => (
          <tr key={inv.invoiceID} className="border-b">
            <td className="p-2">{inv.invoiceNumber}</td>
            <td className="p-2">{inv.contact?.name}</td>
            <td className="p-2">£{inv.total}</td>
            <td className="p-2">{inv.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AuditLogTable() {
  const { data: logs } = trpc.xero.getUploadLogs.useQuery();

  if (!logs || logs.length === 0) return <div>No uploads yet</div>;

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b">
          <th className="text-left p-2">File</th>
          <th className="text-left p-2">Size</th>
          <th className="text-left p-2">Uploaded</th>
        </tr>
      </thead>
      <tbody>
        {logs.map((log: any) => (
          <tr key={log.id} className="border-b">
            <td className="p-2">{log.fileName}</td>
            <td className="p-2">{(log.fileSizeBytes / 1024).toFixed(2)} KB</td>
            <td className="p-2">{new Date(log.uploadedAt).toLocaleDateString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### 4.2 在 App.tsx 中注册路由

```typescript
import XeroPortal from "./pages/XeroPortal";

export default function App() {
  return (
    <Router>
      <Route path="/portal" component={XeroPortal} />
      {/* 其他路由 */}
    </Router>
  );
}
```

---

## 第五部分：Scopes 配置详解

### 5.1 Xero 2026 年 Scopes 规范

从 2026 年 3 月 2 日起，Xero 采用了新的细粒度 Scopes 系统。以下是完整的 Scopes 清单及其含义：

| Scope | 说明 | 用途 |
| :--- | :--- | :--- |
| `openid` | OpenID Connect 标识符 | 必须 |
| `profile` | 用户基本信息 | 必须 |
| `email` | 用户邮箱 | 必须 |
| `accounting.banktransactions.read` | 读取银行交易 | 查询银行账户 |
| `accounting.invoices` | 读写发票 | 查询和创建发票 |
| `accounting.contacts` | 读写联系人 | 查询和管理客户 |
| `accounting.settings.read` | 读取组织设置 | 查询公司信息 |
| `accounting.attachments` | 读写附件 | 上传文件到发票 |
| `files` | 读写文件 | **必须**用于 MTD 文件上传 |
| `offline_access` | 离线访问 | 获取 refresh_token |

**关键规则：**

1. **不使用 `.write` 后缀**：Xero 2026 已弃用 `.write` 后缀（如 `accounting.invoices.write`），改为直接使用基础 scope（如 `accounting.invoices`）。
2. **`files` scope 是必须的**：如果需要上传文件到 Xero Files（MTD Digital Link），必须包含 `files` scope。
3. **`offline_access` 用于 Refresh Token**：如果需要长期访问，必须包含 `offline_access`。

### 5.2 常见的 Scopes 组合

**场景 1：仅查询发票和联系人（只读）**

```typescript
scopes: [
  "openid",
  "profile",
  "email",
  "accounting.invoices",
  "accounting.contacts",
  "offline_access",
]
```

**场景 2：完整的会计系统集成（读写）**

```typescript
scopes: [
  "openid",
  "profile",
  "email",
  "accounting.banktransactions.read",
  "accounting.invoices",
  "accounting.contacts",
  "accounting.settings.read",
  "accounting.attachments",
  "files",
  "offline_access",
]
```

**场景 3：仅 MTD 文件上传（最小权限）**

```typescript
scopes: [
  "openid",
  "profile",
  "email",
  "files",
  "offline_access",
]
```

---

## 第六部分：常见错误与解决方案

### 错误 1：`redirect_uri_mismatch`

**症状：** OAuth 回调时 Xero 返回 `redirect_uri_mismatch` 错误。

**原因：** Xero Developer Portal 中配置的 Redirect URI 与代码中的 `XERO_REDIRECT_URI` 不匹配。

**解决方案：**

1. 登录 Xero Developer Portal
2. 进入应用设置
3. 检查 "OAuth 2.0 redirect URIs" 中的 URI 是否完全匹配 `XERO_REDIRECT_URI` 环境变量
4. 确保使用 HTTPS（不支持 HTTP）
5. 确保路径为 `/api/xero/callback`

### 错误 2：`insufficient_scope`

**症状：** 调用 Xero API 时返回 `insufficient_scope` 错误。

**原因：** 当前 Token 的 Scopes 不包含所需的权限。

**解决方案：**

1. 检查 `xeroRouter.ts` 中的 Scopes 数组是否包含所需的权限
2. 如果修改了 Scopes，用户需要**重新授权**（断开并重新连接 Xero）
3. 确认 Xero Developer Portal 中的应用配置没有限制 Scopes

### 错误 3：`400 No file was attached`

**症状：** 文件上传时 Xero 返回 `400 Bad Request: No file was attached`。

**原因：** xero-node SDK 的 `uploadFileToFolder` 方法存在 bug，它将 Buffer 序列化为字符串，导致 Xero 收不到文件内容。

**解决方案：** **不要使用 SDK 的 `uploadFileToFolder` 方法**。改用 `form-data` + `axios` 直接构建 multipart 请求（如 xeroRouter.ts 中的 `uploadAttachment` 过程所示）。

### 错误 4：`Token 已过期`

**症状：** 调用 Xero API 时返回 `401 Unauthorized`。

**原因：** Access Token 已过期，需要使用 Refresh Token 刷新。

**解决方案：** xeroRouter.ts 中的 `getValidTokenSet` 函数已自动处理 Token 刷新。如果仍然出现此错误，检查：

1. 数据库中是否存储了 Refresh Token
2. `XERO_TOKEN_ENCRYPTION_KEY` 是否正确
3. Token 的 `expires_at` 字段是否正确计算

### 错误 5：`ECONNREFUSED` 数据库连接失败

**症状：** 应用启动时数据库连接失败。

**原因：** `DATABASE_URL` 环境变量不正确或数据库不可达。

**解决方案：**

1. 在 Manus 管理界面的 Database 面板中复制正确的 `DATABASE_URL`
2. 确认数据库已启动
3. 运行 `pnpm db:push` 确保表已创建

---

## 第七部分：测试验证清单

完成部署后，请按照以下清单逐项验证：

| 项 | 验证步骤 | 预期结果 |
| :--- | :--- | :--- |
| **1. 环境变量** | 检查 `.env` 中的 `XERO_CLIENT_ID`、`XERO_CLIENT_SECRET`、`XERO_REDIRECT_URI` | 三个变量都已设置 |
| **2. 数据库表** | 运行 `pnpm db:push`，检查 `xero_tokens` 和 `xero_upload_logs` 表 | 两张表已创建 |
| **3. Express 路由** | 访问 `https://yourdomain.com/api/xero/callback?code=test` | 返回 302 重定向（不是 404） |
| **4. tRPC 路由** | 在浏览器 DevTools 中调用 `trpc.xero.getAuthUrl.useQuery()` | 返回 Xero 授权 URL |
| **5. OAuth 流程** | 点击"Connect with Xero"按钮 | 跳转到 Xero 授权页面 |
| **6. Token 保存** | 授权后，检查数据库 `xero_tokens` 表 | 新记录已插入，`encrypted_tokens` 字段已填充 |
| **7. 发票查询** | 授权后，查看 Invoices 标签 | 发票列表正常加载 |
| **8. 文件上传** | 上传测试 PDF 文件 | 文件出现在 Xero Files → Inbox |
| **9. 审计日志** | 查看 Audit Log 标签 | 上传记录已记录 |
| **10. Token 刷新** | 等待 Token 接近过期（或修改 `expires_at` 为过去时间），再调用 API | API 调用成功，Token 已自动刷新 |

---

## 第八部分：最佳实践

### 8.1 安全性

- **永远不要在前端存储 Token**：所有 Token 操作都在后端进行，前端只通过 tRPC 调用。
- **使用 AES-256-GCM 加密**：Token 在数据库中以加密形式存储，即使数据库被泄露，Token 也无法被解密。
- **定期轮换 Encryption Key**：如果 `XERO_TOKEN_ENCRYPTION_KEY` 泄露，立即更换并重新加密所有 Token。

### 8.2 性能

- **自动 Token 刷新**：在 Token 即将过期时（60 秒内）自动刷新，避免 API 调用失败。
- **缓存 Xero 数据**：对于不经常变化的数据（如联系人列表），考虑在前端缓存以减少 API 调用。
- **分页查询**：发票列表等大数据集应使用分页，避免一次性加载所有数据。

### 8.3 错误处理

- **详细的错误信息**：捕获 Xero API 错误并将其返回给前端，方便调试。
- **用户友好的错误提示**：在 UI 中显示易懂的错误信息，而不是技术细节。
- **自动重试**：对于临时性错误（如网络超时），实现自动重试机制。

### 8.4 审计和合规

- **记录所有上传**：在 `xero_upload_logs` 表中记录每次文件上传，包括时间、用户、文件大小等，用于 MTD 合规。
- **定期备份**：定期备份 `xero_tokens` 和 `xero_upload_logs` 表，防止数据丢失。
- **访问控制**：确保只有授权用户才能访问 Xero 数据。

---

## 第九部分：下次部署的快速清单

下次使用 Manus 部署 Xero 集成时，按照以下步骤快速完成：

```bash
# 1. 创建新 Manus 项目
webdev_init_project --template web-db-user

# 2. 添加环境变量
webdev_request_secrets \
  --key XERO_CLIENT_ID --value <your-id> \
  --key XERO_CLIENT_SECRET --value <your-secret> \
  --key XERO_REDIRECT_URI --value https://yourdomain.com/api/xero/callback \
  --key XERO_TOKEN_ENCRYPTION_KEY --value <64-char-hex>

# 3. 复制 Schema 文件
# 从本项目的 drizzle/schema.ts 复制 xeroTokens 和 xeroUploadLogs 表定义

# 4. 复制后端文件
# xeroTokenCrypto.ts, xeroDb.ts, xeroCallback.ts, xeroRouter.ts

# 5. 注册路由
# 在 server/_core/index.ts 中调用 registerXeroCallbackRoute(app)
# 在 server/routers.ts 中添加 xero: xeroRouter

# 6. 创建前端页面
# 复制 client/src/pages/XeroPortal.tsx

# 7. 运行迁移
pnpm db:push

# 8. 启动开发服务器
pnpm dev

# 9. 测试 OAuth 流程
# 访问 /portal，点击"Connect with Xero"

# 10. 部署
webdev_save_checkpoint
# 点击 UI 中的 Publish 按钮
```

---

*本文档由 Manus AI 于 2026年3月16日生成，基于 AQXI 项目的实际部署经验撰写。*
