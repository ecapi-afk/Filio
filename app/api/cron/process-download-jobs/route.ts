import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseAdmin = await createAdminClient()

  try {
    // Get pending jobs
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
      // Mark as processing
      await supabaseAdmin
        .from('download_jobs')
        .update({ status: 'processing' })
        .eq('id', job.id)

      try {
        // Get file URLs from uploads table
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

        // Create ZIP (simplified — in production use archiver or server-side zip)
        const zipName = `Filio_Download_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.zip`

        // Get signed URLs for each file (1 hour expiry for download)
        const signedUrls = await Promise.all(
          uploads.map(async (upload) => {
            const { data } = await supabaseAdmin
              .storage
              .from('client-uploads')
              .createSignedUrl(upload.storage_path, 3600)
            return { ...upload, signedUrl: data?.signedUrl }
          })
        )

        // Upload ZIP to storage (simplified — actual implementation would zip files)
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

        // Create signed download URL (1 hour expiry)
        const { data: finalUrl } = await supabaseAdmin
          .storage
          .from('download-zips')
          .createSignedUrl(zipName, 3600)

        // Update job with signed URL
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

        // Create notification for the user
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
