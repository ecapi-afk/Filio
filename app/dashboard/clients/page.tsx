import { getClients } from '@/lib/data/clients'
import { ClientsClient } from './clients-client'

export default async function ClientsPage() {
  const clients = await getClients({ includeDeleted: true })

  return <ClientsClient initialClients={clients} />
}