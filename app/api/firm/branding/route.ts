import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

  const { data, error } = await supabase
    .from('firms')
    .select('brand_color, logo_url, portal_welcome_message')
    .eq('id', firmId)
    .single() as { data: { brand_color: string | null; logo_url: string | null; portal_welcome_message: string | null } | null; error: unknown }

  if (error || !data) return NextResponse.json({ error: 'Failed to fetch branding' }, { status: 500 })

  return NextResponse.json({
    brand_color: data.brand_color ?? '#064E3B',
    logo_url: data.logo_url ?? null,
    portal_welcome_message: data.portal_welcome_message ?? '',
  })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const firmId = await getFirmId(supabase, user.id)
  if (!firmId) return NextResponse.json({ error: 'No firm' }, { status: 403 })

  const body = await request.json() as {
    brand_color?: string
    logo_url?: string | null
    portal_welcome_message?: string
  }

  const update: Record<string, unknown> = {}
  if (typeof body.brand_color === 'string') update.brand_color = body.brand_color
  if ('logo_url' in body) update.logo_url = body.logo_url
  if (typeof body.portal_welcome_message === 'string') {
    if (body.portal_welcome_message.length > 500) {
      return NextResponse.json({ error: 'Welcome message too long (max 500 chars)' }, { status: 400 })
    }
    update.portal_welcome_message = body.portal_welcome_message
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
  }

  const adminClient = await createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any).from('firms').update(update).eq('id', firmId)

  if (error) return NextResponse.json({ error: 'Failed to update branding' }, { status: 500 })

  return NextResponse.json({ success: true })
}
