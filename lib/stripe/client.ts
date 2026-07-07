import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-03-25.dahlia',
    })
  }
  return _stripe
}

export const stripe = {
  get checkout() {
    return getStripe().checkout
  },
  get webhooks() {
    return getStripe().webhooks
  },
}

export const PLAN_PRICES: Record<string, string | undefined> = {
  starter: process.env.STRIPE_STARTER_PRICE_ID,
  professional: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
  firm: process.env.STRIPE_FIRM_PRICE_ID,
}

export const PLAN_PRICES_ANNUAL: Record<string, string | undefined> = {
  starter: process.env.STRIPE_STARTER_PRICE_ID_ANNUAL,
  professional: process.env.STRIPE_PROFESSIONAL_PRICE_ID_ANNUAL,
  firm: process.env.STRIPE_FIRM_PRICE_ID_ANNUAL,
}

export const PLAN_LIMITS = {
  starter: { active_limit: 20, dormant_limit: 40 },
  professional: { active_limit: 100, dormant_limit: 200 },
  firm: { active_limit: Infinity, dormant_limit: Infinity },
}
