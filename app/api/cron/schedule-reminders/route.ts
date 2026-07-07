import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// This cron job schedules automatic reminders for clients with approaching deadlines
// Runs daily at 8am

export async function GET(request: NextRequest) {
  // Verify cron secret (for security)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createAdminClient()

  try {
    const now = new Date()

    // Get all active clients with requests that have upcoming deadlines
    const { data: requests } = await supabase
      .from('requests')
      .select(`
        id,
        client_id,
        title,
        deadline_date,
        clients (
          id,
          firm_id,
          auto_reminders_enabled,
          reminder_days_before
        )
      `)
      .eq('clients.management_status', 'active')
      .gte('deadline_date', now.toISOString().split('T')[0])

    if (!requests || requests.length === 0) {
      return NextResponse.json({ success: true, scheduled: 0 })
    }

    // Get firm's default reminder days
    const { data: firms } = await supabase
      .from('firms')
      .select('id, default_reminder_days')

    const defaultReminderDays = firms?.[0]?.default_reminder_days || [14, 7, 3, 1]

    let scheduledCount = 0

    for (const request of requests) {
      const client = request.clients as any
      if (!client || !client.auto_reminders_enabled) continue

      const reminderDays = client.reminder_days_before || defaultReminderDays
      const deadlineDate = new Date(request.deadline_date)

      for (const days of reminderDays) {
        const reminderDate = new Date(deadlineDate)
        reminderDate.setDate(reminderDate.getDate() - days)

        // Only schedule future reminders
        if (reminderDate > now) {
          // Check if a reminder is already scheduled
          const { data: existing } = await supabase
            .from('reminder_jobs')
            .select('id')
            .eq('client_id', client.id)
            .eq('request_id', request.id)
            .eq('status', 'scheduled')
            .single()

          if (!existing) {
            await supabase.from('reminder_jobs').insert({
              client_id: client.id,
              request_id: request.id,
              template: 'deadline_reminder',
              scheduled_for: reminderDate.toISOString(),
              status: 'scheduled',
            })
            scheduledCount++
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      scheduled: scheduledCount,
      processed_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Error in schedule-reminders:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
