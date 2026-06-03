/**
 * Supabase Edge Function: process-magic-email
 *
 * Receives Postmark inbound email webhooks and processes attachments
 * for clients who have a magic email alias (*@send.filio.uk).
 *
 * Postmark webhook URL format:
 *   https://<project>.supabase.co/functions/v1/process-magic-email?key=<WEBHOOK_KEY>
 *
 * The ?key= param must match the POSTMARK_INBOUND_TOKEN secret set in Supabase.
 *
 * Postmark inbound payload reference:
 *   https://postmarkapp.com/developer/webhooks/inbound-webhook
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PostmarkAttachment {
  Name: string
  Content: string        // base64
  ContentType: string
  ContentLength: number
  ContentID?: string     // set for inline/embedded images (e.g. signature logos); empty string for real attachments
}

interface PostmarkInboundPayload {
  From: string
  FromFull?: { Email: string; Name: string; MailboxHash: string }
  To: string
  ToFull?: Array<{ Email: string; Name: string; MailboxHash: string }>
  Subject: string
  MessageID?: string
  Date?: string
  TextBody?: string
  HtmlBody?: string
  Attachments?: PostmarkAttachment[]
}

// ---------------------------------------------------------------------------
// Auto-classification
// ---------------------------------------------------------------------------

type DocCategory = string

const CATEGORY_KEYWORDS: Array<{ category: string; keywords: string[] }> = [
  { category: 'Receipt',        keywords: ['receipt', 'purchase receipt', 'payment received', 'your receipt', 'order confirmation', 'order receipt', 'proof of payment'] },
  { category: 'Invoice',        keywords: ['invoice', 'tax invoice', 'proforma invoice', 'billing', 'amount due', 'payment due', 'inv-', 'inv #'] },
  { category: 'Bank Statement', keywords: ['bank statement', 'account statement', 'statement of account', 'transaction history', 'monthly statement'] },
  { category: 'Payslip',        keywords: ['payslip', 'pay slip', 'salary slip', 'wage slip', 'payroll', 'earnings statement', 'pay advice'] },
  { category: 'Contract',       keywords: ['contract', 'agreement', 'terms and conditions', 'deed', 'memorandum', 'letter of engagement'] },
]

/**
 * Remove email signature from body text.
 * Signatures typically start after:
 * - A line that is exactly "--" or "—"
 * - 3+ underscores or dashes on their own line
 * - Common sign-off phrases at the start of a line
 * - "Sent from my iPhone/Android/..."
 */
function stripSignature(text: string): string {
  const lines = text.split('\n')
  const signatureMarkers = [
    /^--\s*$/,                                      // -- alone
    /^—\s*$/,                                       // em-dash alone
    /^_{3,}\s*$/,                                   // ___
    /^-{3,}\s*$/,                                   // ---
    /^Sent from (my |the )?(iPhone|iPad|Android|Samsung|BlackBerry|Mail|Outlook)/i,
    /^(Best regards?|Kind regards?|Warm regards?|With regards?|Regards?|Cheers|Thanks|Thank you|Sincerely|Yours (sincerely|faithfully|truly)|Best wishes?),?\s*$/i,
    /^Get Outlook for/i,
  ]

  for (let i = 0; i < lines.length; i++) {
    if (signatureMarkers.some(re => re.test(lines[i].trim()))) {
      return lines.slice(0, i).join('\n')
    }
  }
  return text
}

/**
 * Attempt to classify an email attachment into a DocCategory.
 * Only classifies when there is exactly 1 attachment.
 * Searches: filename, subject, and body (signature stripped).
 * Returns 'Uncategorized' if no match is found.
 */
