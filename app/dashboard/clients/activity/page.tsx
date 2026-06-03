'use client'

import { useState, useEffect, useCallback } from 'react'
import { FileText, Users, Download, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
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

const FILTER_TYPES = ['All', 'upload', 'email', 'reminder', 'client_added', 'info_change', 'config_change', 'status_change', 'note_added', 'client_dormant', 'client_deleted'] as const
type FilterType = typeof FILTER_TYPES[number]

export default function ActivityPage() {
  const [filter, setFilter] = useState<FilterType>('All')
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
    } catch (e) {
      setError('Failed to load activity. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchActivities(filter)
  }, [filter, fetchActivities])

  return (
    <div className="space-y-6">
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
  )
}
