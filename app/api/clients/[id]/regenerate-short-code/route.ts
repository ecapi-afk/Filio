import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { regenerateShortCode } from "@/lib/magic/generator"

/**
 * POST /api/clients/[id]/regenerate-short-code
 *
 * Regenerates ONLY the short code (Magic Link).
 * The client's magic email alias remains unchanged.
 *
 * This creates a new portal_token with a new short_code.
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

    // Regenerate short code using the generator function
    const newShortCode = await regenerateShortCode(id)

    if (!newShortCode) {
      return NextResponse.json(
        { error: "Failed to generate unique short code" },
        { status: 500 }
      )
    }

    // Audit log
    await supabase.from("audit_logs").insert({
      firm_id: profile.firm_id,
      client_id: id,
      actor: user.id,
      action: "short_code_regenerated",
      metadata: { previous_short_code: "revoked" },
    })

    return NextResponse.json({
      success: true,
      shortCode: newShortCode,
      message: "Magic Link regenerated. Previous link is now invalid.",
    })
  } catch (err) {
    console.error("Error regenerating short code:", err)
    return NextResponse.json(
      { error: "Failed to regenerate short code" },
      { status: 500 }
    )
  }
}
