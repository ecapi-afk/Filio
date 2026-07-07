"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, Loader2 } from "lucide-react"
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

type StatCardProps = {
  label: string
  value: number
  subLabel: string
  trend?: {
    value: number
    isPositive: boolean
  }
  progress?: number
  borderColor: string
  sparklineData?: number[]
  sparklineColor?: string
  clientTags?: string[]
  showProgressBar?: boolean
  valueColor?: string
  subLabelColor?: string
}

function Sparkline({ data, color }: { data: number[], color: string }) {
  if (!data || data.length === 0) return null

  const max = Math.max(...data)
  const normalized = data.map(v => (v / max) * 100)

  return (
    <div className="flex items-end gap-0.5 h-8">
      {normalized.map((height, i) => (
        <div
          key={i}
          className="w-1.5 rounded-sm transition-all"
          style={{
            height: `${height}%`,
            background: i === normalized.length - 1 ? color : `${color}40`
          }}
        />
      ))}
    </div>
  )
}

function StatCard({
  label,
  value,
  subLabel,
  trend,
  progress,
  borderColor,
  sparklineData,
  sparklineColor,
  clientTags,
  showProgressBar,
  valueColor,
  subLabelColor
}: StatCardProps & { valueColor?: string; subLabelColor?: string }) {
  return (
    <Card className="relative overflow-hidden">
      {/* Colored top border */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${borderColor}`} />

      <CardContent className="p-5 pt-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">{label}</p>

        {/* Active Clients & Uploads layout */}
        {sparklineData && sparklineData.length > 0 ? (
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold text-gray-900 tabular-nums">{value}</p>
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                {trend && (
                  <>
                    <TrendingUp size={11} style={{ color: '#059669' }} />
                    <span style={{ color: '#059669' }}>{trend.value > 0 ? '+' : ''}{trend.value}{subLabel.includes('%') ? '%' : ''}</span>
                  </>
                )}
                {' '}{subLabel}
              </p>
            </div>
            <Sparkline data={sparklineData} color={sparklineColor || '#059669'} />
          </div>
        ) : (
          /* Overdue & Due Soon layout */
          <div>
            <p className="text-3xl font-bold tabular-nums" style={valueColor ? { color: valueColor } : undefined}>
              {value}
            </p>
            <p className="text-xs mt-1" style={subLabelColor ? { color: subLabelColor } : undefined}>
              {subLabel}
            </p>

            {/* Client Tags */}
            {clientTags && clientTags.length > 0 && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {clientTags.map((tag, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={
                      borderColor === 'bg-red-500'
                        ? { background: '#FEE2E2', color: '#DC2626' }
                        : { background: '#FEF3C7', color: '#D97706' }
                    }
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Progress bar */}
            {showProgressBar && progress !== undefined && (
              <div className="mt-2">
                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                  <span>6 of 10 clients pending</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-amber-100 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(progress, 100)}%`, background: '#D97706' }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function EnhancedStatsCards() {
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
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // Generate mock sparkline data (in real app, this would come from API)
  const generateSparkline = (base: number) => {
    return Array.from({ length: 10 }, (_, i) =>
      Math.max(0, base + Math.floor(Math.random() * 10 - 5))
    )
  }

  // Get overdue and due soon clients for tags
  const overdueClients = stats?.healthStatus.overdue || 0
  const dueSoonClients = stats?.healthStatus.due_soon || 0

  const statsData: StatCardProps[] = [
    {
      label: t("dashboard.stats.activeClients"),
      value: stats?.activeClients || 0,
      subLabel: "this month",
      trend: stats?.activeClients ? { value: 3, isPositive: true } : undefined,
      borderColor: "bg-emerald-600",
      sparklineData: stats?.activeClients ? generateSparkline(stats.activeClients) : undefined,
      sparklineColor: "#059669",
    },
    {
      label: t("dashboard.stats.documentsReceived"),
      value: stats?.uploadsThisMonth || 0,
      subLabel: "vs last month",
      trend: stats?.uploadsThisMonth ? { value: 12, isPositive: true } : undefined,
      borderColor: "bg-blue-500",
      sparklineData: stats?.uploadsThisMonth ? generateSparkline(stats.uploadsThisMonth) : undefined,
      sparklineColor: "#2563EB",
    },
    {
      label: locale === "en" ? "Overdue" : "已逾期",
      value: overdueClients,
      subLabel: locale === "en" ? "Immediate action needed" : "需要立即处理",
      borderColor: "bg-red-500",
      valueColor: "#DC2626",
      subLabelColor: "#DC2626",
      clientTags: overdueClients > 0 ? ["Bright"] : undefined,
    },
    {
      label: locale === "en" ? "Due Soon" : "即将到期",
      value: dueSoonClients,
      subLabel: locale === "en" ? "Within 14 days" : "14 天内到期",
      borderColor: "bg-amber-500",
      valueColor: "#D97706",
      subLabelColor: "#D97706",
      showProgressBar: dueSoonClients > 0,
      progress: dueSoonClients > 0 ? 60 : 0,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statsData.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  )
}
