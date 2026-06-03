import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// DELETE /api/firm/purge-all - Delete all data for the current firm
export async function DELETE() {
  // 1. Get current user and their firm_id
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get firm_id from profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.firm_id) {
    return NextResponse.json({ error: 'Firm not found' }, { status: 404 })
  }

  const firmId = profile.firm_id

  // 2. Use admin client to bypass RLS and delete all firm data
  // Deletion order respects FK constraints (CASCADE handles most):
  // 1. download_jobs (firm_id FK, CASCADE)
  // 2. reminder_jobs (firm_id FK, CASCADE) + (client_id FK, CASCADE)
  // 3. clients (firm_id FK, CASCADE) → cascades to: requests, uploads, portal_tokens, magic_email_tokens
  // 4. profiles (firm_id FK)
  // 5. firms (standalone, CASCADE)
  // 6. Sign out user at the end
  const adminClient = await createAdminClient()

  try {
    // Step 1: Delete download_jobs
    await adminClient
      .from('download_jobs')
      .delete()
      .eq('firm_id', firmId)

    // Step 2: Get all client IDs for this firm (needed for cascading deletes)
    const { data: clients } = await adminClient
      .from('clients')
      .select('id')
      .eq('firm_id', firmId)

    const clientIds = clients?.map(c => c.id) || []

    // Step 3: Delete reminder_jobs (has both firm_id and client_id FKs)
    await adminClient
      .from('reminder_jobs')
      .delete()
      .eq('firm_id', firmId)

    // Step 4: Delete magic_email_tokens (client_id FK)
    if (clientIds.length > 0) {
      await adminClient
        .from('magic_email_tokens')
        .delete()
        .in('client_id', clientIds)
    }

    // Step 5: Delete portal_tokens (client_id FK) - handled by CASCADE when clients deleted
    // Step 6: Delete uploads (client_id FK) - handled by CASCADE when clients deleted
    // Step 7: Delete requests (client_id FK) - handled by CASCADE when clients deleted

    // Step 8: Delete clients (this cascades to requests, uploads, portal_tokens)
    await adminClient
      .from('clients')
      .delete()
      .eq('firm_id', firmId)

    // Step 9: Delete profiles (firm_id FK)
    await adminClient
      .from('profiles')
      .delete()
      .eq('firm_id', firmId)

    // Step 10: Delete the firm itself
    await adminClient
      .from('firms')
      .delete()
      .eq('id', firmId)

    // Step 11: Delete the current user from auth.users (irreversible - they cannot log in again)
    await adminClient.auth.admin.deleteUser(user.id)

    // Note: After this, the user is fully deleted. No signOut needed.
    return NextResponse.json({ success: true, deleted: true })
  } catch (err) {
    console.error('Purge all error:', err)
    return NextResponse.json(
      { error: 'Failed to delete firm data', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
