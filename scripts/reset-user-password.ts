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

async function resetPassword() {
  const email = 'zhanghaog@icloud.com';
  const newPassword = 'Admin123';

  console.log(`\n🔄 Resetting password for: ${email}\n`);

  // Get user ID
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error('❌ Error fetching users:', authError);
    return;
  }

  const user = authData.users.find(u => u.email === email);

  if (!user) {
    console.log('❌ User not found');
    return;
  }

  // Update password using admin API
  const { data, error } = await supabase.auth.admin.updateUserById(
    user.id,
    { password: newPassword }
  );

  if (error) {
    console.error('❌ Error resetting password:', error);
    return;
  }

  console.log('✅ Password reset successfully!');
  console.log('   New password:', newPassword);

  // Test login
  console.log('\n🔐 Testing login with new password...');

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: newPassword
  });

  if (signInError) {
    console.log('❌ Login failed:', signInError.message);
  } else {
    console.log('✅ Login successful!');
  }
}

resetPassword().catch(console.error);
