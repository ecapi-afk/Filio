import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import * as postmark from 'postmark'

async function requireAdmin(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null
  return user
}

// POST /api/admin/firms/[firmId]/email
// Body: { subject: string, body: string }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ firmId: string }> }
) {
  const user = await requireAdmin(request)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { firmId } = await params
  const { subject, body } = await request.json()

  if (!subject?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'subject and body are required' }, { status: 400 })
  }

  const admin = await createAdminClient()

  // Get the firm owner email
  const { data: profile } = await admin
    .from('profiles')
    .select('email, full_name')
    .eq('firm_id', firmId)
    .single()

  if (!profile?.email) {
    return NextResponse.json({ error: 'No email found for this firm' }, { status: 404 })
  }

  const client = new postmark.ServerClient(process.env.POSTMARK_API_KEY!)

  await client.sendEmail({
    From: process.env.POSTMARK_FROM_EMAIL!,
    To: (profile as any).email,
    Subject: subject,
    TextBody: body,
    HtmlBody: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <p>${body.replace(/\n/g, '<br>')}</p>
      <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb">
      <p style="color:#9ca3af;font-size:12px">Filio · filio.uk</p>
    </div>`,
    MessageStream: 'outbound',
  })

  return NextResponse.json({ success: true, sentTo: (profile as any).email })
}
