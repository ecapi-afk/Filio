import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');
async function test() {
  const { error } = await supabase.from('uploads').select('xero_attachment_id').limit(1);
  console.log(error);
}
test();
