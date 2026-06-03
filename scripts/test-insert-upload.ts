import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

// Read .env.local manually
const envPath = join(__dirname, '..', '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
const envVars: Record<string, string> = {}

envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) {
    envVars[match[1].trim()] = match[2].trim()
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testInsert() {
  console.log('Testing upload insert...\n')

  // Get a client ID
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name')
    .limit(1)

  if (!clients || clients.length === 0) {
    console.error('No clients found')
    return
  }

  const clientId = clients[0].id
  console.log(`Using client: ${clients[0].name} (${clientId})`)

  // Try to insert exactly like the API does
  const testData = {
    client_id: clientId,
    filename: 'test_file.pdf',
    original_filename: 'original_test.pdf',
    file_type: 'Invoice',
    file_size: 12345,
    channel: 'portal',
    xero_status: 'Synced',
    xero_attachment_id: 'test-123',
    xero_upload_mode: 'attachments'
  }

  console.log('\nAttempting to insert:', JSON.stringify(testData, null, 2))

  const { data, error } = await supabase
    .from('uploads')
    .insert(testData)
    .select()
    .single()

  if (error) {
    console.error('\n❌ INSERT FAILED!')
    console.error('Error:', error)
    console.error('\nError details:')
    console.error('- Code:', error.code)
    console.error('- Message:', error.message)
    console.error('- Details:', error.details)
    console.error('- Hint:', error.hint)
  } else {
    console.log('\n✅ INSERT SUCCESSFUL!')
    console.log('Inserted record:', data)

    // Clean up - delete the test record
    await supabase
      .from('uploads')
      .delete()
      .eq('id', data.id)
    console.log('\nTest record deleted.')
  }
}

testInsert()
