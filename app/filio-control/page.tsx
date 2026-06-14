import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminListClient from './admin-list-client'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Admin — Filio Control' }

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    redirect('/dashboard')
  }

  return <AdminListClient />
}
