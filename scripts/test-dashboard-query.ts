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

async function testDashboardQuery() {
  console.log('🧪 Testing Dashboard query logic...\n')

  // Get a firm
  const { data: firms } = await supabase
    .from('firms')
    .select('id, name')
    .limit(1)

  if (!firms || firms.length === 0) {
    console.error('No firms found')
    return
  }

  const firmId = firms[0].id
  console.log(`Testing with firm: ${firms[0].name} (${firmId})\n`)

  // Get clients for this firm
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name')
    .eq('firm_id', firmId)

  console.log(`Found ${clients?.length || 0} clients`)
  if (clients && clients.length > 0) {
    console.log('Client IDs:', clients.map(c => c.id).slice(0, 3))
  }
  console.log('')

  // Test the exact query from dashboard.ts
  const now = new Date()
  const firstDayOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

  console.log('Query parameters:')
  console.log('  First day of month:', firstDayOfMonth.toISOString())
  console.log('  Client IDs:', clients?.map(c => c.id) || [])
  console.log('')

  const { count: uploadThisMonth, error } = await supabase
    .from('uploads')
    .select('*', { count: 'exact', head: true })
    .in('client_id', clients?.map(c => c.id) || [])
    .gte('uploaded_at', firstDayOfMonth.toISOString())

  console.log('Query result:')
  console.log('  Count:', uploadThisMonth)
  console.log('  Error:', error)
  console.log('')

  // Get actual data to verify
  const { data: actualUploads } = await supabase
    .from('uploads')
    .select('id, client_id, filename, uploaded_at')
    .in('client_id', clients?.map(c => c.id) || [])
    .gte('uploaded_at', firstDayOfMonth.toISOString())
    .limit(5)

  console.log('Sample uploads:')
  actualUploads?.forEach(u => {
    console.log(`  - ${u.filename} (${u.uploaded_at})`)
  })
}

testDashboardQuery()
