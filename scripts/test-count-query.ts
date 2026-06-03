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
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function testQuery() {
  console.log('🧪 Testing different query methods...\n')

  const cutoffDate = '2026-04-01T00:00:00.000Z'
  console.log(`Cutoff date: ${cutoffDate}\n`)

  // Method 1: count with head: true
  const { count: count1, error: error1 } = await supabase
    .from('uploads')
    .select('*', { count: 'exact', head: true })
    .gte('uploaded_at', cutoffDate)

  console.log('Method 1 (head: true):')
  console.log('  Count:', count1)
  console.log('  Error:', error1)

  // Method 2: count with actual data
  const { data: data2, count: count2, error: error2 } = await supabase
    .from('uploads')
    .select('*', { count: 'exact' })
    .gte('uploaded_at', cutoffDate)

  console.log('\nMethod 2 (with data):')
  console.log('  Count:', count2)
  console.log('  Records:', data2?.length)
  console.log('  Error:', error2)

  if (data2 && data2.length > 0) {
    console.log('\n  Sample records:')
    data2.slice(0, 3).forEach(record => {
      console.log(`    - ${record.filename} (${record.uploaded_at})`)
    })
  }

  // Method 3: Total count
  const { count: totalCount, error: totalError } = await supabase
    .from('uploads')
    .select('*', { count: 'exact', head: true })

  console.log('\nMethod 3 (total count):')
  console.log('  Count:', totalCount)
  console.log('  Error:', totalError)
}

testQuery()
