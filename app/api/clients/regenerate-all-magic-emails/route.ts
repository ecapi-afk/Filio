import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

// Generate magic email slug - simple 6-char alphanumeric code
function generateMagicEmailSlug(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let result = ''
  const randomBytes = crypto.randomBytes(6)
  for (let i = 0; i < 6; i++) {
    result += chars[randomBytes[i] % chars.length]
  }
  return result
}

// POST /api/clients/regenerate-all-magic-emails - Regenerate all magic emails for a firm
export async function POST() {
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

  const firmId = profile.firm_id

  try {
    // Get all clients for this firm
    const { data: clients, error: fetchError } = await supabase
      .from('clients')
      .select('id, name')
      .eq('firm_id', firmId)
      .not('management_status', 'eq', 'deleted')

    if (fetchError) {
      console.error('Error fetching clients:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 })
    }

    if (!clients || clients.length === 0) {
      return NextResponse.json({ success: true, updated: 0 })
    }

    // Use admin client to bypass RLS
    const supabaseAdmin = await createAdminClient()

    const updates = clients.map(client => ({
      id: client.id,
      magic_email_slug: generateMagicEmailSlug(),
    }))

    // Batch update all clients
    let updated = 0
    for (const update of updates) {
      const { error: updateError } = await supabaseAdmin
        .from('clients')
        .update({ magic_email_slug: update.magic_email_slug })
        .eq('id', update.id)

      if (!updateError) {
        updated++
      }
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      firm_id: firmId,
      actor: user.id,
      action: 'all_magic_emails_regenerated',
      metadata: { updated },
    })

    return NextResponse.json({
      success: true,
      updated,
      samples: updates.slice(0, 5).map(u => u.magic_email_slug),
    })
  } catch (err) {
    console.error('Error regenerating magic emails:', err)
    return NextResponse.json({ error: 'Failed to regenerate magic emails' }, { status: 500 })
  }
}
