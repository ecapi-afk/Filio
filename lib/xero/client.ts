import { decryptToken, encryptToken } from './crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Firm } from '@/lib/supabase/types'

// Xero API scopes - read-only + offline + attachments write
const XERO_SCOPES = [
  'openid',
  'profile',
  'email',
  'accounting.settings.read',
  'accounting.contacts',
  'accounting.attachments',
  'files',
  'offline_access',
].join(' ')

export function getXeroAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.XERO_CLIENT_ID!,
    redirect_uri: process.env.XERO_REDIRECT_URI!,
    scope: XERO_SCOPES,
    state,
  })

  return `https://login.xero.com/identity/connect/authorize?${params.toString()}`
}

export interface XeroTokens {
  accessToken: string
  refreshToken: string
  expiresAt: Date
  tenantId: string
}

export async function getXeroTokens(firmId: string): Promise<XeroTokens | null> {
  const supabase = await createAdminClient()

  const { data: firm } = await supabase
    .from('firms')
    .select('xero_tokens_encrypted, xero_refresh_token_expires_at')
    .eq('id', firmId)
    .single()

  if (!firm?.xero_tokens_encrypted) {
    return null
  }

  try {
    const decrypted = JSON.parse(decryptToken(firm.xero_tokens_encrypted))
    return {
      accessToken: decrypted.accessToken,
      refreshToken: decrypted.refreshToken,
      expiresAt: new Date(decrypted.expiresAt),
      tenantId: decrypted.tenantId,
    }
  } catch (error) {
    console.error('Failed to decrypt Xero tokens:', error)
    return null
  }
}

export async function saveXeroTokens(
  firmId: string,
  tokens: XeroTokens
): Promise<void> {
  const supabase = await createAdminClient()

  const encrypted = encryptToken(
    JSON.stringify({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt.toISOString(),
      tenantId: tokens.tenantId,
    })
  )

  // Refresh token expires in 60 days by default
  const refreshExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)

  const { error } = await supabase
    .from('firms')
    .update({
      xero_tokens_encrypted: encrypted,
      xero_refresh_token_expires_at: refreshExpiresAt.toISOString(),
    })
    .eq('id', firmId)

  if (error) {
    console.error('Failed to save Xero tokens:', error)
    throw new Error('Failed to save Xero tokens: ' + error.message)
  }
}

// Check if token needs refresh (5 minute buffer)
function needsRefresh(expiresAt: Date): boolean {
  const bufferMs = 5 * 60 * 1000 // 5 minutes
  return Date.now() >= expiresAt.getTime() - bufferMs
}

// Auto-refresh token if needed
export async function ensureFreshAccessToken(firmId: string): Promise<XeroTokens | null> {
  const tokens = await getXeroTokens(firmId)

  if (!tokens) {
    console.error('ensureFreshAccessToken: No tokens found for firmId')
    return null
  }

  // Check if we need to refresh
  if (!needsRefresh(tokens.expiresAt)) {
    return tokens
  }

  // Refresh the token
  try {
    const response = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`
        ).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokens.refreshToken,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Xero token refresh failed:', response.status, errorText)
      return null
    }

    const data = await response.json()

    const newTokens: XeroTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      tenantId: tokens.tenantId,
    }

    // Save the new tokens
    await saveXeroTokens(firmId, newTokens)

    return newTokens
  } catch (error) {
    console.error('Failed to refresh Xero token:', error)
    return null
  }
}

// Make authenticated Xero API request
export async function xeroRequest<T>(
  firmId: string,
  path: string,
  options: RequestInit = {}
): Promise<T | null> {
  const tokens = await ensureFreshAccessToken(firmId)

  if (!tokens) {
    console.error('xeroRequest: No tokens available')
    return null
  }

  const baseUrl = 'https://api.xero.com/api.xro/2.0'
  const url = `${baseUrl}${path}`

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${tokens.accessToken}`,
      'xero-tenant-id': tokens.tenantId,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Xero API error:', response.status, error.substring(0, 500))
    return null
  }

  // Check content-type before parsing
  const contentType = response.headers.get('content-type')
  if (!contentType || !contentType.includes('application/json')) {
    const body = await response.text()
    console.error('Xero API non-JSON response:', response.status, '| content-type:', contentType, '| body:', body.substring(0, 1000))
    return null
  }

  return response.json()
}

