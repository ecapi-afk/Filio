import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
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

  const firmId = profile.firm_id

  // Get all clients with stats
  const { data: clients } = await supabase
    .from('clients')
    .select(`
      id,
      name,
      management_status,
      last_upload,
      next_deadline_date,
      uploads(count)
    `)
    .eq('firm_id', firmId)
    .not('management_status', 'eq', 'deleted')
    .order('name')

  // Get subscription for limits
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('firm_id', firmId)
    .single()

  const plan = subscription?.plan || 'starter'
  const limits = {
    starter: { active: 20, dormant: 40 },
    professional: { active: 100, dormant: 200 },
    firm: { active: Infinity, dormant: Infinity },
  }[plan] || { active: 20, dormant: 40 }

  // Calculate stats
  const now = new Date()
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const activeClients = clients?.filter(c => c.management_status === 'active') || []
  const dormantClients = clients?.filter(c => c.management_status === 'dormant') || []

  const inactiveClients = activeClients.filter(c => {
    if (!c.last_upload) return true
    return new Date(c.last_upload) < ninetyDaysAgo
  })

  const upcomingDeadlines = activeClients.filter(c => {
    if (!c.next_deadline_date) return false
    const deadline = new Date(c.next_deadline_date)
    return deadline >= now && deadline <= thirtyDaysFromNow
  })

  return NextResponse.json({
    data: {
      activeClients: activeClients.length,
      activeLimit: limits.active,
      dormantClients: dormantClients.length,
      dormantLimit: limits.dormant,
      inactiveClients: inactiveClients.length,
      upcomingDeadlines: upcomingDeadlines.length,
      clients: (clients || []).map(c => ({
        id: c.id,
        name: c.name,
        management_status: c.management_status,
        last_upload: c.last_upload,
        total_uploads: c.uploads?.[0]?.count || 0,
        next_deadline: c.next_deadline_date,
      })),
    },
  })
}