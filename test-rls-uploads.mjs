import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('uploads').select('*').limit(1);
  if (error) { console.error(error); return; }
  
  // We really want to check policies directly but we can't from postgrest.
  // We can switch to making an unprivileged request with an anon key and see what it returns!
  // BUT we want to see if the accountant can read it. Let's make a request with the accountant's auth token.
}
test();
