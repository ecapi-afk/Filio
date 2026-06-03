import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ensureFreshAccessToken } from '@/lib/xero/client'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const adminClient = await createAdminClient()

  // Fetch the upload record (join client to get firm_id and xero_contact_id)
  const { data: upload, error: uploadError } = await adminClient
    .from('uploads')
    .select('id, filename, file_type, xero_status, xero_attachment_id, xero_upload_mode, client_id, clients(firm_id, xero_contact_id)')
    .eq('id', id)
    .single()

  if (uploadError || !upload) {
    return NextResponse.json({ error: 'Upload not found' }, { status: 404 })
  }

  const u = upload as any

  if ((u.xero_status || '').toLowerCase() !== 'synced' || !u.xero_attachment_id) {
    return NextResponse.json({ error: 'File not synced to Xero' }, { status: 400 })
  }

  const client = u.clients
  const firmId: string = client?.firm_id
  const xeroContactId: string | null = client?.xero_contact_id
  const attachmentId: string = u.xero_attachment_id
  const uploadMode: string = u.xero_upload_mode || 'files'

  if (!firmId) {
    return NextResponse.json({ error: 'Firm not found' }, { status: 400 })
  }

  // Get fresh Xero tokens
  const tokens = await ensureFreshAccessToken(firmId)
  if (!tokens) {
    return NextResponse.json({ error: 'Xero not connected or token expired' }, { status: 401 })
  }

  // Build the Xero download URL based on upload mode
  let xeroUrl: string
  if (uploadMode === 'attachments' && xeroContactId) {
    // Accounting API: Contact attachment
    xeroUrl = `https://api.xero.com/api.xro/2.0/Contacts/${encodeURIComponent(xeroContactId)}/Attachments/${encodeURIComponent(attachmentId)}/Content`
  } else {
    // Files API: Inbox file
    xeroUrl = `https://api.xero.com/files.xro/1.0/Files/${encodeURIComponent(attachmentId)}/Content`
  }

  const xeroRes = await fetch(xeroUrl, {
    headers: {
      'Authorization': `Bearer ${tokens.accessToken}`,
      'xero-tenant-id': tokens.tenantId,
    },
  })

  if (!xeroRes.ok) {
    const errText = await xeroRes.text()
    return NextResponse.json(
      { error: `Xero download failed: ${xeroRes.status} ${errText}` },
      { status: 502 }
    )
  }

  const contentType = xeroRes.headers.get('content-type') || 'application/octet-stream'
  const filename = u.filename || 'download'

  return new NextResponse(xeroRes.body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  })
}
