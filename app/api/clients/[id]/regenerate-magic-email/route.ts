import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { regenerateMagicEmailAlias } from "@/lib/magic/generator"

/**
 * POST /api/clients/[id]/regenerate-magic-email
 *
 * Regenerates ONLY the magic email alias (stable_alias).
 * The client's short code (Magic Link) remains unchanged.
 *
 * This invalidates all previous email aliases for this client.
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
      .select("id, name")
      .eq("id", id)
      .eq("firm_id", profile.firm_id)
      .single()

    if (!existingClient) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    // Regenerate magic email alias
    const newAlias = await regenerateMagicEmailAlias(id)

    if (!newAlias) {
      return NextResponse.json(
        { error: "Failed to generate unique alias" },
        { status: 500 }
      )
    }

    // Audit log
    await supabase.from("audit_logs").insert({
      firm_id: profile.firm_id,
      client_id: id,
      actor: user.id,
      action: "magic_email_regenerated",
      metadata: { new_alias: newAlias },
    })

    return NextResponse.json({
      success: true,
      alias: newAlias,
      email: `${newAlias}@send.filio.uk`,
      message: "Magic Email regenerated. Previous email address is now invalid.",
    })
  } catch (err) {
    console.error("Error regenerating magic email:", err)
    return NextResponse.json(
      { error: "Failed to regenerate magic email" },
      { status: 500 }
    )
  }
}
