import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAdmin(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null
  return user
}

// PATCH /api/admin/firms/[firmId]/notes
// Body: { notes: string }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ firmId: string }> }
) {
  const user = await requireAdmin(request)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { firmId } = await params
  const { notes } = await request.json()

  const admin = await createAdminClient()
  const { error } = await admin
    .from('firms')
    .update({ admin_notes: notes ?? null })
    .eq('id', firmId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
