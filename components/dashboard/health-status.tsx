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

export function HealthStatus() {
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
      bgColor: "bg-red-50",
      textColor: "text-red-700",
      borderColor: "border-red-200",
      filter: "overdue",
    },
    {
      status: "due_soon",
      labelEn: "Due Soon",
      labelZh: "即将到期",
      count: healthStatus?.due_soon || 0,
      color: "bg-amber-500",
      bgColor: "bg-amber-50",
      textColor: "text-amber-700",
      borderColor: "border-amber-200",
      filter: "due_soon",
    },
    {
      status: "not_started",
      labelEn: "Not Started",
      labelZh: "未开始",
      count: healthStatus?.not_started || 0,
      color: "bg-blue-500",
      bgColor: "bg-blue-50",
      textColor: "text-blue-700",
      borderColor: "border-blue-200",
      filter: "not_started",
    },
    {
      status: "in_progress",
      labelEn: "In Progress",
      labelZh: "进行中",
      count: healthStatus?.in_progress || 0,
      color: "bg-yellow-500",
      bgColor: "bg-yellow-50",
      textColor: "text-yellow-700",
      borderColor: "border-yellow-200",
      filter: "in_progress",
    },
    {
      status: "complete",
      labelEn: "Complete",
      labelZh: "已完成",
      count: healthStatus?.complete || 0,
      color: "bg-green-500",
      bgColor: "bg-green-50",
      textColor: "text-green-700",
      borderColor: "border-green-200",
      filter: "complete",
    },
    {
      status: "no_action",
      labelEn: "No Action",
      labelZh: "无需操作",
      count: healthStatus?.no_action || 0,
      color: "bg-gray-400",
      bgColor: "bg-gray-50",
      textColor: "text-gray-600",
      borderColor: "border-gray-200",
      filter: "no_action",
    },
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">{t("dashboard.healthStatus")}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {statusGroups.map((group) => (
              <Link
                key={group.status}
                href={`/dashboard/clients?status=${group.filter}`}
                className={cn(
                  "flex flex-col items-center justify-center p-4 rounded-lg border transition-all hover:shadow-sm",
                  group.bgColor,
                  group.borderColor
                )}
              >
                <div className={cn("h-3 w-3 rounded-full mb-2", group.color)} />
                <span className={cn("text-2xl font-bold", group.textColor)}>
                  {group.count}
                </span>
                <span className={cn("text-xs mt-1", group.textColor)}>
                  {locale === "en" ? group.labelEn : group.labelZh}
                </span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
