import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function test() {
  const { data: portalTokens } = await supabase.from('portal_tokens').select('token, client_id').limit(1);
  if (!portalTokens || portalTokens.length === 0) { console.log('no portals'); return; }
  
  const tokenRecord = portalTokens[0];
  
  const formData = new FormData();
  formData.append('file', new Blob(['hello xero payload'], { type: 'text/plain' }), 'test-api.txt');
  formData.append('token', tokenRecord.token);
  formData.append('clientId', tokenRecord.client_id);
  
  // We will patch lib/xero/client.ts to console.error the exact reason
  // Actually, wait, the NextJS server logs the error! Let me read the NextJS server logs directly instead.
}
test();
