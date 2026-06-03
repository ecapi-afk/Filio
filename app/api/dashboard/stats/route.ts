import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get firm_id, timezone, and uploads cache
    const { data: profile } = await supabase
      .from('profiles')
      .select('firm_id, firms(timezone, monthly_uploads_cache)')
      .eq('id', user.id)
      .single()

    if (!profile?.firm_id) {
      return NextResponse.json({ error: 'Firm not found' }, { status: 404 })
    }

    const firmId = profile.firm_id
    const timezone = (profile.firms as any)?.timezone || 'Europe/London'
    const monthlyUploadsCache = (profile.firms as any)?.monthly_uploads_cache || {}

    // Get total and active clients in one query, plus created_at to compute newly added clients
    const { data: allClients } = await supabase
      .from('clients')
      .select('id, management_status, created_at')
      .eq('firm_id', firmId)
      .in('management_status', ['active', 'dormant'])
      
    const totalCount = allClients?.length || 0
    const activeClientsList = allClients?.filter(c => c.management_status === 'active') || []
    const activeCount = activeClientsList.length

    // Use Fast O(1) cached count instead of parsing tables
    const { getCurrentMonthKeyInTimezone, getMonthStartInTimezone, getPreviousMonthKeyInTimezone } = await import('@/lib/utils/timezone')
    const currentMonthKey = getCurrentMonthKeyInTimezone(timezone)
    const prevMonthKey = getPreviousMonthKeyInTimezone(timezone)
    const uploadsCount = parseInt(monthlyUploadsCache[currentMonthKey] || '0', 10)
    const uploadsPrevCount = parseInt(monthlyUploadsCache[prevMonthKey] || '0', 10)

    const firstDayOfMonth = getMonthStartInTimezone(timezone)
    const activeClientsAddedThisMonth = activeClientsList.filter(c => new Date(c.created_at) >= firstDayOfMonth).length

    // Get health status counts for active clients
    const { data: clients } = await supabase
      .from('clients')
      .select('computed_health_status')
      .eq('firm_id', firmId)
      .eq('management_status', 'active')

    const healthCounts = {
      overdue: 0,
      due_soon: 0,
      not_started: 0,
      in_progress: 0,
      complete: 0,
      no_action: 0,
    }

    clients?.forEach((client) => {
      const status = client.computed_health_status?.toLowerCase().replace(' ', '_') || 'no_action'
      if (status in healthCounts) {
        healthCounts[status as keyof typeof healthCounts]++
      }
    })

    return NextResponse.json({
      activeClients: activeCount || 0,
      totalClients: totalCount || 0,
      uploadsThisMonth: uploadsCount || 0,
      uploadsPrevMonth: uploadsPrevCount || 0,
      activeClientsAddedThisMonth: activeClientsAddedThisMonth || 0,
      healthStatus: healthCounts,
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}
