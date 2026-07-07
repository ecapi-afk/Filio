import { createClient } from '@/lib/supabase/server'
import { BillingClient } from './billing-client'

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single()

  if (!profile?.firm_id) {
    return (
      <BillingClient
        subscription={{ plan: 'trial', status: 'active', client_limit: 20, current_period_end: null, stripe_customer_id: null, trial_ends_at: null, created_at: new Date().toISOString() }}
        clientCount={0}
      />
    )
  }

  const [{ data: subscription }, { count }] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('plan, status, client_limit, current_period_end, stripe_customer_id, trial_ends_at, created_at')
      .eq('firm_id', profile.firm_id)
      .single(),
    supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('firm_id', profile.firm_id)
      .eq('management_status', 'active'),
  ])

  return (
    <BillingClient
      subscription={
        subscription ?? {
          plan: 'trial',
          status: 'active',
          client_limit: 20,
          current_period_end: null,
          stripe_customer_id: null,
          trial_ends_at: null,
          created_at: new Date().toISOString(),
        }
      }
      clientCount={count ?? 0}
    />
  )
}
