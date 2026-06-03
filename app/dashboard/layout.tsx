import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardSidebar } from '@/components/dashboard/sidebar'
import { DashboardHeader } from '@/components/dashboard/header'

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

  // Get Xero connection status
  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id, firms(xero_connection_status, name)')
    .eq('id', user.id)
    .single()

  const isXeroConnected = (profile?.firms as any)?.xero_connection_status === 'connected'

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F3F4F6' }}>
      <DashboardSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden ml-60">
        <DashboardHeader isXeroConnected={isXeroConnected} />
        <main className="flex-1 overflow-y-auto p-7">
          {children}
        </main>
      </div>
    </div>
  )
}
