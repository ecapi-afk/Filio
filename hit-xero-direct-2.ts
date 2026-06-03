import { createClient } from '@supabase/supabase-js';
import { uploadToXeroContactAttachment } from './lib/xero/client';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function test() {
  const { data: portalTokens } = await supabase.from('portal_tokens').select('token, client_id').limit(1);
  if (!portalTokens || portalTokens.length === 0) { console.log('no portals'); return; }
  const clientId = portalTokens[0].client_id;
  
  const { data: client } = await supabase.from('clients').select('id, firm_id, name, xero_contact_id').eq('id', clientId).single();
  if(!client) return console.log("client not found");
  
  console.log("Client contact details:", client.xero_contact_id);
  // Wait, if xero_contact_id is null, it should fallback to files! BUT what if xero_contact_id is NOT null, but it's an invalid contact id in Xero?
  
  const buf = Buffer.from('hello xero payload', 'utf-8');
  const res = await uploadToXeroContactAttachment(client.firm_id, client.xero_contact_id || 'MOCK', 'test-api.txt', 'text/plain', buf);
  console.log(res);
}
test();
