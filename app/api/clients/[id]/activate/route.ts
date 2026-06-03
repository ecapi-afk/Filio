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

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single()

  if (!profile?.firm_id) {
    return NextResponse.json({ error: 'No firm associated' }, { status: 403 })
  }

  try {
    const { data, error } = await supabase
      .from('clients')
      .update({
        management_status: 'active',
        activated_at: new Date().toISOString(),
        dormant_reminded_at: null, // Reset for new dormant cycle
      })
      .eq('id', id)
      .eq('firm_id', profile.firm_id)
      .select()
      .single()

    if (error) throw error

    // Audit log
    await supabase.from('audit_logs').insert({
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
