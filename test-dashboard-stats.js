require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
// I can't simulate auth token easily here, but we can do a fetch to the actual API route!
// Wait, to hit the API route I need Auth cookie.
