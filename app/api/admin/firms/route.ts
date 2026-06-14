import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Admin guard — reused by all /api/admin/* routes
async function requireAdmin(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null
  return user
}

// GET /api/admin/firms?search=&page=1&limit=20
export async function GET(request: NextRequest) {
  const user = await requireAdmin(request)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = request.nextUrl
  const search = searchParams.get('search')?.trim() || ''
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'))
  const offset = (page - 1) * limit

  const admin = await createAdminClient()

  // 1. Fetch firms + subscriptions in one query
  let firmsQuery = admin
    .from('firms')
    .select(`
      id, name, created_at, suspended_at, admin_notes,
      xero_tenant_id, xero_token_expires_at,
      subscriptions (
        plan, status, client_limit, current_period_end,
        stripe_subscription_id, stripe_customer_id
      )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  const { data: firms, count, error } = await firmsQuery
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!firms || firms.length === 0) {
    return NextResponse.json({ firms: [], total: 0, page, limit })
  }

  const firmIds = firms.map(f => f.id)

  // 2. Fetch owner email for each firm (one profile per firm)
  const { data: profiles } = await admin
    .from('profiles')
    .select('firm_id, email')
    .in('firm_id', firmIds)

  const emailByFirm: Record<string, string> = {}
  profiles?.forEach((p: any) => { emailByFirm[p.firm_id] = p.email })

  // 3. Active client counts per firm
  const { data: clientStats } = await admin
    .from('clients')
    .select('firm_id, management_status')
    .in('firm_id', firmIds)

  const activeByFirm: Record<string, number> = {}
  const totalByFirm: Record<string, number> = {}
  clientStats?.forEach((c: any) => {
    totalByFirm[c.firm_id] = (totalByFirm[c.firm_id] || 0) + 1
    if (c.management_status === 'active') {
      activeByFirm[c.firm_id] = (activeByFirm[c.firm_id] || 0) + 1
    }
  })

  // 4. Total upload counts per firm (via client_id → firm mapping)
  const { data: uploadStats } = await admin
    .from('uploads')
    .select('client_id, clients!inner(firm_id)')
    .in('clients.firm_id', firmIds)

  const uploadsByFirm: Record<string, number> = {}
  uploadStats?.forEach((u: any) => {
    const fid = (u.clients as any)?.firm_id
    if (fid) uploadsByFirm[fid] = (uploadsByFirm[fid] || 0) + 1
  })

  // Apply search filter in JS (Supabase can't easily cross-join filter on firm+profile)
  let result = firms.map((f: any) => {
    const sub = Array.isArray(f.subscriptions) ? f.subscriptions[0] : f.subscriptions
    const now = Date.now()
    const tokenExpiry = f.xero_token_expires_at ? new Date(f.xero_token_expires_at).getTime() : null
    const xeroStatus = !f.xero_tenant_id
      ? 'not_connected'
      : tokenExpiry && tokenExpiry < now
        ? 'token_expired'
        : 'connected'

    return {
      id: f.id,
      name: f.name,
      ownerEmail: emailByFirm[f.id] || null,
      createdAt: f.created_at,
      suspendedAt: f.suspended_at,
      adminNotes: f.admin_notes,
      xeroStatus,
      subscription: sub
        ? {
            plan: sub.plan,
            status: sub.status,
            clientLimit: sub.client_limit,
            currentPeriodEnd: sub.current_period_end,
            stripeSubscriptionId: sub.stripe_subscription_id,
            stripeCustomerId: sub.stripe_customer_id,
          }
        : null,
      activeClients: activeByFirm[f.id] || 0,
      totalClients: totalByFirm[f.id] || 0,
      totalUploads: uploadsByFirm[f.id] || 0,
    }
  })

  // Search filter (name or email)
  if (search) {
    const q = search.toLowerCase()
    result = result.filter(
      f => f.name?.toLowerCase().includes(q) || f.ownerEmail?.toLowerCase().includes(q)
    )
  }

  // Aggregate stats for the dashboard header
  const { count: totalFirms } = await admin
    .from('firms')
    .select('id', { count: 'exact', head: true })

  const { count: paidFirms } = await admin
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')
    .neq('plan', 'trial')

  const { count: newThisMonth } = await admin
    .from('firms')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())

  const { count: totalUploads } = await admin
    .from('uploads')
    .select('id', { count: 'exact', head: true })

  return NextResponse.json({
    firms: result,
    total: search ? result.length : (count ?? 0),
    page,
    limit,
    stats: {
      totalFirms: totalFirms ?? 0,
      paidFirms: paidFirms ?? 0,
      newThisMonth: newThisMonth ?? 0,
      totalUploads: totalUploads ?? 0,
    },
  })
}
