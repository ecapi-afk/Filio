import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const code = 'QP6Xl0';
  const { data, error } = await supabase
    .from('short_links')
    .select('*, portal_tokens(*), clients(*)')
    .eq('short_code', code)
    .single();
  console.log("Error:", error);
  console.log("Data:", JSON.stringify(data, null, 2));
}
test();
