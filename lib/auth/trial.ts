import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { TRIAL_DURATION_MS } from '@/lib/constants/trial'

// Returns true when the firm's trial has expired.
// Fails CLOSED: any query error returns true (deny writes) rather than
// granting access during a Supabase outage.
export async function isTrialExpired(
  supabase: SupabaseClient<Database>,
  firmId: string
): Promise<boolean> {
  const { data: sub, error } = await supabase
    .from('subscriptions')
    .select('plan, status, trial_ends_at, created_at')
    .eq('firm_id', firmId)
    .single()

  if (error || !sub) return true   // fail-closed: deny on any DB error
  if (sub.plan !== 'trial') return false
  if (sub.status === 'cancelled' || sub.status === 'expired') return true

  const endDate = sub.trial_ends_at
    ? new Date(sub.trial_ends_at)
    : new Date(new Date(sub.created_at).getTime() + TRIAL_DURATION_MS)

  return endDate.getTime() < Date.now()
}
