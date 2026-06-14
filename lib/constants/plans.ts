export const PLAN_CLIENT_LIMITS: Record<string, number> = {
  trial: 20,
  starter: 20,
  professional: 100,
  firm: 999999,
}

export const isPlanPro = (plan: string): boolean =>
  plan === 'professional' || plan === 'firm'
