import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { refreshClientCache } from '@/lib/data/clients'

/**
 * POST /api/admin/refresh-client-caches
 *
 * One-time / scheduled endpoint to recompute all cached fields
 * (computed_health_status, next_deadline_date/type, uploads_count)
 * for every client in the firm.
 *
 * Run this once after the SQL migration, then set up a daily cron.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const adminClient = await createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single()

  const firmId = (profile as { firm_id?: string } | null)?.firm_id
  if (!firmId) {
    return NextResponse.json({ error: 'No firm associated' }, { status: 403 })
  }

  // Get all non-deleted clients for this firm
  const { data: clients, error } = await adminClient
    .from('clients')
    .select('id')
    .eq('firm_id', firmId)
    .neq('management_status', 'deleted')

  if (error || !clients) {
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 })
  }

  const clientsList = clients as { id: string }[]
  const startTime = Date.now()
  let succeeded = 0
  let failed = 0
  const errors: string[] = []

  // Refresh each client's cache sequentially (avoids hammering DB)
  for (const client of clientsList) {
    try {
      await refreshClientCache(client.id)
      succeeded++
    } catch (e: unknown) {
      failed++
      const errorMessage = e instanceof Error ? e.message : String(e)
      errors.push(`${client.id}: ${errorMessage}`)
      console.error(`refreshClientCache failed for ${client.id}:`, e)
    }
  }

  const elapsed = Date.now() - startTime

  return NextResponse.json({
    success: true,
    total: clients.length,
    succeeded,
    failed,
    elapsed_ms: elapsed,
    ...(errors.length > 0 && { errors }),
  })
}
