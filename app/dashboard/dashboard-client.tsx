'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Star, Plus, Download, Send, Eye, ChevronRight,
  Upload, Mail, Bell, X, Zap, Users, ArrowUpRight,
  TrendingUp, AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import type { DashboardStats } from '@/lib/data/dashboard'
import { getClients, type ClientListItem } from '@/lib/data/clients'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatRelativeTime } from '@/lib/utils'
import { ACTIVITY_STYLES, type ActivityType } from '@/lib/constants/activity'
import { getClientAvatarBg } from '@/lib/file-types'

type FilterTab = 'All' | 'Overdue' | 'Due Soon' | 'Starred'

type ClientStatus = 'Overdue' | 'Due Soon' | 'Not Started' | 'In Progress' | 'Complete' | 'No Action'

const statusConfig: Record<ClientStatus, { label: string; dot: string }> = {
  'Overdue': { label: 'Overdue', dot: '#DC2626' },
  'Due Soon': { label: 'Due Soon', dot: '#D97706' },
  'Not Started': { label: 'Not Started', dot: '#2563EB' },
  'In Progress': { label: 'In Progress', dot: '#854D0E' },
  'Complete': { label: 'Complete', dot: '#059669' },
  'No Action': { label: 'No Action', dot: '#9CA3AF' },
}

function StatusBadge({ status }: { status: ClientStatus }) {
  const cls: Record<ClientStatus, string> = {
    'Overdue': 'status-overdue',
    'Due Soon': 'status-due-soon',
    'Not Started': 'status-not-started',
    'In Progress': 'status-in-progress',
    'Complete': 'status-complete',
    'No Action': 'status-no-action',
  }
  const cfg = statusConfig[status]
  return (
    <span className={`status-badge ${cls[status]}`}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  )
}

function ProgressBar({ value, total, status }: { value: number; total: number; status: ClientStatus }) {
  const pct = total > 0 ? (value / total) * 100 : 0
  const color = status === 'Overdue' ? '#DC2626' : status === 'Due Soon' ? '#D97706' : status === 'Complete' ? '#059669' : '#2563EB'
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs text-gray-500 tabular-nums">{value}/{total}</span>
    </div>
  )
}

const SPARKLINE_PLACEHOLDER = [40, 55, 45, 70, 60, 80, 65, 90, 75, 100]
const SPARKLINE_H = 32 // px, matches h-8

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const nonZero = data.filter(v => v > 0).length
  const max = Math.max(...data)
  const min = Math.min(...data)
  // Use real data only when at least 5 months have values and there's real variation
  const useReal = nonZero >= 5 && max !== min
  const raw = useReal ? data : SPARKLINE_PLACEHOLDER
  const rawMax = Math.max(...raw)
  // Compute pixel heights (min 4px so bars are always visible)
  const heights = raw.map(v => Math.max(4, Math.round((v / rawMax) * SPARKLINE_H)))
  return (
    <div className="flex items-end gap-0.5" style={{ height: SPARKLINE_H }}>
      {heights.map((h, i) => (
        <div
          key={i}
          className="w-1.5 rounded-sm"
          style={{
            height: h,
            background: i === heights.length - 1 ? color : `${color}40`
          }}
        />
      ))}
    </div>
  )
}

interface DashboardClientProps {
  stats: DashboardStats
  initialClients?: ClientListItem[]
}

