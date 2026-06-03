import { createClient } from '@supabase/supabase-js';
import { uploadToXeroContactAttachment } from './lib/xero/client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: clients } = await supabase.from('clients').select('firm_id, xero_contact_id').not('xero_contact_id', 'is', null).limit(1);
  if (!clients || clients.length === 0) { console.log('No client with contact ID'); return; }
  
  const client = clients[0];
  console.log("Client:", client);
  
  const buf = Buffer.from('hello attachment payload', 'utf-8');
  const res = await uploadToXeroContactAttachment(client.firm_id, client.xero_contact_id, 'test-attach.txt', 'text/plain', buf);
  console.log("Upload result:", res);
}

test();
