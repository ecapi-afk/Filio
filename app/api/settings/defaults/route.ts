import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/settings/defaults - Update firm default settings
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get firm_id from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('firm_id')
      .eq('id', user.id)
      .single()

    if (!profile?.firm_id) {
      return NextResponse.json({ error: 'No firm associated' }, { status: 400 })
    }

    const body = await request.json()
    const {
      default_reminder_days,
      auto_reminders_enabled,
      reply_to_email,
      default_client_language,
      default_vat_quarter_group,
      timezone,
    } = body

    // Validate reminder days
    if (default_reminder_days && !Array.isArray(default_reminder_days)) {
      return NextResponse.json({ error: 'Invalid reminder days' }, { status: 400 })
    }

    // Update firm settings using admin client
    const adminClient = await createAdminClient()
    const updates: Record<string, any> = {}

    if (default_reminder_days !== undefined) {
      updates.default_reminder_days = default_reminder_days
    }
    if (auto_reminders_enabled !== undefined) {
      updates.auto_reminders_enabled = auto_reminders_enabled
    }
    if (reply_to_email !== undefined) {
      updates.reply_to_email = reply_to_email
    }
    if (default_client_language !== undefined) {
      updates.default_client_language = default_client_language
    }
    if (default_vat_quarter_group !== undefined) {
      updates.default_vat_quarter_group = default_vat_quarter_group
    }
    if (timezone !== undefined) {
      updates.timezone = timezone
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
    }

    const { error: updateError } = await adminClient
      .from('firms')
      .update(updates)
      .eq('id', profile.firm_id)

    if (updateError) {
      console.error('Failed to update firm defaults:', updateError)
      return NextResponse.json({ error: 'Failed to update defaults' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in settings defaults:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/settings/defaults - Get current firm default settings
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get firm_id from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('firm_id')
      .eq('id', user.id)
      .single()

    if (!profile?.firm_id) {
      return NextResponse.json({ error: 'No firm associated' }, { status: 400 })
    }

    const { data: firm } = await supabase
      .from('firms')
      .select('default_reminder_days, auto_reminders_enabled, reply_to_email, default_client_language, default_vat_quarter_group, timezone')
      .eq('id', profile.firm_id)
      .single()

    return NextResponse.json({
      default_reminder_days: firm?.default_reminder_days || [30, 14, 7, 1],
      auto_reminders_enabled: firm?.auto_reminders_enabled ?? true,
      reply_to_email: firm?.reply_to_email || '',
      default_client_language: firm?.default_client_language || 'en',
      default_vat_quarter_group: firm?.default_vat_quarter_group || 'A',
      timezone: firm?.timezone || 'Europe/London',
    })
  } catch (error) {
    console.error('Error fetching settings defaults:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
