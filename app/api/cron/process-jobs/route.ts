import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ensureFreshAccessToken, uploadToXeroInbox, uploadToXeroContactAttachment } from '@/lib/xero/client'
import { mimeTypeFromFilename } from '@/lib/utils/mime'
import { sendUploadFailedEmail } from '@/lib/email/postmark'

// Process queued xero_sync jobs
// Runs every 5 minutes (configured in vercel.json)

const MAX_ATTEMPTS = 3

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createAdminClient()

  try {
    // Get queued jobs (limit 10 at a time to stay within cron timeout)
    const { data: jobs, error: fetchError } = await supabase
      .from('jobs')
      .select(`
        id,
        client_id,
        upload_id,
        type,
        attempts,
        clients (
          id,
          name,
          email,
          firm_id,
          xero_contact_id,
          short_links (short_code, is_active),
          firms (
            name,
            xero_upload_mode
          )
        )
      `)
      .eq('status', 'queued')
      .eq('type', 'xero_sync')
      .lt('attempts', MAX_ATTEMPTS)
      .order('created_at', { ascending: true })
      .limit(10)

    if (fetchError) throw fetchError

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ success: true, processed: 0 })
    }

    let processedCount = 0
    let failedCount = 0

    for (const job of jobs) {
      const clientData = job.clients as {
        id: string
        name: string
        email: string | null
        firm_id: string
        xero_contact_id: string | null
        short_links: Array<{ short_code: string; is_active: boolean }> | null
        firms: { name: string | null; xero_upload_mode: string | null } | null
      } | null

      if (!clientData) {
        await supabase
          .from('jobs')
          .update({ status: 'failed', error: 'Client not found' })
          .eq('id', job.id)
        failedCount++
        continue
      }

      const firmId = clientData.firm_id
      const xeroContactId = clientData.xero_contact_id
      const uploadMode = clientData.firms?.xero_upload_mode || 'attachments'

      // Check Xero connection before marking as processing
      const tokens = await ensureFreshAccessToken(firmId)
      if (!tokens) {
        // Don't increment attempts — Xero just isn't connected yet, retry later
        continue
      }

      // Mark as processing
      await supabase
        .from('jobs')
        .update({
          status: 'processing',
          attempts: job.attempts + 1,
          last_attempt_at: new Date().toISOString(),
        })
        .eq('id', job.id)

      // Get upload record
      const { data: upload } = await supabase
        .from('uploads')
        .select('id, filename, original_filename, file_type, storage_path')
        .eq('id', job.upload_id!)
        .single()

      if (!upload) {
        await supabase
          .from('jobs')
          .update({ status: 'failed', error: 'Upload record not found' })
          .eq('id', job.id)
        failedCount++
        continue
      }

      // Need storage_path to fetch the file
      if (!upload.storage_path) {
        await supabase
          .from('jobs')
          .update({ status: 'failed', error: 'No storage_path — cannot fetch file for Xero sync' })
          .eq('id', job.id)
        await supabase
          .from('uploads')
          .update({ xero_status: 'error' })
          .eq('id', upload.id)
        failedCount++
        continue
      }

      // Download file from Supabase Storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('client-uploads')
        .download(upload.storage_path)

      if (downloadError || !fileData) {
        const errMsg = downloadError?.message || 'Failed to download from storage'
        await supabase
          .from('jobs')
          .update({ status: 'failed', error: errMsg })
          .eq('id', job.id)
        await supabase
          .from('uploads')
          .update({ xero_status: 'error' })
          .eq('id', upload.id)
        failedCount++
        continue
      }

      const fileBuffer = await fileData.arrayBuffer()
      const fileName = upload.original_filename || upload.filename
      const mimeType = mimeTypeFromFilename(fileName)

      // Upload to Xero based on mode and whether client has a Xero contact
      let xeroResult: { success: boolean; fileId?: string; error?: string }

      if (uploadMode === 'attachments' && xeroContactId) {
        xeroResult = await uploadToXeroContactAttachment(
          firmId,
          xeroContactId,
          fileName,
          mimeType,
          fileBuffer
        )
      } else {
        // Fallback to Inbox (also used when upload_mode = 'files' or no xero_contact_id)
        xeroResult = await uploadToXeroInbox(firmId, fileName, mimeType, fileBuffer)
      }

      if (xeroResult.success) {
        await supabase
          .from('jobs')
          .update({ status: 'succeeded' })
          .eq('id', job.id)

        await supabase
          .from('uploads')
          .update({
            xero_status: 'synced',
            xero_attachment_id: xeroResult.fileId || null,
          })
          .eq('id', upload.id)

        processedCount++
      } else {
        const isLastAttempt = job.attempts + 1 >= MAX_ATTEMPTS
        await supabase
          .from('jobs')
          .update({
            status: isLastAttempt ? 'failed' : 'queued',
            error: xeroResult.error || 'Xero upload failed',
          })
          .eq('id', job.id)

        if (isLastAttempt) {
          await supabase
            .from('uploads')
            .update({ xero_status: 'error' })
            .eq('id', upload.id)
          failedCount++

          // Notify client by email so they can re-upload via Magic Link
          if (clientData?.email) {
            const activeLink = clientData.short_links?.find(l => l.is_active)
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://filio.uk'
            const uploadLink = activeLink
              ? `${baseUrl}/m/${activeLink.short_code}`
              : baseUrl
            const firmName = clientData.firms?.name || 'Your accountant'
            sendUploadFailedEmail({
              to: clientData.email,
              clientName: clientData.name,
              firmName,
              filename: upload.original_filename || upload.filename,
              uploadLink,
            }).catch(err => console.error('Failed to send upload-failed email:', err))
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      processed: processedCount,
      failed: failedCount,
      processed_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Error in process-jobs:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
