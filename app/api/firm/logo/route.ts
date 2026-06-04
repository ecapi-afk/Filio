import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const BUCKET = 'firm-logos'
const MAX_BYTES = 2 * 1024 * 1024 // 2 MB
const ALLOWED_TYPES = ['image/png', 'image/svg+xml', 'image/jpeg', 'image/webp']

async function getFirmId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', userId)
    .single() as { data: { firm_id: string } | null }
  return data?.firm_id ?? null
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const firmId = await getFirmId(supabase, user.id)
  if (!firmId) return NextResponse.json({ error: 'No firm' }, { status: 403 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 2 MB)' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type. Use PNG, SVG, JPEG or WebP' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() ?? 'png'
  const path = `${firmId}/logo.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const adminClient = await createAdminClient()

  // Ensure the bucket exists (idempotent)
  const { data: bucket } = await adminClient.storage.getBucket(BUCKET)
  if (!bucket) {
    await adminClient.storage.createBucket(BUCKET, { public: true })
  }

  const { error: uploadError } = await adminClient.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (uploadError) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  const { data: publicUrl } = adminClient.storage.from(BUCKET).getPublicUrl(path)
  const logoUrl = publicUrl.publicUrl

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (adminClient as any)
    .from('firms')
    .update({ logo_url: logoUrl })
    .eq('id', firmId)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to save logo URL' }, { status: 500 })
  }

  return NextResponse.json({ url: logoUrl })
}

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const firmId = await getFirmId(supabase, user.id)
  if (!firmId) return NextResponse.json({ error: 'No firm' }, { status: 403 })

  const adminClient = await createAdminClient()

  // Remove all logo files for this firm
  const { data: files } = await adminClient.storage.from(BUCKET).list(firmId)
  if (files?.length) {
    await adminClient.storage.from(BUCKET).remove(files.map(f => `${firmId}/${f.name}`))
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any).from('firms').update({ logo_url: null }).eq('id', firmId)

  return NextResponse.json({ success: true })
}
