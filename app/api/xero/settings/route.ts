import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ensureFreshAccessToken } from '@/lib/xero/client'

export const dynamic = 'force-dynamic'

// GET /api/xero/settings - Test if Settings Read scope is granted
export async function GET() {
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
    const tokens = await ensureFreshAccessToken(profile.firm_id)
    if (!tokens) {
      return NextResponse.json({ error: 'Not connected to Xero' }, { status: 400 })
    }

    // Try to access Accounting Settings endpoint
    const res = await fetch('https://api.xero.com/api.xro/2.0/Settings', {
      headers: {
        'Authorization': `Bearer ${tokens.accessToken}`,
        'xero-tenant-id': tokens.tenantId,
        'Accept': 'application/json'
      }
    })

    if (res.ok) {
      return NextResponse.json({ success: true, message: 'Settings API access confirmed' })
    } else {
      const err = await res.text()
      return NextResponse.json({ error: 'Settings API access denied', details: err }, { status: res.status })
    }
  } catch (err) {
    return NextResponse.json({ error: 'Settings API test failed', details: String(err) }, { status: 500 })
  }
}
