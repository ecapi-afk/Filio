import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createHash } from 'crypto'

// GDPR: Purge clients that have been soft-deleted for 30+ days
// Runs daily at 2am

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createAdminClient()

  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 30)

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
      const emailHash = client.email
        ? createHash('sha256').update(client.email).digest('hex')
        : 'deleted_client'

      try {
        await supabase.rpc('anonymize_client_audit_logs', {
          p_client_id: client.id,
          p_deleted_email_hash: emailHash,
        })
      } catch {
        await supabase
          .from('audit_logs')
          .update({
            client_id: null,
            metadata: { deleted_client_hash: emailHash },
          })
          .eq('client_id', client.id)
      }

      await supabase
        .from('portal_tokens')
        .delete()
        .eq('client_id', client.id)

      await supabase
        .from('reminder_jobs')
        .delete()
        .eq('client_id', client.id)

      await supabase
        .from('uploads')
        .delete()
        .eq('client_id', client.id)

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
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
