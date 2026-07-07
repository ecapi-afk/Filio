import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { refreshClientCache } from '@/lib/data/clients'

// VAT quarter month mappings
const VAT_QUARTER_MONTHS: Record<string, number[]> = {
  'A': [1, 4, 7, 10],   // Jan, Apr, Jul, Oct
  'B': [2, 5, 8, 11],   // Feb, May, Aug, Nov
  'C': [3, 6, 9, 12],   // Mar, Jun, Sep, Dec
}

// Get upcoming quarter deadlines for the next 12 months
// Creates all 4 quarters ahead to handle missed quarters
function getUpcomingQuarterDeadlines(
  vatQuarterGroup: string,
  count: number = 4
): Array<{ month: number; year: number }> {
  const quarterMonths = VAT_QUARTER_MONTHS[vatQuarterGroup] || VAT_QUARTER_MONTHS['A']
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const deadlines: Array<{ month: number; year: number }> = []

  // Find starting point: current quarter or next upcoming
  let startIdx = 0
  for (let i = 0; i < quarterMonths.length; i++) {
    if (quarterMonths[i] >= currentMonth) {
      startIdx = i
      break
    }
    if (i === quarterMonths.length - 1) {
      startIdx = 0 // Next year
    }
  }

  // Generate N quarters ahead
  for (let i = 0; i < count; i++) {
    const idx = (startIdx + i) % quarterMonths.length
    const yearOffset = Math.floor((startIdx + i) / quarterMonths.length)
    deadlines.push({
      month: quarterMonths[idx],
      year: currentYear + yearOffset,
    })
  }

  return deadlines
}

// Calculate the next cycle deadline
function calculateNextDeadline(currentDeadline: string, title: string, vatQuarterGroup: string): string | null {
  const current = new Date(currentDeadline)
  const currentMonth = current.getMonth() + 1
  const currentYear = current.getFullYear()

  if (title.includes('VAT') || title.includes('MTD')) {
    const quarterMonths = VAT_QUARTER_MONTHS[vatQuarterGroup] || VAT_QUARTER_MONTHS['A']
    const currentIdx = quarterMonths.indexOf(currentMonth)

    let nextMonth: number
    let nextYear = currentYear

    if (currentIdx === -1 || currentIdx === quarterMonths.length - 1) {
      nextMonth = quarterMonths[0]
      nextYear = currentYear + 1
    } else {
      nextMonth = quarterMonths[currentIdx + 1]
    }

    return `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`
  } else if (title.includes('Annual') || title.includes('Accounts')) {
    const nextYear = currentYear + 1
    const day = String(current.getDate()).padStart(2, '0')
    const month = String(currentMonth).padStart(2, '0')
    return `${nextYear}-${month}-${day}`
  }

  return null
}

// Ensure future quarters exist for the next 12 months (4 quarters)
async function ensureFutureQuartersExist(
  adminClient: any,
  clientId: string,
  vatQuarterGroup: string,
  financialYearEnd: string | null
): Promise<void> {
  const upcomingDeadlines = getUpcomingQuarterDeadlines(vatQuarterGroup, 4)

  for (const { month, year } of upcomingDeadlines) {
    const deadlineDate = `${year}-${String(month).padStart(2, '0')}-01`

    // Check if this deadline already exists
    const { data: existing } = await adminClient
      .from('requests')
      .select('id')
      .eq('client_id', clientId)
      .eq('deadline_date', deadlineDate)
      .eq('title', 'VAT Return')
      .single()

    if (!existing) {
      const monthName = new Date(year, month - 1).toLocaleString('en', { month: 'long' })
      await adminClient.from('requests').insert({
        client_id: clientId,
        title: 'VAT Return',
        description: `VAT Return for ${monthName}`,
        deadline_date: deadlineDate,
        required_files: 5,
        status: 'pending',
      })
    }
  }
}

