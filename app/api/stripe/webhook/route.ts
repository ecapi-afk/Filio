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

  const deactivateMagicEmails = async (firmId: string) => {
    const { data: firmClients } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('firm_id', firmId)

    const clientIds = firmClients?.map((c: any) => c.id) ?? []
    if (clientIds.length > 0) {
      await supabaseAdmin
        .from('magic_email_aliases')
        .update({ is_active: false })
        .in('client_id', clientIds)
        .eq('is_active', true)
    }

    await supabaseAdmin
      .from('clients')
      .update({ magic_email_slug: null })
      .eq('firm_id', firmId)
      .not('magic_email_slug', 'is', null)
  }

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

        // Downgrading to non-Pro: revoke magic email access immediately
        const isPro = plan === 'professional' || plan === 'firm'
        if (!isPro) {
          await deactivateMagicEmails(firmId)
        }
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

        await deactivateMagicEmails(subData.firm_id)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
