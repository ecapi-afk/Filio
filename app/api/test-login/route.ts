import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Debug test login - ONLY for development/testing
 * Sets a known password for the test user so the fixture can log in via normal flow
 */
export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Disabled in production' }, { status: 403 })
  }

  const email = 'zhanghaog@icloud.com'
  const testPassword = 'TestPassword123!'

  try {
    const adminClient = await createAdminClient()

    // Find user by email
    const { data: users, error: listError } = await adminClient.auth.admin.listUsers()

    if (listError) {
      return NextResponse.json({ error: `List users error: ${listError.message}` }, { status: 500 })
    }

    const user = users?.users?.find((u) => u.email === email)

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update user with a known password using admin API
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      user.id,
      { password: testPassword }
    )

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: `Failed to set password: ${updateError.message}` }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
      },
      credentials: {
        email: email,
        password: testPassword,
      },
    })
  } catch (error: any) {
    console.error('Test login error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
