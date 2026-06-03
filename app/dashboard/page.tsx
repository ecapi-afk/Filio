import { getDashboardData } from '@/lib/data/dashboard'
import { DashboardClient } from './dashboard-client'

export default async function DashboardPage() {
  const stats = await getDashboardData()

  return <DashboardClient stats={stats} initialClients={stats.clients} />
}