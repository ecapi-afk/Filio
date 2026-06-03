/**
 * Debug script: check jobs table and manually trigger process-jobs
 * Run: npx tsx scripts/debug-jobs.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const env: Record<string, string> = {}
readFileSync(join(__dirname, '..', '.env.local'), 'utf-8')
  .split('\n')
  .forEach(line => {
    const m = line.match(/^([^#=][^=]*)=(.*)$/)
    if (m) env[m[1].trim()] = m[2].trim()
  })

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

async function main() {
  console.log('\n=== 1. Recent uploads (email channel) ===')
  const { data: uploads } = await supabase
    .from('uploads')
    .select('id, filename, file_type, xero_status, channel, storage_path, uploaded_at')
    .eq('channel', 'email')
    .order('uploaded_at', { ascending: false })
    .limit(5)
  console.table(uploads)

  console.log('\n=== 2. Jobs table (all xero_sync) ===')
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, upload_id, status, attempts, error, created_at, last_attempt_at')
    .eq('type', 'xero_sync')
    .order('created_at', { ascending: false })
    .limit(10)
  console.table(jobs)

  console.log('\n=== 3. Cross-check: pending uploads with no job ===')
  const { data: pendingUploads } = await supabase
    .from('uploads')
    .select('id, filename, channel, xero_status')
    .eq('xero_status', 'pending')

  if (pendingUploads && pendingUploads.length > 0) {
    for (const u of pendingUploads) {
      const { data: job } = await supabase
        .from('jobs')
        .select('id, status')
        .eq('upload_id', u.id)
        .single()
      console.log(`Upload ${u.id} (${u.filename}) [${u.channel}] → job: ${job ? `${job.id} [${job.status}]` : 'MISSING'}`)
    }
  } else {
    console.log('No pending uploads found.')
  }

  console.log('\n=== 4. Firm Xero connection status ===')
  const { data: firms } = await supabase
    .from('firms')
    .select('id, name, xero_connection_status, xero_upload_mode')
  console.table(firms)

  console.log('\n=== 5. Storage bucket check ===')
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
  if (bucketsError) {
    console.error('Storage error:', bucketsError.message)
  } else {
    console.log('Buckets:', buckets?.map(b => b.name))
    const clientUploads = buckets?.find(b => b.name === 'client-uploads')
    console.log('client-uploads bucket:', clientUploads ? '✅ exists' : '❌ MISSING')
  }

  // Try downloading the most recent email upload from storage
  if (uploads && uploads[0]?.storage_path) {
    console.log(`\n=== 6. Storage download test (${uploads[0].storage_path}) ===`)
    const { data, error } = await supabase.storage
      .from('client-uploads')
      .download(uploads[0].storage_path)
    if (error) {
      console.error('❌ Download failed:', error.message)
    } else {
      console.log(`✅ Downloaded ${(await data.arrayBuffer()).byteLength} bytes`)
    }
  }
}

main().catch(console.error)
