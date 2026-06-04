import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe/client'
import { createClient } from '@/lib/supabase/server'

export async function GET(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single() as { data: { firm_id: string } | null }

  if (!profile?.firm_id) {
    return NextResponse.json({ error: 'No firm associated' }, { status: 403 })
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('firm_id', profile.firm_id)
    .single() as { data: { stripe_customer_id: string | null } | null }

  if (!subscription?.stripe_customer_id) {
    return NextResponse.json({ data: [] })
  }

  try {
    const stripe = getStripe()
    const invoices = await stripe.invoices.list({
      customer: subscription.stripe_customer_id,
      limit: 6,
      status: 'paid',
    })

    const data = invoices.data.map((inv) => ({
      id: inv.id,
      date: new Date(inv.created * 1000).toISOString(),
      amount: inv.amount_paid / 100,
      currency: inv.currency.toUpperCase(),
      pdfUrl: inv.invoice_pdf,
      hostedUrl: inv.hosted_invoice_url,
    }))

    return NextResponse.json({ data })
  } catch (err) {
    console.error('Stripe invoices error:', err)
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
  }
}
