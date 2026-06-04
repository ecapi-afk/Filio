'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface Prefs {
  notify_daily_digest: boolean
  notify_sync_failure: boolean
  notify_client_overdue: boolean
  notify_quota_warning: boolean
}

const TOGGLES: { key: keyof Prefs; label: string; description: string }[] = [
  {
    key: 'notify_daily_digest',
    label: 'Daily Summary Email',
    description: 'Receive a daily digest at 8 AM (firm timezone) with the previous day\'s upload summary',
  },
  {
    key: 'notify_sync_failure',
    label: 'Xero Sync Failure',
    description: 'Immediate email when a file fails to sync to Xero',
  },
  {
    key: 'notify_client_overdue',
    label: 'Client Overdue Alert',
    description: 'Email when a client enters Overdue status',
  },
  {
    key: 'notify_quota_warning',
    label: 'Active Client Quota Warning (80%)',
    description: 'One-time email when your active client count first exceeds 80% of your plan limit',
  },
]

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      style={{ background: checked ? '#059669' : '#D1D5DB' }}
    >
      <span
        className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform"
        style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }}
      />
    </button>
  )
}

export default function NotificationsSettingsPage() {
  const [prefs, setPrefs] = useState<Prefs | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<keyof Prefs | null>(null)

  useEffect(() => {
    fetch('/api/firm/notification-prefs')
      .then(r => r.json())
      .then((data: Prefs) => setPrefs(data))
      .catch(() => toast.error('Failed to load preferences'))
      .finally(() => setLoading(false))
  }, [])

  const handleToggle = async (key: keyof Prefs, value: boolean) => {
    if (!prefs) return
    const prev = prefs[key]
    setPrefs(p => p ? { ...p, [key]: value } : p)
    setSaving(key)
    try {
      const res = await fetch('/api/firm/notification-prefs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      })
      if (!res.ok) throw new Error()
      toast.success('Saved')
    } catch {
      setPrefs(p => p ? { ...p, [key]: prev } : p)
      toast.error('Failed to save preference')
    } finally {
      setSaving(null)
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
      <div className="filio-card divide-y divide-gray-100 overflow-hidden">
        <div className="px-5 py-4">
          <h3 className="text-sm font-bold text-gray-900">Email Notifications</h3>
          <p className="text-xs text-gray-500 mt-0.5">Choose which email alerts your firm receives</p>
        </div>
        {TOGGLES.map(({ key, label, description }) => (
          <div key={key} className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{description}</p>
            </div>
            <div className="relative shrink-0">
              {saving === key && (
                <Loader2 size={14} className="animate-spin text-gray-400 absolute -left-5 top-1" />
              )}
              <Toggle
                checked={prefs?.[key] ?? true}
                onChange={(v) => handleToggle(key, v)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
