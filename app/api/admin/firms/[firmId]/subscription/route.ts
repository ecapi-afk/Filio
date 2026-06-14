import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe/client'
import { PLAN_CLIENT_LIMITS } from '@/lib/constants/plans'

async function requireAdmin(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null
  return user
}

// PATCH /api/admin/firms/[firmId]/subscription
// Body: { plan, clientLimit, currentPeriodEnd, status, stripePriceId? }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ firmId: string }> }
) {
  const user = await requireAdmin(request)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { firmId } = await params
  const body = await request.json()
  const { plan, clientLimit, currentPeriodEnd, status, stripePriceId } = body

  if (!plan || !status) {
    return NextResponse.json({ error: 'plan and status are required' }, { status: 400 })
  }

  const admin = await createAdminClient()

  // Resolve client limit: use provided value or fall back to plan default
  const resolvedLimit = clientLimit ?? PLAN_CLIENT_LIMITS[plan] ?? 20

  // Update our DB first
  const { data: existing } = await admin
    .from('subscriptions')
    .select('stripe_subscription_id, stripe_customer_id')
    .eq('firm_id', firmId)
    .maybeSingle()

  const { error: upsertError } = await admin
    .from('subscriptions')
    .upsert({
      firm_id: firmId,
      plan,
      status,
      client_limit: resolvedLimit,
      current_period_end: currentPeriodEnd ?? null,
      stripe_subscription_id: (existing as any)?.stripe_subscription_id ?? null,
      stripe_customer_id: (existing as any)?.stripe_customer_id ?? null,
    }, { onConflict: 'firm_id' })

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  // Sync to Stripe if the firm has an active Stripe subscription and a price was provided
  const stripeSubId = (existing as any)?.stripe_subscription_id
  if (stripeSubId && stripePriceId) {
    try {
      const stripe = getStripe()
      const stripeSub = await stripe.subscriptions.retrieve(stripeSubId)
      const itemId = stripeSub.items.data[0]?.id

      if (itemId) {
        await stripe.subscriptions.update(stripeSubId, {
          items: [{ id: itemId, price: stripePriceId }],
          // Extend trial end if an end date is provided and it's in the future
          ...(currentPeriodEnd && new Date(currentPeriodEnd) > new Date()
            ? { trial_end: Math.floor(new Date(currentPeriodEnd).getTime() / 1000) }
            : {}),
          proration_behavior: 'none',
        })
      }
    } catch (stripeErr: any) {
      // Log but don't fail — DB is the source of truth for us
      console.error('Admin subscription: Stripe sync failed:', stripeErr.message)
      return NextResponse.json({
        success: true,
        warning: `DB updated but Stripe sync failed: ${stripeErr.message}`,
      })
    }
  }

  return NextResponse.json({ success: true })
}
