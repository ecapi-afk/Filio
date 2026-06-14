import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncUploadToXero } from '@/lib/xero/sync-upload'

// POST /api/upload/confirm
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientId, filename, fileType, fileSize, storagePath, channel, token } = body

    if (!clientId || !filename || !storagePath) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = token ? await createAdminClient() : await createClient()

    if (token) {
      // Verify portal token
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
    } else {
      // Verify user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // Get firm_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('firm_id')
        .eq('id', user.id)
        .single()

      if (!profile?.firm_id) {
        return NextResponse.json({ error: 'No firm associated' }, { status: 403 })
      }

      // Verify client belongs to firm
      const { data: client } = await supabase
        .from('clients')
        .select('id, firm_id, name')
        .eq('id', clientId)
        .eq('firm_id', profile.firm_id)
        .single()

      if (!client) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 })
      }
    }

    // Create upload record
    const { data: upload, error: uploadError } = await supabase
      .from('uploads')
      .insert({
        client_id: clientId,
        filename,
        original_filename: filename,
        file_type: fileType || null,
        file_size: fileSize || null,
        storage_path: storagePath,
        xero_status: 'pending', // Will be synced by cron job
        channel: channel || 'manual',
        uploaded_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (uploadError) {
      console.error('Error creating upload record:', uploadError)
      return NextResponse.json({ error: 'Failed to record upload' }, { status: 500 })
    }

    // Create fallback xero_sync job
    const { data: jobData } = await supabase.from('jobs').insert({
      client_id: clientId,
      upload_id: upload.id,
      type: 'xero_sync',
      status: 'queued',
      attempts: 0,
    }).select('id').single()

    // Immediately attempt Xero sync — fire-and-forget, cron job is the fallback
    if (storagePath) {
      const adminForSync = await createAdminClient()
      Promise.all([
        adminForSync
          .from('clients')
          .select('firm_id, xero_contact_id, xero_linked_contact_id, firms(xero_upload_mode)')
          .eq('id', clientId)
          .single(),
        adminForSync.storage.from('client-uploads').download(storagePath),
      ]).then(async ([clientRes, fileRes]) => {
        const c = clientRes.data as any
        const fileData = fileRes.data
        if (!c || !fileData) return
        await syncUploadToXero({
          uploadId: upload.id,
          jobId: jobData?.id,
          firmId: c.firm_id,
          filename,
          fileBuffer: await fileData.arrayBuffer(),
          xeroContactId: c.xero_contact_id ?? c.xero_linked_contact_id ?? null,
          uploadMode: c.firms?.xero_upload_mode ?? 'attachments',
        })
      }).catch(err => console.error('Immediate Xero sync failed, cron will retry:', err))
    }

    // Update client's last_upload
    await supabase
      .from('clients')
      .update({ last_upload: new Date().toISOString() })
      .eq('id', clientId)

    // Update client's health status based on uploads via synchronous cache refresh
    try {
      const { refreshClientCache } = await import('@/lib/data/clients')
      await refreshClientCache(clientId)
    } catch (e) {
      console.error('Failed to refresh cache:', e)
    }

    // Fire-and-forget: purge expired portal tokens and OTPs on each successful upload
    if (token) {
      const adminForCleanup = await createAdminClient()
      Promise.all([
        adminForCleanup.from('portal_tokens').delete().lt('expires_at', new Date().toISOString()),
        adminForCleanup.from('portal_otps').delete().or('used_at.not.is.null,expires_at.lt.' + new Date().toISOString()),
      ]).catch(() => { /* non-critical */ })
    }

    return NextResponse.json({
      success: true,
      upload,
    })
  } catch (err) {
    console.error('Error in upload confirm:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
