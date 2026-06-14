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

  const [firmRes, profileRes, clientRes, uploadRes, auditRes] = await Promise.all([
    // Firm + subscription
    admin
      .from('firms')
      .select(`
        id, name, created_at, suspended_at, admin_notes,
        xero_tenant_id, xero_token_expires_at, timezone,
        subscriptions (
          plan, status, client_limit, current_period_end,
          stripe_subscription_id, stripe_customer_id
        )
      `)
      .eq('id', firmId)
      .single(),

    // Owner profile
    admin
      .from('profiles')
      .select('email, full_name')
      .eq('firm_id', firmId)
      .limit(1)
      .single(),

    // Client breakdown by status
    admin
      .from('clients')
      .select('id, name, management_status, last_upload')
      .eq('firm_id', firmId)
      .order('last_upload', { ascending: false, nullsFirst: false })
      .limit(10),

    // Upload count
    admin
      .from('uploads')
      .select('id, clients!inner(firm_id)', { count: 'exact', head: true })
      .eq('clients.firm_id', firmId),

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
  const sub = Array.isArray(f.subscriptions) ? f.subscriptions[0] : f.subscriptions
  const now = Date.now()
  const tokenExpiry = f.xero_token_expires_at ? new Date(f.xero_token_expires_at).getTime() : null

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
      ownerEmail: (profileRes.data as any)?.email ?? null,
      ownerName: (profileRes.data as any)?.full_name ?? null,
      createdAt: f.created_at,
      suspendedAt: f.suspended_at,
      adminNotes: f.admin_notes,
      timezone: f.timezone,
      xeroStatus: !f.xero_tenant_id
        ? 'not_connected'
        : tokenExpiry && tokenExpiry < now
          ? 'token_expired'
          : 'connected',
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
    totalUploads: uploadRes.count ?? 0,
    auditLogs: auditRes.data ?? [],
  })
}
