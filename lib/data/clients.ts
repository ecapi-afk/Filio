'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTodayStrInTimezone } from '@/lib/utils/timezone'
import type { Client, HealthStatus, ManagementStatus } from '@/lib/supabase/types'

export type ClientRow = Client

export type ClientWithRelations = Client & {
  client_settings?: any
  requests?: any[]
  uploads?: any[]
  firms?: any
}

export type ClientListItem = {
  id: string
  name: string
  email: string | null
  portal_email: string | null
  is_starred: boolean
  health_status: HealthStatus
  portal_status: string
  management_status: ManagementStatus
  xero_not_found: boolean
  last_upload: string | null
  created_at: string
  deleted_at?: string | null
  portal_token?: string | null
  magic_email_slug?: string | null
  short_links?: Array<{ short_code: string; is_active: boolean }>
  current_period_completed?: boolean
  client_number?: number
  next_deadline?: {
    date: string
    type: string
  }
  upload_progress?: {
    uploaded: number
    required: number
  }
}

// Helper to calculate days since a date
function daysSince(dateStr: string | null): number {
  if (!dateStr) return -1
  const date = new Date(dateStr)
  const now = new Date()
  const diffTime = now.getTime() - date.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

// Helper to get next deadline from requests
async function getNextDeadlineForClient(
  supabase: any,
  clientId: string,
  useAdmin: boolean = false,
  vatQuarterGroup?: string | null
): Promise<{ date: string; type: string } | null> {
  const client = useAdmin ? await createAdminClient() : supabase
  // Use local date at midnight to match calculateHealthStatus date logic
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const localOffset = today.getTimezoneOffset() * 60000
  const todayStr = new Date(today.getTime() - localOffset).toISOString().split('T')[0]

  const { data } = await client
    .from('requests')
    .select('deadline_date, title')
    .eq('client_id', clientId)
    .gte('deadline_date', todayStr)
    .order('deadline_date', { ascending: true })
    .limit(10)

  if (!data || data.length === 0) return null

  // If client is not VAT registered (vat_quarter_group is "none" or null),
  // filter out VAT-related requests
  const isVatRegistered = vatQuarterGroup && vatQuarterGroup !== 'none'

  const filteredData = isVatRegistered
    ? data
    : data.filter((r: any) => {
        const title = (r.title || '').toLowerCase()
        // Skip VAT-related requests for non-VAT registered clients
        return !title.includes('vat') && !title.includes('mtd')
      })

  if (filteredData.length === 0) return null

  return {
    date: filteredData[0].deadline_date,
    type: filteredData[0].title || 'Document Request',
  }
}

// Helper to get upload progress
async function getUploadProgressForClient(
  supabase: any,
  clientId: string,
  useAdmin: boolean = false
): Promise<{ uploaded: number; required: number }> {
  const client = useAdmin ? await createAdminClient() : supabase
  const { count: uploadedCount } = await client
    .from('uploads')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId)

  const { data: requests } = await client
    .from('requests')
    .select('required_files')
    .eq('client_id', clientId)

  const totalRequired = requests?.reduce((sum: number, r: any) => sum + (r.required_files || 1), 0) || 5

  return {
    uploaded: uploadedCount || 0,
    required: totalRequired,
  }
}

