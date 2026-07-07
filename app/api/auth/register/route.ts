import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/auth/register - Register new user with firm
// This endpoint is called AFTER the user has signed up via browser Supabase client
// It handles firm/profile creation with admin privileges
export async function POST(request: NextRequest) {
  try {
    const { email, password, name, firmName } = await request.json()

    if (!email || !password || !name || !firmName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const adminClient = await createAdminClient()

    // Use admin client to sign up - this bypasses RLS
    const { data: authData, error: signUpError } = await adminClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    })

    if (signUpError) {
      return NextResponse.json({ error: signUpError.message }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Registration failed' }, { status: 400 })
    }

    const userId = authData.user.id

    // Create firm using admin client (bypasses RLS)
    const { data: firm, error: firmError } = await (adminClient.from('firms') as any)
      .insert({ name: firmName })
      .select()
      .single()

    if (firmError) {
      console.error('Firm creation error:', JSON.stringify(firmError, null, 2))
      console.error('Firm error keys:', Object.keys(firmError))
      console.error('Firm error constructor:', firmError.constructor?.name)
      return NextResponse.json(
        { error: 'Failed to create firm', details: firmError.message || JSON.stringify(firmError) },
        { status: 500 }
      )
    }

    // Update profile with firm_id using admin client
    const { error: profileError } = await (adminClient.from('profiles') as any)
      .update({ firm_id: firm.id, full_name: name })
      .eq('id', userId)

    if (profileError) {
      console.error('Profile update error:', profileError)
      // Not critical, continue
    }

    // Create trial subscription using admin client (30-day trial)
    const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const { error: subError } = await (adminClient.from('subscriptions') as any)
      .insert({
        firm_id: firm.id,
        plan: 'trial',
        status: 'active',
        client_limit: 20,
        trial_ends_at: trialEndsAt,
      })

    if (subError) {
      console.error('Subscription creation error:', subError)
      // Not critical, continue
    }

    return NextResponse.json({
      success: true,
      user: { id: userId, email },
      firm: { id: firm.id, name: firm.name },
    })
  } catch (err) {
    console.error('Registration error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
