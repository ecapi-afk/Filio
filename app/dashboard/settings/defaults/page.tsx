'use client'

import { useState, useEffect } from 'react'
import { getFirmSettings } from '@/lib/data/settings'
import { COMMON_TIMEZONES } from '@/lib/utils/timezone'

export default function DefaultsSettingsPage() {
  const [vatQuarterGroup, setVatQuarterGroup] = useState<string>('A')
  const [timezone, setTimezone] = useState<string>('Europe/London')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    async function loadSettings() {
      const firm = await getFirmSettings()
      if (firm) {
        // @ts-ignore - default_vat_quarter_group may not be in generated types yet
        setVatQuarterGroup(firm.default_vat_quarter_group || firm.vat_quarter_group || 'A')
        setTimezone(firm.timezone || 'Europe/London')
      }
      setLoading(false)
    }
    loadSettings()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const response = await fetch('/api/settings/defaults', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          default_vat_quarter_group: vatQuarterGroup,
          timezone: timezone
        }),
      })
      if (response.ok) {
        setMessage({ type: 'success', text: 'Defaults updated successfully' })
      } else {
        setMessage({ type: 'error', text: 'Failed to update defaults' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to update defaults' })
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="max-w-2xl">
        <div className="filio-card p-5 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="h-10 bg-gray-200 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <div className="filio-card p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Global Defaults</h3>
        <p className="text-xs text-gray-500 mb-6">Set default values for new clients. These can be overridden per client.</p>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Default VAT Quarter Group</label>
            <p className="text-[10px] text-gray-400 mb-1.5">Applied to new clients when not specified</p>
            <select
              value={vatQuarterGroup}
              onChange={(e) => setVatQuarterGroup(e.target.value)}
              className="mt-1.5 w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-emerald-400 transition-all"
            >
              <option value="none">Not VAT Registered / None</option>
              <option value="A">Group A (Jan/Apr/Jul/Oct)</option>
              <option value="B">Group B (Feb/May/Aug/Nov)</option>
              <option value="C">Group C (Mar/Jun/Sep/Dec)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">System Timezone</label>
            <p className="text-[10px] text-gray-400 mb-1.5">Used for calculating deadlines and system wide time</p>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="mt-1.5 w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-emerald-400 transition-all"
            >
              {COMMON_TIMEZONES.map(tz => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Defaults'}
            </button>
            {message && (
              <span className={`ml-3 text-sm ${message.type === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
                {message.text}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
