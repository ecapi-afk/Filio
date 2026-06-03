import { createClient } from '@/lib/supabase/server';
import { PortalEntryClient } from './portal-entry-client';

export default async function PortalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // For portal entry, we don't need authentication
  // The firm branding could be loaded based on a domain or query param

  return <PortalEntryClient />;
}
