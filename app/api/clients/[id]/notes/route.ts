import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// PATCH /api/clients/[id]/notes - Save internal notes for a client
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the client belongs to the user's firm
    const { data: client } = await supabase
      .from('clients')
      .select('id, firm_id')
      .eq('id', id)
      .single()

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Get user's firm_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('firm_id')
      .eq('id', user.id)
      .single()

    if (client.firm_id !== profile?.firm_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { internal_notes } = body

    if (internal_notes === undefined) {
      return NextResponse.json({ error: 'internal_notes is required' }, { status: 400 })
    }

    // Use admin client to bypass RLS
    const adminClient = await createAdminClient()
    const { error: updateError } = await adminClient
      .from('clients')
      .update({ internal_notes })
      .eq('id', id)

    if (updateError) {
      console.error('Failed to update notes:', updateError)
      return NextResponse.json({ error: 'Failed to save notes' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving notes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
