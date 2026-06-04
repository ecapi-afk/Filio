import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/clients/[id]/activate
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: profile } = await db
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single()

  if (!profile?.firm_id) {
    return NextResponse.json({ error: 'No firm associated' }, { status: 403 })
  }

  // Quota check: count current active clients vs plan limit
  const [{ count: activeCount }, { data: subscription }] = await Promise.all([
    db
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('firm_id', profile.firm_id)
      .eq('management_status', 'active'),
    db
      .from('subscriptions')
      .select('client_limit')
      .eq('firm_id', profile.firm_id)
      .maybeSingle(),
  ])

  const clientLimit = subscription?.client_limit ?? 20
  if ((activeCount ?? 0) >= clientLimit) {
    return NextResponse.json(
      { error: 'quota_exceeded', limit: clientLimit },
      { status: 403 }
    )
  }

  try {
    const { data, error } = await db
      .from('clients')
      .update({
        management_status: 'active',
        activated_at: new Date().toISOString(),
        dormant_reminded_at: null, // Reset so dormant cycle restarts on next dormant
      })
      .eq('id', id)
      .eq('firm_id', profile.firm_id)
      .select()
      .single()

    if (error) throw error

    await db.from('audit_logs').insert({
      firm_id: profile.firm_id,
      client_id: id,
      actor: user.id,
      action: 'client_reactivated',
      metadata: {},
    })

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('Error reactivating client:', err)
    return NextResponse.json({ error: 'Failed to reactivate' }, { status: 500 })
  }
}
