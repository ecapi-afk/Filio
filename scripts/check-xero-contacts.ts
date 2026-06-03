/**
 * Diagnostic script to check if stored Xero contact IDs are valid in Xero
 * Run: npx tsx scripts/check-xero-contacts.ts
 */
import { createAdminClient } from '../lib/supabase/admin'
import { getXeroContacts, ensureFreshAccessToken } from '../lib/xero/client'

async function checkXeroContacts() {
  const supabase = await createAdminClient()

  // Get all firms with Xero connection info
  const { data: firms } = await supabase
    .from('firms')
    .select('id, name, xero_org_name, xero_connection_status, xero_tenant_id')
    .limit(5)

  if (!firms || firms.length === 0) {
    console.error('No firms found')
    return
  }

  console.log(`\nFirms found: ${firms.length}`)
  for (const firm of firms) {
    console.log(`- ${firm.name} (${firm.id})`)
    console.log(`  Status: ${firm.xero_connection_status}, Org: ${firm.xero_org_name}`)
  }

  // Find the first connected firm
  const firm = firms.find(f => f.xero_connection_status === 'connected') || firms[0]

  if (!firm) {
    console.error('No connected firm found')
    return
  }

  console.log(`\nChecking firm: ${firm.name} (${firm.id})`)
  console.log(`Xero org: ${firm.xero_org_name}`)

  // Get all clients with xero_contact_id
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, xero_contact_id')
    .eq('firm_id', firm.id)
    .not('xero_contact_id', 'is', null)

  if (!clients || clients.length === 0) {
    console.log('No clients with xero_contact_id found')
    return
  }

  console.log(`\nFound ${clients.length} clients with xero_contact_id`)

  // Get fresh token
  const tokens = await ensureFreshAccessToken(firm.id)
  if (!tokens) {
    console.error('Cannot get Xero access token')
    return
  }

  // Fetch all Xero contacts
  const xeroContacts = await getXeroContacts(firm.id)
  const xeroContactIds = new Set(xeroContacts.map(c => c.ContactID))

  console.log(`Xero has ${xeroContacts.length} contacts`)

  // Check each stored contact ID
  console.log('\n--- Contact ID Validation ---')
  let validCount = 0
  let invalidCount = 0

  for (const client of clients) {
    const isValid = xeroContactIds.has(client.xero_contact_id)
    const status = isValid ? '✓ VALID' : '✗ INVALID'
    console.log(`${status}: ${client.name}`)
    console.log(`  ContactID: ${client.xero_contact_id}`)

    if (!isValid) {
      invalidCount++
      // Find the contact in Xero to see if maybe the ID changed
      const similar = xeroContacts.find(c =>
        c.Name.toLowerCase().includes(client.name.toLowerCase().substring(0, 5)) ||
        (c.EmailAddress && client.email && c.EmailAddress.toLowerCase() === client.email?.toLowerCase())
      )
      if (similar) {
        console.log(`  ⚠️ Possible match in Xero: "${similar.Name}" (${similar.ContactID})`)
      }
    } else {
      validCount++
    }
  }

  console.log(`\n--- Summary ---`)
  console.log(`Valid: ${validCount}`)
  console.log(`Invalid/Missing: ${invalidCount}`)

  if (invalidCount > 0) {
    console.log('\n⚠️ Some contacts no longer exist in Xero!')
    console.log('This explains why uploads to these contacts fail.')
    console.log('The upload will fall back to Inbox (Files API).')
  }
}

checkXeroContacts().catch(console.error)
