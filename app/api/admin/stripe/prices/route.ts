import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe/client'

async function requireAdmin(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null
  return user
}

// GET /api/admin/stripe/prices
// Returns active Stripe prices with product name and plan metadata
export async function GET(request: NextRequest) {
  const user = await requireAdmin(request)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const stripe = getStripe()
    const prices = await stripe.prices.list({
      active: true,
      expand: ['data.product'],
      limit: 100,
    })

    const result = prices.data
      .map(price => {
        const product = price.product as any
        return {
          id: price.id,
          // plan slug stored in price metadata (e.g. 'professional')
          plan: price.metadata?.plan ?? null,
          nickname: price.nickname,
          productName: product?.name ?? null,
          currency: price.currency,
          unitAmount: price.unit_amount,
          interval: price.recurring?.interval ?? null,
          active: price.active,
        }
      })
      // Only surface prices that have a plan metadata set — those are the ones
      // we care about for subscription management
      .filter(p => p.plan)
      .sort((a, b) => (a.plan ?? '').localeCompare(b.plan ?? ''))

    return NextResponse.json({ prices: result })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
