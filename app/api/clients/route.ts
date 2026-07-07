import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getClients } from '@/lib/data/clients'
import { createMagicCredentials } from '@/lib/magic/generator'
import { isTrialExpired } from '@/lib/auth/trial'
import type { HealthStatus, ManagementStatus } from '@/lib/supabase/types'

// GET /api/clients - List clients for the current user
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const managementStatus = searchParams.get('management_status') as ManagementStatus | null
  const healthStatus = searchParams.get('health_status') as HealthStatus | null
  const search = searchParams.get('search')

  // Use the data layer function which handles all the logic
  const clients = await getClients({
    managementStatus: managementStatus || undefined,
    healthStatus: healthStatus || undefined,
    search: search || undefined,
  })

  return NextResponse.json({ data: clients })
}

// POST /api/clients - Create a new client
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single()

  if (!profile?.firm_id) {
    return NextResponse.json({ error: 'No firm associated' }, { status: 403 })
  }

  if (await isTrialExpired(supabase, profile.firm_id)) {
    return NextResponse.json({ error: 'trial_expired' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { name, email, portal_email } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // ✅ Fetch firm-level global defaults to apply to new client
    const { data: firmDefaults } = await supabase
      .from('firms')
      .select('default_reminder_days, default_magic_email_sender_verified_only')
      .eq('id', profile.firm_id)
      .single()

    const defaultReminderDays = firmDefaults?.default_reminder_days ?? null
    const defaultMagicEmailVerifiedOnly = firmDefaults?.default_magic_email_sender_verified_only ?? false

    const { data, error } = await supabase
      .from('clients')
      .insert({
        firm_id: profile.firm_id,
        name,
        email: email || null,
        portal_email: portal_email || email || null,
        management_status: 'active',
        health_status: 'No Action',
        portal_status: 'Active',
        is_starred: false,
        xero_not_found: false,
        auto_reminders_enabled: true,
        // ✅ Apply firm-level global defaults
        reminder_days_before: defaultReminderDays,
        magic_email_verified_only: defaultMagicEmailVerifiedOnly,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating client:', error)
      return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
    }

    // Create Magic Link (short_code) and Magic Email alias (only if on Pro plan)
    await createMagicCredentials(data.id, name, profile.firm_id)

    // Audit log
    await supabase.from('audit_logs').insert({
      firm_id: profile.firm_id,
      client_id: data.id,
      actor: user.id,
      action: 'client_created',
      metadata: { name },
    })

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('Error in POST /api/clients:', err)
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
