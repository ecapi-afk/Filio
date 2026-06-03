"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Send, Calendar, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/context"

type Deadline = {
  id: string
  client_id: string
  client_name: string
  deadline_type: string
  deadline_date: string
  upload_status: string
}

export function UpcomingDeadlines() {
  const { t, locale } = useI18n()
  const [deadlines, setDeadlines] = useState<Deadline[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchDeadlines() {
      try {
        const response = await fetch('/api/clients?management_status=active&limit=5')
        if (response.ok) {
          const { data } = await response.json()
          // Transform client data to deadline format
          const upcomingDeadlines = (data || [])
            .filter((client: any) => client.next_deadline?.date)
            .map((client: any) => ({
              id: client.id,
              client_id: client.id,
              client_name: client.name,
              deadline_type: client.next_deadline?.type || 'VAT Return',
              deadline_date: client.next_deadline?.date,
              upload_status: client.upload_progress?.uploaded === client.upload_progress?.required
                ? 'complete'
                : client.upload_progress?.uploaded > 0
                  ? 'partial'
                  : 'not_uploaded',
            }))
            .sort((a: any, b: any) => new Date(a.deadline_date).getTime() - new Date(b.deadline_date).getTime())
            .slice(0, 5)

          setDeadlines(upcomingDeadlines)
        }
      } catch (error) {
        console.error('Failed to fetch deadlines:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchDeadlines()
  }, [])

  function getStatusBadge(status: string) {
    switch (status) {
      case "not_uploaded":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">{locale === "en" ? "Not Uploaded" : "未上传"}</Badge>
      case "partial":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{locale === "en" ? "Partial" : "部分完成"}</Badge>
      case "complete":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{locale === "en" ? "Complete" : "已完成"}</Badge>
      default:
        return null
    }
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr)
    return date.toLocaleDateString(locale === "en" ? "en-US" : "zh-CN", { month: "short", day: "numeric" })
  }

  function getDaysLeft(dateStr: string) {
    const deadline = new Date(dateStr)
    const now = new Date()
    const diffTime = deadline.getTime() - now.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">{t("dashboard.upcomingDeadlines")}</CardTitle>
        <Link href="/dashboard/clients" className="text-sm text-primary hover:underline">
          {t("dashboard.recentUploads.viewAll")}
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : deadlines.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>{locale === "en" ? "No upcoming deadlines" : "暂无即将到期的截止日"}</p>
            <p className="text-xs mt-1">{locale === "en" ? "Import clients from Xero to get started" : "从 Xero 导入客户以开始使用"}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {deadlines.map((deadline) => {
              const daysLeft = getDaysLeft(deadline.deadline_date)
              return (
                <div key={deadline.id} className="flex items-center justify-between px-6 py-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <Link
                      href={`/dashboard/clients/${deadline.client_id}`}
                      className="font-medium hover:text-primary transition-colors"
                    >
                      {deadline.client_name}
                    </Link>
                    <Badge variant="secondary" className="text-xs">
                      {deadline.deadline_type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={cn(
                      "text-sm",
                      daysLeft <= 7 ? "text-red-600 font-medium" :
                      daysLeft <= 14 ? "text-amber-600" : "text-muted-foreground"
                    )}>
                      {formatDate(deadline.deadline_date)}
                    </span>
                    {getStatusBadge(deadline.upload_status)}
                    {deadline.upload_status !== "complete" && (
                      <Button size="sm" variant="outline" className="h-8">
                        <Send className="h-3.5 w-3.5 mr-1.5" />
                        {t("clients.sendReminder")}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