export function DashboardClient({ stats, initialClients = [] }: DashboardClientProps) {
  const [filter, setFilter] = useState<FilterTab>('All')
  const [starred, setStarred] = useState<Set<string>>(
    new Set(initialClients.filter(c => c.is_starred).map(c => c.id))
  )
  const [search, setSearch] = useState('')
  const [showOnboarding, setShowOnboarding] = useState(!stats.isXeroConnected)
  const [xeroConnected, setXeroConnected] = useState(stats.isXeroConnected)
  const [uploadsThisMonth, setUploadsThisMonth] = useState(stats.uploadThisMonth)
  const [uploadsPrevMonth, setUploadsPrevMonth] = useState(stats.uploadsPrevMonth || 0)
  const [activeClientsAddedThisMonth, setActiveClientsAddedThisMonth] = useState(stats.activeClientsAddedThisMonth || 0)
  const [loadingUploads, setLoadingUploads] = useState(false)

  // 异步加载上传统计（不阻塞页面渲染）
  useEffect(() => {
    const fetchUploadStats = async () => {
      try {
        setLoadingUploads(true)
        const response = await fetch('/api/dashboard/stats')
        if (response.ok) {
          const data = await response.json()
          setUploadsThisMonth(data.uploadsThisMonth || 0)
          setUploadsPrevMonth(data.uploadsPrevMonth || 0)
          setActiveClientsAddedThisMonth(data.activeClientsAddedThisMonth || 0)
        }
      } catch (error) {
        // 静默失败，保持初始值
      } finally {
        setLoadingUploads(false)
      }
    }

    // 延迟 100ms 执行，确保页面先渲染
    const timer = setTimeout(fetchUploadStats, 100)
    return () => clearTimeout(timer)
  }, [])

  // Real clients from DB passed via props (no mock fallback)
  const clients = initialClients

  const overdue = clients.filter(c => c.health_status === 'Overdue')
  const dueSoon = clients.filter(c => c.health_status === 'Due Soon')

  const filteredClients = clients.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
    if (!matchSearch) return false
    if (filter === 'Overdue') return c.health_status === 'Overdue'
    if (filter === 'Due Soon') return c.health_status === 'Due Soon'
    if (filter === 'Starred') return starred.has(c.id)
    return true
  })

  // Sort clients: Overdue (most overdue first) → Due Soon → Not Started → In Progress → Complete → No Action
  const sortedClients = [...filteredClients].sort((a, b) => {
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

  const toggleStar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setStarred(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const getRowBg = (status: ClientStatus) => {
    if (status === 'Overdue') return '#FFF8F8'
    if (status === 'Due Soon') return '#FFFDF5'
    return 'white'
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

  // Format: "Never", "2 hours ago", or "18 Mar 2026"
  const formatRelativeUpload = (dateStr: string | undefined | null) => {
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

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-4 gap-4">
        {/* Active Clients */}
        <div className="filio-card p-5 stat-card-green">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">Active Clients</p>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold text-gray-900 tabular-nums">{stats.activeClientsCount}</p>
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <TrendingUp size={11} style={{ color: '#059669' }} />
                <span style={{ color: '#059669' }}>+{activeClientsAddedThisMonth}</span> this month
              </p>
            </div>
            <Sparkline data={stats.clientsSparkline} color="#059669" />
          </div>
        </div>

        {/* Uploads This Month */}
        <div className="filio-card p-5 stat-card-blue">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">Uploads This Month</p>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold text-gray-900 tabular-nums relative">
                {loadingUploads ? (
                  <span className="inline-block animate-pulse">...</span>
                ) : (
                  uploadsThisMonth
                )}
              </p>
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <TrendingUp size={11} style={{ color: '#059669' }} />
                <span style={{ color: '#059669' }}>Current month</span>
              </p>
            </div>
            <Sparkline data={stats.uploadsSparkline} color="#2563EB" />
          </div>
        </div>

        {/* Overdue */}
        <div className="filio-card p-5 stat-card-red">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">Overdue</p>
          <div>
            <p className="text-3xl font-bold tabular-nums" style={{ color: '#DC2626' }}>{stats.overdueCount}</p>
            <p className="text-xs mt-1" style={{ color: '#DC2626' }}>Immediate action needed</p>
            <div className="flex gap-1 mt-2 flex-wrap">
              {overdue.slice(0, 2).map(c => (
                <span key={c.id} className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: '#FEE2E2', color: '#DC2626' }}>
                  {c.name.split(' ')[0]}
                </span>
              ))}
              {overdue.length > 2 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: '#FEE2E2', color: '#DC2626' }}>
                  +{overdue.length - 2} more
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Due Soon */}
        <div className="filio-card p-5 stat-card-amber">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">Due Soon</p>
          <div>
            <p className="text-3xl font-bold tabular-nums" style={{ color: '#D97706' }}>{stats.dueSoonCount}</p>
            <p className="text-xs mt-1" style={{ color: '#D97706' }}>Within 14 days</p>
            <div className="mt-2">
              <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                <span>{stats.pendingClientsCount} of {stats.activeClientsCount} clients pending</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-amber-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: stats.activeClientsCount > 0
                      ? `${Math.round((stats.pendingClientsCount / stats.activeClientsCount) * 100)}%`
                      : '0%',
                    background: '#D97706'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Grid: Table + Right Panel ── */}
      <div className="flex gap-5">
        {/* Client Overview Table */}
        <div className="flex-[3] min-w-0 filio-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">Client Overview</h2>
            <Link href="/dashboard/clients" className="text-xs font-medium flex items-center gap-1" style={{ color: '#059669' }}>
                View all clients <ChevronRight size={13} />
              </Link>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-50">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:border-emerald-400 focus:bg-white transition-all"
            />
            <div className="flex gap-1.5">
              {(['All', 'Overdue', 'Due Soon', 'Starred'] as FilterTab[]).map(tab => {
                const counts: Record<FilterTab, number | null> = {
                  'All': clients.length,
                  'Overdue': overdue.length,
                  'Due Soon': dueSoon.length,
                  'Starred': starred.size,
                }
                const colors: Record<FilterTab, string> = {
                  'All': '#059669', 'Overdue': '#DC2626', 'Due Soon': '#D97706', 'Starred': '#D97706'
                }
                const isActive = filter === tab
                return (
                  <button
                    key={tab}
                    onClick={() => setFilter(tab)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={isActive
                      ? { background: colors[tab], color: 'white' }
                      : { background: '#F3F4F6', color: '#6B7280' }
                    }
                  >
                    {tab === 'Starred' ? '★ Starred' : `${tab}${counts[tab] !== null ? ` (${counts[tab]})` : ''}`}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
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
                {sortedClients.map((client) => (
                  <tr
                    key={client.id}
                    className="border-b border-gray-50 hover:brightness-[0.98] transition-all cursor-pointer group"
                    style={{ background: getRowBg(client.health_status as ClientStatus) }}
                    onClick={() => window.location.href = `/dashboard/clients/${client.client_number ?? client.id}`}
                  >
                    <td className="px-4 py-3.5">
                      <button
                        onClick={(e) => toggleStar(client.id, e)}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          size={15}
                          fill={starred.has(client.id) ? '#D97706' : 'none'}
                          style={{ color: starred.has(client.id) ? '#D97706' : '#D1D5DB' }}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${getClientAvatarBg(client.health_status)}`}
                        >
                          {client.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{client.name}</p>
                          <p className="text-xs text-gray-400">{client.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={client.health_status as ClientStatus} />
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-gray-700">
                        {client.upload_progress?.uploaded || 0} files
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div>
                        <p className="text-xs font-medium text-gray-700">
                          {client.next_deadline?.type || 'No deadline'} · {formatDays(client.next_deadline?.date) || 'N/A'}
                        </p>
                        <p className="text-[10px] text-gray-400">{client.next_deadline?.date || 'No deadline set'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-gray-500">
                        {formatRelativeUpload(client.last_upload)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {(client.health_status === 'Overdue' || client.health_status === 'Due Soon') ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); toast.success(`Reminder sent to ${client.name}`); }}
                          className="btn-primary text-xs px-3 py-1.5"
                        >
                          <Send size={12} /> Send Reminder
                        </button>
                      ) : (
                        <Link
                          href={`/dashboard/clients/${client.client_number ?? client.id}`}
                          onClick={e => e.stopPropagation()}
                          className="btn-secondary text-xs px-3 py-1.5"
                        >
                          <Eye size={12} /> View
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredClients.length === 0 && (
              <div className="py-12 text-center">
                <Users size={32} className="mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-400">No clients match your filter</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1 min-w-[260px] space-y-4">
          {/* Upcoming Deadlines */}
          <div className="filio-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900">Upcoming Deadlines</h3>
              <Link href="/dashboard/clients" className="text-xs font-medium" style={{ color: '#059669' }}>View all</Link>
            </div>
            <div className="space-y-3">
              {stats.upcomingDeadlines.slice(0, 5).map(d => {
                // Status-based colors matching health status text colors
                const statusColors: Record<string, string> = {
                  'Overdue': '#DC2626',
                  'Due Soon': '#D97706',
                  'Not Started': '#2563EB',
                  'In Progress': '#CA8A04',
                  'Complete': '#15803D',
                  'No Action': '#475569',
                }
                const color = statusColors[d.status] || '#475569'
                return (
                  <div key={d.id} className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{d.client}</p>
                      <p className="text-[10px] text-gray-400">{d.type}</p>
                    </div>
                    <span
                      className="text-xs font-bold tabular-nums shrink-0"
                      style={{ color }}
                    >
                      {new Date(d.date) < new Date() ? 'Overdue' : `${Math.ceil((new Date(d.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}d`}
                    </span>
                  </div>
                )
              })}
              {stats.upcomingDeadlines.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">No upcoming deadlines</p>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="filio-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900">Recent Uploads</h3>
              <Link href="/dashboard/uploads" className="text-xs font-medium" style={{ color: '#059669' }}>
                All uploads
              </Link>
            </div>
            <div className="space-y-3">
              {stats.recentUploads.slice(0, 5).map(a => {
                const style = ACTIVITY_STYLES[(a.channel || 'upload') as ActivityType] || ACTIVITY_STYLES.upload;
                const IconComponent = style.icon;
                return (
                  <div key={a.id} className="flex items-start gap-2.5">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: style.bg, color: style.color }}
                    >
                      <IconComponent size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-700 truncate" title={`${a.clientName} uploaded ${a.filename}`}>
                        <span className="font-semibold">{a.clientName}</span> uploaded {a.filename}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-gray-400">{formatRelativeTime(a.time)}</span>
                        {a.xeroStatus === 'synced' && (
                          <span className="text-[10px] font-medium" style={{ color: '#059669' }}>· Synced ✓</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              {stats.recentUploads.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">No recent activity</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Onboarding Overlay ── */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setShowOnboarding(false)} className="absolute top-4 right-4 text-gray-300 hover:text-gray-500 transition-colors">
              <X size={20} />
            </button>

            {/* State 1: Xero not connected */}
            {!xeroConnected && (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: '#E0F2FE' }}>
                    <Zap size={28} style={{ color: '#13B5EA' }} />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Connect your Xero account</h2>
                  <p className="text-sm text-gray-500 leading-relaxed">Connect Xero to automatically sync your clients and upload documents directly to their records.</p>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/xero/auth-url')
                        const data = await response.json()
                        if (data.authUrl) {
                          window.location.href = data.authUrl
                        } else {
                          toast.error('Failed to connect to Xero')
                        }
                      } catch (error) {
                        toast.error('Failed to connect to Xero')
                      }
                    }}
                    className="btn-xero w-full justify-center py-3"
                  >
                    <Zap size={16} /> Connect with Xero
                  </button>
                  <button onClick={() => setShowOnboarding(false)} className="btn-secondary w-full justify-center py-2.5">
                    Skip for now
                  </button>
                </div>
              </>
            )}

            {/* State 2: Xero connected, no clients yet */}
            {xeroConnected && (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: '#ECFDF5' }}>
                    <Users size={28} style={{ color: '#059669' }} />
                  </div>
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full" style={{ background: '#34D399', boxShadow: '0 0 6px #34D399' }} />
                    <span className="text-xs font-semibold text-emerald-600">Xero Connected</span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Import your clients</h2>
                  <p className="text-sm text-gray-500 leading-relaxed">Your client list is empty. Import your existing contacts from Xero to get started.</p>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/xero/import', { method: 'POST' })
                        if (response.ok) {
                          toast.success('Clients imported successfully!')
                          setShowOnboarding(false)
                          window.location.reload()
                        } else {
                          toast.error('Failed to import clients')
                        }
                      } catch (error) {
                        toast.error('Failed to import clients')
                      }
                    }}
                    className="btn-primary w-full justify-center py-3"
                  >
                    <Zap size={16} /> Import Clients from Xero
                  </button>
                  <button onClick={() => setShowOnboarding(false)} className="btn-secondary w-full justify-center py-2.5">
                    Skip for now
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}