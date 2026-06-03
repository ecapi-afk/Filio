/**
 * Fix stale xero_contact_id values by matching with actual Xero contacts
 * Run: npx tsx scripts/fix-stale-contacts.ts
 */
import { createAdminClient } from '../lib/supabase/admin'
import { ensureFreshAccessToken } from '../lib/xero/client'

async function fixStaleContacts() {
  const supabase = await createAdminClient()

  // Get all connected firms
  const { data: firms } = await supabase
    .from('firms')
    .select('id, name, xero_org_name')
    .eq('xero_connection_status', 'connected')

  if (!firms || firms.length === 0) {
    console.error('No connected firm found')
    return
  }

  let totalFixed = 0

  for (const firm of firms) {
    console.log(`\n========== ${firm.name} (${firm.xero_org_name}) ==========`)

    const tokens = await ensureFreshAccessToken(firm.id)
    if (!tokens) {
      console.log('✗ Cannot get Xero access token')
      continue
    }

    // Get all clients with xero_contact_id for this firm
    const { data: clients } = await supabase
      .from('clients')
      .select('id, name, email, xero_contact_id')
      .eq('firm_id', firm.id)
      .not('xero_contact_id', 'is', null)

    if (!clients || clients.length === 0) {
      console.log('No clients with xero_contact_id')
      continue
    }

    // Fetch all Xero contacts
    const response = await fetch(
      'https://api.xero.com/api.xro/2.0/Contacts?page=1&includeArchived=false',
      {
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
          'xero-tenant-id': tokens.tenantId,
          'Accept': 'application/json'
        }
      }
    )

    if (!response.ok) {
      console.log(`✗ API Error: ${response.status}`)
      continue
    }

    const data = await response.json()
    const xeroContacts = data.Contacts || []
    const xeroContactMap = new Map(xeroContacts.map((c: any) => [c.ContactID, c]))

    console.log(`Clients with xero_contact_id: ${clients.length}`)
    console.log(`Xero contacts: ${xeroContacts.length}`)

    // Check each client's contact ID
    let fixedForFirm = 0

    for (const client of clients) {
      const xeroContact = xeroContactMap.get(client.xero_contact_id)

      if (xeroContact) {
        // Valid, no fix needed
        continue
      }

      // Stale contact ID - try to find by name
      const nameKey = client.name.toLowerCase().trim()
      const matchingContact = xeroContacts.find((c: any) =>
        c.Name?.toLowerCase().trim() === nameKey
      )

      if (matchingContact) {
        console.log(`\n🔧 Fixing: ${client.name}`)
        console.log(`  Old ContactID: ${client.xero_contact_id}`)
        console.log(`  New ContactID: ${matchingContact.ContactID}`)

        // Update the client's xero_contact_id
        const { error } = await supabase
          .from('clients')
          .update({ xero_contact_id: matchingContact.ContactID })
          .eq('id', client.id)

        if (error) {
          console.log(`  ✗ Failed to update: ${error.message}`)
        } else {
          console.log(`  ✓ Updated successfully`)
          fixedForFirm++
          totalFixed++
        }
      } else {
        console.log(`\n⚠️ Cannot fix: ${client.name}`)
        console.log(`  Stored ContactID: ${client.xero_contact_id}`)
        console.log(`  No matching contact found in Xero by name`)
      }
    }

    console.log(`\n--- Fixed ${fixedForFirm} contacts in this firm ---`)
  }

  console.log(`\n========== TOTAL FIXED: ${totalFixed} ==========`)
}

fixStaleContacts().catch(console.error)
