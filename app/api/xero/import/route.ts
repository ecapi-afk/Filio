import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getXeroContacts, ensureFreshAccessToken, type XeroContact } from '@/lib/xero/client'
import { createMagicCredentials } from '@/lib/magic/generator'

// POST /api/xero/import - Import selected Xero contacts
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get firm_id
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
    const body = await request.json()
    const { contactIds } = body as { contactIds: string[] }

    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json({ error: 'No contacts selected' }, { status: 400 })
    }

    // Verify Xero connection
    const tokens = await ensureFreshAccessToken(firmId)
    if (!tokens) {
      return NextResponse.json({ error: 'Not connected to Xero' }, { status: 400 })
    }

    // Get all Xero contacts
    const allContacts = await getXeroContacts(firmId)
    // Xero API returns uppercase field names: ContactID, Name, EmailAddress
    const contactsToImport = allContacts.filter(c => contactIds.includes(c.ContactID))

    console.log('[POST /api/xero/import] contactIds to import:', contactIds)
    console.log('[POST /api/xero/import] matching contacts:', contactsToImport.length)

    // Get existing clients to avoid duplicates
    const { data: existingClients } = await supabase
      .from('clients')
      .select('xero_contact_id')
      .eq('firm_id', firmId)
      .not('xero_contact_id', 'is', null)

    const existingContactIds = new Set(existingClients?.map(c => c.xero_contact_id) || [])

    // Use admin client to bypass RLS
    const supabaseAdmin = await createAdminClient()

    // ✅ Fetch firm-level global defaults to apply to each imported client
    const { data: firmDefaults } = await supabase
      .from('firms')
      .select('default_reminder_days, default_magic_email_sender_verified_only, default_client_language')
      .eq('id', firmId)
      .single()

    const defaultReminderDays = firmDefaults?.default_reminder_days ?? null
    const defaultMagicEmailVerifiedOnly = firmDefaults?.default_magic_email_sender_verified_only ?? false
    const defaultClientLanguage = firmDefaults?.default_client_language ?? null

    // Extract phone from Xero contact (DEFAULT > MOBILE > DDI > first available)
    const extractPhone = (phones: XeroContact['Phones']): string | null => {
      if (!phones || phones.length === 0) return null
      for (const type of ['DEFAULT', 'MOBILE', 'DDI']) {
        const found = phones.find(p => p.PhoneType === type && p.PhoneNumber?.trim())
        if (found) return found.PhoneNumber.trim()
      }
      const any = phones.find(p => p.PhoneNumber?.trim())
      return any ? any.PhoneNumber.trim() : null
    }

    let imported = 0
    let skipped = 0
    const errors: string[] = []

    for (const contact of contactsToImport) {
      // Skip if already imported
      if (existingContactIds.has(contact.ContactID)) {
        skipped++
        continue
      }

      const phone = extractPhone(contact.Phones)
      console.log('[POST /api/xero/import] Importing:', contact.Name, contact.EmailAddress, contact.ContactID)

      // Insert client using admin client to bypass RLS, applying firm global defaults
      const { data: insertedClient, error: clientError } = await supabaseAdmin
        .from('clients')
        .insert({
          firm_id: firmId,
          name: contact.Name,
          email: contact.EmailAddress,
          portal_email: contact.EmailAddress,
          xero_contact_id: contact.ContactID,
          xero_phone: phone,
          management_status: 'active',
          health_status: 'No Action',
          portal_status: 'Active',
          is_starred: false,
          xero_not_found: false,
          // ✅ Apply firm-level global defaults
          auto_reminders_enabled: true,
          reminder_days_before: defaultReminderDays,
          magic_email_verified_only: defaultMagicEmailVerifiedOnly,
        })
        .select('id')
        .single()

      if (clientError) {
        console.error('[POST /api/xero/import] Failed to import:', clientError)
        errors.push(`Failed to import ${contact.Name}: ${clientError.message}`)
      } else if (insertedClient) {
        // Create Magic Link (short_code) and Magic Email alias in proper tables
        const { shortCode, magicEmailAlias } = await createMagicCredentials(
          insertedClient.id,
          contact.Name,
          firmId
        )
        console.log('[POST /api/xero/import] Created magic credentials:', shortCode, magicEmailAlias)
        imported++
      }
    }


    // Audit log
    await supabase.from('audit_logs').insert({
      firm_id: firmId,
      actor: user.id,
      action: 'xero_contacts_imported',
      metadata: {
        imported,
        skipped,
        errors,
      },
    })

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (err) {
    console.error('Failed to import contacts:', err)
    return NextResponse.json({ error: 'Failed to import contacts' }, { status: 500 })
  }
}
