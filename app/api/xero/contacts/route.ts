import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getXeroContacts, ensureFreshAccessToken } from '@/lib/xero/client'

export const dynamic = 'force-dynamic' // Disable caching for this route

// GET /api/xero/contacts - Get Xero contacts for selection
export async function GET() {
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
    // Verify we have Xero tokens
    const tokens = await ensureFreshAccessToken(firmId)
    if (!tokens) {
      console.error('GET /api/xero/contacts: No tokens available')
      return NextResponse.json({ error: 'Not connected to Xero - please reconnect' }, { status: 400 })
    }

    // Get contacts from Xero
    console.log('Fetching Xero contacts...')
    const contacts = await getXeroContacts(firmId)

    console.log('Xero contacts fetched:', contacts.length)
    if (contacts.length > 0) {
      console.log('First contact sample:', JSON.stringify(contacts[0]).substring(0, 200))
    }

    // Get existing clients to check which are already imported
    const { data: existingClients } = await supabase
      .from('clients')
      .select('xero_contact_id, name, email, portal_status')
      .eq('firm_id', firmId)
      .not('xero_contact_id', 'is', null)

    console.log('Existing clients with xero_contact_id:', existingClients?.length)

    const existingContactIds = new Set(existingClients?.map(c => c.xero_contact_id) || [])

    // Transform contacts to include import status
    // Xero API returns uppercase field names: ContactID, Name, EmailAddress, etc.
    const contactsWithStatus = contacts.map(contact => ({
      contactId: contact.ContactID,
      name: contact.Name,
      emailAddress: contact.EmailAddress,
      phones: contact.Phones,
      addresses: contact.Addresses,
      alreadyImported: existingContactIds.has(contact.ContactID),
    }))

    return NextResponse.json({
      contacts: contactsWithStatus,
      total: contacts.length,
      alreadyImported: contactsWithStatus.filter(c => c.alreadyImported).length,
    })
  } catch (err) {
    console.error('Failed to fetch Xero contacts:', err)
    return NextResponse.json({ error: 'Failed to fetch contacts', details: String(err) }, { status: 500 })
  }
}
