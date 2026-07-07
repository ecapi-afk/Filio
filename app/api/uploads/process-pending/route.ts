import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ensureFreshAccessToken, uploadToXeroInbox, uploadToXeroContactAttachment } from '@/lib/xero/client'
import { mimeTypeFromFilename } from '@/lib/utils/mime'

// POST /api/uploads/process-pending
// Manually trigger Xero sync for queued jobs belonging to the current user's firm.
// Called when the accountant clicks "Sync" in the sidebar — works in both local dev and production.

const MAX_ATTEMPTS = 3

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single()

  if (!profile?.firm_id) {
    return NextResponse.json({ error: 'No firm associated' }, { status: 403 })
  }

  const firmId = profile.firm_id
  const adminClient = await createAdminClient()

  // Only pick up queued jobs that belong to this firm
  const { data: jobs, error: fetchError } = await adminClient
    .from('jobs')
    .select(`
      id,
      client_id,
      upload_id,
      type,
      attempts,
      clients (
        id,
        firm_id,
        xero_contact_id,
        firms (
          xero_upload_mode
        )
      )
    `)
    .eq('status', 'queued')
    .eq('type', 'xero_sync')
    .lt('attempts', MAX_ATTEMPTS)
    .order('created_at', { ascending: true })
    .limit(20)

  if (fetchError) {
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
  }

  // Filter to this firm only (jobs table has no direct firm_id column)
  const firmJobs = (jobs || []).filter(job => {
    const c = job.clients as { firm_id: string } | null
    return c?.firm_id === firmId
  })

  if (firmJobs.length === 0) {
    return NextResponse.json({ success: true, processed: 0, failed: 0, message: 'No pending jobs' })
  }

  // Check Xero connection once
  const tokens = await ensureFreshAccessToken(firmId)
  if (!tokens) {
    return NextResponse.json({ error: 'Not connected to Xero' }, { status: 400 })
  }

  let processedCount = 0
  let failedCount = 0

  for (const job of firmJobs) {
    const clientData = job.clients as {
      id: string
      firm_id: string
      xero_contact_id: string | null
      firms: { xero_upload_mode: string | null } | null
    } | null

    if (!clientData) {
      await adminClient.from('jobs').update({ status: 'failed', error: 'Client not found' }).eq('id', job.id)
      failedCount++
      continue
    }

    const xeroContactId = clientData.xero_contact_id
    const uploadMode = clientData.firms?.xero_upload_mode || 'attachments'

    // Mark as processing
    await adminClient
      .from('jobs')
      .update({
        status: 'processing',
        attempts: job.attempts + 1,
        last_attempt_at: new Date().toISOString(),
      })
      .eq('id', job.id)

    // Get upload record
    if (!job.upload_id) {
      await adminClient.from('jobs').update({ status: 'failed', error: 'No upload_id' }).eq('id', job.id)
      failedCount++
      continue
    }
    const { data: upload } = await adminClient
      .from('uploads')
      .select('id, filename, original_filename, file_type, storage_path')
      .eq('id', job.upload_id)
      .single()

    if (!upload) {
      await adminClient.from('jobs').update({ status: 'failed', error: 'Upload record not found' }).eq('id', job.id)
      failedCount++
      continue
    }

    if (!upload.storage_path) {
      await adminClient.from('jobs').update({ status: 'failed', error: 'No storage_path' }).eq('id', job.id)
      await adminClient.from('uploads').update({ xero_status: 'error' }).eq('id', upload.id)
      failedCount++
      continue
    }

    // Download from Supabase Storage
    const { data: fileData, error: downloadError } = await adminClient.storage
      .from('client-uploads')
      .download(upload.storage_path)

    if (downloadError || !fileData) {
      const errMsg = downloadError?.message || 'Failed to download'
      await adminClient.from('jobs').update({ status: 'failed', error: errMsg }).eq('id', job.id)
      await adminClient.from('uploads').update({ xero_status: 'error' }).eq('id', upload.id)
      failedCount++
      continue
    }

    const fileBuffer = await fileData.arrayBuffer()
    const fileName = upload.original_filename || upload.filename
    const mimeType = mimeTypeFromFilename(fileName)

    let xeroResult: { success: boolean; fileId?: string; error?: string }

    if (uploadMode === 'attachments' && xeroContactId) {
      xeroResult = await uploadToXeroContactAttachment(firmId, xeroContactId, fileName, mimeType, fileBuffer)
    } else {
      xeroResult = await uploadToXeroInbox(firmId, fileName, mimeType, fileBuffer)
    }

    if (xeroResult.success) {
      await adminClient.from('jobs').update({ status: 'succeeded' }).eq('id', job.id)
      await adminClient.from('uploads').update({
        xero_status: 'synced',
        xero_attachment_id: xeroResult.fileId || null,
      }).eq('id', upload.id)
      processedCount++
    } else {
      const isLastAttempt = job.attempts + 1 >= MAX_ATTEMPTS
      await adminClient.from('jobs').update({
        status: isLastAttempt ? 'failed' : 'queued',
        error: xeroResult.error || 'Xero upload failed',
      }).eq('id', job.id)
      if (isLastAttempt) {
        await adminClient.from('uploads').update({ xero_status: 'error' }).eq('id', upload.id)
        failedCount++
      }
    }
  }

  return NextResponse.json({
    success: true,
    processed: processedCount,
    failed: failedCount,
  })
}
