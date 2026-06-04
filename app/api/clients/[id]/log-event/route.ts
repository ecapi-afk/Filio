import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_ACTIONS: string[] = [
  'banner_dismissed',
  'overdue_banner_dismissed',
]

// POST /api/clients/[id]/log-event — write an audit log entry from a UI action
export async function POST(
  request: NextRequest,
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

  const body = await request.json().catch(() => ({}))
  const action = body.action as string
  const metadata = body.metadata ?? {}

  if (!ALLOWED_ACTIONS.includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const { error } = await db.from('audit_logs').insert({
    firm_id: profile.firm_id,
    client_id: id,
    actor: user.id,
    action,
    metadata,
  })

  if (error) {
    return NextResponse.json({ error: 'Failed to log event' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
