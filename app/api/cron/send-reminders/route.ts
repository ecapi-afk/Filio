import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendReminderEmail } from '@/lib/email/postmark'

// Cron job: send scheduled reminders
// Runs daily at 8:30am (configured in vercel.json)

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

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
          portal_token,
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
        portal_token: string | null
        firms: { name: string } | null
      } | null

      if (!client?.portal_email) {
        // Skip — no email address to send to
        await supabaseAdmin
          .from('reminder_jobs')
          .update({ status: 'cancelled', cancel_reason: 'No email address' })
          .eq('id', reminder.id)
        continue
      }

      const firmName = client.firms?.name || 'Your Accountant'
      const uploadLink = client.portal_token
        ? `${APP_URL}/portal/${client.portal_token}`
        : `${APP_URL}/portal`

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
