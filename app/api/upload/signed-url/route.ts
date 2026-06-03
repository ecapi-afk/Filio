import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function generateCleanFilename(
  clientName: string,
  fileType: string,
  originalExt: string
): string {
  const safeName = clientName.replace(/[^a-zA-Z0-9]/g, '')
  const safeType = fileType.replace(/[^a-zA-Z0-9]/g, '')
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${safeName}_${safeType}_${yyyy}${mm}${dd}.${originalExt}`
}

// POST /api/upload/signed-url
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientId, originalFilename, fileType, token } = body

    if (!clientId || !originalFilename || !fileType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = token ? await createAdminClient() : await createClient()

    let channel = 'manual'

    if (token) {
      channel = 'portal'
      // Verify portal token
      const { data: portalToken } = await supabase
        .from('portal_tokens')
        .select('*')
        .eq('token', token)
        .eq('client_id', clientId)
        .gt('expires_at', new Date().toISOString())
        .single()
        
      if (!portalToken) {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 403 })
      }
    } else {
      // Manual upload - verify user is logged in
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
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      
      // We will verify client firm_id belongs to user in the client check below
    }

    // Get client info
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, firm_id, management_status')
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Check if client is dormant/deleted
    if (client.management_status !== 'active') {
      return NextResponse.json({ error: 'Client portal is not active' }, { status: 403 })
    }

    if (!token) {
      // If manual, finish verifying client belongs to user's firm
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = await supabase.from('profiles').select('firm_id').eq('id', user?.id).single()
      if (profile?.firm_id !== client.firm_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Generate standardized filename
    const extMatch = originalFilename.match(/\.([^.]+)$/)
    const ext = extMatch ? extMatch[1].toLowerCase() : 'unknown'
    const finalFilename = generateCleanFilename(client.name, fileType, ext)

    // Generate storage path
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const storagePath = `${client.firm_id}/${client.id}/${randomSuffix}_${finalFilename}`

    // Create signed upload URL
    const { data, error } = await supabase.storage
      .from('client-uploads')
      .createSignedUploadUrl(storagePath)

    if (error || !data) {
      console.error('Error creating signed URL:', error)
      return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      signedUrl: data.signedUrl,
      path: data.path,
      finalFilename,
      channel,
    })
  } catch (err) {
    console.error('Error in signed-url:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
