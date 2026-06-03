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
function getUpcomingQuarterDeadlines(
  vatQuarterGroup: string,
  count: number = 4
): Array<{ month: number; year: number }> {
  const quarterMonths = VAT_QUARTER_MONTHS[vatQuarterGroup] || VAT_QUARTER_MONTHS['A']
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const deadlines: Array<{ month: number; year: number }> = []

  let startIdx = 0
  for (let i = 0; i < quarterMonths.length; i++) {
    if (quarterMonths[i] >= currentMonth) {
      startIdx = i
      break
    }
    if (i === quarterMonths.length - 1) {
      startIdx = 0
    }
  }

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

// Ensure future quarters exist for the next 12 months
async function ensureFutureQuartersExist(
  adminClient: any,
  clientId: string,
  vatQuarterGroup: string,
  financialYearEnd: string | null
): Promise<void> {
  const upcomingDeadlines = getUpcomingQuarterDeadlines(vatQuarterGroup, 4)

  for (const { month, year } of upcomingDeadlines) {
    const deadlineDate = `${year}-${String(month).padStart(2, '0')}-01`

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

// PATCH /api/requests/[id]/status - Update request status (e.g., mark as complete)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const { status } = body as { status: string }

  if (!status) {
    return NextResponse.json({ error: 'Status is required' }, { status: 400 })
  }

  const supabase = await createClient()
  const adminClient = await createAdminClient()

  // Get the request to find client_id and details
  const { data: requestData, error: fetchError } = await adminClient
    .from('requests')
    .select('id, client_id, title, deadline_date, status')
    .eq('id', id)
    .single()

  if (fetchError || !requestData) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }

  // Get user for auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get client's data for ensuring future quarters exist
  const { data: clientData } = await adminClient
    .from('clients')
    .select('vat_quarter_group, financial_year_end')
    .eq('id', requestData.client_id)
    .single()

  const vatQuarterGroup = clientData?.vat_quarter_group || 'A'

  // Update the request status
  const { error: updateError } = await adminClient
    .from('requests')
    .update({ status })
    .eq('id', id)

  if (updateError) {
    console.error('Failed to update request status:', updateError)
    return NextResponse.json({ error: 'Failed to update request status' }, { status: 500 })
  }

  let nextCycleCreated = false
  let nextCycleDeadline: string | null = null

  // If marking as complete, ensure future quarters exist
  if (status === 'Complete') {
    // Ensure VAT Return quarters always have 4 ahead
    await ensureFutureQuartersExist(adminClient, requestData.client_id, vatQuarterGroup, clientData?.financial_year_end)

    // Ensure next year's Annual Accounts exists
    if (requestData.title.includes('Annual')) {
      await ensureNextAnnualAccountsExist(adminClient, requestData.client_id, clientData?.financial_year_end)
    }

    // Get the next deadline for response
    const quarterMonths = VAT_QUARTER_MONTHS[vatQuarterGroup] || VAT_QUARTER_MONTHS['A']
    const currentDate = new Date(requestData.deadline_date)
    const currentMonth = currentDate.getMonth() + 1
    const currentYear = currentDate.getFullYear()

    const currentIdx = quarterMonths.indexOf(currentMonth)
    let nextMonth: number
    let nextYear = currentYear

    if (currentIdx === -1 || currentIdx === quarterMonths.length - 1) {
      nextMonth = quarterMonths[0]
      nextYear = currentYear + 1
    } else {
      nextMonth = quarterMonths[currentIdx + 1]
    }

    nextCycleDeadline = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`
  }

  // Refresh the client's cache to update next_deadline and health_status
  await refreshClientCache(requestData.client_id).catch(e =>
    console.error('refreshClientCache failed:', e)
  )

  // Get updated client cache
  const { data: updatedClient } = await supabase
    .from('clients')
    .select('next_deadline_date, next_deadline_type, computed_health_status')
    .eq('id', requestData.client_id)
    .single()

  return NextResponse.json({
    success: true,
    request_id: id,
    new_status: status,
    client: updatedClient,
    next_cycle_created: nextCycleCreated,
    next_cycle_deadline: nextCycleDeadline,
  })
}
