import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// DEFERRED: Batch ZIP download processing is temporarily disabled.
// Reason: ZIP assembly requires temporary server-side storage of user files,
// which has data handling and compliance implications that need further review.
// Resume when: A server-side streaming ZIP approach (no temp storage) is designed,
// or a dedicated secure temp storage policy is in place.
//
// Original implementation preserved below in comments.

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({ message: 'Batch download processing is currently disabled.' })
}

/*
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseAdmin = await createAdminClient()

  try {
    const { data: jobs } = await supabaseAdmin
      .from('download_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(5)

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ message: 'No pending jobs' })
    }

    for (const job of jobs) {
      await supabaseAdmin
        .from('download_jobs')
        .update({ status: 'processing' })
        .eq('id', job.id)

      try {
        const { data: uploads } = await supabaseAdmin
          .from('uploads')
          .select('storage_path, original_filename')
          .in('id', job.file_ids)

        if (!uploads || uploads.length === 0) {
          await supabaseAdmin
            .from('download_jobs')
            .update({ status: 'failed', completed_at: new Date().toISOString() })
            .eq('id', job.id)
          continue
        }

        const zipName = `Filio_Download_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.zip`

        const signedUrls = await Promise.all(
          uploads.map(async (upload) => {
            const { data } = await supabaseAdmin
              .storage
              .from('client-uploads')
              .createSignedUrl(upload.storage_path, 3600)
            return { ...upload, signedUrl: data?.signedUrl }
          })
        )

        // TODO: Replace placeholder with real ZIP assembly using jszip or archiver
        const { data: zipData, error: zipError } = await supabaseAdmin
          .storage
          .from('download-zips')
          .upload(zipName, Buffer.from('placeholder'), {
            contentType: 'application/zip',
            upsert: true,
          })

        if (zipError) {
          console.error('ZIP upload error:', zipError)
        }

        const { data: finalUrl } = await supabaseAdmin
          .storage
          .from('download-zips')
          .createSignedUrl(zipName, 3600)

        await supabaseAdmin
          .from('download_jobs')
          .update({
            status: 'done',
            zip_name: zipName,
            signed_url: finalUrl?.signedUrl,
            signed_url_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
            completed_at: new Date().toISOString(),
          })
          .eq('id', job.id)

        await supabaseAdmin.from('notifications').insert({
          firm_id: job.firm_id,
          user_id: job.created_by,
          type: 'download_ready',
          title: 'Download ready',
          body: `Your ZIP "${zipName}" is ready for download.`,
          metadata: { download_job_id: job.id, signed_url: finalUrl?.signedUrl },
        })

      } catch (err) {
        console.error('Job processing error:', err)
        await supabaseAdmin
          .from('download_jobs')
          .update({ status: 'failed', completed_at: new Date().toISOString() })
          .eq('id', job.id)
      }
    }

    return NextResponse.json({ success: true, processed: jobs.length })
  } catch (err) {
    console.error('Process download jobs error:', err)
    return NextResponse.json({ error: 'Failed to process jobs' }, { status: 500 })
  }
}
*/
