/**
 * Search for a specific contact by name in Xero
 * Run: npx tsx scripts/search-xero-contact.ts
 */
import { createAdminClient } from '../lib/supabase/admin'
import { ensureFreshAccessToken } from '../lib/xero/client'

async function searchContact() {
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

  console.log(`\nFound ${firms.length} connected firm(s)\n`)

  for (const firm of firms) {
    console.log(`========== ${firm.name} (${firm.xero_org_name}) ==========`)

    const tokens = await ensureFreshAccessToken(firm.id)
    if (!tokens) {
      console.log('✗ Cannot get Xero access token\n')
      continue
    }

    // Fetch all contacts
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
      console.log(`✗ API Error: ${response.status}\n`)
      continue
    }

    const data = await response.json()
    const contacts = data.Contacts || []

    console.log(`Total contacts: ${contacts.length}`)

    // Search for Eric Zhang or similar
    const searchTerms = ['eric', 'zhang', 'Eric', 'Zhang']
    const matchingContacts = contacts.filter((c: any) =>
      searchTerms.some(term => c.Name?.toLowerCase().includes(term))
    )

    if (matchingContacts.length > 0) {
      console.log(`\nFound ${matchingContacts.length} matching contact(s):`)
      for (const contact of matchingContacts) {
        console.log(`\n  Name: ${contact.Name}`)
        console.log(`  ContactID: ${contact.ContactID}`)
        console.log(`  Email: ${contact.EmailAddress}`)
        console.log(`  Status: ${contact.ContactStatus}`)
      }
    } else {
      console.log('\nNo contacts matching "Eric" or "Zhang" found')
    }

    // Also check the specific contact ID
    const specificId = 'a4b680d47014de57fbbcbef2c3007b438c069cde19f5298938'
    const foundById = contacts.find((c: any) => c.ContactID === specificId)
    if (foundById) {
      console.log(`\n✓ Found specific ContactID ${specificId}:`)
      console.log(`  Name: ${foundById.Name}`)
    } else {
      console.log(`\n✗ ContactID ${specificId} NOT found in Xero`)
    }

    console.log('')
  }
}

searchContact().catch(console.error)
