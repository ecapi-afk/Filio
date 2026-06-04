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
    return NextResponse.json({ data: [] })
  }

  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, title, body, metadata, read_at, created_at')
    .eq('firm_id', profile.firm_id)
    .order('created_at', { ascending: false })
    .limit(20) as { data: any[] | null; error: any }

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }

  return NextResponse.json({ data: data ?? [] })
}
