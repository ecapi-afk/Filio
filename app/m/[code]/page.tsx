import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export default async function ShortLinkPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const supabase = await createAdminClient()

  // 1. Fetch short link with related portal_token and client
  const { data: linkData } = await supabase
    .from('short_links')
    .select('created_at, is_active, portal_tokens(token), clients(id, name, email)')
    .eq('short_code', code)
    .eq('is_active', true)
    .single()

  if (!linkData || !linkData.portal_tokens) {
    redirect('/portal/expired')
  }

  // Extract portal token (may be array or object depending on Supabase join)
  const portalToken = Array.isArray(linkData.portal_tokens)
    ? linkData.portal_tokens[0]?.token
    : (linkData.portal_tokens as any)?.token

  if (portalToken) {
    redirect(`/portal/upload?token=${portalToken}`)
  }

  redirect('/portal/expired')
}
