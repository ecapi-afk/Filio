import { createClient } from '@/lib/supabase/server';
import { SettingsClient } from './settings-client';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Get firm_id from profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single();

  if (!profile?.firm_id) {
    return <SettingsClient firm={null} />;
  }

  // Fetch firm data including default settings
  const { data: firm } = await supabase
    .from('firms')
    .select('*')
    .eq('id', profile.firm_id)
    .single();

  // Fetch subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, client_limit, status, current_period_end, stripe_customer_id')
    .eq('firm_id', profile.firm_id)
    .single();

  // Fetch active client count
  const { count } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .eq('firm_id', profile.firm_id)
    .eq('management_status', 'active');

  return (
    <SettingsClient 
      firm={firm} 
      subscription={subscription || { plan: 'trial', client_limit: 20, status: 'active', current_period_end: null, stripe_customer_id: null }}
      clientCount={count || 0}
    />
  );
}
