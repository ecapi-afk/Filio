'use server'

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { Database } from './types'

// @supabase/ssr@0.5.2 compiled types import from a path that no longer exists
// in @supabase/supabase-js@2.103.0 (dist/module/lib/types), causing Schema to
// resolve as never. We cast to SupabaseClient<Database> so TypeScript correctly
// infers the schema from our Database type.
export async function createClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Ignore cookie errors in server components
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // Ignore cookie errors
          }
        },
      },
    }
  ) as unknown as SupabaseClient<Database>
}