// Calculate health status based on requests and uploads
// Decision table from spec:
// | 条件 | 最终状态 |
// | 任一未完成截止日 < today | Overdue |
// | 任一未完成截止日在未来 14 天内 | Due Soon |
// | 未来 15–30 天内有截止日，且本周期上传数 = 0 | Not Started |
// | 已上传 1 个及以上文件，但未完成 | In Progress |
// | 当前周期全部完成 | Complete |
// | 其他情况 | No Action |
async function calculateHealthStatus(
  supabase: any,
  clientId: string,
  useAdmin: boolean = false
): Promise<HealthStatus> {
  const client = useAdmin ? await createAdminClient() : supabase

  // Get client to check manual completion status
  const { data: clientData } = await client
    .from('clients')
    .select('current_period_completed')
    .eq('id', clientId)
    .single()

  // Rule 1: If manually marked as complete, force return Complete
  if (clientData?.current_period_completed === true) {
    return 'Complete'
  }

  // Get all requests for this client
  const { data: requests } = await client
    .from('requests')
    .select('deadline_date, status, required_files')
    .eq('client_id', clientId)

  // Get uploads count
  const { count: uploadedCount } = await client
    .from('uploads')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId)

  const uploads = uploadedCount || 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (!requests || requests.length === 0) {
    return 'No Action'
  }

  // Get incomplete (pending) requests with future deadlines
  // "未完成截止日" = status !== 'Complete' AND deadline_date >= today
  // Only these should be considered when calculating health status
  // Use local date to avoid timezone issues
  const localOffset = today.getTimezoneOffset() * 60000
  const todayStr = new Date(today.getTime() - localOffset).toISOString().split('T')[0]

  const pendingRequests = requests.filter((r: any) =>
    r.status !== 'Complete' && r.deadline_date >= todayStr
  )

  // Also track overdue requests separately (past deadlines that aren't complete)
  const overdueRequests = requests.filter((r: any) =>
    r.status !== 'Complete' && r.deadline_date < todayStr
  )

  if (pendingRequests.length === 0 && overdueRequests.length === 0) {
    return 'No Action'
  }

  if (overdueRequests.length > 0) {
    return 'Overdue'
  }

  if (pendingRequests.length === 0) {
    // Rule 2: No pending requests means ready for completion, but requires manual action
    return 'In Progress'
  }

  // Check deadlines for pending requests
  let hasDueSoon = false
  let hasNearDeadline = false // 15-30 days
  let totalRequired = 0

  // Only check deadlines for pending (incomplete) requests with future deadlines
  for (const req of pendingRequests) {
    const deadline = new Date(req.deadline_date)
    deadline.setHours(0, 0, 0, 0)
    const daysUntil = Math.floor((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    const required = req.required_files || 1
    totalRequired += required

    if (daysUntil <= 14) {
      hasDueSoon = true
    } else if (daysUntil <= 30) {
      hasNearDeadline = true
    }
  }

  // Apply decision table in priority order (after overdue check)
  if (hasDueSoon) {
    return 'Due Soon'
  }
  if (hasNearDeadline && uploads === 0) {
    return 'Not Started'
  }
  if (uploads > 0 && uploads < totalRequired) {
    return 'In Progress'
  }
  // Rule 3: Even if uploads >= required, don't auto-complete - require manual confirmation
  // Return In Progress until accountant marks as complete
  if (uploads >= totalRequired && totalRequired > 0) {
    return 'In Progress'
  }

  return 'No Action'
}

export async function getClients(
  options: {
    managementStatus?: ManagementStatus
    healthStatus?: HealthStatus
    search?: string
    includeDeleted?: boolean
  } = {}
): Promise<ClientListItem[]> {
  const supabase = await createClient()

  // 1. Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // 2. Get firm_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single()

  const firmId = (profile as { firm_id?: string } | null)?.firm_id
  if (!firmId) return []

  // 3. Single query — reads pre-computed cached columns, no joins to requests/uploads.
  //    computed_health_status, next_deadline_date/type, uploads_count are maintained
  //    at write time by refreshClientCache() — zero extra queries on every page load.
  let query = supabase
    .from('clients')
    .select(`
      id,
      client_number,
      name,
      email,
      portal_email,
      is_starred,
      portal_status,
      management_status,
      xero_not_found,
      last_upload,
      created_at,
      portal_token,
      magic_email_slug,
      current_period_completed,
      vat_quarter_group,
      computed_health_status,
      next_deadline_date,
      next_deadline_type,
      uploads_count,
      deleted_at,
      short_links(short_code, is_active)
    `)
    .eq('firm_id', firmId)

  if (options.managementStatus) {
    query = query.eq('management_status', options.managementStatus)
  } else if (!options.includeDeleted) {
    query = query.neq('management_status', 'deleted')
  }

  // Health status filter — DB-side (uses idx_clients_firm_health index)
  if (options.healthStatus) {
    query = query.eq('computed_health_status', options.healthStatus)
  }

  // Search filter — DB-side
  if (options.search) {
    query = query.or(
      `name.ilike.%${options.search}%,email.ilike.%${options.search}%,portal_email.ilike.%${options.search}%`
    )
  }

  // Sort by nearest deadline first, nulls last (uses idx_clients_firm_deadline index)
  query = query.order('next_deadline_date', { ascending: true, nullsFirst: false })

  const { data: clients, error } = await query

  if (error) {
    console.error('Error fetching clients:', error)
    return []
  }

  if (!clients || clients.length === 0) return []

  // Today as YYYY-MM-DD in UTC — safe for deadline comparison since stored dates
  // are plain date strings (no time component). Using UTC avoids timezone shifts
  // that could flip the date by one day near midnight.
  const todayUTC = new Date().toISOString().split('T')[0]

  // 4. Map to ClientListItem — all values pre-computed, no JS calculations needed.
  //    STALE-CACHE GUARD: computed_health_status is written at mutation time and
  //    can go stale as deadlines pass with no user action. If next_deadline_date
  //    is already in the past but the cached status isn't Overdue/Complete,
  //    override it here so the UI is always correct — zero extra DB queries.
  return (clients as any[]).map(client => {
    const cachedStatus: HealthStatus = client.computed_health_status || 'No Action'
    const isStaleNonOverdue =
      client.next_deadline_date &&
      client.next_deadline_date < todayUTC &&
      cachedStatus !== 'Overdue' &&
      cachedStatus !== 'Complete'
    const health_status: HealthStatus = isStaleNonOverdue ? 'Overdue' : cachedStatus
    return {
      ...client,
      health_status,
      next_deadline: client.next_deadline_date
        ? { date: client.next_deadline_date, type: client.next_deadline_type || 'Document Request' }
        : null,
      upload_progress: {
        uploaded: client.uploads_count ?? 0,
        required: 5,
      },
    }
  }) as ClientListItem[]
}


// Calculate health status from pre-fetched data (no DB queries)
function calculateHealthStatusFromData(
  requests: any[],
  uploadsCount: number,
  todayStr: string
): HealthStatus {
  if (!requests || requests.length === 0) {
    return 'No Action'
  }

  const pendingRequests = requests.filter((r: any) =>
    r.status !== 'Complete' && r.deadline_date >= todayStr
  )

  const overdueRequests = requests.filter((r: any) =>
    r.status !== 'Complete' && r.deadline_date < todayStr
  )

  if (pendingRequests.length === 0 && overdueRequests.length === 0) {
    return 'No Action'
  }

  if (overdueRequests.length > 0) {
    return 'Overdue'
  }

  if (pendingRequests.length === 0) {
    return 'In Progress'
  }

  let hasDueSoon = false
  let hasNearDeadline = false
  let totalRequired = 0

  for (const req of pendingRequests) {
    const deadline = new Date(req.deadline_date)
    const daysUntil = Math.floor((deadline.getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24))
    totalRequired += req.required_files || 1

    if (daysUntil <= 14) {
      hasDueSoon = true
    } else if (daysUntil <= 30) {
      hasNearDeadline = true
    }
  }

  if (hasDueSoon) return 'Due Soon'
  if (hasNearDeadline && uploadsCount === 0) return 'Not Started'
  if (uploadsCount > 0 && uploadsCount < totalRequired) return 'In Progress'
  if (uploadsCount >= totalRequired && totalRequired > 0) return 'In Progress'

  return 'No Action'
}

export async function getClientById(id: string): Promise<ClientWithRelations | null> {
  const supabase = await createClient()
  const adminClient = await createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('clients')
    .select(`
      *,
      firms(xero_connection_status, timezone, xero_upload_mode),
      short_links(short_code, is_active)
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching client detail:', error)
    return null
  }

  if (!data) return null

  // Cast to avoid Supabase type inference issues
  const clientData = data as ClientWithRelations

  console.log('getClientById:', {
    id,
    clientData: data
  })

  // Fetch requests + uploads in parallel (both only depend on client id)
  const timezone = (clientData.firms as any)?.timezone || 'Europe/London'
  const now = getTodayStrInTimezone(timezone)

  const [requestsResult, uploadsResult] = await Promise.all([
    adminClient
      .from('requests')
      .select('id, title, deadline_date, required_files, status')
      .eq('client_id', id),
    adminClient
      .from('uploads')
      .select('id, filename, original_filename, file_type, file_size, xero_status, channel, uploaded_at, xero_upload_mode, xero_attachment_id', { count: 'exact' })
      .eq('client_id', id)
      .order('uploaded_at', { ascending: false }),
  ])

  if (requestsResult.error) {
    console.error('Error fetching requests:', requestsResult.error)
  }

  const requests = (requestsResult.data ?? []) as any[]
  const uploadsData = (uploadsResult.data ?? []) as any[]
  const uploadedCount = uploadsResult.count || 0

  // Compute next_deadline from already-fetched requests (no extra query)
  const pendingRequests = requests
    .filter((r: any) => r.deadline_date && r.deadline_date >= now)
    .sort((a: any, b: any) => a.deadline_date.localeCompare(b.deadline_date))

  const nextDeadline = pendingRequests.length > 0
    ? { date: pendingRequests[0].deadline_date, type: pendingRequests[0].title || 'Document Request' }
    : null

  const totalRequired = requests.reduce((sum: number, r: any) => sum + (r.required_files || 1), 0) || 5

  // Calculate health status from already-fetched data — replaces calculateHealthStatus()
  // which made 3 extra DB queries (clients + requests + uploads) redundantly
  let calculatedHealth: HealthStatus
  if (clientData.current_period_completed === true) {
    calculatedHealth = 'Complete'
  } else {
    calculatedHealth = calculateHealthStatusFromData(requests, uploadedCount, now)
  }

  return {
    ...clientData,
    health_status: calculatedHealth,
    requests,
    uploads: uploadsData,
    next_deadline: nextDeadline,
    upload_progress: {
      uploaded: uploadedCount,
      required: totalRequired,
    },
  } as ClientWithRelations
}

export async function getFirmBrandingByClientId(clientId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('clients')
    .select(`
      firms (
        name,
        logo_url,
        brand_color,
        reply_to_email,
        xero_connection_status
      )
    `)
    .eq('id', clientId)
    .single()

  const clientData = data as { firms?: any } | null

  if (error || !clientData?.firms) {
    return {
      name: 'Filio Accountant',
      logo_url: null,
      brand_color: '#0F2744',
      reply_to_email: 'support@filio.uk',
      xero_connection_status: 'connected'
    }
  }

  const firm = clientData.firms as any
  return {
    name: firm.name,
    logo_url: firm.logo_url,
    brand_color: firm.brand_color,
    reply_to_email: firm.reply_to_email,
    xero_connection_status: firm.xero_connection_status
  }
}

export async function updateClient(
  id: string,
  updates: Partial<Client>
): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await (supabase
    .from('clients') as any)
    .update(updates)
    .eq('id', id)

  if (error) {
    console.error('Error updating client:', error)
    return false
  }

  return true
}

export async function setClientDormant(id: string): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await (supabase
    .from('clients') as any)
    .update({
      management_status: 'dormant',
      dormanted_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('Error setting client dormant:', error)
    return false
  }

  return true
}

export async function reactivateClient(id: string): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await (supabase
    .from('clients') as any)
    .update({
      management_status: 'active',
      activated_at: new Date().toISOString(),
      dormant_reminded_at: null,
    })
    .eq('id', id)

  if (error) {
    console.error('Error reactivating client:', error)
    return false
  }

  return true
}

// ============================================================
// Cache maintenance — call after any data mutation
// ============================================================

/**
 * Recomputes and persists the 4 cached fields for a single client:
 *   - next_deadline_date / next_deadline_type
 *   - uploads_count
 *   - computed_health_status
 *
 * Call this from every write path that affects requests or uploads.
 */
export async function refreshClientCache(clientId: string): Promise<void> {
  const adminClient = await createAdminClient()

  // Parallel: requests + uploads count + current period status
  const [reqResult, uploadCountResult, clientResult] = await Promise.all([
    adminClient
      .from('requests')
      .select('deadline_date, title, status, required_files')
      .eq('client_id', clientId),
    adminClient
      .from('uploads')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId),
    adminClient
      .from('clients')
      .select('current_period_completed, firms(timezone)')
      .eq('id', clientId)
      .single(),
  ])

  const requests = (reqResult.data ?? []) as any[]
  const uploadsCount = uploadCountResult.count ?? 0
  const clientData = clientResult.data as { current_period_completed?: boolean, firms?: { timezone?: string } } | null
  const currentPeriodCompleted = clientData?.current_period_completed ?? false
  const timezone = (clientData?.firms as any)?.timezone || 'Europe/London'
  const todayStr = getTodayStrInTimezone(timezone)

  // Soonest pending request (future deadlines)
  const pending = requests
    .filter((r: any) => r.status !== 'Complete' && r.deadline_date >= todayStr)
    .sort((a: any, b: any) => a.deadline_date.localeCompare(b.deadline_date))

  // Overdue requests (past deadlines not marked complete)
  // Sort ascending: earliest date = most overdue, so it appears first
  const overdue = requests
    .filter((r: any) => r.status !== 'Complete' && r.deadline_date < todayStr)
    .sort((a: any, b: any) => a.deadline_date.localeCompare(b.deadline_date))

  // If there are overdue requests, show the MOST overdue one as next_deadline
  // This ensures Overdue clients keep showing their overdue deadline until manually marked complete
  const nextDeadlineDate = overdue[0]?.deadline_date ?? pending[0]?.deadline_date ?? null
  const nextDeadlineType = overdue[0]?.title ?? pending[0]?.title ?? null

  // Health status — pure memory, 0 extra DB queries
  const health = currentPeriodCompleted
    ? 'Complete'
    : calculateHealthStatusFromData(requests, uploadsCount, todayStr)

  // One atomic update
  await (adminClient
    .from('clients') as any)
    .update({
      next_deadline_date: nextDeadlineDate,
      next_deadline_type: nextDeadlineType,
      uploads_count: uploadsCount,
      computed_health_status: health,
    })
    .eq('id', clientId)
}

// ============================================================
// Short URL routing — look up client by client_number
// ============================================================

/**
 * Fetch a client by its short numeric ID (client_number).
 * Used in /dashboard/clients/[number] URL routing.
 * Internal API calls still use the UUID (data.id).
 */
export async function getClientByNumber(clientNumber: number): Promise<ClientWithRelations | null> {
  const supabase = await createClient()
  const adminClient = await createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Resolve the UUID from client_number
  const { data: clientRow, error: lookupError } = await supabase
    .from('clients')
    .select('id, firm_id')
    .eq('client_number', clientNumber)
    .single()

  if (lookupError || !clientRow) return null

  const clientRowData = clientRow as { id: string }
  // Delegate to the UUID-based loader
  return getClientById(clientRowData.id)
}

