import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { OTPClient } from './otp-client'

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

  // 2. Check 30-minute window
  // In a real app we would check `last_sent_at`, but for now `created_at` will demonstrate the window.
  const isWithin30Mins = Date.now() - new Date(linkData.created_at).getTime() < 30 * 60 * 1000

  // Ensure portal_tokens is extracted as a single object if array
  const portalToken = Array.isArray(linkData.portal_tokens) 
    ? linkData.portal_tokens[0]?.token 
    : (linkData.portal_tokens as any)?.token

  if (isWithin30Mins && portalToken) {
    // Bypass OTP, go straight to upload
    redirect(`/portal/upload?token=${portalToken}`)
  }

  // Ensure client exists
  const clientData = Array.isArray(linkData.clients) ? linkData.clients[0] : linkData.clients

  // 3. Require OTP verification
  return (
    <OTPClient 
      code={code} 
      portalToken={portalToken} 
      clientName={clientData?.name || 'Client'}
      clientEmail={clientData?.email || 'your email'}
    />
  )
}
