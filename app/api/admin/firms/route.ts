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

  // 1. Fetch firms (paginated, no nested join to avoid FK detection issues)
  const { data: firms, count, error: firmError } = await admin
    .from('firms')
    .select('id, name, created_at, suspended_at, xero_connection_status', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (firmError) {
    return NextResponse.json({ error: firmError.message }, { status: 500 })
  }

  if (!firms || firms.length === 0) {
    const { count: totalFirms } = await admin.from('firms').select('id', { count: 'exact', head: true })
    const { count: paidFirms } = await admin.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active').neq('plan', 'trial')
    const { count: newThisMonth } = await admin.from('firms').select('id', { count: 'exact', head: true }).gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
    const { count: totalUploads } = await admin.from('uploads').select('id', { count: 'exact', head: true })
    return NextResponse.json({
      firms: [], total: 0, page, limit,
      stats: { totalFirms: totalFirms ?? 0, paidFirms: paidFirms ?? 0, newThisMonth: newThisMonth ?? 0, totalUploads: totalUploads ?? 0 },
    })
  }

  const firmIds = firms.map((f: any) => f.id)

  // 2. Subscriptions — separate query, safer than nested select
  const { data: subscriptions } = await admin
    .from('subscriptions')
    .select('firm_id, plan, status, client_limit, current_period_end, stripe_subscription_id, stripe_customer_id')
    .in('firm_id', firmIds)

  const subByFirm: Record<string, any> = {}
  subscriptions?.forEach((s: any) => { subByFirm[s.firm_id] = s })

  // 3. Owner emails — profiles gives us user IDs, then auth.admin for emails
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, firm_id')
    .in('firm_id', firmIds)

  const firmByUser: Record<string, string> = {}
  profiles?.forEach((p: any) => { firmByUser[p.id] = p.firm_id })

  const emailByFirm: Record<string, string> = {}
  if (profiles && profiles.length > 0) {
    const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const userIdSet = new Set(Object.keys(firmByUser))
    users
      .filter((u: any) => userIdSet.has(u.id))
      .forEach((u: any) => {
        const firmId = firmByUser[u.id]
        if (firmId && u.email) emailByFirm[firmId] = u.email
      })
  }

  // 4. Client counts per firm
  const { data: clientRows } = await admin
    .from('clients')
    .select('firm_id, management_status')
    .in('firm_id', firmIds)

  const activeByFirm: Record<string, number> = {}
  const totalByFirm: Record<string, number> = {}
  clientRows?.forEach((c: any) => {
    totalByFirm[c.firm_id] = (totalByFirm[c.firm_id] || 0) + 1
    if (c.management_status === 'active') {
      activeByFirm[c.firm_id] = (activeByFirm[c.firm_id] || 0) + 1
    }
  })

  // 5. Upload counts — resolve client IDs for these firms, then count uploads
  const { data: clientIdRows } = await admin
    .from('clients')
    .select('id, firm_id')
    .in('firm_id', firmIds)

  const firmByClientId: Record<string, string> = {}
  clientIdRows?.forEach((c: any) => { firmByClientId[c.id] = c.firm_id })

  const allClientIds = Object.keys(firmByClientId)
  const uploadsByFirm: Record<string, number> = {}
  if (allClientIds.length > 0) {
    const { data: uploadRows } = await admin
      .from('uploads')
      .select('client_id')
      .in('client_id', allClientIds)

    uploadRows?.forEach((u: any) => {
      const firmId = firmByClientId[u.client_id]
      if (firmId) uploadsByFirm[firmId] = (uploadsByFirm[firmId] || 0) + 1
    })
  }

  // Build result rows
  let result = firms.map((f: any) => {
    const sub = subByFirm[f.id] ?? null
    const xeroStatus = f.xero_connection_status === 'connected'
      ? 'connected'
      : f.xero_connection_status === 'token_expired'
        ? 'token_expired'
        : 'not_connected'

    return {
      id: f.id,
      name: f.name,
      ownerEmail: emailByFirm[f.id] || null,
      createdAt: f.created_at,
      suspendedAt: f.suspended_at,
      xeroStatus,
      subscription: sub
        ? {
            plan: sub.plan,
            status: sub.status,
            clientLimit: sub.client_limit,
            currentPeriodEnd: sub.current_period_end,
          }
        : null,
      activeClients: activeByFirm[f.id] || 0,
      totalClients: totalByFirm[f.id] || 0,
      totalUploads: uploadsByFirm[f.id] || 0,
    }
  })

  // Search filter (name or email) applied in JS
  if (search) {
    const q = search.toLowerCase()
    result = result.filter(
      f => f.name?.toLowerCase().includes(q) || f.ownerEmail?.toLowerCase().includes(q)
    )
  }

  // Dashboard header stats
  const [
    { count: totalFirms },
    { count: paidFirms },
    { count: newThisMonth },
    { count: totalUploads },
  ] = await Promise.all([
    admin.from('firms').select('id', { count: 'exact', head: true }),
    admin.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active').neq('plan', 'trial'),
    admin.from('firms').select('id', { count: 'exact', head: true }).gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    admin.from('uploads').select('id', { count: 'exact', head: true }),
  ])

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
