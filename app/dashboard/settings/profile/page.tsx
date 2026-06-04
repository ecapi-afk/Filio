'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ProfileData {
  id: string
  email: string
  full_name: string
  position: string
  language: string
  firm_name: string
}

export default function ProfileSettingsPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ full_name: '', position: '', language: 'en' })

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then((data: ProfileData) => {
        setProfile(data)
        setForm({ full_name: data.full_name, position: data.position, language: data.language })
      })
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      toast.success('Profile updated')
    } catch {
      toast.error('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-gray-300" size={24} />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="filio-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-gray-900">Account Details</h3>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
          <input
            type="text"
            value={profile?.email ?? ''}
            disabled
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
          />
          <p className="text-xs text-gray-400 mt-1">Email cannot be changed here</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Firm</label>
          <input
            type="text"
            value={profile?.firm_name ?? ''}
            disabled
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
          />
        </div>
      </div>

      <div className="filio-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-gray-900">Personal Details</h3>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
          <input
            type="text"
            value={form.full_name}
            onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
            placeholder="Your full name"
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Job Title / Position</label>
          <input
            type="text"
            value={form.position}
            onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
            placeholder="e.g. Senior Accountant"
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Language</label>
          <select
            value={form.language}
            onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="en">English</option>
            <option value="zh">中文 (Chinese)</option>
          </select>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}
