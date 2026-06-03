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

async function checkTimezones() {
  console.log('🕐 Checking database timezone settings and data...\n')

  // Check current system timezone
  const now = new Date()
  console.log('System Info:')
  console.log('  Current time (local):', now.toString())
  console.log('  Current time (UTC):', now.toUTCString())
  console.log('  Current time (ISO):', now.toISOString())
  console.log('  Timezone offset:', now.getTimezoneOffset(), 'minutes')
  console.log('')

  // Get sample uploads with timestamps
  const { data: uploads } = await supabase
    .from('uploads')
    .select('id, filename, uploaded_at')
    .order('uploaded_at', { ascending: false })
    .limit(5)

  console.log('Recent uploads (raw timestamps from DB):')
  uploads?.forEach(u => {
    const date = new Date(u.uploaded_at)
    console.log(`  ${u.filename}`)
    console.log(`    DB value: ${u.uploaded_at}`)
    console.log(`    Parsed (local): ${date.toString()}`)
    console.log(`    Parsed (UTC): ${date.toUTCString()}`)
    console.log('')
  })

  // Check firms table for timezone field
  const { data: firms } = await supabase
    .from('firms')
    .select('*')
    .limit(1)

  if (firms && firms.length > 0) {
    console.log('Firms table structure:')
    console.log('  Fields:', Object.keys(firms[0]))
    console.log('  Has timezone field?', 'timezone' in firms[0] ? 'Yes' : 'No')
    console.log('')
  }

  // Test date range query
  const firstDayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const firstDayLocal = new Date(now.getFullYear(), now.getMonth(), 1)

  console.log('Date range comparison:')
  console.log('  First day (UTC):', firstDayUTC.toISOString())
  console.log('  First day (local):', firstDayLocal.toISOString())
  console.log('')

  const { count: countUTC } = await supabase
    .from('uploads')
    .select('*', { count: 'exact', head: true })
    .gte('uploaded_at', firstDayUTC.toISOString())

  const { count: countLocal } = await supabase
    .from('uploads')
    .select('*', { count: 'exact', head: true })
    .gte('uploaded_at', firstDayLocal.toISOString())

  console.log('Query results:')
  console.log('  Count with UTC date:', countUTC)
  console.log('  Count with local date:', countLocal)
}

checkTimezones()
