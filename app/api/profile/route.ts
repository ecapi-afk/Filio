import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/profile - Get current user's profile
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('Profile fetch error:', profileError)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }

  // Get firm info separately
  let firmName = ''
  let xeroOrgName = ''
  let xeroConnected = false
  let xeroLastSyncAt: string | null = null
  if (profile?.firm_id) {
    const { data: firm } = await supabase
      .from('firms')
      .select('name, xero_org_name, xero_connection_status, xero_last_sync_at')
      .eq('id', profile.firm_id)
      .single()

    if (firm) {
      firmName = firm.name || ''
      xeroOrgName = firm.xero_org_name || firm.name || ''  // Use Xero org name if available
      xeroConnected = firm.xero_connection_status === 'connected'
      xeroLastSyncAt = firm.xero_last_sync_at
    }
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    full_name: profile?.full_name || user.user_metadata?.full_name || '',
    position: profile?.position || '',
    language: profile?.language || 'en',
    avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || '',
    firm_id: profile?.firm_id,
    firm_name: firmName,
    xero_org_name: xeroOrgName,
    xero_connected: xeroConnected,
    xero_last_sync_at: xeroLastSyncAt,
  })
}

// PATCH /api/profile - Update current user's profile
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { full_name, position, language } = await request.json()

  const { data: profile, error } = await supabase
    .from('profiles')
    .update({
      full_name,
      position,
      language,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)
    .select()
    .single()

  if (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }

  return NextResponse.json({ success: true, profile })
}
