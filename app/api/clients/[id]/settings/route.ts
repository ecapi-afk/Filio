import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { refreshClientCache } from '@/lib/data/clients'

// VAT Quarter month mappings
const VAT_QUARTER_MONTHS: Record<string, number[]> = {
  'A': [1, 4, 7, 10],  // Jan, Apr, Jul, Oct
  'B': [2, 5, 8, 11],    // Feb, May, Aug, Nov
  'C': [3, 6, 9, 12],    // Mar, Jun, Sep, Dec
}

// Generate requests based on VAT quarter group and financial year end
function generateRequestsForClient(
  clientId: string,
  vatQuarterGroup: string,
  financialYearEnd: string
): Array<{
  client_id: string
  title: string
  description: string | null
  deadline_date: string
  required_files: number
  status: string
}> {
  const requests: Array<{
    client_id: string
    title: string
    description: string | null
    deadline_date: string
    required_files: number
    status: string
  }> = []

  const currentYear = new Date().getFullYear()

  // Generate quarterly VAT requests
  const quarterMonths = VAT_QUARTER_MONTHS[vatQuarterGroup] || VAT_QUARTER_MONTHS['A']
  for (const month of quarterMonths) {
    const deadlineDate = `${currentYear}-${String(month).padStart(2, '0')}-01`
    requests.push({
      client_id: clientId,
      title: 'VAT Return',
      description: `VAT Return for ${new Date(currentYear, month - 1).toLocaleString('en', { month: 'long' })}`,
      deadline_date: deadlineDate,
      required_files: 5,
      status: 'pending',
    })
  }

  // Generate yearly financial year end request if set
  if (financialYearEnd) {
    // Parse "April 15" format
    const parts = financialYearEnd.trim().split(/\s+/)
    if (parts.length >= 2) {
      const monthName = parts[0]
      const day = parts[1].replace(/[^0-9]/g, '') || '1'
      const monthIndex = new Date(`${monthName} 1, ${currentYear}`).getMonth() + 1
      if (monthIndex > 0 && monthIndex <= 12) {
        requests.push({
          client_id: clientId,
          title: 'Annual Accounts',
          description: `Annual Accounts due ${financialYearEnd}`,
          deadline_date: `${currentYear}-${String(monthIndex).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
          required_files: 10,
          status: 'pending',
        })
      }
    }
  }

  return requests
}

// PATCH /api/clients/[id]/settings - Update client settings
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the client belongs to the user's firm
    const { data: client } = await supabase
      .from('clients')
      .select('id, firm_id, vat_quarter_group, financial_year_end')
      .eq('id', id)
      .single()

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Get user's firm_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('firm_id')
      .eq('id', user.id)
      .single()

    if (client.firm_id !== profile?.firm_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      vat_quarter_group,
      financial_year_end,
      auto_reminders_enabled,
      reminder_days_before,
      portal_email,
      portal_language,
    } = body

    // Build updates object
    const updates: Record<string, any> = {}

    if (vat_quarter_group !== undefined) {
      updates.vat_quarter_group = vat_quarter_group
    }
    if (financial_year_end !== undefined) {
      updates.financial_year_end = financial_year_end
    }
    if (auto_reminders_enabled !== undefined) {
      updates.auto_reminders_enabled = auto_reminders_enabled
    }
    if (reminder_days_before !== undefined) {
      updates.reminder_days_before = reminder_days_before
    }
    if (portal_email !== undefined) {
      updates.portal_email = portal_email
    }

    // Use admin client to bypass RLS
    const adminClient = await createAdminClient()
    const { error: updateError } = await adminClient
      .from('clients')
      .update(updates)
      .eq('id', id)

    if (updateError) {
      console.error('Failed to update client settings:', updateError)
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }

    // If VAT quarter group or financial year end changed, regenerate requests
    const newVatGroup = vat_quarter_group ?? client.vat_quarter_group ?? 'A'
    const newFinancialYearEnd = financial_year_end ?? client.financial_year_end ?? ''

    console.log('New VAT group:', newVatGroup, 'New FY end:', newFinancialYearEnd)

    if (vat_quarter_group !== undefined || financial_year_end !== undefined) {
      // Delete existing requests for this client
      const { error: deleteError } = await adminClient
        .from('requests')
        .delete()
        .eq('client_id', id)

      if (deleteError) {
        console.error('Failed to delete requests:', deleteError)
      }

      // Generate new requests
      const newRequests = generateRequestsForClient(id, newVatGroup, newFinancialYearEnd)
      console.log('Generated requests count:', newRequests.length)
      console.log('Generated requests:', JSON.stringify(newRequests, null, 2))

      if (newRequests.length > 0) {
        const { error: requestsError } = await adminClient
          .from('requests')
          .insert(newRequests)

        if (requestsError) {
          console.error('Failed to create requests:', requestsError)
        } else {
          console.log('Requests created successfully')
          // Update cached fields now that requests have changed
          await refreshClientCache(id).catch(e => console.error('refreshClientCache failed:', e))
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in client settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
