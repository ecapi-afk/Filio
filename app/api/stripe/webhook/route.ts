import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe/client'
import { createAdminClient } from '@/lib/supabase/admin'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabaseAdmin = await createAdminClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const firmId = session.metadata?.firm_id
      const plan = session.metadata?.plan

      if (firmId && plan) {
        await supabaseAdmin.from('subscriptions').upsert({
          firm_id: firmId,
          plan,
          status: 'active',
          stripe_subscription_id: session.subscription as string,
          stripe_customer_id: session.customer as string,
          current_period_end: new Date(session.expires_at! * 1000).toISOString(),
        }, { onConflict: 'firm_id' })
      }
      break
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const { data: subData } = await supabaseAdmin
        .from('subscriptions')
        .select('firm_id')
        .eq('stripe_customer_id', sub.customer)
        .single()

      if (subData?.firm_id) {
        await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'canceled' })
          .eq('firm_id', subData.firm_id)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
