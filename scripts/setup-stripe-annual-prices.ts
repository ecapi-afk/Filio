/**
 * Creates annual Stripe prices for each plan and outputs the env var values.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_xxx \
 *   STRIPE_STARTER_PRICE_ID=price_xxx \
 *   STRIPE_PROFESSIONAL_PRICE_ID=price_xxx \
 *   STRIPE_FIRM_PRICE_ID=price_xxx \
 *   npx tsx scripts/setup-stripe-annual-prices.ts
 */

import Stripe from 'stripe'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const MONTHLY_PRICE_IDS: Record<string, string | undefined> = {
  starter: process.env.STRIPE_STARTER_PRICE_ID,
  professional: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
  firm: process.env.STRIPE_FIRM_PRICE_ID,
}

// Annual totals in pence (GBP)
const ANNUAL_AMOUNTS: Record<string, number> = {
  starter: 27600,      // £276/year
  professional: 56400, // £564/year
  firm: 94800,         // £948/year
}

if (!STRIPE_SECRET_KEY) {
  console.error('❌  STRIPE_SECRET_KEY is required')
  process.exit(1)
}

const missingPrices = Object.entries(MONTHLY_PRICE_IDS)
  .filter(([, v]) => !v)
  .map(([k]) => `STRIPE_${k.toUpperCase()}_PRICE_ID`)

if (missingPrices.length > 0) {
  console.error('❌  Missing required env vars:', missingPrices.join(', '))
  process.exit(1)
}

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2026-03-25.dahlia' })

async function getProductId(priceId: string): Promise<string> {
  const price = await stripe.prices.retrieve(priceId)
  if (typeof price.product === 'string') return price.product
  return (price.product as Stripe.Product).id
}

async function findExistingAnnualPrice(productId: string, amount: number): Promise<string | null> {
  const prices = await stripe.prices.list({ product: productId, active: true, limit: 100 })
  const existing = prices.data.find(
    p => p.recurring?.interval === 'year' && p.unit_amount === amount && p.currency === 'gbp'
  )
  return existing?.id ?? null
}

async function main() {
  console.log('🔍  Looking up product IDs from existing monthly prices…\n')

  const results: Record<string, string> = {}

  for (const [plan, monthlyPriceId] of Object.entries(MONTHLY_PRICE_IDS)) {
    const productId = await getProductId(monthlyPriceId!)
    const annualAmount = ANNUAL_AMOUNTS[plan]

    console.log(`📦  ${plan}: product=${productId}, annual amount=£${(annualAmount / 100).toFixed(2)}/year`)

    // Reuse existing annual price if one already exists for this product + amount
    const existing = await findExistingAnnualPrice(productId, annualAmount)
    if (existing) {
      console.log(`   ✅  Found existing annual price: ${existing}`)
      results[plan] = existing
      continue
    }

    const price = await stripe.prices.create({
      product: productId,
      unit_amount: annualAmount,
      currency: 'gbp',
      recurring: { interval: 'year' },
      nickname: `${plan.charAt(0).toUpperCase() + plan.slice(1)} — Annual`,
    })

    console.log(`   ✅  Created annual price: ${price.id}`)
    results[plan] = price.id
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅  Done! Set these environment variables:\n')
  console.log(`STRIPE_STARTER_PRICE_ID_ANNUAL=${results.starter}`)
  console.log(`STRIPE_PROFESSIONAL_PRICE_ID_ANNUAL=${results.professional}`)
  console.log(`STRIPE_FIRM_PRICE_ID_ANNUAL=${results.firm}`)
  console.log('\nThen add them to Vercel:')
  console.log(`  vercel env add STRIPE_STARTER_PRICE_ID_ANNUAL`)
  console.log(`  vercel env add STRIPE_PROFESSIONAL_PRICE_ID_ANNUAL`)
  console.log(`  vercel env add STRIPE_FIRM_PRICE_ID_ANNUAL`)
}

main().catch(err => {
  console.error('❌  Error:', err.message)
  process.exit(1)
})
