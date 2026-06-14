import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAdmin(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null
  return user
}

// GET /api/admin/firms/[firmId]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ firmId: string }> }
) {
  const user = await requireAdmin(request)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { firmId } = await params
  const admin = await createAdminClient()

  const [firmRes, profileRes, clientRes, auditRes] = await Promise.all([
    // Firm only — no nested join to avoid FK detection issues
    admin
      .from('firms')
      .select('id, name, created_at, suspended_at, admin_notes, xero_connection_status, xero_org_name, xero_last_sync_at, timezone')
      .eq('id', firmId)
      .single(),

    // Owner profile — only has id + full_name; email lives in auth.users
    admin
      .from('profiles')
      .select('id, full_name')
      .eq('firm_id', firmId)
      .limit(1)
      .single(),

    // Recent clients
    admin
      .from('clients')
      .select('id, name, management_status, last_upload')
      .eq('firm_id', firmId)
      .order('last_upload', { ascending: false, nullsFirst: false })
      .limit(10),

    // Recent audit logs (last 20)
    admin
      .from('audit_logs')
      .select('id, action, metadata, created_at, actor')
      .eq('firm_id', firmId)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  if (firmRes.error || !firmRes.data) {
    return NextResponse.json({ error: 'Firm not found' }, { status: 404 })
  }

  const f = firmRes.data as any

  // Subscription — separate query
  const { data: subData } = await admin
    .from('subscriptions')
    .select('plan, status, client_limit, current_period_end, stripe_subscription_id, stripe_customer_id')
    .eq('firm_id', firmId)
    .limit(1)
    .single()
  const sub = subData as any

  // Upload count — via client IDs for this firm
  const { data: firmClientIds } = await admin
    .from('clients')
    .select('id')
    .eq('firm_id', firmId)

  let uploadCount = 0
  if (firmClientIds && firmClientIds.length > 0) {
    const ids = firmClientIds.map((c: any) => c.id)
    const { count } = await admin
      .from('uploads')
      .select('id', { count: 'exact', head: true })
      .in('client_id', ids)
    uploadCount = count ?? 0
  }

  // Resolve owner email from auth.users (email not stored in profiles table)
  const profileUserId = (profileRes.data as any)?.id ?? null
  let ownerEmail: string | null = null
  if (profileUserId) {
    const { data: { user: authUser } } = await admin.auth.admin.getUserById(profileUserId)
    ownerEmail = authUser?.email ?? null
  }

  // Client stats breakdown
  const clients = (clientRes.data ?? []) as any[]
  const { data: clientCountData } = await admin
    .from('clients')
    .select('management_status')
    .eq('firm_id', firmId)

  const statusCounts = (clientCountData ?? []).reduce((acc: any, c: any) => {
    acc[c.management_status] = (acc[c.management_status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return NextResponse.json({
    firm: {
      id: f.id,
      name: f.name,
      ownerEmail,
      ownerName: (profileRes.data as any)?.full_name ?? null,
      createdAt: f.created_at,
      suspendedAt: f.suspended_at,
      adminNotes: f.admin_notes,
      timezone: f.timezone,
      xeroStatus: f.xero_connection_status === 'connected'
        ? 'connected'
        : f.xero_connection_status === 'token_expired'
          ? 'token_expired'
          : 'not_connected',
      xeroOrgName: f.xero_org_name ?? null,
      xeroLastSyncAt: f.xero_last_sync_at ?? null,
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
    },
    clientStats: {
      active: statusCounts['active'] || 0,
      dormant: statusCounts['dormant'] || 0,
      archived: statusCounts['archived'] || 0,
      deleted: statusCounts['deleted'] || 0,
      recentClients: clients,
    },
    totalUploads: uploadCount,
    auditLogs: auditRes.data ?? [],
  })
}
