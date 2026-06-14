/**
 * Magic Link Short Code Generator
 * Base62 encoding (0-9, a-z, A-Z) for URL-safe 6-character codes
 * Includes collision detection and recursive retry logic
 */

import { createAdminClient } from "@/lib/supabase/admin"

const CHARSET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
const SHORT_CODE_LENGTH = 6
const MAX_ATTEMPTS = 5

function getRandomBytes(length: number): Uint8Array {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    return crypto.getRandomValues(new Uint8Array(length))
  }
  // Fallback for Node.js if global crypto is missing
  const nodeCrypto = require("crypto")
  return new Uint8Array(nodeCrypto.randomBytes(length))
}

/**
 * Generate a cryptographically random Base62 string
 */
function generateBase62(length: number): string {
  const randomBytes = getRandomBytes(length)
  let result = ""
  for (let i = 0; i < length; i++) {
    result += CHARSET[randomBytes[i] % CHARSET.length]
  }
  return result
}

/**
 * Check if a short code already exists in short_links or portal_tokens
 */
async function shortCodeExists(shortCode: string): Promise<boolean> {
  const supabase = await createAdminClient()

  // Check short_links table
  const { data: linkData } = await supabase
    .from("short_links")
    .select("id")
    .eq("short_code", shortCode)
    .eq("is_active", true)
    .maybeSingle()

  if (linkData) return true

  // Also check portal_tokens for legacy compatibility
  const { data: tokenData } = await supabase
    .from("portal_tokens")
    .select("id")
    .eq("short_code", shortCode)
    .maybeSingle()

  return !!tokenData
}

/**
 * Generate a unique short code with collision retry
 * Returns null if unable to generate after MAX_ATTEMPTS
 */
export async function generateUniqueShortCode(): Promise<string | null> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = generateBase62(SHORT_CODE_LENGTH)
    const exists = await shortCodeExists(candidate)

    if (!exists) {
      return candidate
    }

    console.warn(`Short code collision detected: ${candidate}, retry ${attempt + 1}/${MAX_ATTEMPTS}`)
  }

  console.error("Failed to generate unique short code after 5 attempts")
  return null
}

/**
 * Generate magic email stable alias
 * Format: [NamePrefix]-[6-char hex]
 * Cleans name: removes special chars, lowercase, max 10 chars
 */
function generateHexSuffix(): string {
  const randomBytes = getRandomBytes(3)
  return Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

/**
 * Clean client name for use in alias
 * - Lowercase
 * - Remove special characters
 * - Max 10 characters
 * - Remove trailing hyphens
 */
function cleanNameForAlias(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 10)
    .replace(/-$/, "")
}

/**
 * Generate a magic email alias for a client
 * Format: "Eric-279ec7@send.filio.uk"
 */
export function generateMagicEmailAlias(clientName: string): string {
  const prefix = cleanNameForAlias(clientName)
  const hexSuffix = generateHexSuffix()
  return `${prefix}-${hexSuffix}`
}

/**
 * Check if an alias already exists
 */
async function aliasExists(alias: string): Promise<boolean> {
  const supabase = await createAdminClient()

  const { data } = await supabase
    .from("magic_email_aliases")
    .select("id")
    .eq("alias", alias)
    .eq("is_active", true)
    .maybeSingle()

  return !!data
}

/**
 * Generate a unique magic email alias with collision retry
 */
export async function generateUniqueMagicEmailAlias(
  clientName: string
): Promise<string | null> {
  const prefix = cleanNameForAlias(clientName)

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const hexSuffix = generateHexSuffix()
    const candidate = `${prefix}-${hexSuffix}`
    const exists = await aliasExists(candidate)

    if (!exists) {
      return candidate
    }

    console.warn(
      `Magic email alias collision: ${candidate}, retry ${attempt + 1}/${MAX_ATTEMPTS}`
    )
  }

  return null
}

/**
 * Check if a firm has an active Pro (professional or firm) subscription
 */
async function firmHasProSubscription(firmId: string): Promise<boolean> {
  const supabase = await createAdminClient()

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("firm_id", firmId)
    .eq("status", "active")
    .single()

  if (!subscription) return false
  return subscription.plan === "professional" || subscription.plan === "firm"
}

/**
 * Create both short_code and magic email alias for a new client
 *
 * Creates:
 * 1. portal_tokens entry with token + expires_at + short_code (for /portal/[token] and /m/[short_code])
 * 2. short_links entry for tracking short code clicks
 * 3. magic_email_aliases entry (for Magic Email forwarding) - only if firm has Pro subscription
 */
