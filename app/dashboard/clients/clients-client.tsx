'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Star, Plus, Send, Eye, Search, Filter,
  ChevronRight, X, Upload, Mail, FileText, Zap,
  Download, MoreHorizontal, Users, RotateCcw, Trash2, AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import type { ClientListItem } from '@/lib/data/clients'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { getClientAvatarBg } from '@/lib/file-types'

type ClientStatus = 'Overdue' | 'Due Soon' | 'Not Started' | 'In Progress' | 'Complete' | 'No Action'

const statusConfig: Record<ClientStatus, { label: string; dot: string; cls: string }> = {
  'Overdue': { label: 'Overdue', dot: '#DC2626', cls: 'status-overdue' },
  'Due Soon': { label: 'Due Soon', dot: '#D97706', cls: 'status-due-soon' },
  'Not Started': { label: 'Not Started', dot: '#2563EB', cls: 'status-not-started' },
  'In Progress': { label: 'In Progress', dot: '#2563EB', cls: 'status-in-progress' },
  'Complete': { label: 'Complete', dot: '#059669', cls: 'status-complete' },
  'No Action': { label: 'No Action', dot: '#9CA3AF', cls: 'status-no-action' },
}

// Format: "Never", "2 hours ago", or "18 Mar 2026"
function formatRelativeUpload(dateStr: string | undefined | null): string {
  if (!dateStr) return 'Never'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hours ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function StatusBadge({ status }: { status: ClientStatus }) {
  const cfg = statusConfig[status]
  return (
    <span className={`status-badge ${cfg.cls}`}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  )
}

interface QuickPreviewProps {
  client: ClientListItem
  onClose: () => void
}

function QuickPreview({ client, onClose }: QuickPreviewProps) {
  return (
    <div className="xl:w-80 shrink-0 filio-card overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-900">Client Preview</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Client Info */}
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{ background: '#059669' }}
          >
            {client.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-gray-900">{client.name}</p>
            <p className="text-xs text-gray-400">{client.email}</p>
            <div className="mt-1">
              <StatusBadge status={client.health_status as ClientStatus} />
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Uploads</p>
            <p className="text-lg font-bold text-gray-900">
              {client.upload_progress?.uploaded || 0}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Last Upload</p>
            <p className="text-lg font-bold text-gray-900">{formatRelativeUpload(client.last_upload)}</p>
          </div>
        </div>

        {/* Deadline Status */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Status</p>
          <div
            className="flex items-center gap-2 p-3 rounded-lg"
            style={{
              background: client.next_deadline?.date
                ? (new Date(client.next_deadline.date) < new Date() ? '#FEF2F2' : '#FFFBEB')
                : '#F3F4F6'
            }}
          >
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {client.next_deadline?.type
                  ? (new Date(client.next_deadline.date) < new Date()
                    ? `Overdue (${client.next_deadline.type})`
                    : client.next_deadline.type)
                  : 'No deadline'}
              </p>
              <p className="text-xs text-gray-500">
                {client.next_deadline?.date
                  ? (new Date(client.next_deadline.date) < new Date()
                    ? `Was due ${client.next_deadline.date}`
                    : client.next_deadline.date)
                  : 'Not set'}
              </p>
            </div>
          </div>
        </div>

        {/* Portal Status */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Portal</p>
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{
                background: client.portal_status === 'Active' ? '#059669' : '#DC2626'
              }}
            />
            <span className="text-sm text-gray-700">{client.portal_status}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={() => toast.success(`Reminder sent to ${client.name}`)}
            className="btn-primary w-full justify-center py-2.5 text-sm"
          >
            <Send size={14} /> Send Reminder
          </button>
          <Link
            href={`/dashboard/clients/${client.client_number ?? client.id}`}
            className="btn-secondary w-full justify-center py-2.5 text-sm"
          >
            <Eye size={14} /> View Full Details <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  )
}

interface ClientsClientProps {
  initialClients?: ClientListItem[]
}

export function ClientsClient({ initialClients = [] }: ClientsClientProps) {
  const [search, setSearch] = useState('')
  const [managementTab, setManagementTab] = useState<'active' | 'dormant' | 'deleted'>('active')
  const [statusFilter, setStatusFilter] = useState<ClientStatus | 'All'>('All')
  const [showStarred, setShowStarred] = useState(false)
  const [starred, setStarred] = useState<Set<string>>(
    new Set(initialClients.filter(c => c.is_starred).map(c => c.id))
  )
  const [previewClient, setPreviewClient] = useState<ClientListItem | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<{ client: ClientListItem; action: 'complete' | 'reopen' } | null>(null)
  const [updatingPeriod, setUpdatingPeriod] = useState<Set<string>>(new Set())
  const [restoringClient, setRestoringClient] = useState<Set<string>>(new Set())

  // Real clients from DB — no mock fallback
  const clients = initialClients

  const filtered = clients.filter(c => {
    const matchManagement = c.management_status === managementTab
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'All' || c.health_status === statusFilter
    const matchStarred = !showStarred || starred.has(c.id)
    return matchManagement && matchSearch && matchStatus && matchStarred
  })

  const toggleStar = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    // Optimistic update
    setStarred(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
    try {
      const res = await fetch(`/api/clients/${id}/star`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to toggle star')
    } catch {
      // Revert on error
      setStarred(prev => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id); else next.add(id)
        return next
      })
      toast.error('Failed to update star')
    }
  }

  const handlePeriodToggle = async (client: ClientListItem) => {
    setOpenMenuId(null)
    setUpdatingPeriod(prev => new Set(prev).add(client.id))
    try {
      const res = await fetch(`/api/clients/${client.id}/period`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to update period')
      const data = await res.json()
      // Update the client's status in the list
      // The parent will re-fetch or we can update locally
      toast.success(data.current_period_completed
        ? `${client.next_deadline?.type || 'Period'} marked as complete`
        : `${client.next_deadline?.type || 'Period'} reopened`)
      // Force refresh by toggling a state - in real app would refetch
      window.location.reload()
    } catch {
      toast.error('Failed to update period status')
    } finally {
      setUpdatingPeriod(prev => {
        const next = new Set(prev)
        next.delete(client.id)
        return next
      })
    }
    setConfirmAction(null)
  }

  const handleRestoreClient = async (client: ClientListItem, e: React.MouseEvent) => {
    e.stopPropagation()
    setRestoringClient(prev => new Set(prev).add(client.id))
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ management_status: 'dormant' }),
      })
      if (!res.ok) throw new Error('Failed to restore client')
      toast.success(`${client.name} restored to Dormant`)
      window.location.reload()
    } catch {
      toast.error('Failed to restore client')
    } finally {
      setRestoringClient(prev => {
        const next = new Set(prev)
        next.delete(client.id)
        return next
      })
    }
  }

  const getDeletionCountdown = (deletedAt: string | null | undefined) => {
    if (!deletedAt) return null
    const deletedDate = new Date(deletedAt)
    const purgeDate = new Date(deletedDate.getTime() + 30 * 24 * 60 * 60 * 1000)
    const now = new Date()
    const diffMs = purgeDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays <= 0) return { days: 0, expired: true }
    return { days: diffDays, expired: false }
  }

  const formatDate = (dateStr: string | undefined | null) => {
    if (!dateStr) return 'N/A'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const formatDays = (dateStr: string | null | undefined) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    if (days < 0) return <span className="text-xs font-semibold" style={{ color: '#DC2626' }}>{Math.abs(days)}d ago</span>
    if (days <= 14) return <span className="text-xs font-semibold" style={{ color: '#D97706' }}>{days}d</span>
    return <span className="text-xs text-gray-500">{days}d</span>
  }

  const getRowBg = (status: ClientStatus) => {
    if (status === 'Overdue') return '#FFF8F8'
    if (status === 'Due Soon') return '#FFFDF5'
    return 'white'
  }

  const statusOptions: (ClientStatus | 'All')[] = ['All', 'Overdue', 'Due Soon', 'Not Started', 'In Progress', 'Complete', 'No Action']

  const overdueCount = clients.filter(c => c.management_status === 'active' && c.health_status === 'Overdue').length

  // Sort clients: Overdue (most overdue first) → Due Soon → Not Started → In Progress → Complete → No Action
  const sortedFiltered = [...filtered].sort((a, b) => {
    const statusOrder: Record<string, number> = {
      'Overdue': 0,
      'Due Soon': 1,
      'Not Started': 2,
      'In Progress': 3,
      'Complete': 4,
      'No Action': 5,
    }
    const aOrder = statusOrder[a.health_status || 'No Action'] ?? 5
    const bOrder = statusOrder[b.health_status || 'No Action'] ?? 5

    // If same status, sort by how overdue/due soon they are
    if (aOrder === bOrder) {
      if (aOrder === 0 || aOrder === 1) {
        // For Overdue or Due Soon, sort by deadline date (earliest first)
        const aDate = a.next_deadline?.date ? new Date(a.next_deadline.date).getTime() : Infinity
        const bDate = b.next_deadline?.date ? new Date(b.next_deadline.date).getTime() : Infinity
        return aDate - bDate // Earlier dates first (most overdue/due soon)
      }
      return 0
    }
    return aOrder - bOrder
  })

  return (
    <div className="flex flex-col xl:flex-row gap-5">
      {/* Main Table */}
      <div className="flex-1 filio-card overflow-hidden">
        {/* Management Status Primary Tabs */}
        <div className="flex border-b border-gray-100">
          {(['active', 'dormant', 'deleted'] as const).map(tab => {
            const count = clients.filter(c => c.management_status === tab).length
            const isDeleted = tab === 'deleted'
            return (
              <button
                key={tab}
                onClick={() => { setManagementTab(tab); setStatusFilter('All') }}
                className={`px-5 py-3 text-sm font-semibold capitalize transition-all border-b-2 -mb-px ${
                  managementTab === tab
                    ? isDeleted ? 'border-red-500 text-red-600' : 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab} <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
                  managementTab === tab
                    ? isDeleted ? 'bg-red-50 text-red-600' : 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>{count}</span>
              </button>
            )
          })}
        </div>

        {/* Filters */}
        <div className="px-5 py-4 border-b border-gray-100 space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full text-sm pl-9 pr-4 py-2 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:border-emerald-400 focus:bg-white transition-all"
              />
            </div>
            <button
              onClick={() => setShowStarred(!showStarred)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${showStarred ? 'border-amber-300 text-amber-700 bg-amber-50' : 'border-gray-200 text-gray-600 bg-white'}`}
            >
              <Star size={14} fill={showStarred ? '#D97706' : 'none'} style={{ color: showStarred ? '#D97706' : '#9CA3AF' }} />
              Starred
            </button>
            <button onClick={() => toast.info('Feature coming soon')} className="btn-secondary">
              <Download size={14} /> Export
            </button>
          </div>

          {/* Health Status Chips (secondary filter) — only shown in active tab */}
          {managementTab === 'active' && (
            <div className="flex gap-1.5 flex-wrap">
              {statusOptions.map(s => {
                const count = s === 'All'
                  ? clients.filter(c => c.management_status === 'active').length
                  : clients.filter(c => c.management_status === 'active' && c.health_status === s).length
                const isSelected = statusFilter === s
                const colors: Partial<Record<ClientStatus | 'All', string>> = {
                  'All': '#059669', 'Overdue': '#DC2626', 'Due Soon': '#D97706',
                  'Not Started': '#2563EB', 'In Progress': '#854D0E', 'Complete': '#059669', 'No Action': '#6B7280'
                }
                return (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className="px-3 py-1 rounded-full text-xs font-semibold transition-all border"
                    style={isSelected
                      ? { background: colors[s] || '#059669', color: 'white', borderColor: colors[s] || '#059669' }
                      : { background: '#F3F4F6', color: '#6B7280', borderColor: '#E5E7EB' }
                    }
                  >
                    {s} {count > 0 && `(${count})`}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="w-8 px-4 py-3" />
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Client</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Status</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Uploads</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Deadline</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Last Upload</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedFiltered.map(client => {
              if (managementTab === 'deleted') {
                const countdown = getDeletionCountdown(client.deleted_at)
                return (
                  <tr key={client.id} className="border-b border-gray-50 bg-gray-50/60 opacity-75">
                    <td className="px-4 py-3.5">
                      <Trash2 size={14} className="text-red-300" />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 bg-gray-400">
                          {client.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-500 line-through">{client.name}</p>
                          <p className="text-xs text-gray-400">{client.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="status-badge" style={{ background: '#FEE2E2', color: '#DC2626' }}>Deleted</span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-400">
                      {client.upload_progress?.uploaded || 0} files
                    </td>
                    <td className="px-4 py-3.5" colSpan={2}>
                      {countdown ? (
                        countdown.expired ? (
                          <span className="text-xs text-red-500 font-medium">Permanent deletion pending</span>
                        ) : (
                          <span className="text-xs text-gray-500">
                            Permanently deleted in <span className="font-semibold text-red-500">{countdown.days}d</span>
                          </span>
                        )
                      ) : (
                        <span className="text-xs text-gray-400">Scheduled for deletion</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={(e) => handleRestoreClient(client, e)}
                        disabled={restoringClient.has(client.id)}
                        className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1"
                      >
                        {restoringClient.has(client.id) ? (
                          <span className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                        ) : (
                          <>
                            <RotateCcw size={11} /> Restore
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                )
              }

              return (
              <tr
                key={client.id}
                className="border-b border-gray-50 hover:brightness-[0.98] transition-all cursor-pointer"
                style={{ background: previewClient?.id === client.id ? '#F0FDF4' : getRowBg(client.health_status as ClientStatus) }}
                onClick={() => setPreviewClient(previewClient?.id === client.id ? null : client)}
              >
                <td className="px-4 py-3.5">
                  <button onClick={(e) => toggleStar(client.id, e)}>
                    <Star
                      size={14}
                      fill={starred.has(client.id) ? '#D97706' : 'none'}
                      style={{ color: starred.has(client.id) ? '#D97706' : '#D1D5DB' }}
                    />
                  </button>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="relative shrink-0">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${getClientAvatarBg(client.health_status)}`}
                      >
                        {client.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      {client.xero_not_found && (
                        <span title="Xero contact not found — uploads will fail" className="absolute -top-1 -right-1">
                          <AlertCircle size={10} className="text-orange-500 fill-orange-100" />
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{client.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-xs text-gray-400">{client.email}</p>
                        <span className={`text-[10px] font-medium px-1.5 py-0 rounded-full leading-4 ${
                          client.portal_status === 'Active' ? 'bg-emerald-50 text-emerald-600' :
                          client.portal_status === 'Frozen' ? 'bg-gray-100 text-gray-500' :
                          'bg-red-50 text-red-500'
                        }`}>{client.portal_status}</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  {managementTab === 'dormant'
                    ? <span className="status-badge" style={{ background: '#F3F4F6', color: '#6B7280' }}>Dormant</span>
                    : <StatusBadge status={client.health_status as ClientStatus} />
                  }
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-xs text-gray-700">
                    {client.upload_progress?.uploaded || 0} files
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <p className="text-xs font-medium text-gray-700">
                    {client.next_deadline?.type || 'No deadline'}
                  </p>
                  <div className="flex items-center gap-1">
                    {formatDays(client.next_deadline?.date)}
                    <span className="text-[10px] text-gray-400">· {client.next_deadline?.date || 'Not set'}</span>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-xs text-gray-500">{formatRelativeUpload(client.last_upload)}</td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5">
                    {(client.health_status === 'Overdue' || client.health_status === 'Due Soon') && (
                      <button
                        onClick={(e) => { e.stopPropagation(); toast.success(`Reminder sent to ${client.name}`); }}
                        className="btn-primary text-xs px-2.5 py-1.5"
                      >
                        <Send size={11} /> Remind
                      </button>
                    )}
                    <Link
                      href={`/dashboard/clients/${client.client_number ?? client.id}`}
                      onClick={e => e.stopPropagation()}
                      className="btn-secondary text-xs px-2.5 py-1.5"
                    >
                      <Eye size={11} />
                    </Link>
                    {/* Period Actions Menu */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenMenuId(openMenuId === client.id ? null : client.id)
                        }}
                        disabled={updatingPeriod.has(client.id)}
                        className="btn-secondary text-xs px-2 py-1.5"
                      >
                        {updatingPeriod.has(client.id) ? (
                          <span className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                        ) : (
                          <MoreHorizontal size={11} />
                        )}
                      </button>
                      {openMenuId === client.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }}
                          />
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-20">
                            {client.current_period_completed ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setConfirmAction({ client, action: 'reopen' })
                                }}
                                className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                              >
                                Re-open {client.next_deadline?.type || 'Period'}
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setConfirmAction({ client, action: 'complete' })
                                }}
                                className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                              >
                                Mark {client.next_deadline?.type || 'Period'} as Complete
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
        </div>

        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <Users size={36} className="mx-auto mb-3 text-gray-200" />
            <p className="text-sm text-gray-400">No clients match your search</p>
          </div>
        )}
      </div>

      {/* Quick Preview Panel */}
      {previewClient && (
        <QuickPreview client={previewClient} onClose={() => setPreviewClient(null)} />
      )}

      {/* Confirm Dialog */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {confirmAction.action === 'complete' ? 'Confirm Completion' : 'Re-open Period'}
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              {confirmAction.action === 'complete' ? (
                <>You are marking the <strong>{confirmAction.client.next_deadline?.type || 'this period'}</strong> (due <strong>{formatDate(confirmAction.client.next_deadline?.date)}</strong>) as finished. This will stop all automatic reminders for this specific task. Continue?</>
              ) : (
                <>This will resume monitoring and reminders for the <strong>{confirmAction.client.next_deadline?.type || 'this period'}</strong> period (due <strong>{formatDate(confirmAction.client.next_deadline?.date)}</strong>). Continue?</>
              )}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handlePeriodToggle(confirmAction.client)}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${
                  confirmAction.action === 'complete'
                    ? 'bg-emerald-500 hover:bg-emerald-600'
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {confirmAction.action === 'complete' ? 'Mark as Complete' : 'Re-open Period'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}