import { createClient } from '@supabase/supabase-js';
import { uploadToXeroInbox } from './lib/xero/client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: firms } = await supabase.from('firms').select('id').not('xero_tokens_encrypted', 'is', null).limit(1);
  if (!firms || firms.length === 0) { console.log('No connected firm'); return; }
  
  const firmId = firms[0].id;
  console.log("Firm ID:", firmId);
  
  const buf = Buffer.from('hello xero', 'utf-8');
  // It shouldn't error with cookies now because we use adminClient!
  const res = await uploadToXeroInbox(firmId, 'test1.txt', 'text/plain', buf);
  console.log("Upload result:", res);
}

test();
