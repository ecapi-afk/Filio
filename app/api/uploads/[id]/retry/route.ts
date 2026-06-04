import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { uploadToXeroContactAttachment, uploadToXeroInbox } from '@/lib/xero/client'
import { mimeTypeFromFilename } from '@/lib/utils/mime'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single() as { data: { firm_id: string } | null }

  if (!profile?.firm_id) return NextResponse.json({ error: 'No firm' }, { status: 403 })

  const { id } = await params
  const adminClient = await createAdminClient()

  // Fetch upload and verify it belongs to this firm via the client relationship
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: upload } = await (adminClient as any)
    .from('uploads')
    .select('id, filename, storage_path, client_id, xero_status, clients(id, name, firm_id, xero_contact_id, xero_linked_contact_id)')
    .eq('id', id)
    .single() as {
      data: {
        id: string
        filename: string
        storage_path: string | null
        client_id: string
        xero_status: string | null
        clients: {
          id: string
          name: string
          firm_id: string
          xero_contact_id: string | null
          xero_linked_contact_id: string | null
        } | null
      } | null
    }

  if (!upload || upload.clients?.firm_id !== profile.firm_id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (!upload.storage_path) {
    return NextResponse.json({ error: 'No storage path for this upload' }, { status: 400 })
  }

  // Download file from Supabase Storage
  const { data: fileData, error: downloadError } = await adminClient.storage
    .from('client-uploads')
    .download(upload.storage_path)

  if (downloadError || !fileData) {
    return NextResponse.json({ error: 'Failed to download file from storage' }, { status: 500 })
  }

  // Fetch firm upload mode
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: firm } = await (adminClient as any)
    .from('firms')
    .select('xero_tokens_encrypted, xero_upload_mode')
    .eq('id', profile.firm_id)
    .single() as { data: { xero_tokens_encrypted: string | null; xero_upload_mode: string | null } | null }

  if (!firm?.xero_tokens_encrypted) {
    return NextResponse.json({ error: 'Xero not connected' }, { status: 400 })
  }

  const fileBuffer = Buffer.from(await fileData.arrayBuffer())
  const uploadMode = firm.xero_upload_mode ?? 'attachments'
  const contactId = upload.clients?.xero_contact_id ?? upload.clients?.xero_linked_contact_id

  if (uploadMode === 'files') {
    const result = await uploadToXeroInbox(profile.firm_id, upload.filename, mimeTypeFromFilename(upload.filename), fileBuffer)
    if (!result.success) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminClient as any).from('uploads').update({ xero_status: 'failed' }).eq('id', id)
      return NextResponse.json({ error: result.error ?? 'Xero upload failed' }, { status: 500 })
    }
  } else {
    if (!contactId) {
      return NextResponse.json({ error: 'No Xero contact linked to this client' }, { status: 400 })
    }
    const result = await uploadToXeroContactAttachment(profile.firm_id, contactId, upload.filename, mimeTypeFromFilename(upload.filename), fileBuffer)
    if (!result.success) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminClient as any).from('uploads').update({ xero_status: 'failed' }).eq('id', id)
      return NextResponse.json({ error: result.error ?? 'Xero upload failed' }, { status: 500 })
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any).from('uploads').update({ xero_status: 'synced' }).eq('id', id)

  return NextResponse.json({ success: true })
}
