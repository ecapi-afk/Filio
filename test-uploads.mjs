import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: uploads, error } = await supabase.from('uploads').select('*').order('uploaded_at', { ascending: false }).limit(5);
  if (error) {
    console.error("DB Error:", error);
  } else {
    console.log(`Found ${uploads.length} uploads:`);
    console.log(JSON.stringify(uploads, null, 2));
  }
}
test();
