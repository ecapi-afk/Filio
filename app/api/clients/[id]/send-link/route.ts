import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendMagicLinkEmail } from '@/lib/email/postmark'
import { regenerateShortCode } from '@/lib/magic/generator'

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

    const recipientEmail = (client as any).portal_email || (client as any).email
    if (!recipientEmail) {
      return NextResponse.json({ error: 'No email address available' }, { status: 400 })
    }

    // Look up the active short link for this client
    const { data: activeLink } = await supabaseAdmin
      .from('short_links')
      .select('short_code')
      .eq('client_id', id)
      .eq('is_active', true)
      .single()

    let shortCode = activeLink?.short_code

    // If no active short link exists, generate one
    if (!shortCode) {
      shortCode = await regenerateShortCode(id) ?? undefined
    }

    if (!shortCode) {
      return NextResponse.json({ error: 'Failed to get upload link' }, { status: 500 })
    }

    const firmName = (client.firms as any)?.name || 'Your Accountant'
    const uploadLink = `${APP_URL}/m/${shortCode}`

    await sendMagicLinkEmail({
      to: recipientEmail,
      clientName: client.name,
      firmName,
      uploadLink,
    })

    await supabase.from('audit_logs').insert({
      firm_id: profile.firm_id,
      client_id: id,
      actor: user.id,
      action: 'magic_link_sent',
      metadata: { sent_to: recipientEmail, short_code: shortCode },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error sending magic link:', err)
    return NextResponse.json({ error: 'Failed to send magic link' }, { status: 500 })
  }
}
