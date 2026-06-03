import { getClientById, getClientByNumber } from '@/lib/data/clients'
import { ClientDetailClient } from './client-detail-client'
import { ClientDetailV3 } from './client-detail-v3'

const DEMO_CLIENT_ID = 'fcc6d2f0-5c33-4f5b-986a-6ae3a81c8afe'

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // Support both numeric client_number (e.g. /clients/42) and UUID
  const isNumeric = /^\d+$/.test(id)
  const client = isNumeric
    ? await getClientByNumber(Number(id))
    : await getClientById(id)

  if (!client) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Client not found</h2>
          <p className="text-gray-500">The client you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  // Canary deployment: render V3 for demo ID only
  if (client.id === DEMO_CLIENT_ID) {
    return <ClientDetailV3 client={client} />
  }

  return <ClientDetailClient client={client} />
}
