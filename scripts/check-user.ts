import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Read .env.local manually
const envPath = join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};

envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkUser() {
  const email = 'zhanghaog@icloud.com';

  console.log(`\n🔍 Checking user: ${email}\n`);

  // Check if user exists in auth.users
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error('❌ Error fetching users:', authError);
    return;
  }

  const user = authData.users.find(u => u.email === email);

  if (!user) {
    console.log('❌ User not found in auth.users');
    return;
  }

  console.log('✅ User found in auth.users:');
  console.log('   ID:', user.id);
  console.log('   Email:', user.email);
  console.log('   Email confirmed:', user.email_confirmed_at ? 'Yes' : 'No');
  console.log('   Created:', user.created_at);
  console.log('   Last sign in:', user.last_sign_in_at || 'Never');

  // Check profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profile) {
    console.log('\n✅ Profile found:');
    console.log('   Firm ID:', profile.firm_id);
    console.log('   Full name:', profile.full_name);
  }

  // Try to sign in with the password
  console.log('\n🔐 Testing login with password "Admin123"...');

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: 'Admin123'
  });

  if (signInError) {
    console.log('❌ Login failed:', signInError.message);
  } else {
    console.log('✅ Login successful!');
  }
}

checkUser().catch(console.error);
