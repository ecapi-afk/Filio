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

async function checkUploads() {
  console.log('📊 Checking uploads table...\n')

  // Get all uploads
  const { data: uploads, error } = await supabase
    .from('uploads')
    .select('*')
    .order('uploaded_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error('❌ Error:', error)
    return
  }

  console.log(`✅ Found ${uploads?.length || 0} uploads (showing last 10):\n`)

  if (uploads && uploads.length > 0) {
    uploads.forEach((upload, index) => {
      console.log(`${index + 1}. Upload ID: ${upload.id}`)
      console.log(`   Client ID: ${upload.client_id}`)
      console.log(`   Filename: ${upload.filename}`)
      console.log(`   Original Filename: ${upload.original_filename}`)
      console.log(`   File Type: ${upload.file_type}`)
      console.log(`   File Size: ${upload.file_size} bytes`)
      console.log(`   Xero Status: ${upload.xero_status}`)
      console.log(`   Xero Attachment ID: ${upload.xero_attachment_id}`)
      console.log(`   Channel: ${upload.channel}`)
      console.log(`   Upload Mode: ${upload.xero_upload_mode}`)
      console.log(`   Uploaded At: ${upload.uploaded_at}`)
      console.log('')
    })

    // Show table structure
    console.log('📋 Table structure (fields):')
    const fields = Object.keys(uploads[0])
    fields.forEach(field => {
      console.log(`   - ${field}`)
    })
  } else {
    console.log('⚠️  No uploads found in the table')
  }

  // Get count by month
  const now = new Date()
  const firstDayOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

  console.log(`\n🔍 Counting uploads since: ${firstDayOfMonth.toISOString()}`)

  const { data: monthlyCount, error: countError } = await supabase
    .from('uploads')
    .select('id', { count: 'exact', head: true })
    .gte('uploaded_at', firstDayOfMonth.toISOString())

  if (!countError) {
    console.log(`📈 Uploads this month: ${monthlyCount || 0}`)
  } else {
    console.error('❌ Count error:', countError)
  }
}

checkUploads()
