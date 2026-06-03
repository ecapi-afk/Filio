import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendMagicLinkEmail } from '@/lib/email/postmark'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// POST /api/clients/[id]/send-link
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const supabaseAdmin = await createAdminClient()
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
    // Get client with firm info
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select(`
        id,
        name,
        email,
        portal_email,
        portal_token,
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

    // Get or generate portal token if needed
    let token = client.portal_token
    if (!token) {
      const { randomBytes } = await import('crypto')
      token = randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

      await supabaseAdmin
        .from('portal_tokens')
        .insert({
          client_id: id,
          token,
          expires_at: expiresAt,
        })

      await supabaseAdmin
        .from('clients')
        .update({ portal_token: token })
        .eq('id', id)
    }

    const firmName = (client.firms as any)?.name || 'Your Accountant'
    const uploadLink = `${APP_URL}/portal/${token}`
    const recipientEmail = client.portal_email || client.email

    if (!recipientEmail) {
      return NextResponse.json({ error: 'No email address available' }, { status: 400 })
    }

    // Send the magic link email
    await sendMagicLinkEmail({
      to: recipientEmail,
      clientName: client.name,
      firmName,
      uploadLink,
    })

    // Audit log
    await supabase.from('audit_logs').insert({
      firm_id: profile.firm_id,
      client_id: id,
      actor: user.id,
      action: 'magic_link_sent',
      metadata: { sent_to: recipientEmail },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error sending magic link:', err)
    return NextResponse.json({ error: 'Failed to send magic link' }, { status: 500 })
  }
}
