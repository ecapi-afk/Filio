import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ensureFreshAccessToken } from '@/lib/xero/client'

export const dynamic = 'force-dynamic'

// GET /api/xero/test-files - Test if Files API scope is granted
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

    // Try to access Files API Inbox endpoint
    const res = await fetch('https://api.xero.com/files.xro/1.0/Inbox', {
      headers: {
        'Authorization': `Bearer ${tokens.accessToken}`,
        'xero-tenant-id': tokens.tenantId,
        'Accept': 'application/json'
      }
    })

    if (res.ok) {
      return NextResponse.json({ success: true, message: 'Files API access confirmed' })
    } else {
      const err = await res.text()
      return NextResponse.json({ error: 'Files API access denied', details: err }, { status: res.status })
    }
  } catch (err) {
    return NextResponse.json({ error: 'Files API test failed', details: String(err) }, { status: 500 })
  }
}
