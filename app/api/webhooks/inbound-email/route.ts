import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

/**
 * Postmark Inbound Email Webhook Handler
 * Receives emails sent to *@send.filio.uk via Postmark's inbound processing
 *
 * Security: validates a secret token passed as ?token= query param.
 * Set POSTMARK_WEBHOOK_TOKEN in env and configure the same value in Postmark's
 * inbound webhook URL: https://filio.uk/api/webhooks/inbound-email?token=<TOKEN>
 *
 * Flow:
 * 1. Validate webhook token
 * 2. Parse the To address to extract magic_email_alias
 * 3. Look up client by magic_email_alias
 * 4. Check client management_status
 * 5. Process attachments → Supabase Storage + uploads table
 * 6. Create firm notification
 */

// Postmark inbound email payload
// https://postmarkapp.com/developer/webhooks/inbound-webhook
interface PostmarkAttachment {
  Name: string
  Content: string // base64
  ContentType: string
  ContentLength: number
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

/**
 * Extract magic_email_alias from the To address.
 * Input:  "Eric-279ec7@send.filio.uk"  ->  "Eric-279ec7"
 * Also handles Postmark's display-name format: "Name <alias@send.filio.uk>"
 */
function extractAlias(rawTo: string): string | null {
  // Strip display name if present: "Name <email>" → "email"
  const emailOnly = rawTo.match(/<([^>]+)>/) ? rawTo.match(/<([^>]+)>/)![1] : rawTo
  const match = emailOnly.trim().match(/^([^@]+)@send\.filio\.uk$/i)
  return match ? match[1] : null
}

/**
 * Validate the webhook token from the URL query string.
 */
function validateToken(request: NextRequest): boolean {
  const expected = process.env.POSTMARK_WEBHOOK_TOKEN
  if (!expected) {
    // If no token is configured, allow through in development only
    return process.env.NODE_ENV !== "production"
  }
  const provided = request.nextUrl.searchParams.get("token")
  return provided === expected
}

/**
 * Store one attachment in Supabase Storage and create an uploads record.
 */
async function processAttachment(
  clientId: string,
  firmId: string,
  attachment: PostmarkAttachment,
  supabaseAdmin: Awaited<ReturnType<typeof createAdminClient>>
): Promise<{ success: boolean; uploadId?: string; error?: string }> {
  try {
    const fileBuffer = Buffer.from(attachment.Content, "base64")
    const timestamp = Date.now()
    const safeName = attachment.Name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const storagePath = `${firmId}/${clientId}/${timestamp}-${safeName}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from("client-uploads")
      .upload(storagePath, fileBuffer, {
        contentType: attachment.ContentType,
        upsert: false,
      })

    if (uploadError) {
      return { success: false, error: uploadError.message }
    }

    const { data: recordData, error: recordError } = await supabaseAdmin
      .from("uploads")
      .insert({
        client_id: clientId,
        filename: attachment.Name,
        original_filename: attachment.Name,
        storage_path: storagePath,
        file_type: attachment.ContentType,
        file_size: fileBuffer.length,
        channel: "email",
        xero_status: "pending",
      })
      .select("id")
      .single()

    if (recordError) {
      return { success: false, error: recordError.message }
    }

    return { success: true, uploadId: recordData.id }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Processing failed" }
  }
}

export async function POST(request: NextRequest) {
  // 1. Validate webhook token
  if (!validateToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const payload: PostmarkInboundPayload = await request.json()

    // 2. Extract alias from To address
    const alias = extractAlias(payload.To)
    if (!alias) {
      return NextResponse.json(
        { error: "Invalid email address format" },
        { status: 400 }
      )
    }

    const supabaseAdmin = await createAdminClient()

    // 3. Look up client by magic email alias
    const { data: aliasRecord, error: aliasError } = await supabaseAdmin
      .from("magic_email_aliases")
      .select("client_id, is_active, clients(id, name, management_status, firm_id)")
      .eq("alias", alias)
      .eq("is_active", true)
      .single()

    if (aliasError || !aliasRecord) {
      // Silently accept — avoids leaking whether an alias exists
      return NextResponse.json({ success: true, message: "Accepted" })
    }

    const client = aliasRecord.clients as unknown as {
      id: string
      name: string
      management_status: string
      firm_id: string
    }

    // 4. Check client status
    if (client.management_status === "deleted") {
      return NextResponse.json({ success: true, message: "Accepted" })
    }

    if (client.management_status === "dormant") {
      return NextResponse.json(
        { error: "Client account is dormant" },
        { status: 403 }
      )
    }

    if (client.management_status === "archived") {
      return NextResponse.json(
        { error: "Client account is archived" },
        { status: 403 }
      )
    }

    // 5. Process attachments
    const attachments = payload.Attachments || []

    if (attachments.length === 0) {
      return NextResponse.json(
        { error: "No attachments found in email" },
        { status: 400 }
      )
    }

    const results: Array<{ filename: string; success: boolean; uploadId?: string; error?: string }> = []

    for (const attachment of attachments) {
      const result = await processAttachment(
        client.id,
        client.firm_id,
        attachment,
        supabaseAdmin
      )
      results.push({
        filename: attachment.Name,
        success: result.success,
        uploadId: result.uploadId,
        error: result.error,
      })
    }

    // Update client's last_upload timestamp
    await supabaseAdmin
      .from("clients")
      .update({ last_upload: new Date().toISOString() })
      .eq("id", client.id)

    // 6. Create notification for the firm
    await supabaseAdmin.from("notifications").insert({
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

    return NextResponse.json({
      success: true,
      message: `Processed ${successCount} of ${attachments.length} attachments`,
      results,
    })
  } catch (error) {
    console.error("Inbound email webhook error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
