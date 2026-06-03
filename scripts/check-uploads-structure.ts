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

async function checkStructure() {
  console.log('\n🔍 Checking uploads table structure and constraints...\n');

  // Try to get a sample upload record structure
  const { data: sample, error: sampleError } = await supabase
    .from('uploads')
    .select('*')
    .limit(1);

  if (sampleError) {
    console.error('❌ Error querying uploads:', sampleError);
  } else {
    console.log('✅ Can query uploads table');
    console.log('📊 Sample record structure:', sample?.[0] ? Object.keys(sample[0]) : 'No records');
  }

  // Check clients table for reference
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('id, firm_id, name')
    .limit(1);

  if (clientsError) {
    console.error('❌ Error querying clients:', clientsError);
  } else {
    console.log('\n✅ Sample client:', clients?.[0]);
  }

  // Try to insert a test record with service role (should bypass RLS)
  console.log('\n🧪 Testing insert with service role key...\n');

  const testUpload = {
    client_id: clients?.[0]?.id || 'test-client-id',
    filename: 'test-rls-check.pdf',
    file_size: 1024,
    file_type: 'Other',
    channel: 'portal',
    xero_status: 'Synced',
    original_filename: 'test-rls-check.pdf',
    xero_upload_mode: 'attachments'
  };

  const { data: insertData, error: insertError } = await supabase
    .from('uploads')
    .insert(testUpload)
    .select();

  if (insertError) {
    console.error('❌ Insert failed:', insertError);
    console.log('\n📋 Error details:');
    console.log('  Code:', insertError.code);
    console.log('  Message:', insertError.message);
    console.log('  Details:', insertError.details);
    console.log('  Hint:', insertError.hint);
  } else {
    console.log('✅ Insert successful:', insertData);

    // Clean up test record
    if (insertData?.[0]?.id) {
      await supabase
        .from('uploads')
        .delete()
        .eq('id', insertData[0].id);
      console.log('🧹 Test record cleaned up');
    }
  }
}

checkStructure().catch(console.error);
