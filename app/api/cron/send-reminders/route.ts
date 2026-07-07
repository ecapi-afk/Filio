import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendReminderEmail } from '@/lib/email/postmark'
import { getClientUploadLink } from '@/lib/magic/get-upload-link'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseAdmin = await createAdminClient()
  const now = new Date()

  try {
    const { data: reminders, error: fetchError } = await supabaseAdmin
      .from('reminder_jobs')
      .select(`
        id,
        client_id,
        template,
        scheduled_for,
        clients (
          id,
          name,
          portal_email,
          management_status,
          firms (
            name
          )
        )
      `)
      .eq('status', 'scheduled')
      .lte('scheduled_for', now.toISOString())

    if (fetchError) throw fetchError

    if (!reminders || reminders.length === 0) {
      return NextResponse.json({ success: true, sent: 0 })
    }

    let sentCount = 0
    const failures: Array<{ id: string; error: string }> = []

    for (const reminder of reminders) {
      const client = reminder.clients as {
        id: string
        name: string
        portal_email: string | null
        management_status: string | null
        firms: { name: string } | null
      } | null

      // Skip non-active clients — cancel the job
      if (client?.management_status !== 'active') {
        await supabaseAdmin
          .from('reminder_jobs')
          .update({ status: 'cancelled', cancel_reason: 'Client not active' })
          .eq('id', reminder.id)
        continue
      }

      if (!client.portal_email) {
        await supabaseAdmin
          .from('reminder_jobs')
          .update({ status: 'cancelled', cancel_reason: 'No email address' })
          .eq('id', reminder.id)
        continue
      }

      const firmName = client.firms?.name || 'Your Accountant'
      const uploadLink = await getClientUploadLink(supabaseAdmin, client.id)

      try {
        await sendReminderEmail({
          to: client.portal_email,
          clientName: client.name,
          firmName,
          deadlineType: 'Document Request',
          deadlineDate: 'soon',
          uploadLink,
        })

        await supabaseAdmin
          .from('reminder_jobs')
          .update({ status: 'sent', sent_at: now.toISOString() })
          .eq('id', reminder.id)

        sentCount++
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        failures.push({ id: reminder.id, error: message })

        await supabaseAdmin
          .from('reminder_jobs')
          .update({ status: 'failed', cancel_reason: message })
          .eq('id', reminder.id)
      }
    }

    return NextResponse.json({
      success: true,
      sent: sentCount,
      failed: failures.length,
      failures,
      processed_at: now.toISOString(),
    })
  } catch (err) {
    console.error('Error in send-reminders cron:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
