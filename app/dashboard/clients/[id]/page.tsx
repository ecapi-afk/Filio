import { getClientById, getClientByNumber } from '@/lib/data/clients'
import { ClientDetailV3 } from './client-detail-v3'

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

  return <ClientDetailV3 client={client} />
}