// Xero Organization info
export interface XeroOrganization {
  tenantId: string
  tenantName: string
  createdDateUtc: string
}

// Get Xero organizations (tenants)
export async function getXeroOrganizations(firmId: string): Promise<XeroOrganization[]> {
  const tokens = await ensureFreshAccessToken(firmId)
  if (!tokens) return []

  const response = await fetch('https://api.xero.com/connections', {
    headers: {
      Authorization: `Bearer ${tokens.accessToken}`,
    },
  })

  if (!response.ok) {
    console.error('Failed to get Xero connections')
    return []
  }

  return response.json()
}

// Xero Contact type (API returns uppercase field names)
export interface XeroContact {
  ContactID: string
  Name: string
  EmailAddress: string | null
  Phones: Array<{ PhoneType: string; PhoneNumber: string }>
  Addresses: Array<{ AddressType: string; City?: string; Country?: string }>
}

// Get contacts from Xero
export async function getXeroContacts(firmId: string): Promise<XeroContact[]> {
  const response = await xeroRequest<{ Contacts: XeroContact[] }>(
    firmId,
    '/Contacts?page=1&includeArchived=false'
  )

  return response?.Contacts || []
}

// Extract a usable phone number from Xero contact (DEFAULT > MOBILE > first available)
function extractXeroPhone(phones: XeroContact['Phones']): string | null {
  if (!phones || phones.length === 0) return null
  const priority = ['DEFAULT', 'MOBILE', 'DDI']
  for (const type of priority) {
    const found = phones.find(p => p.PhoneType === type && p.PhoneNumber?.trim())
    if (found) return found.PhoneNumber.trim()
  }
  const any = phones.find(p => p.PhoneNumber?.trim())
  return any ? any.PhoneNumber.trim() : null
}

// Sync Xero contacts to Filio clients
export async function syncXeroContacts(firmId: string): Promise<{
  added: number
  updated: number
  errors: string[]
}> {
  const contacts = await getXeroContacts(firmId)
  const supabase = await createClient()

  let added = 0
  let updated = 0
  const errors: string[] = []

  for (const contact of contacts) {
    try {
      const phone = extractXeroPhone(contact.Phones)

      // Check if contact already exists (Xero API uses PascalCase field names)
      const { data: existing } = await supabase
        .from('clients')
        .select('id, xero_contact_id')
        .eq('firm_id', firmId)
        .eq('xero_contact_id', contact.ContactID)
        .single()

      if (existing) {
        // Update existing client
        const { error } = await supabase
          .from('clients')
          .update({
            name: contact.Name,
            email: contact.EmailAddress,
            xero_phone: phone,
          })
          .eq('id', existing.id)

        if (error) {
          errors.push(`Failed to update ${contact.Name}: ${error.message}`)
        } else {
          updated++
        }
      } else {
        // Create new client
        const { error } = await supabase
          .from('clients')
          .insert({
            firm_id: firmId,
            name: contact.Name,
            email: contact.EmailAddress,
            xero_contact_id: contact.ContactID,
            xero_phone: phone,
            management_status: 'active',
            health_status: 'No Action',
            portal_status: 'Active',
            is_starred: false,
            xero_not_found: false,
          })

        if (error) {
          errors.push(`Failed to add ${contact.Name}: ${error.message}`)
        } else {
          added++
        }
      }
    } catch (err) {
      errors.push(`Error processing ${contact.Name}: ${err}`)
    }
  }

  return { added, updated, errors }
}

