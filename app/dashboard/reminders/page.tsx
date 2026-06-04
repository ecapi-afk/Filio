'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, AlertCircle, Clock, ToggleLeft, ToggleRight, XCircle } from 'lucide-react'

type JobStatus = 'scheduled' | 'sent' | 'failed' | 'cancelled'

interface ReminderJob {
  id: string
  status: JobStatus
  sent_at: string | null
  scheduled_for: string
  template: string
  clients: { id: string; name: string } | null
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function statusConfig(status: JobStatus) {
  switch (status) {
    case 'sent':
      return { label: 'Delivered', bg: '#ECFDF5', color: '#059669', icon: CheckCircle2 }
    case 'failed':
      return { label: 'Failed', bg: '#FEF2F2', color: '#DC2626', icon: AlertCircle }
    case 'cancelled':
      return { label: 'Cancelled', bg: '#F3F4F6', color: '#6B7280', icon: XCircle }
    case 'scheduled':
    default:
      return { label: 'Pending', bg: '#FFFBEB', color: '#D97706', icon: Clock }
  }
}

export default function RemindersPage() {
  const [autoReminders, setAutoReminders] = useState(true)
  const [jobs, setJobs] = useState<ReminderJob[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/reminders')
      .then(r => r.json())
      .then(data => setJobs(data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const sentCount = jobs.filter(j => j.status === 'sent').length
  const failedCount = jobs.filter(j => j.status === 'failed').length
  const pendingCount = jobs.filter(j => j.status === 'scheduled').length

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="filio-card p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#ECFDF5' }}>
            <CheckCircle2 size={20} style={{ color: '#059669' }} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{sentCount}</p>
            <p className="text-xs text-gray-400">Delivered</p>
          </div>
        </div>
        <div className="filio-card p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#FEF2F2' }}>
            <AlertCircle size={20} style={{ color: '#DC2626' }} />
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums" style={{ color: '#DC2626' }}>{failedCount}</p>
            <p className="text-xs text-gray-400">Failed</p>
          </div>
        </div>
        <div className="filio-card p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#FFFBEB' }}>
            <Clock size={20} style={{ color: '#D97706' }} />
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums" style={{ color: '#D97706' }}>{pendingCount}</p>
            <p className="text-xs text-gray-400">Pending</p>
          </div>
        </div>
      </div>

      {/* Reminder Settings */}
      <div className="filio-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Automated Reminders</h3>
            <p className="text-xs text-gray-500 mt-0.5">Automatically send reminders before deadlines</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{autoReminders ? 'On' : 'Off'}</span>
            <button onClick={() => setAutoReminders(!autoReminders)}>
              {autoReminders
                ? <ToggleRight size={24} style={{ color: '#059669' }} />
                : <ToggleLeft size={24} className="text-gray-300" />
              }
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[30, 14, 7, 1].map(days => (
            <div
              key={days}
              className="flex items-center gap-2 p-3 rounded-lg border"
              style={{
                background: autoReminders ? '#ECFDF5' : '#F9FAFB',
                borderColor: autoReminders ? '#059669' : '#E5E7EB'
              }}
            >
              <CheckCircle2 size={14} style={{ color: autoReminders ? '#059669' : '#9CA3AF' }} />
              <span
                className="text-xs font-medium"
                style={{ color: autoReminders ? '#059669' : '#9CA3AF' }}
              >
                {days} days before
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Reminder History */}
      <div className="filio-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">Reminder History</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {loading && (
            <div className="px-5 py-8 text-center text-sm text-gray-400">Loading…</div>
          )}
          {!loading && jobs.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-gray-400">No reminders sent yet</div>
          )}
          {!loading && jobs.map(job => {
            const cfg = statusConfig(job.status)
            const Icon = cfg.icon
            const displayDate = job.sent_at ?? job.scheduled_for
            const isAuto = job.template === 'deadline_reminder'
            return (
              <div key={job.id} className="flex items-start gap-4 px-5 py-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: cfg.bg }}
                >
                  <Icon size={18} style={{ color: cfg.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {job.clients?.name ?? '—'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Deadline Reminder</p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {isAuto ? 'Auto' : 'Manual'} · {formatDate(displayDate)}
                  </p>
                </div>
                <span
                  className="text-xs font-semibold px-2 py-1 rounded-full"
                  style={{ background: cfg.bg, color: cfg.color }}
                >
                  {cfg.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
