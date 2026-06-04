import { NextRequest, NextResponse } from 'next/server'

// DEFERRED: Batch ZIP download is temporarily disabled.
// Reason: Requires server-side temporary storage of user files during ZIP assembly,
// which has data handling and compliance implications that need further review.
// Resume when: A server-side streaming ZIP approach (no temp storage) is designed,
// or a dedicated secure temp storage policy is in place.
//
// Original implementation preserved below in comments.

export async function POST(_request: NextRequest) {
  return NextResponse.json(
    { error: 'Batch download is not available yet. Please download files individually.' },
    { status: 501 }
  )
}

export async function GET(_request: NextRequest) {
  return NextResponse.json(
    { error: 'Batch download is not available yet.' },
    { status: 501 }
  )
}

/*
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST — Create a batch download job
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single()

  if (!profile?.firm_id) {
    return NextResponse.json({ error: 'No firm associated' }, { status: 403 })
  }

  try {
    const { fileIds } = await request.json()

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json({ error: 'No files selected' }, { status: 400 })
    }

    if (fileIds.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 files per download' }, { status: 400 })
    }

    const supabaseAdmin = await createAdminClient()

    // Verify all files belong to this firm
    const { data: uploads } = await supabaseAdmin
      .from('uploads')
      .select('id')
      .in('id', fileIds)

    if (!uploads || uploads.length !== fileIds.length) {
      return NextResponse.json({ error: 'Some files not found' }, { status: 400 })
    }

    // Create download job
    const { data: job, error } = await supabaseAdmin
      .from('download_jobs')
      .insert({
        firm_id: profile.firm_id,
        created_by: user.id,
        file_ids: fileIds,
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: 'Download is being prepared. You will be notified when ready.',
    })
  } catch (err) {
    console.error('Create download job error:', err)
    return NextResponse.json({ error: 'Failed to create download job' }, { status: 500 })
  }
}

// GET — Check job status
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const jobId = searchParams.get('jobId')

  if (!jobId) {
    return NextResponse.json({ error: 'Job ID required' }, { status: 400 })
  }

  const { data: job } = await supabase
    .from('download_jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  return NextResponse.json({ data: job })
}
*/
