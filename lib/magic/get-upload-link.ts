import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

/**
 * Returns the correct upload link for a client.
 * Prefers the active short_code (/m/[code]).
 * Falls back to /portal if no active short link exists.
 */
export async function getClientUploadLink(
  supabase: SupabaseClient<Database>,
  clientId: string
): Promise<string> {
  const { data } = await supabase
    .from('short_links')
    .select('short_code')
    .eq('client_id', clientId)
    .eq('is_active', true)
    .single()

  if (data?.short_code) {
    return `${APP_URL}/m/${data.short_code}`
  }

  return `${APP_URL}/portal`
}
