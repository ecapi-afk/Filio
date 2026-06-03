import { createClient } from '@supabase/supabase-js';
import { ensureFreshAccessToken } from './lib/xero/client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: firms } = await supabase.from('firms').select('id, xero_tokens_encrypted').not('xero_tokens_encrypted', 'is', null).limit(1);
  if (!firms || firms.length === 0) { console.log('No connected firm'); return; }
  
  const firmId = firms[0].id;
  const tokens = await ensureFreshAccessToken(firmId);
  if (!tokens) { console.log('No tokens'); return; }
  
  console.log("Got tokens, fetching inbox...");
  
  const response = await fetch('https://api.xero.com/files.xro/1.0/Inbox', {
    headers: {
      'Authorization': `Bearer ${tokens.accessToken}`,
      'xero-tenant-id': tokens.tenantId,
      'Accept': 'application/json'
    }
  });
  
  const data = await response.json();
  console.log(data);
}

test();
