'use server'

import { createClient } from '@/lib/supabase/server'
import type { Profile, Firm, Subscription } from '@/lib/supabase/types'

export type ProfileWithFirm = Profile & {
  firms: Firm | null
}

export type SubscriptionWithPlan = Subscription & {
  firm?: {
    name: string
  }
}

export async function getProfile(): Promise<ProfileWithFirm | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*, firms(*)')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('Error fetching profile:', error)
    return null
  }

  return data as ProfileWithFirm
}

export async function updateProfile(updates: Partial<Profile>): Promise<boolean> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) {
    console.error('Error updating profile:', error)
    return false
  }

  return true
}

export async function getSubscription(): Promise<SubscriptionWithPlan | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single()

  if (!profile?.firm_id) return null

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('firm_id', profile.firm_id)
    .single()

  if (error) {
    console.error('Error fetching subscription:', error)
    return null
  }

  return data as SubscriptionWithPlan
}

export async function getFirmSettings(): Promise<Firm | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single()

  if (!profile?.firm_id) return null

  const { data, error } = await supabase
    .from('firms')
    .select('*')
    .eq('id', profile.firm_id)
    .single()

  if (error) {
    console.error('Error fetching firm settings:', error)
    return null
  }

  return data as Firm
}

export async function updateFirm(updates: Partial<Firm>): Promise<boolean> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_id')
    .eq('id', user.id)
    .single()

  if (!profile?.firm_id) return false

  const { error } = await supabase
    .from('firms')
    .update(updates)
    .eq('id', profile.firm_id)

  if (error) {
    console.error('Error updating firm:', error)
    return false
  }

  return true
}
