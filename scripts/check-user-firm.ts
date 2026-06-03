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

async function checkUserFirm() {
  const email = 'zhanghaog@icloud.com'

  console.log(`🔍 Checking firm for user: ${email}\n`)

  // Get user
  const { data: authData } = await supabase.auth.admin.listUsers()
  const user = authData.users.find(u => u.email === email)

  if (!user) {
    console.error('User not found')
    return
  }

  console.log('User ID:', user.id)

  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single()

  console.log('Profile firm_id:', profile?.firm_id)
  console.log('')

  // Get firm
  const { data: firm } = await supabase
    .from('firms')
    .select('*')
    .eq('id', profile?.firm_id)
    .single()

  console.log('Firm:', firm?.name)
  console.log('Firm ID:', firm?.id)
  console.log('')

  // Get clients for this firm
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name')
    .eq('firm_id', profile?.firm_id)

  console.log(`Clients: ${clients?.length || 0}`)
  clients?.forEach(c => {
    console.log(`  - ${c.name} (${c.id})`)
  })
  console.log('')

  // Get uploads for these clients
  if (clients && clients.length > 0) {
    const now = new Date()
    const firstDayOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

    const { count: uploadCount } = await supabase
      .from('uploads')
      .select('*', { count: 'exact', head: true })
      .in('client_id', clients.map(c => c.id))
      .gte('uploaded_at', firstDayOfMonth.toISOString())

    console.log(`Uploads this month: ${uploadCount}`)
  }
}

checkUserFirm()
