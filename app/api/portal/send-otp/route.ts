import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendOTPEmail } from '@/lib/email/postmark'
import { createHash, randomInt } from 'crypto'

function hashOTP(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}

export async function POST(request: NextRequest) {
  try {
    const { shortCode } = await request.json() as { shortCode?: string }
    if (!shortCode) {
      return NextResponse.json({ error: 'shortCode required' }, { status: 400 })
    }

    const adminClient = await createAdminClient()

    // Resolve short_link → client + firm
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: link } = await (adminClient as any)
      .from('short_links')
      .select('is_active, clients(id, name, email, portal_email, firm_id, firms(name))')
      .eq('short_code', shortCode)
      .single() as {
        data: {
          is_active: boolean
          clients: {
            id: string
            name: string
            email: string | null
            portal_email: string | null
            firm_id: string
            firms: { name: string } | null
          } | null
        } | null
      }

    if (!link?.is_active || !link.clients) {
      return NextResponse.json({ error: 'Invalid or inactive portal link' }, { status: 404 })
    }

    const client = link.clients
    const recipientEmail = client.portal_email || client.email
    if (!recipientEmail) {
      return NextResponse.json({ error: 'No email address on file for this client' }, { status: 400 })
    }

    // Rate limit: max 3 unused unexpired OTPs per short_code
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (adminClient as any)
      .from('portal_otps')
      .select('id', { count: 'exact', head: true })
      .eq('short_code', shortCode)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString()) as { count: number | null }

    if ((count ?? 0) >= 3) {
      return NextResponse.json(
        { error: 'Too many pending codes. Please wait a few minutes before requesting another.' },
        { status: 429 }
      )
    }

    // Generate 6-digit OTP
    const otp = String(randomInt(100000, 999999))
    const codeHash = hashOTP(otp)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (adminClient as any)
      .from('portal_otps')
      .insert({ short_code: shortCode, code_hash: codeHash, expires_at: expiresAt })

    if (insertError) {
      return NextResponse.json({ error: 'Failed to create OTP' }, { status: 500 })
    }

    // Send email
    const firmName = client.firms?.name || 'Your accountant'
    await sendOTPEmail({
      to: recipientEmail,
      clientName: client.name,
      firmName,
      otpCode: otp,
    })

    return NextResponse.json({ success: true, maskedEmail: maskEmail(recipientEmail) })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function maskEmail(email: string): string {
  if (!email.includes('@')) return email
  const [local, domain] = email.split('@')
  return `${local[0]}***@${domain}`
}