// Upload file to Xero Inbox
export async function uploadToXeroInbox(
  firmId: string,
  fileName: string,
  mimeType: string,
  fileBuffer: ArrayBuffer | Buffer | Uint8Array
): Promise<{ success: boolean; fileId?: string; error?: string }> {
  try {
    const tokens = await ensureFreshAccessToken(firmId)
    if (!tokens) {
      return { success: false, error: 'Xero not connected or token expired' }
    }

    // 1. Get Inbox folder
    const inboxRes = await fetch('https://api.xero.com/files.xro/1.0/Inbox', {
      headers: {
        'Authorization': `Bearer ${tokens.accessToken}`,
        'xero-tenant-id': tokens.tenantId,
        'Accept': 'application/json'
      }
    })
    
    if (!inboxRes.ok) {
      const err = await inboxRes.text()
      console.error('Failed to get Xero Inbox:', err)
      return { success: false, error: 'Failed to access Xero Inbox' }
    }
    
    const inbox = await inboxRes.json()
    const inboxId = inbox.Id || inbox.id
    
    if (!inboxId) {
      return { success: false, error: 'Inbox folder ID not found' }
    }

    // 2. Upload file to Inbox
    const url = `https://api.xero.com/files.xro/1.0/Files/${encodeURIComponent(inboxId)}`
    
    // We construct a multipart/form-data payload. Xero expects the form field name to be the filename.
    const formData = new FormData()
    formData.append(fileName, new Blob([fileBuffer as BlobPart], { type: mimeType }), fileName)

    const uploadRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokens.accessToken}`,
        'xero-tenant-id': tokens.tenantId,
        'Accept': 'application/json'
      },
      body: formData
    })

    if (!uploadRes.ok) {
      const errText = await uploadRes.text()
      console.error('Xero Upload Failed:', errText)
      return { success: false, error: 'Xero upload rejected' }
    }

    const uploadedData = await uploadRes.json()
    return { success: true, fileId: uploadedData.Id || uploadedData.id }
  } catch (err: any) {
    console.error('uploadToXeroInbox exception:', err)
    return { success: false, error: err.message || 'Exception uploading to Xero' }
  }
}

// Upload file as an attachment to a Xero Contact
export async function uploadToXeroContactAttachment(
  firmId: string,
  contactId: string,
  fileName: string,
  mimeType: string,
  fileBuffer: ArrayBuffer | Buffer | Uint8Array
): Promise<{ success: boolean; fileId?: string; error?: string }> {
  try {
    const tokens = await ensureFreshAccessToken(firmId)
    if (!tokens) {
      return { success: false, error: 'Xero not connected or token expired' }
    }

    const url = `https://api.xero.com/api.xro/2.0/Contacts/${encodeURIComponent(contactId)}/Attachments/${encodeURIComponent(fileName)}`

    // Xero Accounting API attachments expect raw binary body
    const uploadRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokens.accessToken}`,
        'xero-tenant-id': tokens.tenantId,
        'Content-Type': mimeType,
        'Accept': 'application/json'
      },
      body: fileBuffer as BodyInit
    })

    if (!uploadRes.ok) {
      const errText = await uploadRes.text()
      console.error('Xero Contact Attachment Failed:', {
        status: uploadRes.status,
        statusText: uploadRes.statusText,
        error: errText
      })
      // Try to parse JSON error for more details
      let errorDetail = 'Xero attachment rejected'
      try {
        const errJson = JSON.parse(errText)
        if (errJson.Message) errorDetail = errJson.Message
        if (errJson.Errors?.[0]?.message) errorDetail = errJson.Errors[0].message
      } catch {}
      return { success: false, error: errorDetail }
    }

    const uploadedData = await uploadRes.json()
    // Accounting API returns Attachments array. Grab the ID from the response.
    const attachmentId = uploadedData.Attachments?.[0]?.AttachmentID || uploadedData.Id || uploadedData.id
    return { success: true, fileId: attachmentId }
  } catch (err: any) {
    console.error('uploadToXeroContactAttachment exception:', err)
    return { success: false, error: err.message || 'Exception uploading to Xero Contact' }
  }
}

