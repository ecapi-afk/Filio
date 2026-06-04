'use client'

import { useState, useEffect, useCallback } from 'react'
import { FileText, Users, Download, Loader2, Clock, ChevronRight, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ACTIVITY_STYLES, ACTIVITY_LABELS, type ActivityType, XERO_STATUS_STYLES } from '@/lib/constants/activity'
import { formatRelativeTime } from '@/lib/utils'
import Link from 'next/link'

interface Activity {
  id: string
  type: ActivityType
  clientName: string
  clientId: string | null
  description: string
  timestamp: string
  xeroStatus?: 'synced' | 'pending' | 'failed'
  fileName?: string
  originalFileName?: string | null
}

interface ClientStat {
  id: string
  name: string
  management_status: string
  last_upload: string | null
  total_uploads: number
}

const FILTER_TYPES = ['All', 'upload', 'email', 'reminder', 'client_added', 'info_change', 'config_change', 'status_change', 'note_added', 'client_dormant', 'client_deleted'] as const
type FilterType = typeof FILTER_TYPES[number]

export default function ActivityPage() {
  const [filter, setFilter] = useState<FilterType>('All')
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inactiveClients, setInactiveClients] = useState<ClientStat[]>([])
  const [statsLoading, setStatsLoading] = useState(true)

  const fetchActivities = useCallback(async (type: FilterType) => {
    setLoading(true)
    setError(null)
    try {
      const url = type === 'All'
        ? '/api/activity?limit=50'
        : `/api/activity?type=${type}&limit=50`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setActivities(data.activities || [])
    } catch {
      setError('Failed to load activity. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchActivities(filter)
  }, [filter, fetchActivities])

  useEffect(() => {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    fetch('/api/clients/activity-stats')
      .then(r => r.json())
      .then(data => {
        const inactive = (data.data?.clients || []).filter((c: ClientStat) =>
          c.management_status === 'active' &&
          (!c.last_upload || new Date(c.last_upload) < ninetyDaysAgo)
        )
        setInactiveClients(inactive)
      })
      .catch(() => {})
      .finally(() => setStatsLoading(false))
  }, [])

  return (
    <div className="flex gap-6 items-start">
      {/* Main Activity Feed */}
      <div className="flex-1 min-w-0 space-y-5">
        <div className="flex items-center justify-end">
          <Button variant="outline" size="sm">
            <Download size={14} className="mr-1.5" /> Export
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-2 flex-wrap">
              {FILTER_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    filter === type
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {type === 'All' ? 'All Activity' : ACTIVITY_LABELS[type as ActivityType]}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Activity List */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="animate-spin text-gray-400" size={24} />
              </div>
            ) : error ? (
              <div className="py-12 text-center">
                <p className="text-sm text-red-500">{error}</p>
                <button
                  onClick={() => fetchActivities(filter)}
                  className="mt-2 text-xs text-emerald-600 hover:underline"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {activities.map((activity) => {
                  const style = ACTIVITY_STYLES[activity.type] || ACTIVITY_STYLES.upload
                  const Icon = style.icon
                  return (
                    <div
                      key={activity.id}
                      className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors"
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: style.bg, color: style.color }}
                      >
                        <Icon size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {activity.clientId ? (
                            <Link
                              href={`/dashboard/clients/${activity.clientId}`}
                              className="text-sm font-semibold text-gray-900 hover:text-emerald-700 hover:underline"
                            >
                              {activity.clientName}
                            </Link>
                          ) : (
                            <span className="text-sm font-semibold text-gray-900">{activity.clientName}</span>
                          )}
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                            style={{ background: style.bg, color: style.color }}
                          >
                            {ACTIVITY_LABELS[activity.type]}
                          </span>
                          {activity.xeroStatus && (
                            <span className={`text-xs shrink-0 ${XERO_STATUS_STYLES[activity.xeroStatus].className}`}>
                              {XERO_STATUS_STYLES[activity.xeroStatus].label}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{activity.description}</p>
                        {activity.fileName && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate" title={activity.fileName}>
                            <FileText size={10} className="inline mr-1" />
                            {activity.fileName}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 shrink-0 mt-0.5">
                        {formatRelativeTime(activity.timestamp)}
                      </span>
                    </div>
                  )
                })}

                {activities.length === 0 && !loading && (
                  <div className="py-12 text-center">
                    <Users size={32} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-sm text-gray-400">No activity found</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Suggestions Sidebar */}
      <div className="w-72 shrink-0 space-y-4 sticky top-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock size={14} className="text-amber-500" />
              Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {statsLoading ? (
              <div className="px-4 pb-4">
                <div className="skeleton h-20 rounded-lg" />
              </div>
            ) : inactiveClients.length === 0 ? (
              <div className="px-4 pb-4 text-center">
                <Zap size={20} className="mx-auto mb-2 text-emerald-400" />
                <p className="text-xs text-gray-500">All active clients have uploaded recently</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                <div className="px-4 py-3 bg-amber-50/60">
                  <p className="text-xs font-semibold text-amber-700">
                    {inactiveClients.length} client{inactiveClients.length !== 1 ? 's' : ''} haven&apos;t uploaded in 90+ days
                  </p>
                </div>
                {inactiveClients.slice(0, 5).map(c => (
                  <Link
                    key={c.id}
                    href={`/dashboard/clients/${c.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50/60 transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{c.name}</p>
                      <p className="text-[10px] text-gray-400">
                        {c.last_upload ? `Last: ${formatRelativeTime(c.last_upload)}` : 'Never uploaded'}
                      </p>
                    </div>
                    <ChevronRight size={12} className="text-gray-300 group-hover:text-gray-500 shrink-0 ml-2" />
                  </Link>
                ))}
                {inactiveClients.length > 5 && (
                  <div className="px-4 py-2.5 text-center">
                    <Link href="/dashboard/clients" className="text-xs text-emerald-600 hover:underline">
                      View all {inactiveClients.length} →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
