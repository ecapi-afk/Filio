import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/lib/supabase/types'

type ClientUpdate = Database['public']['Tables']['clients']['Update']

// GET /api/clients/[id] - Get single client with relations
export async function GET(
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

  const { data, error } = await supabase
    .from('clients')
    .select(`
      *,
      firms(xero_connection_status),
      requests(id, title, deadline_date, required_files, status),
      short_links(short_code, is_active)
    `)
    .eq('id', id)
    .eq('firm_id', profile.firm_id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  return NextResponse.json({ data })
}

// PATCH /api/clients/[id] - Update client
export async function PATCH(
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
    const body = await request.json()

    const ALLOWED_FIELDS = [
      'name', 'email', 'portal_email', 'phone', 'address', 'notes',
      'auto_reminders_enabled', 'reminder_days_before',
      'tax_year_end', 'company_number', 'vat_number',
      'xero_contact_id', 'xero_linked_contact_id',
    ] as const

    const patch = Object.fromEntries(
      Object.entries(body).filter(([k]) => (ALLOWED_FIELDS as readonly string[]).includes(k))
    ) as ClientUpdate

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('clients')
      .update(patch)
      .eq('id', id)
      .eq('firm_id', profile.firm_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating client:', error)
      return NextResponse.json({ error: 'Failed to update client' }, { status: 500 })
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      firm_id: profile.firm_id,
      client_id: id,
      actor: user.id,
      action: 'client_updated',
      metadata: { changes: Object.keys(patch) },
    })

    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

// DELETE /api/clients/[id] - Soft delete client
export async function DELETE(
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

  // Soft delete
  const { error } = await supabase
    .from('clients')
    .update({
      management_status: 'deleted',
      deleted_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('firm_id', profile.firm_id)

  if (error) {
    console.error('Error deleting client:', error)
    return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 })
  }

  // Cancel all pending reminder jobs — deleted clients must not receive reminders
  const adminClient = await createAdminClient()
  const { error: cancelError } = await adminClient
    .from('reminder_jobs')
    .update({ status: 'cancelled', cancel_reason: 'Client deleted' })
    .eq('client_id', id)
    .eq('status', 'scheduled')
  if (cancelError) {
    console.error('delete client: failed to cancel reminder jobs:', cancelError)
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    firm_id: profile.firm_id,
    client_id: id,
    actor: user.id,
    action: 'client_deleted',
    metadata: {},
  })

  return NextResponse.json({ success: true })
}
