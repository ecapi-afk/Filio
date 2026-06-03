import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Debug endpoint to test firm creation
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const results: Record<string, any> = {
    hasUser: !!user,
    userId: user?.id || null,
  }

  if (user) {
    // Try to create a firm
    const { data: firm, error: firmError } = await supabase
      .from('firms')
      .insert({ name: 'Test Firm' })
      .select()
      .single()

    results.firm = firm
    results.firmError = firmError

    if (firm) {
      // Try to update profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      results.profile = profile
      results.profileError = profileError

      if (profile) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ firm_id: firm.id })
          .eq('id', user.id)

        results.updateError = updateError
      }
    }
  }

  return NextResponse.json(results)
}
