import { createAdminClient } from '@/lib/supabase/admin'
import { ensureFreshAccessToken, uploadToXeroContactAttachment, uploadToXeroInbox } from './client'
import { mimeTypeFromFilename } from '@/lib/utils/mime'

interface SyncUploadOptions {
  uploadId: string
  jobId?: string
  firmId: string
  filename: string
  fileBuffer: Buffer | ArrayBuffer
  xeroContactId?: string | null
  uploadMode?: string | null
}

/**
 * Immediately attempt to sync an upload to Xero.
 * On success: marks upload as synced and job as succeeded.
 * On failure: leaves upload as pending and job as queued for cron retry.
 * Returns true if synced.
 */
export async function syncUploadToXero(opts: SyncUploadOptions): Promise<boolean> {
  const { uploadId, jobId, firmId, filename, fileBuffer, xeroContactId, uploadMode = 'attachments' } = opts

  const tokens = await ensureFreshAccessToken(firmId)
  if (!tokens) return false

  const buffer = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer)
  const mimeType = mimeTypeFromFilename(filename)

  let result: { success: boolean; fileId?: string; error?: string }

  if (uploadMode === 'attachments' && xeroContactId) {
    result = await uploadToXeroContactAttachment(firmId, xeroContactId, filename, mimeType, buffer)
  } else {
    result = await uploadToXeroInbox(firmId, filename, mimeType, buffer)
  }

  const supabase = await createAdminClient()

  if (result.success) {
    await Promise.all([
      supabase.from('uploads').update({
        xero_status: 'synced',
        xero_attachment_id: result.fileId || null,
      }).eq('id', uploadId),
      jobId
        ? supabase.from('jobs').update({ status: 'succeeded' }).eq('id', jobId)
        : Promise.resolve(),
    ])
    return true
  }

  return false
}
