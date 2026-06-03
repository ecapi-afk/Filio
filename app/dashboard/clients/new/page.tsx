import { NewClientForm } from './new-client-form'

export default async function NewClientPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>
}) {
  const params = await searchParams
  return <NewClientForm initialMode={params.mode} />
}