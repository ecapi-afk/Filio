import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getXeroContacts, ensureFreshAccessToken } from '@/lib/xero/client'

export const dynamic = 'force-dynamic'

// GET /api/debug/contact-ids - Debug stored Xero contact IDs
export async function GET() {
  const supabase = await createAdminClient()

  // Get all firms with Xero connection
  const { data: firms } = await supabase
    .from('firms')
    .select('id, name, xero_connection_status')
    .eq('xero_connection_status', 'connected')
    .limit(1)

  if (!firms || firms.length === 0) {
    return NextResponse.json({ error: 'No connected firms found' })
  }

  const firm = firms[0]

  // Get fresh token
  const tokens = await ensureFreshAccessToken(firm.id)
  if (!tokens) {
    return NextResponse.json({ error: 'Cannot get Xero access token' })
  }

  // Get Xero contacts
  const xeroContacts = await getXeroContacts(firm.id)
  const xeroContactIds = new Set(xeroContacts.map(c => c.ContactID))

  // Get clients with xero_contact_id
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, email, xero_contact_id')
    .eq('firm_id', firm.id)
    .not('xero_contact_id', 'is', null)

  if (!clients || clients.length === 0) {
    return NextResponse.json({
      firm: firm.name,
      xeroContactsCount: xeroContacts.length,
      storedContactsCount: 0,
      validContacts: [],
      invalidContacts: []
    })
  }

  // Check each stored contact ID against Xero
  const validContacts: Array<{ name: string; email: string | null; contactId: string }> = []
  const invalidContacts: Array<{ name: string; email: string | null; contactId: string }> = []

  for (const client of clients) {
    if (xeroContactIds.has(client.xero_contact_id)) {
      validContacts.push({
        name: client.name,
        email: client.email,
        contactId: client.xero_contact_id
      })
    } else {
      invalidContacts.push({
        name: client.name,
        email: client.email,
        contactId: client.xero_contact_id
      })
    }
  }

  return NextResponse.json({
    firm: firm.name,
    xeroContactsCount: xeroContacts.length,
    storedContactsCount: clients.length,
    validContacts,
    invalidContacts,
    summary: {
      valid: validContacts.length,
      invalid: invalidContacts.length,
      invalidPercent: Math.round((invalidContacts.length / clients.length) * 100)
    }
  })
}
