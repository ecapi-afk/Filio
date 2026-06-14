'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Building2, CreditCard, TrendingUp, Upload, ChevronLeft, ChevronRight, ExternalLink, Wifi, WifiOff, AlertTriangle, RefreshCw } from 'lucide-react'

interface FirmRow {
  id: string
  name: string
  ownerEmail: string | null
  createdAt: string
  suspendedAt: string | null
  xeroStatus: 'connected' | 'token_expired' | 'not_connected'
  subscription: {
    plan: string
    status: string
    clientLimit: number
    currentPeriodEnd: string | null
  } | null
  activeClients: number
  totalClients: number
  totalUploads: number
}

interface Stats {
  totalFirms: number
  paidFirms: number
  newThisMonth: number
  totalUploads: number
}

const PLAN_COLORS: Record<string, string> = {
  trial: 'bg-gray-100 text-gray-600',
  starter: 'bg-blue-50 text-blue-700',
  professional: 'bg-emerald-50 text-emerald-700',
  firm: 'bg-purple-50 text-purple-700',
}

const PLAN_LABELS: Record<string, string> = {
  trial: 'Trial',
  starter: 'Starter',
  professional: 'Pro',
  firm: 'Firm',
}

export default function AdminListClient() {
  const router = useRouter()
  const [firms, setFirms] = useState<FirmRow[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState<string | null>(null)
  const limit = 20

  const fetchFirms = useCallback(async () => {
    setLoading(true)
    setApiError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (search) params.set('search', search)
      const res = await fetch(`/api/admin/firms?${params}`)
      const data = await res.json()
      if (!res.ok) {
        setApiError(`${res.status}: ${data.error ?? 'Unknown error'}`)
        return
      }
      setFirms(data.firms ?? [])
      setTotal(data.total ?? 0)
      if (data.stats) setStats(data.stats)
    } catch (e: any) {
      setApiError(e.message ?? 'Network error')
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => { fetchFirms() }, [fetchFirms])

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1) }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const totalPages = Math.ceil(total / limit)

  const xeroIcon = (status: FirmRow['xeroStatus']) => {
    if (status === 'connected') return <Wifi size={13} className="text-emerald-500" />
    if (status === 'token_expired') return <AlertTriangle size={13} className="text-amber-500" />
    return <WifiOff size={13} className="text-gray-300" />
  }

  const xeroLabel = (status: FirmRow['xeroStatus']) => {
    if (status === 'connected') return 'Connected'
    if (status === 'token_expired') return 'Expired'
    return 'Not linked'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center">
            <span className="text-white text-xs font-bold">F</span>
          </div>
          <span className="text-sm font-semibold text-gray-900">Filio Control</span>
          <span className="text-xs text-gray-400 font-mono">admin</span>
        </div>
        <button onClick={fetchFirms} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Stats header */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Firms', value: stats.totalFirms, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Paid Accounts', value: stats.paidFirms, icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'New This Month', value: stats.newThisMonth, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Total Uploads', value: stats.totalUploads.toLocaleString(), icon: Upload, color: 'text-amber-600', bg: 'bg-amber-50' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                  <s.icon size={18} className={s.color} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 tabular-nums">{s.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* API error banner */}
        {apiError && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-mono">
            API Error: {apiError}
          </div>
        )}

        {/* Search + count */}
        <div className="flex items-center justify-between mb-4">
          <div className="relative w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
            />
          </div>
          <span className="text-xs text-gray-400">{total} firms</span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Firm</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Plan</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Clients</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Uploads</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Xero</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Registered</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-3 bg-gray-100 rounded animate-pulse w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : firms.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-400">
                    No firms found
                  </td>
                </tr>
              ) : firms.map(firm => {
                const plan = firm.subscription?.plan ?? 'trial'
                const subStatus = firm.subscription?.status ?? 'none'
                const isSuspended = !!firm.suspendedAt
                const limit = firm.subscription?.clientLimit ?? 20

                return (
                  <tr
                    key={firm.id}
                    className={`border-b border-gray-50 hover:bg-gray-50/60 transition-colors cursor-pointer ${isSuspended ? 'opacity-60' : ''}`}
                    onClick={() => router.push(`/filio-control/${firm.id}`)}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
                          {firm.name?.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 flex items-center gap-1.5">
                            {firm.name}
                            {isSuspended && (
                              <span className="text-[10px] font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">SUSPENDED</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-400">{firm.ownerEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold w-fit ${PLAN_COLORS[plan] ?? 'bg-gray-100 text-gray-600'}`}>
                          {PLAN_LABELS[plan] ?? plan}
                        </span>
                        <span className={`text-[10px] ${subStatus === 'active' ? 'text-emerald-600' : 'text-gray-400'}`}>
                          {subStatus === 'active' ? 'Active' : subStatus === 'canceled' ? 'Canceled' : 'No sub'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-gray-900 tabular-nums">{firm.activeClients}</p>
                      <p className="text-xs text-gray-400">of {limit >= 999999 ? '∞' : limit}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-gray-900 tabular-nums">{firm.totalUploads}</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        {xeroIcon(firm.xeroStatus)}
                        {xeroLabel(firm.xeroStatus)}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-400">
                      {new Date(firm.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-4">
                      <ExternalLink size={13} className="text-gray-300" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
