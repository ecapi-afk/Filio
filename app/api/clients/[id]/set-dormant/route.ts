import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/clients/[id]/set-dormant
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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
    const body = await request.json().catch(() => ({}))
    const reason = body.reason || 'manual'

    const { data, error } = await supabase
      .from('clients')
      .update({
        management_status: 'dormant',
        dormanted_at: new Date().toISOString(),
        management_status_reason: reason,
      })
      .eq('id', id)
      .eq('firm_id', profile.firm_id)
      .select()
      .single()

    if (error) throw error

    // Deactivate magic email alias so alias table stays consistent with client status
    // HIGH-3: check errors — if cleanup fails, log and continue (dormant write already succeeded)
    const adminClient = await createAdminClient()
    const [aliasResult, slugResult] = await Promise.all([
      adminClient
        .from('magic_email_aliases')
        .update({ is_active: false })
        .eq('client_id', id)
        .eq('is_active', true),
      adminClient
        .from('clients')
        .update({ magic_email_slug: null })
        .eq('id', id)
        .not('magic_email_slug', 'is', null),
    ])
    if (aliasResult.error) {
      console.error('set-dormant: failed to deactivate magic email alias:', aliasResult.error)
    }
    if (slugResult.error) {
      console.error('set-dormant: failed to clear magic_email_slug:', slugResult.error)
    }

    await supabase.from('audit_logs').insert({
      firm_id: profile.firm_id,
      client_id: id,
      actor: user.id,
      action: 'client_set_dormant',
      metadata: { reason },
    })

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('Error setting client dormant:', err)
    return NextResponse.json({ error: 'Failed to set dormant' }, { status: 500 })
  }
}
