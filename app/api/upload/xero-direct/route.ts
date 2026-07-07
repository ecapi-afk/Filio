import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { uploadToXeroInbox, uploadToXeroContactAttachment } from '@/lib/xero/client'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const token = formData.get('token') as string | null
    const clientId = formData.get('clientId') as string | null
    const fileType = formData.get('fileType') as string | null
    const originalFilename = formData.get('originalFilename') as string | null

    if (!file || !token || !clientId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Use renamed file for Xero upload, keep original filename
    const uploadFilename = file.name

    const supabase = await createAdminClient()

    // 1. Verify token
    const { data: portalToken } = await supabase
      .from('portal_tokens')
      .select('*')
      .eq('token', token)
      .eq('client_id', clientId)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (!portalToken) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 403 })
    }

    // 2. Get client and firm
    const { data: client } = await supabase
      .from('clients')
      .select('id, firm_id, name, management_status, xero_contact_id, firm:firm_id(xero_upload_mode)')
      .eq('id', clientId)
      .single()

    const clientData = client as any

    if (!clientData) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    if (clientData.management_status !== 'active') {
      return NextResponse.json({ error: 'Client portal is not active' }, { status: 403 })
    }

    // Determine upload mode
    const firmData = clientData.firm
    const rawMode = Array.isArray(firmData) ? firmData[0]?.xero_upload_mode : firmData?.xero_upload_mode
    const uploadMode = rawMode === 'files' ? 'files' : 'attachments'

    console.log(`[xero-direct] rawMode: ${rawMode}, uploadMode: ${uploadMode}, xero_contact_id: ${clientData.xero_contact_id}`)

    // 3. Upload buffer directly to Xero
    const fileBuffer = await file.arrayBuffer()
    let xeroRes;
    let actualMode = uploadMode; // Track the actual API mode used

    if (uploadMode === 'attachments' && clientData.xero_contact_id) {
      xeroRes = await uploadToXeroContactAttachment(
        clientData.firm_id,
        clientData.xero_contact_id,
        file.name,
        file.type || 'application/octet-stream',
        fileBuffer
      )

      // Graceful fallback to Inbox if Contact Attachment fails (e.g. contact deleted in Xero)
      if (!xeroRes.success) {
        console.warn('Attachment API failed, falling back to Inbox Files API:', xeroRes.error)
        xeroRes = await uploadToXeroInbox(
          clientData.firm_id,
          file.name,
          file.type || 'application/octet-stream',
          fileBuffer
        )
        actualMode = 'files' // Record that we actually used Files API after fallback
      }
    } else {
      xeroRes = await uploadToXeroInbox(
        clientData.firm_id,
        file.name,
        file.type || 'application/octet-stream',
        fileBuffer
      )
    }

    if (!xeroRes.success) {
      console.error('[xero-direct] Upload failed:', {
        error: xeroRes.error,
        mode: actualMode,
        clientId,
        xeroContactId: clientData.xero_contact_id,
        filename: uploadFilename
      })
      return NextResponse.json({
        error: xeroRes.error || 'Upload to Xero failed',
        mode: actualMode,
        details: `Failed using ${actualMode} API`,
        debug: {
          hasXeroContactId: !!clientData.xero_contact_id,
          xeroContactId: clientData.xero_contact_id || null
        }
      }, { status: 500 })
    }

    // 4. Save success record directly in database
    // filename = the name uploaded to Xero (renamed)
    // original_filename = the original name before renaming
    // xero_upload_mode = actual API mode used (attachments or files)
    const { data: upload, error: uploadError } = await supabase
      .from('uploads')
      .insert({
        client_id: clientId,
        filename: uploadFilename,
        original_filename: originalFilename || uploadFilename,
        file_type: fileType || 'Other',
        file_size: file.size,
        channel: 'portal',
        xero_status: 'synced',
        xero_attachment_id: xeroRes.fileId,
      })
      .select()
      .single()

    if (uploadError) {
      console.error('❌ Failed to save upload record:', {
        error: uploadError,
        code: uploadError.code,
        message: uploadError.message,
        details: uploadError.details,
        hint: uploadError.hint,
        clientId,
        filename: uploadFilename,
        originalFilename: originalFilename,
        fileType: fileType,
        fileSize: file.size
      })
      // Return error instead of silently continuing
      return NextResponse.json({
        error: 'Failed to save upload record',
        details: uploadError.message,
        xeroSuccess: true // Xero upload succeeded but DB save failed
      }, { status: 500 })
    }

    // Update last upload time
    await supabase
      .from('clients')
      .update({ last_upload: new Date().toISOString() })
      .eq('id', clientId)

    // Synchronously refresh cache
    try {
      const { refreshClientCache } = await import('@/lib/data/clients')
      await refreshClientCache(clientId)
    } catch (e) {
      console.error('Failed to refresh cache:', e)
    }

    return NextResponse.json({
      success: true,
      upload
    })
  } catch (err) {
    console.error('Error in xero-direct route:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
