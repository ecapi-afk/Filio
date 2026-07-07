import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardSidebar } from '@/components/dashboard/sidebar'
import { DashboardHeader } from '@/components/dashboard/header'
import { TrialBanner } from '@/components/dashboard/trial-banner'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get Xero connection status + firm for subscription lookup
  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id, firms(xero_connection_status, name)')
    .eq('id', user.id)
    .single()

  const isXeroConnected = (profile?.firms as any)?.xero_connection_status === 'connected'

  // Fetch subscription to check trial status
  let subscription: { plan: string; trial_ends_at: string | null; created_at: string } | null = null
  if (profile?.firm_id) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan, trial_ends_at, created_at')
      .eq('firm_id', profile.firm_id)
      .single()
    subscription = sub ?? null
  }

  const isTrial = subscription?.plan === 'trial'

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F3F4F6' }}>
      <DashboardSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden lg:ml-60">
        <DashboardHeader isXeroConnected={isXeroConnected} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-7">
          {isTrial && subscription && (
            <TrialBanner
              trialEndsAt={subscription.trial_ends_at}
              createdAt={subscription.created_at}
            />
          )}
          {children}
        </main>
      </div>
    </div>
  )
}
