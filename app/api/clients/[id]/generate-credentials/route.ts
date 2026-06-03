import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createMagicCredentials } from "@/lib/magic/generator"

/**
 * POST /api/clients/[id]/generate-credentials
 *
 * Generates Magic Link (short code + portal token) and Magic Email alias
 * for clients that were imported/created without these credentials.
 *
 * Safe to call even if credentials already exist — but will skip if they do.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
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
    // Verify client belongs to firm
    const { data: existingClient } = await supabase
      .from("clients")
      .select("id, name, portal_token, magic_email_slug, reminder_days_before, magic_email_verified_only")
      .eq("id", id)
      .eq("firm_id", profile.firm_id)
      .single()

    if (!existingClient) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    // If credentials already exist, return success without creating duplicates
    if (existingClient.portal_token && existingClient.magic_email_slug) {
      return NextResponse.json({
        success: true,
        message: "Credentials already exist",
        alreadyExists: true,
      })
    }

    // Generate magic credentials
    const { shortCode, magicEmailAlias } = await createMagicCredentials(
      existingClient.id,
      existingClient.name
    )

    if (!shortCode || !magicEmailAlias) {
      return NextResponse.json(
        { error: "Failed to generate credentials" },
        { status: 500 }
      )
    }

    // ✅ Also backfill firm-level defaults (reminder days, magic email verification)
    // if the client was imported without them
    const { data: firmDefaults } = await supabase
      .from("firms")
      .select("default_reminder_days, default_magic_email_sender_verified_only")
      .eq("id", profile.firm_id)
      .single()

    if (firmDefaults) {
      const updates: Record<string, unknown> = {}
      if (existingClient.reminder_days_before === null && firmDefaults.default_reminder_days) {
        updates.reminder_days_before = firmDefaults.default_reminder_days
      }
      if (existingClient.magic_email_verified_only === null || existingClient.magic_email_verified_only === undefined) {
        updates.magic_email_verified_only = firmDefaults.default_magic_email_sender_verified_only ?? false
      }
      if (Object.keys(updates).length > 0) {
        await supabase.from("clients").update(updates).eq("id", id)
      }
    }

    // Audit log
    await supabase.from("audit_logs").insert({
      firm_id: profile.firm_id,
      client_id: id,
      actor: user.id,
      action: "credentials_generated",
      metadata: { shortCode, magicEmailAlias },
    })

    return NextResponse.json({
      success: true,
      shortCode,
      magicEmailAlias,
      message: "Magic Link and Magic Email generated successfully.",
    })

  } catch (err) {
    console.error("Error generating credentials:", err)
    return NextResponse.json(
      { error: "Failed to generate credentials" },
      { status: 500 }
    )
  }
}
