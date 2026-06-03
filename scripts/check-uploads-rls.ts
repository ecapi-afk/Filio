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

async function checkRLS() {
  console.log('\n🔍 Checking uploads table RLS policies...\n');

  // Query pg_policies to get RLS policies for uploads table
  const { data: policies, error } = await supabase
    .rpc('exec_sql', {
      query: `
        SELECT
          schemaname,
          tablename,
          policyname,
          permissive,
          roles,
          cmd,
          qual,
          with_check
        FROM pg_policies
        WHERE tablename = 'uploads'
        ORDER BY policyname;
      `
    });

  if (error) {
    console.error('❌ Error querying policies:', error);

    // Try alternative method
    console.log('\n📋 Trying alternative query...\n');

    const { data: altData, error: altError } = await supabase
      .from('uploads')
      .select('*')
      .limit(1);

    if (altError) {
      console.log('❌ Query error:', altError);
    } else {
      console.log('✅ Can query uploads table');
    }

    return;
  }

  if (!policies || policies.length === 0) {
    console.log('⚠️  No RLS policies found for uploads table');
  } else {
    console.log('✅ Found RLS policies:');
    policies.forEach((policy: any) => {
      console.log(`\n  Policy: ${policy.policyname}`);
      console.log(`  Command: ${policy.cmd}`);
      console.log(`  Roles: ${policy.roles}`);
      console.log(`  Using: ${policy.qual || 'N/A'}`);
      console.log(`  With check: ${policy.with_check || 'N/A'}`);
    });
  }

  // Check if RLS is enabled
  const { data: rlsStatus, error: rlsError } = await supabase
    .rpc('exec_sql', {
      query: `
        SELECT relname, relrowsecurity
        FROM pg_class
        WHERE relname = 'uploads';
      `
    });

  if (!rlsError && rlsStatus) {
    console.log('\n📊 RLS Status:');
    console.log('  Enabled:', rlsStatus[0]?.relrowsecurity ? 'Yes' : 'No');
  }
}

checkRLS().catch(console.error);
