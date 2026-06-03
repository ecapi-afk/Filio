'use client'

import { useState } from 'react'
import { Bell, Send, CheckCircle2, AlertCircle, Clock, ToggleLeft, ToggleRight } from 'lucide-react'
import { toast } from 'sonner'

type ReminderStatus = 'Delivered' | 'Failed' | 'Pending'

interface ReminderItem {
  id: string
  clientName: string
  type: string
  date: string
  status: ReminderStatus
  sentBy: 'Auto' | 'Manual'
}

const mockReminders: ReminderItem[] = [
  { id: '1', clientName: 'Harlow & Sons Ltd', type: 'VAT Return · 7 days before', date: '25 Mar 2026, 08:00', status: 'Delivered', sentBy: 'Auto' },
  { id: '2', clientName: 'Patel Consulting', type: 'Year-End · 14 days before', date: '18 Mar 2026, 08:00', status: 'Delivered', sentBy: 'Auto' },
  { id: '3', clientName: 'Wright Freelance', type: 'VAT Return · Manual', date: '01 Mar 2026, 14:30', status: 'Delivered', sentBy: 'Manual' },
  { id: '4', clientName: 'Blackwood Retail Ltd', type: 'Year-End · 30 days before', date: '01 Feb 2026, 08:00', status: 'Failed', sentBy: 'Auto' },
  { id: '5', clientName: 'Chen Digital Agency', type: 'VAT Return · 7 days before', date: '20 Feb 2026, 08:00', status: 'Delivered', sentBy: 'Auto' },
]

export default function RemindersPage() {
  const [autoReminders, setAutoReminders] = useState(true)

  const pendingCount = mockReminders.filter(r => r.status === 'Pending').length
  const failedCount = mockReminders.filter(r => r.status === 'Failed').length

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="filio-card p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#ECFDF5' }}>
            <CheckCircle2 size={20} style={{ color: '#059669' }} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">
              {mockReminders.filter(r => r.status === 'Delivered').length}
            </p>
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
        <div className="grid grid-cols-4 gap-3">
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
          {mockReminders.map(reminder => (
            <div key={reminder.id} className="flex items-start gap-4 px-5 py-4">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: reminder.status === 'Delivered' ? '#ECFDF5' :
                             reminder.status === 'Failed' ? '#FEF2F2' : '#FFFBEB'
                }}
              >
                {reminder.status === 'Delivered' && <CheckCircle2 size={18} style={{ color: '#059669' }} />}
                {reminder.status === 'Failed' && <AlertCircle size={18} style={{ color: '#DC2626' }} />}
                {reminder.status === 'Pending' && <Clock size={18} style={{ color: '#D97706' }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{reminder.clientName}</p>
                <p className="text-xs text-gray-500 mt-0.5">{reminder.type}</p>
                <p className="text-[10px] text-gray-400 mt-1">
                  {reminder.sentBy} · {reminder.date}
                </p>
              </div>
              <span
                className="text-xs font-semibold px-2 py-1 rounded-full"
                style={{
                  background: reminder.status === 'Delivered' ? '#ECFDF5' :
                             reminder.status === 'Failed' ? '#FEF2F2' : '#FFFBEB',
                  color: reminder.status === 'Delivered' ? '#059669' :
                         reminder.status === 'Failed' ? '#DC2626' : '#D97706'
                }}
              >
                {reminder.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
