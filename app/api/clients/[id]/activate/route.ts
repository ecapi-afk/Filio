import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isPlanPro } from '@/lib/constants/plans'

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
  // Only consider active subscriptions — canceled subs fall back to trial limit (20)
  const [{ count: activeCount }, { data: subscription }] = await Promise.all([
    db
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('firm_id', profile.firm_id)
      .eq('management_status', 'active'),
    db
      .from('subscriptions')
      .select('client_limit, plan')
      .eq('firm_id', profile.firm_id)
      .eq('status', 'active')
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
        dormant_reminded_at: null,
      })
      .eq('id', id)
      .eq('firm_id', profile.firm_id)
      .select()
      .single()

    if (error) throw error

    // Restore magic email alias if firm is on a Pro plan
    const plan = subscription?.plan
    if (plan && isPlanPro(plan)) {
      const adminClient = await createAdminClient()
      const { data: aliasRecord } = await adminClient
        .from('magic_email_aliases')
        .select('alias')
        .eq('client_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (aliasRecord?.alias) {
        await Promise.all([
          adminClient
            .from('magic_email_aliases')
            .update({ is_active: true })
            .eq('client_id', id)
            .eq('alias', aliasRecord.alias),
          adminClient
            .from('clients')
            .update({ magic_email_slug: aliasRecord.alias })
            .eq('id', id),
        ])
      }
    }

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
