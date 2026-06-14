import { createAdminClient } from '@/lib/supabase/admin'
import { ensureFreshAccessToken, uploadToXeroContactAttachment, uploadToXeroInbox } from './client'
import { mimeTypeFromFilename } from '@/lib/utils/mime'

interface SyncUploadOptions {
  uploadId: string
  firmId: string
  filename: string
  fileBuffer: Buffer | ArrayBuffer
  xeroContactId?: string | null
  uploadMode?: string | null
}

const MAX_ATTEMPTS = 3
const RETRY_DELAY_MS = 500

/**
 * Sync a file to Xero with up to 3 attempts.
 * On success: marks upload as synced.
 * On total failure: marks upload as error and returns error message.
 */
export async function syncUploadToXero(
  opts: SyncUploadOptions
): Promise<{ success: boolean; error?: string }> {
  const { uploadId, firmId, filename, fileBuffer, xeroContactId, uploadMode = 'attachments' } = opts

  const tokens = await ensureFreshAccessToken(firmId)
  if (!tokens) {
    await markFailed(uploadId)
    return { success: false, error: 'Xero not connected' }
  }

  const buffer = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer)
  const mimeType = mimeTypeFromFilename(filename)
  let lastError: string | undefined

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = (uploadMode === 'attachments' && xeroContactId)
      ? await uploadToXeroContactAttachment(firmId, xeroContactId, filename, mimeType, buffer)
      : await uploadToXeroInbox(firmId, filename, mimeType, buffer)

    if (result.success) {
      const supabase = await createAdminClient()
      await supabase.from('uploads').update({
        xero_status: 'synced',
        xero_attachment_id: result.fileId || null,
      }).eq('id', uploadId)
      return { success: true }
    }

    lastError = result.error
    if (attempt < MAX_ATTEMPTS) {
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS))
    }
  }

  await markFailed(uploadId)
  return { success: false, error: lastError }
}

async function markFailed(uploadId: string) {
  const supabase = await createAdminClient()
  await supabase.from('uploads').update({ xero_status: 'error' }).eq('id', uploadId)
}
