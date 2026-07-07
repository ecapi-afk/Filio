import { NextRequest, NextResponse } from 'next/server'
import { getStripe, PLAN_PRICES, PLAN_PRICES_ANNUAL } from '@/lib/stripe/client'
import { createClient } from '@/lib/supabase/server'

const VALID_PLANS = ['starter', 'professional', 'firm'] as const
type Plan = typeof VALID_PLANS[number]
type Billing = 'monthly' | 'annual'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.firm_id) {
    return NextResponse.json({ error: 'No firm associated' }, { status: 403 })
  }

  let plan: Plan
  let billing: Billing
  try {
    const body = await request.json()
    if (!VALID_PLANS.includes(body.plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }
    plan = body.plan as Plan
    billing = body.billing === 'annual' ? 'annual' : 'monthly'
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Prefer annual price ID if available; fall back to monthly
  const priceId =
    (billing === 'annual' ? PLAN_PRICES_ANNUAL[plan] : undefined) ?? PLAN_PRICES[plan]

  if (!priceId) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  try {
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing?canceled=true`,
      metadata: { firm_id: profile.firm_id, plan, billing },
    })

    if (!session.url) {
      return NextResponse.json({ error: 'Checkout session did not return a URL' }, { status: 500 })
    }

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
