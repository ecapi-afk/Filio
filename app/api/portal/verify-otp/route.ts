import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createHash, timingSafeEqual } from 'crypto'

function hashOTP(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}

export async function POST(request: NextRequest) {
  try {
    const { shortCode, otp } = await request.json() as { shortCode?: string; otp?: string }

    if (!shortCode || !otp) {
      return NextResponse.json({ error: 'shortCode and otp required' }, { status: 400 })
    }

    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json({ error: 'Invalid code format' }, { status: 400 })
    }

    const adminClient = await createAdminClient()

    // Find the most recent valid OTP for this short_code
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows } = await (adminClient as any)
      .from('portal_otps')
      .select('id, code_hash, expires_at, used_at')
      .eq('short_code', shortCode)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(5) as { data: { id: string; code_hash: string; expires_at: string; used_at: string | null }[] | null }

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Code not found or expired' }, { status: 401 })
    }

    const inputHash = hashOTP(otp)

    // Check against all recent valid OTPs (timing-safe comparison)
    const matched = rows.find(row => {
      try {
        return timingSafeEqual(
          Buffer.from(row.code_hash, 'hex'),
          Buffer.from(inputHash, 'hex')
        )
      } catch {
        return false
      }
    })

    if (!matched) {
      return NextResponse.json({ error: 'Incorrect code' }, { status: 401 })
    }

    // Mark OTP as used (consume it)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient as any)
      .from('portal_otps')
      .update({ used_at: new Date().toISOString() })
      .eq('id', matched.id)

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
