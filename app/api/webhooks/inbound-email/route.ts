import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { syncUploadToXero } from "@/lib/xero/sync-upload"
import { sendUploadResultEmail } from "@/lib/email/postmark"

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
 * 5. Process attachments → Supabase Storage + uploads table + immediate Xero sync
 * 6. Send result email to sender if any syncs failed
 * 7. Create firm notification
 */

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
  const emailOnly = rawTo.match(/<([^>]+)>/) ? rawTo.match(/<([^>]+)>/)![1] : rawTo
  const match = emailOnly.trim().match(/^([^@]+)@send\.filio\.uk$/i)
  return match ? match[1] : null
}

function validateToken(request: NextRequest): boolean {
  const expected = process.env.POSTMARK_WEBHOOK_TOKEN
  if (!expected) {
    return process.env.NODE_ENV !== "production"
  }
  const provided = request.nextUrl.searchParams.get("token")
  return provided === expected
}

interface AttachmentResult {
  filename: string
  success: boolean
  uploadId?: string
  error?: string
}

/**
 * Store one attachment in Supabase Storage, create an uploads record,
 * then immediately attempt Xero sync (3 built-in retries).
 */
async function processAttachment(
  clientId: string,
  firmId: string,
  attachment: PostmarkAttachment,
  supabaseAdmin: Awaited<ReturnType<typeof createAdminClient>>,
  xeroContactId?: string | null,
  xeroUploadMode?: string | null
): Promise<AttachmentResult> {
  try {
    const fileBuffer = Buffer.from(attachment.Content, "base64")
    const timestamp = Date.now()
    const safeName = attachment.Name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const storagePath = `${firmId}/${clientId}/${timestamp}-${safeName}`

    const { error: storageError } = await supabaseAdmin.storage
      .from("client-uploads")
      .upload(storagePath, fileBuffer, {
        contentType: attachment.ContentType,
        upsert: false,
      })

    if (storageError) {
      return { filename: attachment.Name, success: false, error: storageError.message }
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
      return { filename: attachment.Name, success: false, error: recordError.message }
    }

    // Immediate Xero sync with built-in 3-attempt retry
    const syncResult = await syncUploadToXero({
      uploadId: recordData.id,
      firmId,
      filename: attachment.Name,
      fileBuffer,
      xeroContactId,
      uploadMode: xeroUploadMode,
    })

    // Delete from storage — we don't retain client files after sync attempt
    await supabaseAdmin.storage
      .from('client-uploads')
      .remove([storagePath])
      .catch(err => console.error('Storage cleanup failed:', err))

    if (!syncResult.success) {
      return {
        filename: attachment.Name,
        success: false,
        uploadId: recordData.id,
        error: syncResult.error || 'Xero sync failed',
      }
    }

    return { filename: attachment.Name, success: true, uploadId: recordData.id }
  } catch (error) {
    return {
      filename: attachment.Name,
      success: false,
      error: error instanceof Error ? error.message : "Processing failed",
    }
  }
}

export async function POST(request: NextRequest) {
  if (!validateToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const payload: PostmarkInboundPayload = await request.json()

    const alias = extractAlias(payload.To)
    if (!alias) {
      return NextResponse.json({ error: "Invalid email address format" }, { status: 400 })
    }

    const supabaseAdmin = await createAdminClient()

    const { data: aliasRecord, error: aliasError } = await supabaseAdmin
      .from("magic_email_aliases")
      .select("client_id, is_active, clients(id, name, management_status, firm_id)")
      .eq("alias", alias)
      .eq("is_active", true)
      .single()

    if (aliasError || !aliasRecord) {
      return NextResponse.json({ success: true, message: "Accepted" })
    }

    const client = aliasRecord.clients as unknown as {
      id: string
      name: string
      management_status: string
      firm_id: string
    }

    if (client.management_status === "deleted") {
      return NextResponse.json({ success: true, message: "Accepted" })
    }

    if (client.management_status === "dormant") {
      return NextResponse.json({ error: "Client account is dormant" }, { status: 403 })
    }

    if (client.management_status === "archived") {
      return NextResponse.json({ error: "Client account is archived" }, { status: 403 })
    }

    // Verify firm has active Pro subscription before processing
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('plan, status')
      .eq('firm_id', client.firm_id)
      .eq('status', 'active')
      .maybeSingle()

    const isPro = subscription?.plan === 'professional' || subscription?.plan === 'firm'
    if (!isPro) {
      return NextResponse.json({ success: true, message: 'Accepted' })
    }

    const attachments = payload.Attachments || []

    if (attachments.length === 0) {
      return NextResponse.json({ error: "No attachments found in email" }, { status: 400 })
    }

    // Fetch Xero context and firm/client details needed for sync and failure email
    const [firmRes, clientXeroRes] = await Promise.all([
      supabaseAdmin
        .from("firms")
        .select("xero_upload_mode, name")
        .eq("id", client.firm_id)
        .single(),
      supabaseAdmin
        .from("clients")
        .select("xero_contact_id, xero_linked_contact_id, short_links(short_code, is_active)")
        .eq("id", client.id)
        .single(),
    ])

    const firmData = firmRes.data as any
    const clientXero = clientXeroRes.data as any
    const xeroContactId = clientXero?.xero_contact_id ?? clientXero?.xero_linked_contact_id ?? null
    const xeroUploadMode = firmData?.xero_upload_mode ?? 'attachments'

    const results: AttachmentResult[] = []

    for (const attachment of attachments) {
      const result = await processAttachment(
        client.id,
        client.firm_id,
        attachment,
        supabaseAdmin,
        xeroContactId,
        xeroUploadMode
      )
      results.push(result)
    }

    // Send failure summary email to the sender if any attachments failed
    const failures = results.filter(r => !r.success)
    if (failures.length > 0) {
      const activeLink = clientXero?.short_links?.find((l: any) => l.is_active)
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://filio.uk'
      const uploadLink = activeLink ? `${baseUrl}/m/${activeLink.short_code}` : baseUrl
      const firmName = firmData?.name || 'Your accountant'
      const succeeded = results.filter(r => r.success).map(r => r.filename)

      sendUploadResultEmail({
        to: payload.From,
        clientName: client.name,
        firmName,
        succeeded,
        failed: failures.map(r => ({ filename: r.filename, reason: r.error })),
        uploadLink,
      }).catch(err => console.error('Failed to send upload result email:', err))
    }

    // Update client's last_upload timestamp
    await supabaseAdmin
      .from("clients")
      .update({ last_upload: new Date().toISOString() })
      .eq("id", client.id)

    // Create notification for the firm
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

    const successCount = results.filter(r => r.success).length

    return NextResponse.json({
      success: true,
      message: `Processed ${successCount} of ${attachments.length} attachments`,
      results,
    })
  } catch (error) {
    console.error("Inbound email webhook error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
