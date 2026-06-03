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
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('Supabase URL:', supabaseUrl ? 'Found' : 'Missing')
console.log('Supabase Key:', supabaseKey ? 'Found' : 'Missing')

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkUploads() {
  // Get total count of ALL uploads (no date filter)
  const { count: totalCount, error: totalError } = await supabase
    .from('uploads')
    .select('*', { count: 'exact', head: true })

  if (totalError) {
    console.error('Total count error:', totalError)
  } else {
    console.log('\n=== Total Uploads in Database ===')
    console.log('Total uploads (all time):', totalCount)
  }

  // Get all uploads (no limit)
  const { data: uploads, error } = await supabase
    .from('uploads')
    .select('id, filename, uploaded_at, client_id, xero_status, channel')
    .order('uploaded_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('\n=== Recent uploads (last 20) ===')
  if (uploads && uploads.length > 0) {
    uploads.forEach(u => {
      console.log(`- ${u.filename}`)
      console.log(`  Date: ${u.uploaded_at}`)
      console.log(`  Client: ${u.client_id}`)
      console.log(`  Status: ${u.xero_status}, Channel: ${u.channel}`)
      console.log('')
    })
  } else {
    console.log('No uploads found in database!')
  }

  // Check current month uploads
  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  console.log('\n=== Date Range ===')
  console.log('First day of month:', firstDayOfMonth.toISOString())
  console.log('Current date:', now.toISOString())

  const { count, error: countError } = await supabase
    .from('uploads')
    .select('*', { count: 'exact', head: true })
    .gte('uploaded_at', firstDayOfMonth.toISOString())

  if (countError) {
    console.error('Count error:', countError)
    return
  }

  console.log('\n=== Results ===')
  console.log('Total uploads this month:', count)

  // Get clients
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, firm_id, last_upload')
    .limit(5)

  console.log('\n=== Sample Clients ===')
  clients?.forEach(c => {
    console.log(`- ${c.name}`)
    console.log(`  ID: ${c.id}`)
    console.log(`  Firm: ${c.firm_id}`)
    console.log(`  Last Upload: ${c.last_upload || 'Never'}`)
    console.log('')
  })
}

checkUploads()
