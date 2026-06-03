/**
 * Find clients with invalid/stale xero_contact_id
 * Run: npx tsx scripts/find-stale-contacts.ts
 */
import { createAdminClient } from '../lib/supabase/admin'
import { ensureFreshAccessToken } from '../lib/xero/client'

async function findStaleContacts() {
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

    console.log(`Clients with xero_contact_id: ${clients.length}`)

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

    console.log(`Xero contacts: ${xeroContacts.length}`)

    // Check each client's contact ID
    let validCount = 0
    let staleCount = 0

    for (const client of clients) {
      const xeroContact = xeroContactMap.get(client.xero_contact_id)

      if (xeroContact) {
        validCount++
      } else {
        staleCount++
        console.log(`\n✗ STALE: ${client.name} (${client.email})`)
        console.log(`  Stored ContactID: ${client.xero_contact_id}`)
        console.log(`  This ID does NOT exist in Xero!`)

        // Try to find a matching contact by name
        const similar = xeroContacts.find((c: any) =>
          c.Name?.toLowerCase().includes(client.name.toLowerCase().substring(0, 5))
        )
        if (similar) {
          console.log(`  ⚠️ Possible match in Xero: "${similar.Name}" (${similar.ContactID})`)
        }
      }
    }

    console.log(`\n--- Summary ---`)
    console.log(`Valid: ${validCount}`)
    console.log(`Stale: ${staleCount}`)

    if (staleCount > 0) {
      console.log('\n⚠️ These clients have invalid xero_contact_id!')
      console.log('Uploads for these clients will fail or fallback to Inbox.')
    }
  }
}

findStaleContacts().catch(console.error)
