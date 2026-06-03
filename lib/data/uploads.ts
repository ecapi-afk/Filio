'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMonthStartInTimezone } from '@/lib/utils/timezone'

export type UploadHistoryItem = {
  id: string
  clientId: string
  clientName: string
  clientHealthStatus: string
  filename: string
  originalFilename: string | null
  fileType: string | null
  fileSize: number | null
  xeroStatus: string
  channel: string
  uploadedAt: string
}

async function getFirmId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single()

  return profile?.firm_id ?? null
}

export async function getUploads(options: {
  clientId?: string
  limit?: number
  offset?: number
} = {}): Promise<UploadHistoryItem[]> {
  const userSupabase = await createClient()
  const firmId = await getFirmId(userSupabase)
  if (!firmId) return []

  const supabase = await createAdminClient()

  let query = supabase
    .from('uploads')
    .select(`
      id,
      client_id,
      filename,
      original_filename,
      file_type,
      file_size,
      xero_status,
      channel,
      uploaded_at,
      clients (
        id,
        name,
        computed_health_status
      )
    `)
    .eq('clients.firm_id', firmId)
    .order('uploaded_at', { ascending: false })

  if (options.clientId) {
    query = query.eq('client_id', options.clientId)
  }

  if (options.limit) {
    query = query.limit(options.limit)
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit ?? 20) - 1)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching uploads:', error)
    return []
  }

  return (data ?? []).map((u: typeof data[0]) => ({
    id: u.id,
    clientId: u.client_id,
    clientName: u.clients?.name ?? 'Unknown',
    clientHealthStatus: u.clients?.computed_health_status ?? 'No Action',
    filename: u.filename,
    originalFilename: u.original_filename ?? null,
    fileType: u.file_type,
    fileSize: u.file_size,
    xeroStatus: u.xero_status,
    channel: u.channel,
    uploadedAt: u.uploaded_at,
  }))
}

export async function getUploadStats(): Promise<{
  totalUploads: number
  uploadThisMonth: number
  pendingSync: number
  failedSync: number
}> {
  const userSupabase = await createClient()
  const firmId = await getFirmId(userSupabase)
  if (!firmId) {
    return { totalUploads: 0, uploadThisMonth: 0, pendingSync: 0, failedSync: 0 }
  }

  const supabase = await createAdminClient()

  const { data: profile } = await userSupabase
    .from('profiles')
    .select('firms(timezone)')
    .eq('id', (await userSupabase.auth.getUser()).data.user?.id ?? '')
    .single()

  const timezone = (profile?.firms as any)?.timezone || 'Europe/London'
  const firstDayOfMonth = getMonthStartInTimezone(timezone)
  const monthStart = firstDayOfMonth.toISOString()

  // Run queries in parallel
  const [totalResult, monthResult, pendingResult, failedResult] = await Promise.all([
    supabase
      .from('uploads')
      .select('id', { count: 'exact', head: true })
      .eq('clients.firm_id', firmId),

    supabase
      .from('uploads')
      .select('id', { count: 'exact', head: true })
      .gte('uploaded_at', monthStart)
      .eq('clients.firm_id', firmId),

    supabase
      .from('uploads')
      .select('id', { count: 'exact', head: true })
      .eq('xero_status', 'pending')
      .eq('clients.firm_id', firmId),

    supabase
      .from('uploads')
      .select('id', { count: 'exact', head: true })
      .eq('xero_status', 'error')
      .eq('clients.firm_id', firmId),
  ])

  return {
    totalUploads: totalResult.count ?? 0,
    uploadThisMonth: monthResult.count ?? 0,
    pendingSync: pendingResult.count ?? 0,
    failedSync: failedResult.count ?? 0,
  }
}
