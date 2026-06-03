import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * DELETE /api/clients/[id]/permanent-delete
 *
 * Permanently deletes a client and all associated data.
 * Only allowed for clients already in 'deleted' status (GDPR compliance).
 * This is irreversible.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const supabaseAdmin = await createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("firm_id")
    .eq("id", user.id)
    .single()

  if (!profile?.firm_id) {
    return NextResponse.json({ error: "No firm associated" }, { status: 403 })
  }

  try {
    // Verify client belongs to firm AND is already soft-deleted (use admin to bypass RLS)
    const { data: existingClient } = await supabaseAdmin
      .from("clients")
      .select("id, name, management_status")
      .eq("id", id)
      .eq("firm_id", profile.firm_id)
      .eq("management_status", "deleted")
      .single()

    if (!existingClient) {
      return NextResponse.json(
        { error: "Client not found or not in deleted status" },
        { status: 404 }
      )
    }

    // Create anonymous audit log BEFORE deletion (HMRC 7-year requirement)
    const hashedEmail = await hashForAudit(existingClient.name + "@redacted")
    await supabaseAdmin.from("audit_logs").insert({
      firm_id: profile.firm_id,
      client_id: id,
      actor: user.id,
      action: "permanent_delete",
      metadata: {
        client_name_hash: hashedEmail,
        deleted_at: new Date().toISOString(),
        retention_until: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000).toISOString(),
      },
    })

    // Delete all associated data using admin client (bypasses RLS)

    // 1. Delete uploads (and their storage files)
    const { data: uploads } = await supabaseAdmin
      .from("uploads")
      .select("storage_path")
      .eq("client_id", id)

    // Delete files from storage
    if (uploads && uploads.length > 0) {
      for (const upload of uploads) {
        if (upload.storage_path) {
          await supabaseAdmin.storage
            .from("client-uploads")
            .remove([upload.storage_path])
        }
      }
    }

    // 2. Delete upload records
    await supabaseAdmin.from("uploads").delete().eq("client_id", id)

    // 3. Delete portal tokens
    await supabaseAdmin.from("portal_tokens").delete().eq("client_id", id)

    // 4. Delete short links
    await supabaseAdmin.from("short_links").delete().eq("client_id", id)

    // 5. Delete magic email aliases
    await supabaseAdmin.from("magic_email_aliases").delete().eq("client_id", id)

    // 6. Delete client
    await supabaseAdmin.from("clients").delete().eq("id", id)

    // 7. Delete notifications
    await supabaseAdmin.from("notifications").delete().eq("client_id", id)

    // 8. Delete jobs
    await supabaseAdmin.from("jobs").delete().eq("client_id", id)

    return NextResponse.json({
      success: true,
      message: "Client permanently deleted",
    })
  } catch (err) {
    console.error("Permanent delete error:", err)
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: "Failed to permanently delete client", details: message },
      { status: 500 }
    )
  }
}

/**
 * Simple hash for audit log - GDPR compliant anonymous retention
 */
async function hashForAudit(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}
