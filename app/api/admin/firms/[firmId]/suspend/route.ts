import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAdmin(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null
  return user
}

// POST /api/admin/firms/[firmId]/suspend
// Suspends a firm: sets suspended_at + dormants all active clients
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ firmId: string }> }
) {
  const user = await requireAdmin(request)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { firmId } = await params
  const admin = await createAdminClient()

  // Mark firm as suspended
  const { error: firmError } = await admin
    .from('firms')
    .update({ suspended_at: new Date().toISOString() })
    .eq('id', firmId)

  if (firmError) return NextResponse.json({ error: firmError.message }, { status: 500 })

  // Set all active clients to dormant
  const { error: clientError } = await admin
    .from('clients')
    .update({ management_status: 'dormant', management_status_reason: 'account_suspended' })
    .eq('firm_id', firmId)
    .eq('management_status', 'active')

  if (clientError) {
    console.error('suspend: failed to dormant clients:', clientError)
  }

  // Deactivate all magic email aliases
  const { data: firmClients } = await admin
    .from('clients')
    .select('id')
    .eq('firm_id', firmId)

  const clientIds = (firmClients ?? []).map((c: any) => c.id)
  if (clientIds.length > 0) {
    await admin
      .from('magic_email_aliases')
      .update({ is_active: false })
      .in('client_id', clientIds)

    await admin
      .from('clients')
      .update({ magic_email_slug: null })
      .eq('firm_id', firmId)
      .not('magic_email_slug', 'is', null)
  }

  return NextResponse.json({ success: true })
}

// DELETE /api/admin/firms/[firmId]/suspend  →  unsuspend
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ firmId: string }> }
) {
  const user = await requireAdmin(request)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { firmId } = await params
  const admin = await createAdminClient()

  const { error } = await admin
    .from('firms')
    .update({ suspended_at: null })
    .eq('id', firmId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
