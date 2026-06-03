import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getXeroAuthUrl } from '@/lib/xero/client'
import { randomBytes } from 'crypto'

// GET /api/xero/auth-url - Get Xero OAuth authorization URL
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Generate state token for CSRF protection
  const state = randomBytes(16).toString('hex')

  // Store state in cookie or session for verification
  const authUrl = getXeroAuthUrl(state)

  return NextResponse.json({
    success: true,
    authUrl,
    state,
  })
}
