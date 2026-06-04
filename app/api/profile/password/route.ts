import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { currentPassword, newPassword } = await request.json() as {
    currentPassword?: string
    newPassword?: string
  }

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'currentPassword and newPassword required' }, { status: 400 })
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  // Verify current password by attempting sign-in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  })

  if (signInError) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })
  }

  // Update password using admin client
  const adminClient = await createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (adminClient as any).auth.admin.updateUserById(user.id, {
    password: newPassword,
  })

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update password' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
