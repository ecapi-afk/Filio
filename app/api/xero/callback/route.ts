import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { saveXeroTokens } from '@/lib/xero/client'

// GET /api/xero/callback - Handle Xero OAuth callback
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Handle Xero OAuth error
  if (error) {
    console.error('Xero OAuth error:', error)
    return NextResponse.redirect(
      new URL(`/dashboard/settings/xero?error=${encodeURIComponent(error)}`, request.url)
    )
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/dashboard/settings/xero?error=missing_code', request.url)
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // User not logged in - redirect to login first
    return NextResponse.redirect(
      new URL('/login?redirect=/dashboard/settings/xero&xero_callback=' + encodeURIComponent(request.url), request.url)
    )
  }

  // Get firm_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single()

  if (!profile?.firm_id) {
    // No firm associated - user needs to register first
    return NextResponse.redirect(
      new URL('/register?error=no_firm', request.url)
    )
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`
        ).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.XERO_REDIRECT_URI!,
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Xero token exchange error:', errorText)
      return NextResponse.redirect(
        new URL('/dashboard/settings/xero?error=token_exchange_failed', request.url)
      )
    }

    const tokenData = await tokenResponse.json()

    // Get tenant ID (organization)
    const connectionsResponse = await fetch('https://api.xero.com/connections', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })

    if (!connectionsResponse.ok) {
      return NextResponse.redirect(
        new URL('/dashboard/settings/xero?error=get_connections_failed', request.url)
      )
    }

    const connections = await connectionsResponse.json()
    const tenant = connections[0]

    if (!tenant?.tenantId) {
      return NextResponse.redirect(
        new URL('/dashboard/settings/xero?error=no_organization', request.url)
      )
    }

    // Save tokens (uses admin client internally)
    await saveXeroTokens(profile.firm_id, {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      tenantId: tenant.tenantId,
    })

    // Update firm record using admin client
    const adminClient = await createAdminClient()
    const { error: updateError } = await adminClient
      .from('firms')
      .update({
        xero_connection_status: 'connected',
        xero_org_id: tenant.tenantId,
        xero_org_name: tenant.tenantName,
        xero_last_sync_at: new Date().toISOString(),
      })
      .eq('id', profile.firm_id)

    if (updateError) {
      console.error('Failed to update firm:', updateError)
      throw new Error('Failed to update firm: ' + updateError.message)
    }

    // Audit log using admin client
    await adminClient.from('audit_logs').insert({
      firm_id: profile.firm_id,
      actor: user.id,
      action: 'xero_connected',
      metadata: { tenantId: tenant.tenantId, tenantName: tenant.tenantName },
    })

    // Redirect to dashboard with success
    return NextResponse.redirect(new URL('/dashboard/settings/xero?connected=true', request.url))
  } catch (err) {
    console.error('Error in Xero callback:', err)
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.redirect(
      new URL(`/dashboard/settings/xero?error=internal_error&detail=${encodeURIComponent(errorMessage)}`, request.url)
    )
  }
}
