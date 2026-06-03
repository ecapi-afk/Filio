import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/uploads - Get upload history
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const clientId = searchParams.get('client_id')
  const managementStatus = searchParams.get('management_status')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  // Get firm_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single()

  if (!profile?.firm_id) {
    return NextResponse.json({ error: 'No firm associated' }, { status: 403 })
  }

  let query = supabase
    .from('uploads')
    .select(`
      id,
      client_id,
      filename,
      original_filename,
      file_type,
      file_size,
      xero_status,
      xero_upload_mode,
      channel,
      uploaded_at,
      clients (
        id,
        name,
        management_status
      )
    `)
    .eq('clients.firm_id', profile.firm_id)
    .order('uploaded_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (clientId) {
    query = query.eq('client_id', clientId)
  }

  if (managementStatus) {
    query = query.eq('clients.management_status', managementStatus)
  }

  const { data, error, count } = await query

  if (error) {
    console.error('Error fetching uploads:', error)
    return NextResponse.json({ error: 'Failed to fetch uploads' }, { status: 500 })
  }

  return NextResponse.json({
    data: data ?? [],
    count: count ?? 0,
    limit,
    offset,
  })
}
