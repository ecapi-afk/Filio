import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getXeroOrganizations, syncXeroContacts, ensureFreshAccessToken } from '@/lib/xero/client'

export const dynamic = 'force-dynamic' // Disable caching for this route

// POST /api/xero/sync - Sync Xero data
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

  try {
    // Verify we have Xero tokens
    const tokens = await ensureFreshAccessToken(firmId)
    if (!tokens) {
      return NextResponse.json({ error: 'Not connected to Xero' }, { status: 400 })
    }

    // Get organization info
    const organizations = await getXeroOrganizations(firmId)
    const org = organizations[0]

    if (!org) {
      return NextResponse.json({ error: 'No Xero organization found' }, { status: 400 })
    }

    // Sync contacts
    const syncResult = await syncXeroContacts(firmId)

    // Update mapping and times using admin logic to bypass RLS blocks
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const adminClient = await createAdminClient()

    // Update firm with org info and last sync time
    const { error: firmError } = await adminClient
      .from('firms')
      .update({
        xero_org_id: org.tenantId,
        xero_org_name: org.tenantName,
        xero_last_sync_at: new Date().toISOString(),
      })
      .eq('id', firmId)

    if (firmError) {
      console.error('Failed to update firm sync status:', firmError)
    }

    // Audit log
    await adminClient.from('audit_logs').insert({
      firm_id: firmId,
      actor: user.id,
      action: 'xero_synced',
      metadata: {
        organization: org.tenantName,
        added: syncResult.added,
        updated: syncResult.updated,
      },
    })

    return NextResponse.json({
      success: true,
      organization: org.tenantName,
      sync: syncResult,
    })
  } catch (err) {
    console.error('Xero sync error:', err)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}

// GET /api/xero/sync - Get Xero connection status
export async function GET() {
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

  // Get firm data
  const { data: firm } = await supabase
    .from('firms')
    .select('xero_connection_status, xero_org_id, xero_org_name, xero_last_sync_at, xero_tokens_encrypted')
    .eq('id', firmId)
    .single()

  console.log('[GET /api/xero/sync] firmId:', firmId, 'firm:', JSON.stringify(firm))

  if (!firm || firm.xero_connection_status !== 'connected') {
    console.log('[GET /api/xero/sync] Returning connected: false because firm is', firm?.xero_connection_status)
    return NextResponse.json({
      connected: false,
    })
  }

  // Check if token is still valid
  const tokens = await ensureFreshAccessToken(firmId)

  return NextResponse.json({
    connected: !!tokens,
    organization: firm.xero_org_name || null,
    lastSync: firm.xero_last_sync_at || null,
  })
}
