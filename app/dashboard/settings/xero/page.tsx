import { createClient } from '@/lib/supabase/server';
import { XeroSettingsClient } from './xero-settings-client';

export const dynamic = 'force-dynamic';

export default async function XeroSettingsPage() {
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

  // Fetch firm data including Xero connection info
  const { data: firm } = profile?.firm_id
    ? await supabase.from('firms').select('*').eq('id', profile.firm_id).single()
    : { data: null };

  return <XeroSettingsClient firm={firm} />;
}
