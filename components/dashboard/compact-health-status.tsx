"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/context"

type HealthStatusData = {
  overdue: number
  due_soon: number
  not_started: number
  in_progress: number
  complete: number
  no_action: number
}

export function CompactHealthStatus() {
  const { t, locale } = useI18n()
  const [healthStatus, setHealthStatus] = useState<HealthStatusData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/dashboard/stats')
        if (response.ok) {
          const data = await response.json()
          setHealthStatus(data.healthStatus)
        }
      } catch (error) {
        console.error('Failed to fetch health status:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchStats()
  }, [])

  const statusGroups = [
    {
      status: "overdue",
      labelEn: "Overdue",
      labelZh: "已逾期",
      count: healthStatus?.overdue || 0,
      color: "bg-red-500",
      textColor: "text-red-700",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
    },
    {
      status: "due_soon",
      labelEn: "Due Soon",
      labelZh: "即将到期",
      count: healthStatus?.due_soon || 0,
      color: "bg-amber-500",
      textColor: "text-amber-700",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
    },
    {
      status: "not_started",
      labelEn: "Not Started",
      labelZh: "未开始",
      count: healthStatus?.not_started || 0,
      color: "bg-blue-500",
      textColor: "text-blue-700",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    {
      status: "in_progress",
      labelEn: "In Progress",
      labelZh: "进行中",
      count: healthStatus?.in_progress || 0,
      color: "bg-yellow-500",
      textColor: "text-yellow-700",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
    },
    {
      status: "complete",
      labelEn: "Complete",
      labelZh: "已完成",
      count: healthStatus?.complete || 0,
      color: "bg-emerald-500",
      textColor: "text-emerald-700",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
    },
    {
      status: "no_action",
      labelEn: "No Action",
      labelZh: "无需操作",
      count: healthStatus?.no_action || 0,
      color: "bg-gray-400",
      textColor: "text-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
    },
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">
          {locale === 'en' ? 'Health Status' : '健康状态'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {statusGroups.map((group) => (
              <Link
                key={group.status}
                href={`/dashboard/clients?status=${group.status}`}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg border transition-all hover:shadow-sm",
                  group.bgColor,
                  group.borderColor
                )}
              >
                <div className={cn("h-2 w-2 rounded-full shrink-0", group.color)} />
                <div className="flex-1 min-w-0">
                  <div className={cn("text-lg font-bold", group.textColor)}>
                    {group.count}
                  </div>
                  <div className={cn("text-xs truncate", group.textColor)}>
                    {locale === "en" ? group.labelEn : group.labelZh}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
