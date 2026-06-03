"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Loader2, FileUp, Mail, Upload, CheckCircle, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/context"

type Activity = {
  id: string
  type: 'upload' | 'reminder' | 'sync'
  client_name: string
  client_id: string
  message: string
  timestamp: string
  status?: 'success' | 'failed'
}

export function RecentActivity() {
  const { locale } = useI18n()
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchActivities() {
      try {
        // Fetch recent uploads
        const uploadsRes = await fetch('/api/uploads?limit=3')
        if (uploadsRes.ok) {
          const { data: uploads } = await uploadsRes.json()
          const uploadActivities: Activity[] = (uploads || []).map((upload: any) => ({
            id: upload.id,
            type: 'upload',
            client_name: upload.client_name,
            client_id: upload.client_id,
            message: locale === 'en'
              ? `uploaded ${upload.file_type || 'file'} via Portal`
              : `通过门户上传了${upload.file_type || '文件'}`,
            timestamp: upload.uploaded_at,
            status: (upload.xero_status || '').toLowerCase() === 'synced' ? 'success' : (upload.xero_status || '').toLowerCase() === 'failed' ? 'failed' : undefined,
          }))
          setActivities(uploadActivities)
        }
      } catch (error) {
        console.error('Failed to fetch activities:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchActivities()
  }, [locale])

  function getActivityIcon(type: string, status?: string) {
    if (type === 'upload') {
      if (status === 'success') return <CheckCircle className="h-4 w-4 text-emerald-600" />
      if (status === 'failed') return <AlertCircle className="h-4 w-4 text-red-600" />
      return <Upload className="h-4 w-4 text-blue-600" />
    }
    if (type === 'reminder') return <Mail className="h-4 w-4 text-amber-600" />
    if (type === 'sync') return <FileUp className="h-4 w-4 text-emerald-600" />
    return <FileUp className="h-4 w-4 text-gray-400" />
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)

    if (diffMins < 1) {
      return locale === 'en' ? 'Just now' : '刚刚'
    } else if (diffMins < 60) {
      return locale === 'en' ? `${diffMins} min ago` : `${diffMins} 分钟前`
    } else if (diffHours < 24) {
      return locale === 'en' ? `${diffHours}h ago` : `${diffHours} 小时前`
    } else {
      return date.toLocaleDateString(locale === 'en' ? 'en-US' : 'zh-CN', { month: 'short', day: 'numeric' })
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">
          {locale === 'en' ? 'Recent Activity' : '最近活动'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8">
            <FileUp className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-500">
              {locale === 'en' ? 'No recent activity' : '暂无最近活动'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                <div className="mt-0.5">
                  {getActivityIcon(activity.type, activity.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/dashboard/clients/${activity.client_id}`}
                      className="font-medium text-sm hover:text-emerald-600 transition-colors truncate"
                    >
                      {activity.client_name}
                    </Link>
                    <span className="text-xs text-gray-500 shrink-0">
                      {formatTime(activity.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">{activity.message}</p>
                  {activity.status && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs mt-1",
                        activity.status === 'success' && "bg-emerald-50 text-emerald-700 border-emerald-200",
                        activity.status === 'failed' && "bg-red-50 text-red-700 border-red-200"
                      )}
                    >
                      {activity.status === 'success' && '✓ Synced'}
                      {activity.status === 'failed' && '✗ Failed'}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
