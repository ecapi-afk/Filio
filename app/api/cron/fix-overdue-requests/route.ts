import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/cron/fix-overdue-requests
// Batch update overdue requests to Complete status
// Use case: When testing data has old overdue requests that need to be cleared
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const adminClient = await createAdminClient()

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

  // Get current date in local timezone
  const today = new Date()
  const localOffset = today.getTimezoneOffset() * 60000
  const todayStr = new Date(today.getTime() - localOffset).toISOString().split('T')[0]

  try {
    // Find all overdue requests for this firm
    // First get all clients for this firm
    const { data: clients } = await supabase
      .from('clients')
      .select('id')
      .eq('firm_id', profile.firm_id)

    if (!clients || clients.length === 0) {
      return NextResponse.json({ success: true, message: 'No clients found', updated: 0 })
    }

    const clientIds = clients.map(c => c.id)

    // Find overdue requests (not Complete and deadline < today)
    const { data: overdueRequests, error: findError } = await adminClient
      .from('requests')
      .select('id, client_id, title, deadline_date, status')
      .in('client_id', clientIds)
      .neq('status', 'Complete')
      .lt('deadline_date', todayStr)

    if (findError) throw findError

    if (!overdueRequests || overdueRequests.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No overdue requests found',
        updated: 0
      })
    }

    // Update all overdue requests to Complete
    const { data: updatedData, error: updateError } = await adminClient
      .from('requests')
      .update({ status: 'Complete' })
      .in('id', overdueRequests.map(r => r.id))
      .select()

    if (updateError) throw updateError

    // Audit log
    await supabase.from('audit_logs').insert({
      firm_id: profile.firm_id,
      actor: user.id,
      action: 'bulk_fix_overdue_requests',
      metadata: {
        updated_count: overdueRequests.length,
        requests: overdueRequests.map(r => ({ id: r.id, title: r.title, deadline_date: r.deadline_date }))
      },
    })

    return NextResponse.json({
      success: true,
      message: `Updated ${overdueRequests.length} overdue requests to Complete`,
      updated: overdueRequests.length,
      requests: overdueRequests
    })

  } catch (err) {
    console.error('Error fixing overdue requests:', err)
    return NextResponse.json({ error: 'Failed to fix overdue requests' }, { status: 500 })
  }
}

// GET /api/cron/fix-overdue-requests
// Dry run - check how many overdue requests exist without updating
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const adminClient = await createAdminClient()

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

  // Get current date in local timezone
  const today = new Date()
  const localOffset = today.getTimezoneOffset() * 60000
  const todayStr = new Date(today.getTime() - localOffset).toISOString().split('T')[0]

  try {
    // Get all clients for this firm
    const { data: clients } = await adminClient
      .from('clients')
      .select('id')
      .eq('firm_id', profile.firm_id)

    if (!clients || clients.length === 0) {
      return NextResponse.json({ success: true, overdueRequests: [], count: 0 })
    }

    const clientIds = clients.map(c => c.id)

    // Find overdue requests (not Complete and deadline < today) using admin client
    const { data: overdueRequests, error } = await adminClient
      .from('requests')
      .select('id, client_id, title, deadline_date, status')
      .in('client_id', clientIds)
      .neq('status', 'Complete')
      .lt('deadline_date', todayStr)

    if (error) throw error

    return NextResponse.json({
      success: true,
      today: todayStr,
      overdueRequests: overdueRequests || [],
      count: overdueRequests?.length || 0
    })

  } catch (err) {
    console.error('Error checking overdue requests:', err)
    return NextResponse.json({ error: 'Failed to check overdue requests' }, { status: 500 })
  }
}
