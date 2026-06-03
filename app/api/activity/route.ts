import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ActivityType } from '@/lib/constants/activity'

export interface ActivityItem {
  id: string
  type: ActivityType
  clientName: string
  clientId: string | null
  description: string
  timestamp: string
  xeroStatus?: 'synced' | 'pending' | 'failed'
  fileName?: string
  originalFileName?: string | null
}

// Map audit_log action names to our ActivityType enum
const ACTION_TO_ACTIVITY_TYPE: Record<string, ActivityType> = {
  file_uploaded: 'upload',
  upload_created: 'upload',
  email_received: 'email',
  magic_email_received: 'email',
  all_magic_emails_regenerated: 'email',
  manual_reminder_sent: 'reminder',
  client_created: 'client_added',
  xero_contacts_imported: 'client_added',
  client_updated: 'info_change',
  client_set_dormant: 'client_dormant',
  client_deleted: 'client_deleted',
  client_reactivated: 'client_added',
  xero_connected: 'status_change',
  xero_synced: 'status_change',
  period_updated: 'config_change',
  portal_token_regenerated: 'info_change',
  magic_link_sent: 'info_change',
}

function describeAction(action: string, metadata: any, clientName: string): string {
  switch (action) {
    case 'client_created': return `Client ${metadata?.name || clientName} was created`
    case 'client_updated': return `Client info updated: ${Array.isArray(metadata?.changes) ? metadata.changes.join(', ') : 'details changed'}`
    case 'client_deleted': return `Client deleted`
    case 'client_set_dormant': return `Set to dormant${metadata?.reason ? `: ${metadata.reason}` : ''}`
    case 'client_reactivated': return `Client reactivated`
    case 'manual_reminder_sent': return `Reminder sent to ${metadata?.sent_to || 'client'}`
    case 'magic_link_sent': return `Portal link sent to ${metadata?.sent_to || 'client'}`
    case 'xero_connected': return `Xero connected (${metadata?.tenantName || ''})`
    case 'xero_synced': return `Xero sync: ${metadata?.added || 0} added, ${metadata?.updated || 0} updated`
    case 'xero_contacts_imported': return `${metadata?.imported || ''} contacts imported from Xero`
    case 'period_updated': return `Accounting period updated`
    case 'portal_token_regenerated': return `Portal access link regenerated`
    case 'all_magic_emails_regenerated': return `All magic emails regenerated`
    default: return action.replace(/_/g, ' ')
  }
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const adminClient = await createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single()

  if (!profile?.firm_id) return NextResponse.json({ error: 'No firm' }, { status: 403 })

  const firmId = profile.firm_id
  const { searchParams } = new URL(request.url)
  const typeFilter = searchParams.get('type') // e.g. 'upload', 'reminder', etc.
  const limit = parseInt(searchParams.get('limit') || '50')

  // --- Fetch audit log events ---
  const { data: auditRows } = await adminClient
    .from('audit_logs')
    .select('id, client_id, actor, action, metadata, created_at')
    .eq('firm_id', firmId)
    .order('created_at', { ascending: false })
    .limit(100)

  // --- Fetch recent uploads separately (they have richer data) ---
  const { data: uploadRows } = await adminClient
    .from('uploads')
    .select('id, client_id, filename, original_filename, xero_status, channel, uploaded_at')
    .order('uploaded_at', { ascending: false })
    .limit(100)
    // filter uploads belonging to this firm by joining clients
    .in('client_id', (await adminClient
      .from('clients')
      .select('id')
      .eq('firm_id', firmId)
    ).data?.map(c => c.id) || [])

  // --- Fetch client names for lookups ---
  const allClientIds = [
    ...new Set([
      ...(auditRows || []).map(r => r.client_id).filter(Boolean),
      ...(uploadRows || []).map(r => r.client_id),
    ])
  ]

  const { data: clientRows } = await adminClient
    .from('clients')
    .select('id, name')
    .in('id', allClientIds as string[])

  const clientMap: Record<string, string> = {}
  for (const c of clientRows || []) clientMap[c.id] = c.name

  // --- Build unified activity list ---
  const activities: ActivityItem[] = []

  // Add uploads
  for (const u of uploadRows || []) {
    const channel = u.channel || 'upload'
    let activityType: ActivityType = 'upload'
    if (channel === 'email') activityType = 'email'

    activities.push({
      id: `upload-${u.id}`,
      type: activityType,
      clientName: clientMap[u.client_id] || 'Unknown Client',
      clientId: u.client_id,
      description: `Uploaded ${u.filename}`,
      fileName: u.filename,
      originalFileName: u.original_filename ?? null,
      timestamp: u.uploaded_at,
      xeroStatus: (() => {
        const s = (u.xero_status || '').toLowerCase()
        if (s === 'synced') return 'synced' as const
        if (s === 'failed' || s === 'error') return 'failed' as const
        if (s === 'pending') return 'pending' as const
        return undefined
      })(),
    })
  }

  // Add audit log events (excluding pure upload events already covered)
  const UPLOAD_ACTIONS = new Set(['file_uploaded', 'upload_created'])
  for (const row of auditRows || []) {
    if (UPLOAD_ACTIONS.has(row.action)) continue
    const activityType = ACTION_TO_ACTIVITY_TYPE[row.action]
    if (!activityType) continue
    const clientName = row.client_id ? (clientMap[row.client_id] || 'Unknown Client') : 'System'
    activities.push({
      id: `log-${row.id}`,
      type: activityType,
      clientName,
      clientId: row.client_id,
      description: describeAction(row.action, row.metadata, clientName),
      timestamp: row.created_at,
    })
  }

  // Sort by timestamp desc
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  // Apply type filter if provided
  const filtered = typeFilter && typeFilter !== 'All'
    ? activities.filter(a => a.type === typeFilter)
    : activities

  return NextResponse.json({ activities: filtered.slice(0, limit) })
}
