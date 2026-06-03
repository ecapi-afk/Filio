import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/xero/disconnect - Disconnect Xero
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get firm_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single()

  if (!profile?.firm_id) {
    return NextResponse.json({ error: 'No firm associated' }, { status: 403 })
  }

  const firmId = profile.firm_id

  // Use admin client to bypass RLS and force disconnect
  const supabaseAdmin = await createAdminClient()

  const { error: updateError } = await supabaseAdmin
    .from('firms')
    .update({
      xero_connection_status: 'disconnected',
      xero_org_id: null,
      xero_org_name: null,
      xero_tokens_encrypted: null,
      xero_last_sync_at: null,
    })
    .eq('id', firmId)

  if (updateError) {
    console.error('[POST /api/xero/disconnect] Database update failed:', updateError)
    return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
  }

  console.log('[POST /api/xero/disconnect] Successfully disconnected firm:', firmId)

  return NextResponse.json({ success: true })
}
