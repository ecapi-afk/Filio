"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, Clock, AlertCircle, FileUp, Loader2 } from "lucide-react"
import { useI18n } from "@/lib/i18n/context"

type DashboardStats = {
  activeClients: number
  totalClients: number
  uploadsThisMonth: number
  healthStatus: {
    overdue: number
    due_soon: number
    not_started: number
    in_progress: number
    complete: number
    no_action: number
  }
}

export function StatsCards() {
  const { t, locale } = useI18n()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/dashboard/stats')
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-5 flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const statsData = [
    {
      labelKey: "dashboard.stats.activeClients",
      value: stats?.activeClients || 0,
      subLabel: locale === "en" ? `Plan limit 100` : `套餐限额 100`,
      progress: stats?.activeClients || 0,
      icon: TrendingUp,
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
    },
    {
      labelKey: "dashboard.stats.documentsReceived",
      value: stats?.uploadsThisMonth || 0,
      subLabel: locale === "en" ? "Last 30 days" : "最近 30 天",
      icon: FileUp,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-100",
    },
    {
      labelKey: "dashboard.stats.pending",
      value: stats?.healthStatus.due_soon || 0,
      subLabel: locale === "en" ? "Due soon" : "即将到期",
      icon: Clock,
      iconColor: "text-amber-600",
      iconBg: "bg-amber-100",
    },
    {
      labelKey: "dashboard.stats.overdue",
      value: stats?.healthStatus.overdue || 0,
      subLabel: locale === "en" ? "Needs attention" : "需要关注",
      icon: AlertCircle,
      iconColor: "text-red-600",
      iconBg: "bg-red-100",
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statsData.map((stat) => (
        <Card key={stat.labelKey}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t(stat.labelKey)}</p>
                <p className="text-3xl font-bold mt-1">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.subLabel}</p>
              </div>
              <div className={`p-2.5 rounded-lg ${stat.iconBg}`}>
                <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
              </div>
            </div>
            {stat.progress !== undefined && (
              <div className="mt-3">
                <Progress value={stat.progress} className="h-1.5" />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
