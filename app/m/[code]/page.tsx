import { createAdminClient } from '@/lib/supabase/admin'
import { isTrialExpired } from '@/lib/auth/trial'
import { redirect } from 'next/navigation'

export default async function ShortLinkPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const supabase = await createAdminClient()

  // Fetch short link with client firm_id and portal token in one query
  const { data: linkData } = await supabase
    .from('short_links')
    .select('is_active, portal_tokens(token), clients(id, firm_id)')
    .eq('short_code', code)
    .eq('is_active', true)
    .single()

  if (!linkData || !linkData.portal_tokens) {
    redirect('/portal/expired')
  }

  // Check firm billing — block portal access if trial expired or subscription lapsed
  const client = Array.isArray(linkData.clients)
    ? linkData.clients[0]
    : (linkData.clients as any)

  if (client?.firm_id) {
    const expired = await isTrialExpired(supabase, client.firm_id)
    if (expired) {
      redirect('/portal/billing-paused')
    }
  }

  const portalToken = Array.isArray(linkData.portal_tokens)
    ? linkData.portal_tokens[0]?.token
    : (linkData.portal_tokens as any)?.token

  if (portalToken) {
    redirect(`/portal/upload?token=${portalToken}`)
  }

  redirect('/portal/expired')
}
