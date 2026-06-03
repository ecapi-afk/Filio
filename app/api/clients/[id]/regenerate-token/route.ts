import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { regenerateShortCode } from '@/lib/magic/generator'

// POST /api/clients/[id]/regenerate-token
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
    // Verify client belongs to firm
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id, name')
      .eq('id', id)
      .eq('firm_id', profile.firm_id)
      .single()

    if (!existingClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Use the canonical generator which:
    // 1. Creates a new portal_token with short_code
    // 2. Deactivates old short_links entries
    // 3. Creates a new active short_links entry
    // 4. Syncs portal_token onto the clients row
    const newShortCode = await regenerateShortCode(id)

    if (!newShortCode) {
      return NextResponse.json({ error: 'Failed to generate short code' }, { status: 500 })
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      firm_id: profile.firm_id,
      client_id: id,
      actor: user.id,
      action: 'portal_token_regenerated',
      metadata: { short_code: newShortCode },
    })

    return NextResponse.json({
      success: true,
      short_code: newShortCode,
    })
  } catch (err) {
    console.error('Error regenerating token:', err)
    return NextResponse.json({ error: 'Failed to regenerate token' }, { status: 500 })
  }
}
