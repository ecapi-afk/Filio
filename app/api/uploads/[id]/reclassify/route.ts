import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ensureFreshAccessToken } from '@/lib/xero/client'

// PATCH /api/uploads/[id]/reclassify
// Updates file_type (category) and auto-renames filename to match.
// Filename format: [ClientName]_[Category]_[UploadDate].[ext]

/**
 * Generate a standardised filename from client name, category and upload date.
 * e.g. "EricZhang_Invoice_20260507.pdf"
 */
function buildNewFilename(opts: {
  clientName: string
  category: string
  uploadedAt: string   // ISO timestamp
  originalFilename: string
}): string {
  const ext = opts.originalFilename.split('.').pop() || 'file'
  const date = new Date(opts.uploadedAt)
  const dateStr = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('')

  // Sanitise client name: keep letters/digits only, max 20 chars
  const safeName = opts.clientName
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 20)

  // Sanitise category: remove spaces
  const safeCategory = opts.category.replace(/\s+/g, '')

  return `${safeName}_${safeCategory}_${dateStr}.${ext}`
}

/**
 * Attempt to rename a file in Xero Files API (Inbox uploads).
 * Contact Attachments don't have a rename endpoint — those are left as-is.
 */
async function tryRenameInXero(opts: {
  firmId: string
  xeroAttachmentId: string
  newFilename: string
}): Promise<{ renamed: boolean; note?: string }> {
  const tokens = await ensureFreshAccessToken(opts.firmId)
  if (!tokens) return { renamed: false, note: 'No Xero tokens' }

  // Try Files API rename (works for Inbox uploads)
  const res = await fetch(
    `https://api.xero.com/files.xro/1.0/Files/${encodeURIComponent(opts.xeroAttachmentId)}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        'xero-tenant-id': tokens.tenantId,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ Name: opts.newFilename }),
    }
  )

  if (res.ok) return { renamed: true }

  // 404/405 → it's a contact attachment, not a Files API entry
  return {
    renamed: false,
    note: `Xero rename skipped (status ${res.status}) — contact attachment`,
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { file_type } = body

    if (!file_type) {
      return NextResponse.json({ error: 'file_type is required' }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('firm_id')
      .eq('id', user.id)
      .single()

    if (!profile?.firm_id) {
      return NextResponse.json({ error: 'No firm associated' }, { status: 403 })
    }

    const adminClient = await createAdminClient()

    // Get upload with client info
    const { data: upload, error: uploadError } = await adminClient
      .from('uploads')
      .select(`
        id,
        client_id,
        filename,
        original_filename,
        file_type,
        xero_attachment_id,
        xero_status,
        uploaded_at,
        clients!inner (
          id,
          name,
          firm_id
        )
      `)
      .eq('id', id)
      .single()

    if (uploadError || !upload) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 })
    }

    const client = upload.clients as { id: string; name: string; firm_id: string }

    if (client.firm_id !== profile.firm_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Build new filename based on new category
    const newFilename = buildNewFilename({
      clientName: client.name,
      category: file_type,
      uploadedAt: upload.uploaded_at,
      originalFilename: upload.original_filename || upload.filename,
    })

    // Update DB: file_type + filename
    const { data: updated, error: updateError } = await adminClient
      .from('uploads')
      .update({ file_type, filename: newFilename })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }

    // Attempt Xero rename if already synced
    let xeroNote: string | undefined
    if ((upload.xero_status || '').toLowerCase() === 'synced' && upload.xero_attachment_id) {
      const xeroResult = await tryRenameInXero({
        firmId: client.firm_id,
        xeroAttachmentId: upload.xero_attachment_id,
        newFilename,
      })
      xeroNote = xeroResult.note
    }

    // Audit log
    await adminClient.from('audit_logs').insert({
      firm_id: profile.firm_id,
      client_id: upload.client_id,
      actor: user.id,
      action: 'upload_reclassified',
      metadata: {
        upload_id: id,
        old_file_type: upload.file_type,
        new_file_type: file_type,
        old_filename: upload.filename,
        new_filename: newFilename,
        xero_note: xeroNote,
      },
    })

    return NextResponse.json({
      success: true,
      upload: updated,
      new_filename: newFilename,
      xero_note: xeroNote,
    })
  } catch (err) {
    console.error('Error in reclassify route:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
