import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ count: 0 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single() as { data: { firm_id: string } | null }

  if (!profile?.firm_id) {
    return NextResponse.json({ count: 0 })
  }

  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('firm_id', profile.firm_id)
    .is('read_at', null)

  return NextResponse.json({ count: count ?? 0 })
}
