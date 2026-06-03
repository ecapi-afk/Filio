import { getUploads, getUploadStats } from '@/lib/data/uploads'
import { UploadsClient } from './uploads-client'

export default async function UploadsPage() {
  const [uploads, stats] = await Promise.all([
    getUploads({ limit: 50 }),
    getUploadStats(),
  ])

  return <UploadsClient initialUploads={uploads} initialStats={stats} />
}