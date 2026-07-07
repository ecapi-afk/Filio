'use client'

import Link from 'next/link'
import { Clock, X, Zap } from 'lucide-react'
import { useState } from 'react'
import { TRIAL_DURATION_MS } from '@/lib/constants/trial'

interface TrialBannerProps {
  trialEndsAt: string | null
  createdAt: string
}

function resolveEndDate(trialEndsAt: string | null, createdAt: string): Date | null {
  if (trialEndsAt) {
    const d = new Date(trialEndsAt)
    return isNaN(d.getTime()) ? null : d
  }
  const start = new Date(createdAt)
  if (isNaN(start.getTime())) return null
  return new Date(start.getTime() + TRIAL_DURATION_MS)
}

function getDaysRemaining(trialEndsAt: string | null, createdAt: string): number {
  const endDate = resolveEndDate(trialEndsAt, createdAt)
  if (!endDate) return 0
  return Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function getTrialProgress(trialEndsAt: string | null, createdAt: string): number {
  const endDate = resolveEndDate(trialEndsAt, createdAt)
  if (!endDate) return 100
  const startDate = new Date(createdAt)
  if (isNaN(startDate.getTime())) return 100
  const total = endDate.getTime() - startDate.getTime()
  const elapsed = Date.now() - startDate.getTime()
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)))
}

export function TrialBanner({ trialEndsAt, createdAt }: TrialBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const daysRemaining = getDaysRemaining(trialEndsAt, createdAt)
  const progress = getTrialProgress(trialEndsAt, createdAt)

  const isExpired = daysRemaining <= 0
  const isUrgent = daysRemaining <= 3
  const isWarning = daysRemaining <= 7

  const bgClass = isExpired || isUrgent
    ? 'bg-red-50 border-red-200'
    : isWarning
    ? 'bg-amber-50 border-amber-200'
    : 'bg-blue-50 border-blue-200'

  const textClass = isExpired || isUrgent
    ? 'text-red-800'
    : isWarning
    ? 'text-amber-800'
    : 'text-blue-800'

  const progressBg = isExpired || isUrgent
    ? 'bg-red-400'
    : isWarning
    ? 'bg-amber-400'
    : 'bg-blue-400'

  const label = isExpired
    ? 'Trial expired — read-only mode'
    : `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left in your trial`

  const sub = isExpired
    ? 'You can view existing data but cannot add clients or upload files.'
    : 'Full access to all features. Subscribe before your trial ends.'

  return (
    <div className={`border rounded-xl px-4 py-3 mb-5 flex items-center gap-4 ${bgClass}`}>
      <Clock size={16} className={`shrink-0 ${textClass}`} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`text-sm font-semibold ${textClass}`}>{label}</span>
          <span className={`text-xs ${textClass} opacity-70 hidden sm:block`}>{sub}</span>
        </div>
        {!isExpired && (
          <div className="mt-1.5 h-1 w-full max-w-[200px] rounded-full bg-black/10">
            <div
              className={`h-1 rounded-full transition-all ${progressBg}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      <Link
        href="/dashboard/settings/billing"
        className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all ${
          isExpired || isUrgent
            ? 'bg-red-600 hover:bg-red-700'
            : isWarning
            ? 'bg-amber-600 hover:bg-amber-700'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        <Zap size={12} />
        Upgrade Now
      </Link>

      {!isExpired && (
        <button
          onClick={() => setDismissed(true)}
          className={`shrink-0 opacity-50 hover:opacity-100 transition-opacity ${textClass}`}
          title="Dismiss"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
