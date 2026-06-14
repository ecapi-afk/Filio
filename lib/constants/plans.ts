/**
 * Sentinel value for plans with no effective client limit (Firm tier).
 *
 * Why not `Infinity`:
 *   1. The DB column is INTEGER — Infinity can't be stored there.
 *   2. JSON.stringify(Infinity) === 'null', so API responses would silently
 *      send null instead of a number, breaking client-side logic.
 *   3. Supabase `.lte()` / comparison operators don't accept Infinity.
 *
 * Callers that need to skip the quota check should guard with:
 *   `if (limit < UNLIMITED_CLIENTS && count >= limit) { ... }`
 */
export const UNLIMITED_CLIENTS = 999_999

export const PLAN_CLIENT_LIMITS: Record<string, number> = {
  trial: 20,
  starter: 20,
  professional: 100,
  // Firm plan is effectively unlimited; see UNLIMITED_CLIENTS for why not Infinity
  firm: UNLIMITED_CLIENTS,
}

/**
 * Returns true for plans that unlock Magic Email and higher client limits.
 * Currently: Professional (100 clients) and Firm (unlimited).
 *
 * Use this instead of comparing plan strings inline — it keeps plan logic
 * in one place and makes the intent readable at the call site.
 */
export const isPlanPro = (plan: string): boolean =>
  plan === 'professional' || plan === 'firm'
