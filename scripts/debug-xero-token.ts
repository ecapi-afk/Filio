/**
 * Debug token and tenant configuration
 * Run: npx tsx scripts/debug-xero-token.ts
 */
import { createAdminClient } from '../lib/supabase/admin'
import { getXeroOrganizations, getXeroTokens, ensureFreshAccessToken } from '../lib/xero/client'
import { decryptToken } from '../lib/xero/crypto'

async function debugToken() {
  const supabase = await createAdminClient()

  // Get first connected firm
  const { data: firms } = await supabase
    .from('firms')
    .select('id, name, xero_tokens_encrypted, xero_org_name')
    .eq('xero_connection_status', 'connected')
    .limit(1)

  if (!firms || firms.length === 0) {
    console.error('No connected firm found')
    return
  }

  const firm = firms[0]
  console.log(`\nFirm: ${firm.name} (${firm.id})`)
  console.log(`Xero Org Name: ${firm.xero_org_name}`)

  // Decrypt and show stored tokens (without exposing actual values)
  if (firm.xero_tokens_encrypted) {
    try {
      const decrypted = JSON.parse(decryptToken(firm.xero_tokens_encrypted))
      console.log('\n--- Stored Token Info ---')
      console.log(`Access Token exists: ${!!decrypted.accessToken}`)
      console.log(`Refresh Token exists: ${!!decrypted.refreshToken}`)
      console.log(`Expires at: ${decrypted.expiresAt}`)
      console.log(`Tenant ID: ${decrypted.tenantId}`)
      console.log(`Token age: ${Date.now() - new Date(decrypted.expiresAt).getTime()}ms from expiry`)
    } catch (e) {
      console.error('Failed to decrypt tokens:', e)
    }
  } else {
    console.log('\nNo encrypted tokens stored')
  }

  // Check organizations
  console.log('\n--- Xero Organizations ---')
  const orgs = await getXeroOrganizations(firm.id)
  console.log(`Found ${orgs.length} organization(s):`)
  for (const org of orgs) {
    console.log(`  - ${org.tenantName} (${org.tenantId})`)
  }

  // Get fresh token
  console.log('\n--- Fresh Token Check ---')
  const tokens = await getXeroTokens(firm.id)
  if (tokens) {
    console.log(`Access Token exists: ${!!tokens.accessToken}`)
    console.log(`Tenant ID from getXeroTokens: ${tokens.tenantId}`)
    console.log(`Expires at: ${tokens.expiresAt}`)
    console.log(`Needs refresh: ${Date.now() >= tokens.expiresAt.getTime() - 5 * 60 * 1000}`)
  } else {
    console.log('No tokens available from getXeroTokens')
  }

  // Try ensureFreshAccessToken
  console.log('\n--- ensureFreshAccessToken ---')
  const freshTokens = await ensureFreshAccessToken(firm.id)
  if (freshTokens) {
    console.log(`Access Token exists: ${!!freshTokens.accessToken}`)
    console.log(`Tenant ID: ${freshTokens.tenantId}`)
    console.log(`Expires at: ${freshTokens.expiresAt}`)
  } else {
    console.log('ensureFreshAccessToken returned null')
  }

  // Try to list contacts
  console.log('\n--- Test API Call (List Contacts) ---')
  const response = await fetch(
    'https://api.xero.com/api.xro/2.0/Contacts?page=1&includeArchived=false',
    {
      headers: {
        'Authorization': `Bearer ${freshTokens?.accessToken}`,
        'xero-tenant-id': freshTokens?.tenantId,
        'Accept': 'application/json'
      }
    }
  )
  console.log(`Status: ${response.status}`)
  const data = await response.json()
  if (response.ok) {
    console.log(`Contacts returned: ${data.Contacts?.length || 0}`)
    if (data.Contacts?.length > 0) {
      console.log('First contact:', JSON.stringify(data.Contacts[0]).substring(0, 200))
    }
  } else {
    console.log('Error:', JSON.stringify(data).substring(0, 300))
  }
}

debugToken().catch(console.error)
