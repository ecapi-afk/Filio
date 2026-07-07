import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { PortalUploadClient } from './portal-upload-client';

export default async function PortalUploadPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    redirect('/portal?error=missing_token');
  }

  const supabase = await createAdminClient();
  const { data: portalToken } = await supabase
    .from('portal_tokens')
    .select('*, clients(*, firms(id, name, xero_connection_status))')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (!portalToken) {
    redirect('/portal/expired');
  }

  const client = portalToken.clients as any
  if (client?.management_status !== 'active') {
    redirect('/portal/paused');
  }

  return <PortalUploadClient portalToken={portalToken} />;
}
