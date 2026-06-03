/**
 * Manually run the xero_sync job processor (bypasses HTTP/cron auth)
 * Run: npx tsx scripts/run-process-jobs.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const env: Record<string, string> = {}
readFileSync(join(__dirname, '..', '.env.local'), 'utf-8')
  .split('\n')
  .forEach(line => {
    const m = line.match(/^([^#=][^=]*)=(.*)$/)
    if (m) env[m[1].trim()] = m[2].trim()
  })

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

const MAX_ATTEMPTS = 3

async function ensureFreshToken(firmId: string) {
  const { data: firm } = await supabase
    .from('firms')
    .select('xero_tokens_encrypted, xero_refresh_token_expires_at')
    .eq('id', firmId)
    .single()

  if (!firm?.xero_tokens_encrypted) {
    console.log(`  ⚠️  No Xero tokens for firm ${firmId}`)
    return null
  }

  // Import crypto helpers
  const { decryptToken, encryptToken } = await import('../lib/xero/crypto')
  const decrypted = JSON.parse(decryptToken(firm.xero_tokens_encrypted))
  const tokens = {
    accessToken: decrypted.accessToken,
    refreshToken: decrypted.refreshToken,
    expiresAt: new Date(decrypted.expiresAt),
    tenantId: decrypted.tenantId,
  }

  // Refresh if within 5 min of expiry
  const needsRefresh = Date.now() >= tokens.expiresAt.getTime() - 5 * 60 * 1000
  if (!needsRefresh) return tokens

  console.log('  🔄 Refreshing Xero token...')
  const res = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${env.XERO_CLIENT_ID}:${env.XERO_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: tokens.refreshToken }),
  })

  if (!res.ok) {
    console.error('  ❌ Token refresh failed:', await res.text())
    return null
  }

  const data = await res.json()
  const newTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
    tenantId: tokens.tenantId,
  }

  const encrypted = encryptToken(JSON.stringify({
    accessToken: newTokens.accessToken,
    refreshToken: newTokens.refreshToken,
    expiresAt: newTokens.expiresAt.toISOString(),
    tenantId: newTokens.tenantId,
  }))
  await supabase.from('firms').update({ xero_tokens_encrypted: encrypted }).eq('id', firmId)
  console.log('  ✅ Token refreshed')
  return newTokens
}

async function uploadToXero(tokens: any, upload: any, client: any) {
  const { data: fileBlob, error: dlErr } = await supabase.storage
    .from('client-uploads')
    .download(upload.storage_path)

  if (dlErr || !fileBlob) {
    return { success: false, error: dlErr?.message || 'Download failed' }
  }

  const fileBuffer = await fileBlob.arrayBuffer()
  const fileName = upload.original_filename || upload.filename
  const mimeType = upload.file_type_mime || 'application/octet-stream'

  const mode = client.firms?.xero_upload_mode || 'attachments'
  const contactId = client.xero_contact_id

  if (mode === 'attachments' && contactId) {
    console.log(`  📎 Uploading as Contact Attachment to contact ${contactId}...`)
    const url = `https://api.xero.com/api.xro/2.0/Contacts/${encodeURIComponent(contactId)}/Attachments/${encodeURIComponent(fileName)}`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        'xero-tenant-id': tokens.tenantId,
        'Content-Type': mimeType,
        Accept: 'application/json',
      },
      body: fileBuffer,
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('  Xero error:', err.substring(0, 300))
      return { success: false, error: `Xero ${res.status}: ${err.substring(0, 100)}` }
    }
    const data = await res.json()
    return { success: true, fileId: data.Attachments?.[0]?.AttachmentID }
  } else {
    console.log(`  📁 Uploading to Xero Inbox...`)
    const inboxRes = await fetch('https://api.xero.com/files.xro/1.0/Inbox', {
      headers: { Authorization: `Bearer ${tokens.accessToken}`, 'xero-tenant-id': tokens.tenantId, Accept: 'application/json' }
    })
    if (!inboxRes.ok) return { success: false, error: 'Cannot access Xero Inbox' }
    const inbox = await inboxRes.json()
    const inboxId = inbox.Id || inbox.id

    const formData = new FormData()
    formData.append(fileName, new Blob([fileBuffer], { type: mimeType }), fileName)
    const uploadRes = await fetch(`https://api.xero.com/files.xro/1.0/Files/${encodeURIComponent(inboxId)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokens.accessToken}`, 'xero-tenant-id': tokens.tenantId, Accept: 'application/json' },
      body: formData,
    })
    if (!uploadRes.ok) {
      const err = await uploadRes.text()
      return { success: false, error: `Xero ${uploadRes.status}: ${err.substring(0, 100)}` }
    }
    const data = await uploadRes.json()
    return { success: true, fileId: data.Id || data.id }
  }
}

async function main() {
  console.log('\n🚀 Running xero_sync job processor...\n')

  const { data: jobs, error } = await supabase
    .from('jobs')
    .select(`
      id, client_id, upload_id, type, attempts,
      clients ( id, firm_id, xero_contact_id, firms ( xero_upload_mode ) )
    `)
    .eq('status', 'queued')
    .eq('type', 'xero_sync')
    .lt('attempts', MAX_ATTEMPTS)
    .order('created_at', { ascending: true })
    .limit(10)

  if (error) { console.error('❌ Failed to fetch jobs:', error); return }
  if (!jobs?.length) { console.log('✅ No queued jobs.'); return }

  console.log(`Found ${jobs.length} queued jobs\n`)

  for (const job of jobs) {
    const client = job.clients as any
    console.log(`\n--- Job ${job.id} ---`)
    console.log(`  firm: ${client?.firm_id}`)

    const tokens = await ensureFreshToken(client?.firm_id)
    if (!tokens) {
      console.log('  ⏭️  Skipping — no Xero tokens')
      continue
    }

    // Mark processing
    await supabase.from('jobs').update({
      status: 'processing',
      attempts: job.attempts + 1,
      last_attempt_at: new Date().toISOString(),
    }).eq('id', job.id)

    // Get upload
    const { data: upload } = await supabase
      .from('uploads')
      .select('id, filename, original_filename, file_type, storage_path')
      .eq('id', job.upload_id)
      .single()

    if (!upload) {
      console.log('  ❌ Upload not found')
      await supabase.from('jobs').update({ status: 'failed', error: 'Upload not found' }).eq('id', job.id)
      continue
    }

    console.log(`  file: ${upload.filename} | storage_path: ${upload.storage_path}`)

    if (!upload.storage_path) {
      console.log('  ❌ No storage_path')
      await supabase.from('jobs').update({ status: 'failed', error: 'No storage_path' }).eq('id', job.id)
      await supabase.from('uploads').update({ xero_status: 'error' }).eq('id', upload.id)
      continue
    }

    const result = await uploadToXero(tokens, upload, client)

    if (result.success) {
      console.log(`  ✅ Synced to Xero! fileId: ${result.fileId}`)
      await supabase.from('jobs').update({ status: 'succeeded' }).eq('id', job.id)
      await supabase.from('uploads').update({ xero_status: 'synced', xero_attachment_id: result.fileId || null }).eq('id', upload.id)
    } else {
      const isLast = job.attempts + 1 >= MAX_ATTEMPTS
      console.log(`  ❌ Failed: ${result.error}`)
      await supabase.from('jobs').update({
        status: isLast ? 'failed' : 'queued',
        error: result.error,
      }).eq('id', job.id)
      if (isLast) await supabase.from('uploads').update({ xero_status: 'error' }).eq('id', upload.id)
    }
  }

  console.log('\n✅ Done.')
}

main().catch(console.error)
