/**
 * Debug script to verify a specific Xero contact ID
 * Run: npx tsx scripts/verify-xero-contact.ts
 */
import { createAdminClient } from '../lib/supabase/admin'
import { xeroRequest } from '../lib/xero/client'
import { ensureFreshAccessToken } from '../lib/xero/client'

async function verifyContact() {
  const supabase = await createAdminClient()

  // The contact ID to verify
  const CONTACT_ID = 'a4b680d47014de57fbbcbef2c3007b438c069cde19f5298938'

  // Get all connected firms
  const { data: firms } = await supabase
    .from('firms')
    .select('id, name, xero_org_name')
    .eq('xero_connection_status', 'connected')

  if (!firms || firms.length === 0) {
    console.error('No connected firm found')
    return
  }

  console.log(`\nFound ${firms.length} connected firm(s)`)
  for (const firm of firms) {
    console.log(`- ${firm.name} (${firm.id}), Org: ${firm.xero_org_name}`)
  }

  // Iterate through all firms to find the right one
  for (const firm of firms) {
    console.log(`\n========== Checking Firm: ${firm.name} (${firm.id}) ==========`)

    // Get fresh token
    const tokens = await ensureFreshAccessToken(firm.id)
    if (!tokens) {
      console.log('✗ Cannot get Xero access token for this firm')
      continue
    }

    console.log(`Tenant ID: ${tokens.tenantId}`)
    console.log(`\n--- Checking Contact ID: ${CONTACT_ID} ---`)

    // Try to get the contact directly from Xero
    try {
      // Method 1: Use xeroRequest helper
      const contact = await xeroRequest<any>(
        firm.id,
        `/Contacts/${CONTACT_ID}`
      )

      if (contact) {
        console.log('\n✓ Contact found in Xero:')
        console.log(`  Name: ${contact.Name}`)
        console.log(`  ContactID: ${contact.ContactID}`)
        console.log(`  Email: ${contact.EmailAddress}`)
        console.log(`  AccountNumber: ${contact.AccountNumber}`)
        console.log(`  ContactStatus: ${contact.ContactStatus}`)
      } else {
        console.log('\n✗ Contact NOT found via xeroRequest (null response)')
      }
    } catch (err) {
      console.error('Error fetching contact:', err)
    }

    // Method 2: Direct fetch to see raw response
    console.log('\n--- Direct API fetch ---')
    const response = await fetch(
      `https://api.xero.com/api.xro/2.0/Contacts/${CONTACT_ID}`,
      {
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
          'xero-tenant-id': tokens.tenantId,
          'Accept': 'application/json'
        }
      }
    )

    console.log(`Status: ${response.status}`)
    if (!response.ok) {
      const text = await response.text()
      console.log(`Response: ${text.substring(0, 300)}`)
    } else {
      const data = await response.json()
      console.log(`Contact: ${JSON.stringify(data)?.substring(0, 200)}`)
    }

    // Check if contact exists in our database
    console.log('\n--- Database Check ---')
    const { data: clients } = await supabase
      .from('clients')
      .select('id, name, email, xero_contact_id')
      .eq('xero_contact_id', CONTACT_ID)
      .eq('firm_id', firm.id)

    if (clients && clients.length > 0) {
      console.log('\n✓ Contact ID found in Filio database:')
      for (const client of clients) {
        console.log(`  Client: ${client.name} (${client.email})`)
        console.log(`  xero_contact_id: ${client.xero_contact_id}`)
      }
    } else {
      console.log('\n✗ Contact ID NOT found in Filio database for this firm')
    }
  }
}

verifyContact().catch(console.error)
