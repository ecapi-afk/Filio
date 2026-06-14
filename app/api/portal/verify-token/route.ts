import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/portal/verify-token - Verify a portal token and get client info
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Look up the token
    const { data: portalToken, error } = await supabase
      .from('portal_tokens')
      .select(`
        id,
        token,
        expires_at,
        clients (
          id,
          name,
          management_status,
          portal_email,
          firms (
            name,
            logo_url,
            brand_color,
            reply_to_email
          )
        )
      `)
      .eq('token', token)
      .single()

    if (error || !portalToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
    }

    const client = portalToken.clients as any
    const firm = client?.firms

    // Check if client is active
    if (client.management_status !== 'active') {
      return NextResponse.json({
        error: 'Portal paused',
        client_status: client.management_status,
      }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      client: {
        id: client.id,
        name: client.name,
        portal_email: client.portal_email,
      },
      firm: firm ? {
        name: firm.name,
        logo_url: firm.logo_url,
        brand_color: firm.brand_color,
        reply_to_email: firm.reply_to_email,
      } : null,
    })
  } catch (err) {
    console.error('Error verifying portal token:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
