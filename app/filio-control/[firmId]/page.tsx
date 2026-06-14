import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import FirmDetailClient from './firm-detail-client'

export const dynamic = 'force-dynamic'

export default async function AdminFirmPage({ params }: { params: Promise<{ firmId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    redirect('/dashboard')
  }

  const { firmId } = await params
  return <FirmDetailClient firmId={firmId} />
}
