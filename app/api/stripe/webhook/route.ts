import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe/client'
import { createAdminClient } from '@/lib/supabase/admin'
import { PLAN_CLIENT_LIMITS, isPlanPro } from '@/lib/constants/plans'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const body = await request.text()
  // CRITICAL-1: explicit null guard — don't rely on SDK throwing for missing header
  const sig = request.headers.get('stripe-signature')
  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
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

  // MEDIUM-1: check upsert error so subscription state failures are visible
  const syncSubscription = async (
    firmId: string,
    plan: string,
    stripeSubscriptionId: string,
    stripeCustomerId: string,
    currentPeriodEnd: number | null | undefined,
    status: 'active' | 'canceled',
    currentPeriodStart?: number | null
  ) => {
    const clientLimit = PLAN_CLIENT_LIMITS[plan] ?? 20

    const { error } = await supabaseAdmin.from('subscriptions').upsert({
      firm_id: firmId,
      plan,
      status,
      client_limit: clientLimit,
      stripe_subscription_id: stripeSubscriptionId,
      stripe_customer_id: stripeCustomerId,
      current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null,
      current_period_start: currentPeriodStart ? new Date(currentPeriodStart * 1000).toISOString() : null,
    }, { onConflict: 'firm_id' })

    if (error) throw new Error(`Failed to upsert subscription: ${error.message}`)

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
            (stripeSubscription as any).current_period_end as number | undefined,
            'active',
            (stripeSubscription as any).current_period_start as number | undefined,
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

        if (!subData?.firm_id) break

        // CRITICAL-2: plan must come from price.metadata.plan (set on all Stripe prices).
        // If absent (misconfigured price), only refresh current_period_end and log — don't
        // guess the plan, which could silently skip magic email deactivation on downgrade.
        const pricePlan = sub.items.data[0]?.price?.metadata?.plan as string | undefined

        if (!pricePlan || !PLAN_CLIENT_LIMITS[pricePlan]) {
          console.error(
            `subscription.updated: price metadata missing 'plan' for sub ${sub.id}. ` +
            `Keeping existing plan '${subData.plan}', only refreshing current_period_end.`
          )
          const periodEnd = (sub as any).current_period_end as number | undefined
          const periodStart = (sub as any).current_period_start as number | undefined
          await supabaseAdmin
            .from('subscriptions')
            .update({
              current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
              current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
            })
            .eq('stripe_subscription_id', sub.id)
          break
        }

        const subCustomerId = typeof sub.customer === 'string' ? sub.customer : (sub.customer as Stripe.Customer).id
        const clientLimit = await syncSubscription(
          subData.firm_id,
          pricePlan,
          sub.id,
          subCustomerId,
          (sub as any).current_period_end as number | undefined,
          sub.status === 'active' ? 'active' : 'canceled',
          (sub as any).current_period_start as number | undefined,
        )

        await dormantExcessClients(subData.firm_id, clientLimit)

        if (!isPlanPro(pricePlan)) {
          await deactivateMagicEmails(subData.firm_id)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const deletedCustomerId = typeof sub.customer === 'string' ? sub.customer : (sub.customer as Stripe.Customer).id
        const { data: subData } = await supabaseAdmin
          .from('subscriptions')
          .select('firm_id')
          .eq('stripe_customer_id', deletedCustomerId)
          .single()

        if (subData?.firm_id) {
          await supabaseAdmin
            .from('subscriptions')
            .update({ status: 'canceled' })
            .eq('firm_id', subData.firm_id)

          // HIGH-4: deactivate magic emails and dormant excess clients back to trial limit
          await deactivateMagicEmails(subData.firm_id)
          await dormantExcessClients(subData.firm_id, PLAN_CLIENT_LIMITS['trial'])
        }
        break
      }
    }
  } catch (err) {
    console.error('Stripe webhook handler error:', err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