function classifyEmail(opts: {
  attachmentCount: number
  filename: string
  subject: string
  textBody: string
}): DocCategory {
  if (opts.attachmentCount !== 1) return 'Uncategorized'

  const bodyWithoutSig = stripSignature(opts.textBody)
  const searchText = [opts.filename, opts.subject, bodyWithoutSig]
    .join(' ')
    .toLowerCase()

  for (const { category, keywords } of CATEGORY_KEYWORDS) {
    if (keywords.some((kw: string) => searchText.includes(kw.toLowerCase()))) {
      return category
    }
  }

  return 'Uncategorized'
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract the alias part from a @send.filio.uk address.
 * Handles both plain "alias@send.filio.uk" and display-name format
 * "Name <alias@send.filio.uk>".
 */
function extractAlias(rawTo: string): string | null {
  const emailOnly = rawTo.match(/<([^>]+)>/) ? rawTo.match(/<([^>]+)>/)![1] : rawTo
  const match = emailOnly.trim().match(/^([^@]+)@send\.filio\.uk$/i)
  return match ? match[1] : null
}

/**
 * Decode base64 to Uint8Array (Deno-compatible, no Node Buffer).
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  // Only accept POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    })
  }

  // Validate webhook key from query string
  const url = new URL(req.url)
  const providedKey = url.searchParams.get("key")
  const expectedKey = Deno.env.get("POSTMARK_INBOUND_TOKEN")

  if (!expectedKey || providedKey !== expectedKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  // Parse payload
  let payload: PostmarkInboundPayload
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  // Extract alias
  const alias = extractAlias(payload.To ?? "")
  if (!alias) {
    return new Response(
      JSON.stringify({ error: "Invalid To address — not a @send.filio.uk address" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }

  // Init Supabase admin client
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  )

  // Look up client by magic email alias
  const { data: aliasRecord, error: aliasError } = await supabase
    .from("magic_email_aliases")
    .select("client_id, is_active, clients(id, name, management_status, firm_id)")
    .eq("alias", alias)
    .eq("is_active", true)
    .single()

  if (aliasError || !aliasRecord) {
    // Silently accept — avoids leaking whether an alias exists
    return new Response(JSON.stringify({ success: true, message: "Accepted" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  }

  const client = (aliasRecord.clients as unknown) as {
    id: string
    name: string
    management_status: string
    firm_id: string
  }

  // Check client status
  if (client.management_status === "deleted") {
    return new Response(JSON.stringify({ success: true, message: "Accepted" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  }

  if (client.management_status === "dormant") {
    return new Response(
      JSON.stringify({ error: "Client account is dormant" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    )
  }

  if (client.management_status === "archived") {
    return new Response(
      JSON.stringify({ error: "Client account is archived" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    )
  }

  // Filter out inline/embedded images (signature logos, banners, etc.)
  // Inline attachments have a non-empty ContentID (e.g. "image001@xxx")
  const allAttachments = payload.Attachments ?? []
  const attachments = allAttachments.filter(a => !a.ContentID || a.ContentID.trim() === "")

  if (attachments.length === 0) {
    return new Response(
      JSON.stringify({ error: "No real attachments found (inline images ignored)" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }

  // Auto-classify (only when 1 attachment)
  const docCategory = classifyEmail({
    attachmentCount: attachments.length,
    filename: attachments[0]?.Name ?? '',
    subject: payload.Subject ?? '',
    textBody: payload.TextBody ?? '',
  })

  // Process each attachment
  const results: Array<{ filename: string; success: boolean; uploadId?: string; error?: string }> = []
  const now = Date.now()

  for (const attachment of attachments) {
    try {
      const fileBytes = base64ToUint8Array(attachment.Content)
      const safeName = attachment.Name.replace(/[^a-zA-Z0-9._-]/g, "_")
      const storagePath = `${client.firm_id}/${client.id}/${now}-${safeName}`

      // Upload to Supabase Storage
      const { error: storageError } = await supabase.storage
        .from("client-uploads")
        .upload(storagePath, fileBytes, {
          contentType: attachment.ContentType,
          upsert: false,
        })

      if (storageError) {
        results.push({ filename: attachment.Name, success: false, error: storageError.message })
        continue
      }

      // Create uploads record
      const { data: uploadRecord, error: dbError } = await supabase
        .from("uploads")
        .insert({
          client_id: client.id,
          filename: attachment.Name,
          original_filename: attachment.Name,
          storage_path: storagePath,
          file_type: docCategory,
          file_size: fileBytes.length,
          channel: "magic_email",
          xero_status: "pending",
        })
        .select("id")
        .single()

      if (dbError) {
        results.push({ filename: attachment.Name, success: false, error: dbError.message })
        continue
      }

      // Queue Xero sync job
      await supabase.from("jobs").insert({
        client_id: client.id,
        upload_id: uploadRecord.id,
        type: "xero_sync",
        status: "queued",
        attempts: 0,
      })

      results.push({ filename: attachment.Name, success: true, uploadId: uploadRecord.id })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Processing failed"
      results.push({ filename: attachment.Name, success: false, error: msg })
    }
  }

  // Update client's last_upload timestamp
  await supabase
    .from("clients")
    .update({ last_upload: new Date().toISOString() })
    .eq("id", client.id)

  // Create notification for the firm
  await supabase.from("notifications").insert({
    firm_id: client.firm_id,
    user_id: null,
    type: "upload_received",
    title: "Upload received",
    body: `New file(s) received from ${client.name} via email`,
    metadata: {
      client_id: client.id,
      attachment_count: attachments.length,
      from: payload.From,
    },
  })

  const successCount = results.filter((r) => r.success).length

  return new Response(
    JSON.stringify({
      success: true,
      message: `Processed ${successCount} of ${attachments.length} attachments`,
      results,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  )
})