export async function createMagicCredentials(
  clientId: string,
  clientName: string,
  firmId?: string
): Promise<{
  shortCode: string | null
  magicEmailAlias: string | null
}> {
  const supabase = await createAdminClient()

  // Generate short code
  const shortCode = await generateUniqueShortCode()
  if (!shortCode) {
    return { shortCode: null, magicEmailAlias: null }
  }

  // Generate portal token (32 bytes hex) using our safe randomBytes generator
  const tokenBytes = getRandomBytes(32)
  const token = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('')
  const expiresAt = new Date('2099-12-31T23:59:59Z').toISOString()

  // Create portal token with all required fields
  const { data: portalToken, error: tokenError } = await supabase
    .from("portal_tokens")
    .insert({
      client_id: clientId,
      token: token,
      expires_at: expiresAt,
      short_code: shortCode,
    })
    .select("id")
    .single()

  if (tokenError) {
    console.error("Failed to create portal token:", tokenError)
    return { shortCode: null, magicEmailAlias: null }
  }

  // Create short link entry for tracking
  const { error: shortLinkError } = await supabase.from("short_links").insert({
    client_id: clientId,
    portal_token_id: portalToken.id,
    short_code: shortCode,
    is_active: true,
  })

  if (shortLinkError) {
    console.error("Failed to create short link:", shortLinkError)
  }

  // Check if firm has Pro subscription before creating magic email alias
  let alias: string | null = null
  if (firmId) {
    const hasPro = await firmHasProSubscription(firmId)
    if (hasPro) {
      alias = await generateUniqueMagicEmailAlias(clientName)
      if (alias) {
        const { error: aliasError } = await supabase
          .from("magic_email_aliases")
          .insert({
            client_id: clientId,
            alias: alias,
            email_address: `${alias}@send.filio.uk`,
          })

        if (aliasError) {
          console.error("Failed to create magic email alias:", aliasError)
          alias = null
        }
      }
    }
  }

  // ✅ Sync portal_token and magic_email_slug onto the clients row so the detail page can read them
  const { error: clientUpdateError } = await supabase
    .from("clients")
    .update({
      portal_token: token,
      magic_email_slug: alias ? `${alias}@send.filio.uk` : null,
    })
    .eq("id", clientId)

  if (clientUpdateError) {
    console.error("Failed to sync magic credentials to client row:", clientUpdateError)
  }

  return { shortCode, magicEmailAlias: alias }
}

/**
 * Regenerate only the short code (keeps magic email the same)
 * Creates a new portal_token with new short_code and a new short_links entry
 */
export async function regenerateShortCode(
  clientId: string
): Promise<string | null> {
  const supabase = await createAdminClient()

  // Generate new short code
  const newShortCode = await generateUniqueShortCode()
  if (!newShortCode) {
    return null
  }

  // Generate new portal token using our safe randomBytes generator
  const tokenBytes = getRandomBytes(32)
  const token = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('')
  const expiresAt = new Date('2099-12-31T23:59:59Z').toISOString()

  // Create new portal token with all required fields
  const { data: portalToken, error: tokenError } = await supabase
    .from("portal_tokens")
    .insert({
      client_id: clientId,
      token: token,
      expires_at: expiresAt,
      short_code: newShortCode,
    })
    .select("id")
    .single()

  if (tokenError) {
    console.error("Failed to create portal token:", tokenError)
    return null
  }

  // Deactivate all existing short links for this client
  await supabase
    .from("short_links")
    .update({ is_active: false })
    .eq("client_id", clientId)

  // Create new short link entry
  const { error: shortLinkError } = await supabase.from("short_links").insert({
    client_id: clientId,
    portal_token_id: portalToken.id,
    short_code: newShortCode,
    is_active: true,
  })

  if (shortLinkError) {
    console.error("Failed to create short link:", shortLinkError)
  }

  // ✅ Sync updated portal_token onto the clients row
  await supabase
    .from("clients")
    .update({ portal_token: token })
    .eq("id", clientId)

  return newShortCode
}

/**
 * Regenerate only the magic email alias (keeps short code the same)
 */
export async function regenerateMagicEmailAlias(
  clientId: string
): Promise<string | null> {
  const supabase = await createAdminClient()

  // Deactivate existing alias
  await supabase
    .from("magic_email_aliases")
    .update({ is_active: false, regenerated_at: new Date().toISOString() })
    .eq("client_id", clientId)
    .eq("is_active", true)

  // Get client name for new alias
  const { data: client } = await supabase
    .from("clients")
    .select("name")
    .eq("id", clientId)
    .single()

  if (!client) {
    return null
  }

  // Generate new alias
  const newAlias = await generateUniqueMagicEmailAlias(client.name)
  if (!newAlias) {
    return null
  }

  // Get previous alias for audit trail
  const { data: prevAlias } = await supabase
    .from("magic_email_aliases")
    .select("alias")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  // Create new alias record
  const { error } = await supabase.from("magic_email_aliases").insert({
    client_id: clientId,
    alias: newAlias,
    email_address: `${newAlias}@send.filio.uk`,
    previous_alias: prevAlias?.alias,
  })

  if (error) {
    console.error("Failed to create new magic email alias:", error)
    return null
  }

  // ✅ Sync magic_email_slug onto the clients row so the detail page can read it
  await supabase
    .from("clients")
    .update({ magic_email_slug: `${newAlias}@send.filio.uk` })
    .eq("id", clientId)

  return newAlias
}
