"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, Send, Download } from "lucide-react"
import { useI18n } from "@/lib/i18n/context"

export function QuickActions() {
  const { t, locale } = useI18n()

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">{t("dashboard.quickActions")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button variant="outline" className="w-full justify-start h-11">
          <RefreshCw className="h-4 w-4 mr-3" />
          {locale === "en" ? "Sync Clients from Xero" : "从 Xero 同步客户"}
        </Button>
        <Button variant="outline" className="w-full justify-start h-11">
          <Send className="h-4 w-4 mr-3" />
          {locale === "en" ? "Send Overdue Reminders" : "向逾期客户发送提醒"}
        </Button>
        <Button variant="outline" className="w-full justify-start h-11">
          <Download className="h-4 w-4 mr-3" />
          {locale === "en" ? "Download Audit Report" : "下载审计报告"}
        </Button>
      </CardContent>
    </Card>
  )
}
