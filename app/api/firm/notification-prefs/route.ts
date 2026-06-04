import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type NotificationPrefs = {
  notify_daily_digest: boolean
  notify_sync_failure: boolean
  notify_client_overdue: boolean
  notify_quota_warning: boolean
  notify_auto_dormant: boolean
  notify_dormant_reminder: boolean
  notify_upload_attempt: boolean
  notify_weekly_report: boolean
}

const ALLOWED_KEYS: (keyof NotificationPrefs)[] = [
  'notify_daily_digest',
  'notify_sync_failure',
  'notify_client_overdue',
  'notify_quota_warning',
  'notify_auto_dormant',
  'notify_dormant_reminder',
  'notify_upload_attempt',
  'notify_weekly_report',
]

async function getFirmId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', userId)
    .single() as { data: { firm_id: string } | null }
  return data?.firm_id ?? null
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const firmId = await getFirmId(supabase, user.id)
  if (!firmId) return NextResponse.json({ error: 'No firm' }, { status: 403 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('firms')
    .select(ALLOWED_KEYS.join(', '))
    .eq('id', firmId)
    .single() as { data: NotificationPrefs | null; error: unknown }

  if (error || !data) return NextResponse.json({ error: 'Failed to fetch prefs' }, { status: 500 })

  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const firmId = await getFirmId(supabase, user.id)
  if (!firmId) return NextResponse.json({ error: 'No firm' }, { status: 403 })

  const body = await request.json() as Partial<NotificationPrefs>
  const update = Object.fromEntries(
    ALLOWED_KEYS.filter(k => k in body).map(k => [k, Boolean(body[k])])
  )

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('firms').update(update).eq('id', firmId)

  if (error) return NextResponse.json({ error: 'Failed to update prefs' }, { status: 500 })

  return NextResponse.json({ success: true })
}
