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

async function addTimezoneColumn() {
  console.log('🕐 Adding timezone column to firms table...\n')

  // Check if column already exists
  const { data: existingFirms } = await supabase
    .from('firms')
    .select('*')
    .limit(1)

  if (existingFirms && existingFirms.length > 0) {
    const hasTimezone = 'timezone' in existingFirms[0]
    if (hasTimezone) {
      console.log('✅ Timezone column already exists')
      console.log('Current value:', existingFirms[0].timezone)
      return
    }
  }

  console.log('⚠️  Timezone column does not exist')
  console.log('Please run this SQL in Supabase SQL Editor:\n')
  console.log('----------------------------------------')
  console.log(`ALTER TABLE firms
ADD COLUMN timezone TEXT DEFAULT 'Europe/London' NOT NULL;

COMMENT ON COLUMN firms.timezone IS 'IANA timezone identifier (e.g., Europe/London, America/New_York, Asia/Shanghai)';`)
  console.log('----------------------------------------')
}

addTimezoneColumn()
