'use server'

import { createClient } from '@/lib/supabase/server'
import { getClients, type ClientListItem } from '@/lib/data/clients'
import type { HealthStatus } from '@/lib/supabase/types'
import { getMonthStartInTimezone, getTodayStartInTimezone } from '@/lib/utils/timezone'

// ============================================================
// Types returned by dashboard queries
// ============================================================

export type HealthStatusGroup = {
  label: HealthStatus
  count: number
  colors: string
}

export type UpcomingDeadline = {
  id: string
  client: string
  clientId: string
  type: string
  date: string
  status: string
  urgent: boolean
}

export type RecentUploadItem = {
  id: string
  clientId: string
  clientName: string
  filename: string
  type: string
  time: string
  xeroStatus: string
  channel: string
}

export type DashboardStats = {
  activeClientsCount: number
  pendingClientsCount: number
  clientLimit: number
  plan: string
  uploadThisMonth: number
  uploadsPrevMonth: number
  activeClientsAddedThisMonth: number
  overdueCount: number
  dueSoonCount: number
  healthGroups: HealthStatusGroup[]
  upcomingDeadlines: UpcomingDeadline[]
  recentUploads: RecentUploadItem[]
  isXeroConnected: boolean
  clients: ClientListItem[]
  /** Last 10 months of active client counts (cumulative, oldest→newest) */
  clientsSparkline: number[]
  /** Last 10 months of upload counts (oldest→newest) */
  uploadsSparkline: number[]
}

// ============================================================
// Health status colour map
// ============================================================

const STATUS_COLORS: Record<HealthStatus, string> = {
  'Overdue': 'bg-red-100 text-red-700',
  'Due Soon': 'bg-amber-100 text-amber-700',
  'Not Started': 'bg-blue-100 text-blue-700',
  'In Progress': 'bg-yellow-100 text-yellow-700',
  'Complete': 'bg-green-100 text-green-700',
  'No Action': 'bg-zinc-100 text-zinc-600',
}

const ALL_STATUSES: HealthStatus[] = [
  'Overdue', 'Due Soon', 'Not Started', 'In Progress', 'Complete', 'No Action'
]

// Health statuses that indicate a deadline exists
const DEADLINE_STATUSES: HealthStatus[] = ['Overdue', 'Due Soon', 'Not Started']

// ============================================================
// Main Dashboard data loader
// ============================================================