// Ensure next year's annual accounts exists
async function ensureNextAnnualAccountsExist(
  adminClient: any,
  clientId: string,
  financialYearEnd: string | null
): Promise<void> {
  if (!financialYearEnd) return

  const parts = financialYearEnd.trim().split(/\s+/)
  if (parts.length < 2) return

  const monthName = parts[0]
  const day = parts[1].replace(/[^0-9]/g, '') || '1'
  const monthIndex = new Date(`${monthName} 1, 2000`).getMonth() + 1

  const nextYear = new Date().getFullYear() + 1
  const deadlineDate = `${nextYear}-${String(monthIndex).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  // Check if next year's annual accounts exists
  const { data: existing } = await adminClient
    .from('requests')
    .select('id')
    .eq('client_id', clientId)
    .eq('deadline_date', deadlineDate)
    .eq('title', 'Annual Accounts')
    .single()

  if (!existing) {
    await adminClient.from('requests').insert({
      client_id: clientId,
      title: 'Annual Accounts',
      description: `Annual Accounts due ${financialYearEnd}`,
      deadline_date: deadlineDate,
      required_files: 10,
      status: 'pending',
    })
  }
}

// POST /api/clients/[id]/period - Toggle period completion status
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const adminClient = await createAdminClient()

  // Get current client state with deadline info and vat_quarter_group
  const { data: client, error: fetchError } = await supabase
    .from('clients')
    .select('id, name, current_period_completed, next_deadline_date, next_deadline_type, vat_quarter_group, financial_year_end')
    .eq('id', id)
    .single()

  if (fetchError || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  const currentCompleted = client.current_period_completed ?? false
  const newCompleted = !currentCompleted
  const vatQuarterGroup = client.vat_quarter_group || 'A'

  // Get user's firm_id for audit log
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single()

  // Find the specific request that matches next_deadline_date and next_deadline_type
  let requestUpdated = false
  let nextCycleRequestCreated = false
  let nextCycleDeadline: string | null = null

  if (client.next_deadline_date && client.next_deadline_type) {
    const { data: matchingRequest } = await adminClient
      .from('requests')
      .select('id, status, title')
      .eq('client_id', id)
      .eq('deadline_date', client.next_deadline_date)
      .eq('title', client.next_deadline_type)
      .single()

    if (matchingRequest) {
      const newStatus = newCompleted ? 'Complete' : 'pending'
      const { error: requestError } = await adminClient
        .from('requests')
        .update({ status: newStatus })
        .eq('id', matchingRequest.id)

      if (requestError) {
        console.error('Failed to update request status:', requestError)
      } else {
        requestUpdated = true

        // If marking as complete, ensure future quarters exist
        if (newCompleted === true) {
          // Ensure VAT Return quarters always have 4 ahead
          await ensureFutureQuartersExist(adminClient, id, vatQuarterGroup, client.financial_year_end)

          // Ensure next year's Annual Accounts exists
          // Check the TITLE of the request we're completing, not the current next_deadline_type
          if (matchingRequest.title.includes('Annual')) {
            await ensureNextAnnualAccountsExist(adminClient, id, client.financial_year_end)
          }

          // Calculate what the next deadline will be after this completion
          const nextDeadline = calculateNextDeadline(
            client.next_deadline_date,
            matchingRequest.title,  // Use the actual request title, not next_deadline_type
            vatQuarterGroup
          )
          nextCycleDeadline = nextDeadline
        }
      }
    }
  }

  // Update client period completion status
  const { error: updateError } = await supabase
    .from('clients')
    .update({ current_period_completed: newCompleted })
    .eq('id', id)

  if (updateError) {
    console.error('Failed to update period status:', updateError)
    return NextResponse.json({ error: 'Failed to update period status' }, { status: 500 })
  }

  // Refresh cached fields
  await refreshClientCache(id).catch(e => console.error('refreshClientCache failed:', e))

  // If marking as complete, cancel pending reminders
  if (newCompleted === true) {
    await adminClient
      .from('reminder_jobs')
      .update({ status: 'cancelled' })
      .eq('client_id', id)
      .eq('status', 'pending')
  }

  // Log to audit_logs
  const action = newCompleted ? 'period_completed_manually' : 'period_reopened_manually'
  const metadata = {
    type: client.next_deadline_type || 'Unknown',
    date: client.next_deadline_date || null,
    previous_status: currentCompleted ? 'complete' : 'incomplete',
    request_updated: requestUpdated,
    next_cycle_created: nextCycleRequestCreated,
    next_cycle_deadline: nextCycleDeadline,
  }

  if (profile?.firm_id) {
    await supabase.from('audit_logs').insert({
      firm_id: profile.firm_id,
      client_id: id,
      action,
      metadata,
      actor: user.id,
    })
  }

  // Get updated client data after refresh
  const { data: updatedClient } = await supabase
    .from('clients')
    .select('next_deadline_date, next_deadline_type, computed_health_status')
    .eq('id', id)
    .single()

  return NextResponse.json({
    success: true,
    current_period_completed: newCompleted,
    next_deadline_date: updatedClient?.next_deadline_date ?? null,
    next_deadline_type: updatedClient?.next_deadline_type ?? null,
    computed_health_status: updatedClient?.computed_health_status ?? null,
    next_cycle_created: nextCycleRequestCreated,
    next_cycle_deadline: nextCycleDeadline,
  })
}
