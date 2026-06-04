import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/clients/[id]/audit-logs — fetch audit log entries for a client
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: profile } = await db
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single()

  if (!profile?.firm_id) {
    return NextResponse.json({ error: 'No firm associated' }, { status: 403 })
  }

  // Verify client belongs to this firm
  const { data: client } = await db
    .from('clients')
    .select('id')
    .eq('id', id)
    .eq('firm_id', profile.firm_id)
    .single()

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  const { data: logs, error } = await db
    .from('audit_logs')
    .select('id, action, metadata, created_at, actor')
    .eq('client_id', id)
    .eq('firm_id', profile.firm_id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
  }

  // Fetch actor emails for display
  const actorIds = [...new Set((logs ?? []).map((l: any) => l.actor).filter(Boolean))]
  let actorMap: Record<string, string> = {}
  if (actorIds.length > 0) {
    const { data: actors } = await db
      .from('profiles')
      .select('id, full_name, email')
      .in('id', actorIds)
    for (const a of (actors ?? [])) {
      actorMap[a.id] = a.full_name || a.email || a.id
    }
  }

  const entries = (logs ?? []).map((l: any) => ({
    id: l.id,
    action: l.action,
    metadata: l.metadata,
    timestamp: l.created_at,
    actor: l.actor ? (actorMap[l.actor] ?? 'System') : 'System',
  }))

  return NextResponse.json({ logs: entries })
}
