import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Client } from '@/lib/supabase/types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // Get current state
  const { data: client, error: fetchError } = await supabase
    .from('clients')
    .select('is_starred')
    .eq('id', id)
    .single()

  if (fetchError || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  // Toggle star - ensure boolean type
  const currentStarred = client.is_starred ?? false
  const newStarred = !currentStarred

  const { error: updateError } = await supabase
    .from('clients')
    .update({ is_starred: newStarred })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update star' }, { status: 500 })
  }

  return NextResponse.json({ success: true, is_starred: newStarred })
}