export async function getDashboardData(): Promise<DashboardStats> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return getEmptyDashboardStats()

  // Resolve the firm_id and Xero status for this accountant
  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id, firms(xero_connection_status, timezone, monthly_uploads_cache)')
    .eq('id', user.id)
    .single()

  if (!profile?.firm_id) return getEmptyDashboardStats()
  const firmId = profile.firm_id
  const firmData = profile.firms as any
  const isXeroConnected = firmData?.xero_connection_status === 'connected'
  const timezone = firmData?.timezone || 'Europe/London'
  const monthlyUploadsCache = firmData?.monthly_uploads_cache || {}

  // Get active clients with their computed next_deadline
  const clients = await getClients({ managementStatus: 'active' })

  // Get subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, status, client_limit')
    .eq('firm_id', firmId)
    .single()

  // Get recent uploads
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminClient = await createAdminClient()
  const { data: uploadsData } = await adminClient
    .from('uploads')
    .select('id, filename, file_type, xero_status, channel, uploaded_at, client_id')
    .in('client_id', clients.map(c => c.id))
    .order('uploaded_at', { ascending: false })
    .limit(8)

  const uploads = uploadsData ?? []

  // Fast O(1) read for current and previous month uploads using the firm-level cache (zero DB query)
  const { getCurrentMonthKeyInTimezone, getMonthStartInTimezone, getPreviousMonthKeyInTimezone, getLastNMonthKeys } = await import('@/lib/utils/timezone')
  const currentMonthKey = getCurrentMonthKeyInTimezone(timezone)
  const prevMonthKey = getPreviousMonthKeyInTimezone(timezone)
  const uploadThisMonth = parseInt(monthlyUploadsCache[currentMonthKey] || '0', 10)
  const uploadsPrevMonth = parseInt(monthlyUploadsCache[prevMonthKey] || '0', 10)

  // Compute how many clients were added this month
  const firstDayOfMonth = getMonthStartInTimezone(timezone)
  const activeClientsAddedThisMonth = clients.filter(c => new Date(c.created_at) >= firstDayOfMonth).length

  // Build health status groups and counts
  const countByStatus = Object.fromEntries(ALL_STATUSES.map(s => [s, 0])) as Record<HealthStatus, number>
  for (const client of clients) {
    const status = client.health_status as HealthStatus
    if (status in countByStatus) countByStatus[status]++
  }

  const healthGroups: HealthStatusGroup[] = ALL_STATUSES.map(label => ({
    label,
    count: countByStatus[label],
    colors: STATUS_COLORS[label],
  }))

  // Active clients = portal_status === 'Active'
  const activeClientsCount = clients.filter(c => c.portal_status === 'Active').length

  // Pending = Due Soon status AND files not fully uploaded (uploaded < required)
  const pendingClientsCount = clients.filter(c =>
    c.health_status === 'Due Soon' &&
    c.upload_progress &&
    c.upload_progress.uploaded < c.upload_progress.required
  ).length

  // Recent uploads formatted for UI
  const clientMap = new Map(clients.map(c => [c.id, c.name]))
  const recentUploads: RecentUploadItem[] = uploads.map(u => ({
    id: u.id,
    clientId: u.client_id,
    clientName: clientMap.get(u.client_id) ?? 'Unknown',
    filename: u.filename,
    type: u.file_type ?? 'Unknown',
    time: u.uploaded_at,
    xeroStatus: u.xero_status ?? 'pending',
    channel: u.channel ?? 'portal',
  }))

  // Upcoming deadlines from clients with deadline statuses
  const todayStart = getTodayStartInTimezone(timezone)
  const upcomingDeadlines: UpcomingDeadline[] = clients
    .filter(c => DEADLINE_STATUSES.includes(c.health_status as HealthStatus) && c.next_deadline)
    .map(c => {
      const deadlineDate = new Date(c.next_deadline!.date)
      const daysUntil = Math.ceil((deadlineDate.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24))
      return {
        id: c.id,
        client: c.name,
        clientId: c.id,
        type: c.next_deadline!.type,
        date: c.next_deadline!.date,
        status: c.health_status,
        urgent: daysUntil <= 3 || daysUntil < 0,
        daysUntil,
      }
    })
    // Sort: Overdue first (most overdue = most negative daysUntil), then by date ascending
    .sort((a, b) => {
      // Overdue (negative days) come first
      if (a.daysUntil < 0 && b.daysUntil >= 0) return -1
      if (b.daysUntil < 0 && a.daysUntil >= 0) return 1
      // Both overdue: sort by most overdue first (most negative daysUntil)
      if (a.daysUntil < 0 && b.daysUntil < 0) return a.daysUntil - b.daysUntil
      // Both future/due soon: sort by date ascending (soonest first)
      return new Date(a.date).getTime() - new Date(b.date).getTime()
    })
    .slice(0, 5)

  // Build 10-month sparklines
  const last10Months = getLastNMonthKeys(timezone, 10)

  // Uploads sparkline: read directly from the monthly_uploads_cache
  const uploadsSparkline = last10Months.map(m => parseInt(monthlyUploadsCache[m] || '0', 10))

  // Clients sparkline: cumulative count of active clients created up to end of each month
  // Using JS Date trick: new Date(year, month, 0) = last day of the previous month (1-indexed month)
  const clientsSparkline = last10Months.map(monthKey => {
    const [year, month] = monthKey.split('-').map(Number)
    const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999))
    return clients.filter(c => new Date(c.created_at) <= endOfMonth).length
  })

  return {
    activeClientsCount,
    pendingClientsCount,
    clientLimit: subscription?.client_limit ?? 20,
    plan: subscription?.plan ?? 'trial',
    uploadThisMonth: uploadThisMonth ?? 0,
    uploadsPrevMonth,
    activeClientsAddedThisMonth,
    overdueCount: countByStatus['Overdue'],
    dueSoonCount: countByStatus['Due Soon'],
    healthGroups,
    upcomingDeadlines,
    recentUploads,
    isXeroConnected,
    clients,
    clientsSparkline,
    uploadsSparkline,
  }
}

// ============================================================
// Empty/fallback state (no auth or no data yet)
// ============================================================

function getEmptyDashboardStats(): DashboardStats {
  return {
    activeClientsCount: 0,
    pendingClientsCount: 0,
    clientLimit: 20,
    plan: 'trial',
    uploadThisMonth: 0,
    uploadsPrevMonth: 0,
    activeClientsAddedThisMonth: 0,
    overdueCount: 0,
    dueSoonCount: 0,
    healthGroups: ALL_STATUSES.map(label => ({
      label,
      count: 0,
      colors: STATUS_COLORS[label],
    })),
    upcomingDeadlines: [],
    recentUploads: [],
    isXeroConnected: false,
    clients: [],
    clientsSparkline: Array(10).fill(0),
    uploadsSparkline: Array(10).fill(0),
  }
}
