# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Filio** is a UK accounting SaaS platform for accountants to manage client document uploads synced to Xero. Built with Next.js App Router, TypeScript, Tailwind CSS, and shadcn/ui.

## Build Commands

```bash
pnpm dev          # Start development server (http://localhost:3000)
pnpm build        # Production build
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm test:e2e     # Run all Playwright E2E tests
pnpm test:e2e:ui  # Run Playwright with UI
pnpm test:e2e:smoke  # Run smoke tests only
```

## Architecture

### Stack
- **Framework**: Next.js 15 (App Router)
- **Database/Auth**: Supabase (Postgres + Auth + Storage + RLS)
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **Xero Integration**: OAuth 2.0 with AES-256-GCM token encryption
- **Email**: Postmark (outbound transactional + inbound receiving via `send.filio.uk`)
- **Testing**: Playwright E2E

### Key Architecture Patterns

**Supabase Client Strategy**:
- `lib/supabase/client.ts` - Browser client (`createBrowserClient`)
- `lib/supabase/server.ts` - Server components/API routes (`createServerClient`)
- `lib/supabase/admin.ts` - Admin client for RLS bypass operations

**Xero Token Encryption**:
- Tokens stored encrypted via `lib/xero/crypto.ts` (AES-256-GCM)
- Auto-refresh with 5-minute buffer via `ensureFreshAccessToken()`
- Upload modes: "attachments" (linked to contact) or "files" (to Inbox)

**i18n**:
- Language context at `lib/i18n/context.tsx`
- Locales in `lib/i18n/locales/en.ts` and `zh.ts`
- Uses nested key format (e.g., `clients.title`, `nav.dashboard`)

**Database Schema** (Supabase):
- `firms` - Accountancy firm settings (Xero connection, branding, defaults)
- `clients` - Client records with cached/denormalized columns
- `uploads` - File upload records
- `requests` - Document requests with deadlines
- `jobs` / `reminder_jobs` - Background job queues
- `portal_tokens` - Magic link tokens
- `audit_logs` - Action logging (7-year HMRC retention)

### API Route Structure

- `/api/clients/[id]/*` - Client CRUD, token regeneration, soft/permanent delete
- `/api/xero/*` - Xero OAuth, contacts sync, import, settings
- `/api/upload/*` - Signed URL generation, upload confirmation, Xero direct upload
- `/api/cron/*` - Scheduled jobs (reminders, batch downloads, purges)
- `/api/portal/*` - Portal token verification

### File Upload Flow

1. Client requests signed URL via `/api/upload/signed-url`
2. File uploaded directly to Supabase Storage
3. Confirmation via `/api/upload/confirm` creates upload record
4. Background job syncs to Xero via Attachments API or Files API

## Database & Migrations

Migrations in `supabase/migrations/`. Key migrations:
- `add_client_cache_fields.sql` - Denormalized columns (uploads_count, next_deadline_date)
- `20260417_add_original_filename.sql` - Original filename tracking
- `20260418_add_xero_upload_mode.sql` - Upload mode preference

## Environment Variables

See `.env.example` for required variables:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `XERO_CLIENT_ID` / `XERO_CLIENT_SECRET` / `XERO_REDIRECT_URI`
- `POSTMARK_API_KEY` / `POSTMARK_FROM_EMAIL` / `POSTMARK_WEBHOOK_TOKEN` (email)
- `STRIPE_*` (billing)
