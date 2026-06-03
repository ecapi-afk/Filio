import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Debug endpoint to check user and firm status
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', user: null })
  }

  // Get profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Get firm if firm_id exists
  let firm = null
  if (profile?.firm_id) {
    const { data: firmData } = await supabase
      .from('firms')
      .select('*')
      .eq('id', profile.firm_id)
      .single()
    firm = firmData
  }

  return NextResponse.json({
    user: { id: user.id, email: user.email },
    profile,
    firm,
    hasTokens: !!firm?.xero_tokens_encrypted,
    connectionStatus: firm?.xero_connection_status,
  })
}
