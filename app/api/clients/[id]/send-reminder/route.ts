import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendReminderEmail } from '@/lib/email/postmark'
import { getClientUploadLink } from '@/lib/magic/get-upload-link'

// POST /api/clients/[id]/send-reminder
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single()

  if (!profile?.firm_id) {
    return NextResponse.json({ error: 'No firm associated' }, { status: 403 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const template = body.template || 'reminder'
    const deadlineType = body.deadline_type || 'Document Request'
    const deadlineDate = body.deadline_date || 'soon'

    // Get client info for email
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select(`
        id,
        name,
        email,
        portal_email,
        management_status,
        firms (
          name
        )
      `)
      .eq('id', id)
      .eq('firm_id', profile.firm_id)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    if ((client as any).management_status !== 'active') {
      return NextResponse.json({ error: 'Client is not active' }, { status: 403 })
    }

    const firmName = (client.firms as any)?.name || 'Your Accountant'
    const uploadLink = await getClientUploadLink(supabase, id)
    const recipientEmail = client.portal_email || client.email

    if (recipientEmail) {
      // Send the reminder email
      await sendReminderEmail({
        to: recipientEmail,
        clientName: client.name,
        firmName,
        deadlineType,
        deadlineDate,
        uploadLink,
      })
    }

    // Cancel existing scheduled reminders for this client
    await supabase
      .from('reminder_jobs')
      .update({
        status: 'cancelled',
        cancel_reason: 'Superseded by manual send',
      })
      .eq('client_id', id)
      .eq('status', 'scheduled')

    // Create manual reminder job
    const { data: job, error } = await supabase
      .from('reminder_jobs')
      .insert({
        client_id: id,
        template,
        scheduled_for: new Date().toISOString(),
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    // Audit log
    await supabase.from('audit_logs').insert({
      firm_id: profile.firm_id,
      client_id: id,
      actor: user.id,
      action: 'manual_reminder_sent',
      metadata: { template, sent_to: recipientEmail },
    })

    return NextResponse.json({ success: true, job })
  } catch (err) {
    console.error('Error sending reminder:', err)
    return NextResponse.json({ error: 'Failed to send reminder' }, { status: 500 })
  }
}
