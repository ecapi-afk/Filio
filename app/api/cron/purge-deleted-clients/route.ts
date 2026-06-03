import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createHash } from 'crypto'

// GDPR: Purge clients that have been soft-deleted for 30+ days
// Runs daily at 2am

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 30) // 30 days ago

    // Get clients deleted before cutoff
    const { data: clientsToPurge } = await supabase
      .from('clients')
      .select('id, firm_id, email, portal_email')
      .eq('management_status', 'deleted')
      .lt('deleted_at', cutoffDate.toISOString())

    if (!clientsToPurge || clientsToPurge.length === 0) {
      return NextResponse.json({ success: true, purged: 0 })
    }

    let purgedCount = 0

    for (const client of clientsToPurge) {
      // Anonymize audit logs (SHA-256 hash of email for compliance)
      const emailHash = client.email
        ? createHash('sha256').update(client.email).digest('hex')
        : 'deleted_client'

      await supabase.rpc('anonymize_client_audit_logs', {
        p_client_id: client.id,
        p_deleted_email_hash: emailHash,
      }).catch(() => {
        // RPC might not exist, fall back to direct update
        supabase
          .from('audit_logs')
          .update({
            client_id: null,
            metadata: { deleted_client_hash: emailHash },
          })
          .eq('client_id', client.id)
      })

      // Delete portal tokens
      await supabase
        .from('portal_tokens')
        .delete()
        .eq('client_id', client.id)

      // Delete client settings
      await supabase
        .from('client_settings')
        .delete()
        .eq('client_id', client.id)

      // Delete reminder jobs
      await supabase
        .from('reminder_jobs')
        .delete()
        .eq('client_id', client.id)

      // Delete uploads (and associated files in storage would be handled separately)
      await supabase
        .from('uploads')
        .delete()
        .eq('client_id', client.id)

      // Finally, hard delete the client
      await supabase
        .from('clients')
        .delete()
        .eq('id', client.id)

      purgedCount++
    }

    return NextResponse.json({
      success: true,
      purged: purgedCount,
      purged_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Error in purge-deleted-clients:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
