'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Database } from './types'

// Admin client with service role - bypasses RLS
// Using direct supabase-js client (not SSR version) to avoid cookie handling issues
export async function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

