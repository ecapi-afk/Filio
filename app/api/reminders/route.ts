import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single() as { data: { firm_id: string } | null }

  if (!profile?.firm_id) {
    return NextResponse.json({ error: 'No firm associated' }, { status: 403 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('reminder_jobs')
    .select('id, status, sent_at, scheduled_for, template, clients(id, name, firm_id)')
    .eq('clients.firm_id', profile.firm_id)
    .not('clients', 'is', null)
    .order('scheduled_for', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 })
  }

  return NextResponse.json({ data: data ?? [] })
}
