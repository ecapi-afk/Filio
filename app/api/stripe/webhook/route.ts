import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe/client'
import { createAdminClient } from '@/lib/supabase/admin'
import { PLAN_CLIENT_LIMITS, isPlanPro } from '@/lib/constants/plans'
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

  const dormantExcessClients = async (firmId: string, newLimit: number) => {
    const { data: activeClients, error } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('firm_id', firmId)
      .eq('management_status', 'active')
      .order('last_upload', { ascending: true, nullsFirst: true })

    if (error) throw new Error(`Failed to fetch active clients: ${error.message}`)
    if (!activeClients || activeClients.length <= newLimit) return

    const excessIds = activeClients.slice(newLimit).map((c: any) => c.id)
    const { error: updateError } = await supabaseAdmin
      .from('clients')
      .update({ management_status: 'dormant' })
      .in('id', excessIds)

    if (updateError) throw new Error(`Failed to dormant excess clients: ${updateError.message}`)
  }

  const deactivateMagicEmails = async (firmId: string) => {
    const { data: firmClients, error: fetchError } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('firm_id', firmId)

    if (fetchError) throw new Error(`Failed to fetch firm clients: ${fetchError.message}`)

    const clientIds = firmClients?.map((c: any) => c.id) ?? []
    if (clientIds.length > 0) {
      const { error: aliasError } = await supabaseAdmin
        .from('magic_email_aliases')
        .update({ is_active: false })
        .in('client_id', clientIds)
        .eq('is_active', true)

      if (aliasError) throw new Error(`Failed to deactivate magic email aliases: ${aliasError.message}`)
    }

    const { error: slugError } = await supabaseAdmin
      .from('clients')
      .update({ magic_email_slug: null })
      .eq('firm_id', firmId)
      .not('magic_email_slug', 'is', null)

    if (slugError) throw new Error(`Failed to clear magic email slugs: ${slugError.message}`)
  }

  const syncSubscription = async (
    firmId: string,
    plan: string,
    stripeSubscriptionId: string,
    stripeCustomerId: string,
    currentPeriodEnd: number,
    status: 'active' | 'canceled'
  ) => {
    const clientLimit = PLAN_CLIENT_LIMITS[plan] ?? 20

    await supabaseAdmin.from('subscriptions').upsert({
      firm_id: firmId,
      plan,
      status,
      client_limit: clientLimit,
      stripe_subscription_id: stripeSubscriptionId,
      stripe_customer_id: stripeCustomerId,
      current_period_end: new Date(currentPeriodEnd * 1000).toISOString(),
    }, { onConflict: 'firm_id' })

    return clientLimit
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const firmId = session.metadata?.firm_id
        const plan = session.metadata?.plan

        if (firmId && plan) {
          const stripe = getStripe()
          const stripeSubscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          )

          const clientLimit = await syncSubscription(
            firmId,
            plan,
            stripeSubscription.id,
            session.customer as string,
            stripeSubscription.current_period_end,
            'active'
          )

          await dormantExcessClients(firmId, clientLimit)

          if (!isPlanPro(plan)) {
            await deactivateMagicEmails(firmId)
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const { data: subData } = await supabaseAdmin
          .from('subscriptions')
          .select('firm_id, plan')
          .eq('stripe_subscription_id', sub.id)
          .single()

        if (subData?.firm_id) {
          const plan = (sub.items.data[0]?.price?.metadata?.plan as string) ?? subData.plan
          const clientLimit = await syncSubscription(
            subData.firm_id,
            plan,
            sub.id,
            sub.customer as string,
            sub.current_period_end,
            sub.status === 'active' ? 'active' : 'canceled'
          )

          await dormantExcessClients(subData.firm_id, clientLimit)

          if (!isPlanPro(plan)) {
            await deactivateMagicEmails(subData.firm_id)
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
  } catch (err) {
    console.error('Stripe webhook handler error:', err)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }

  return NextResponse.json({ received: true })
}
