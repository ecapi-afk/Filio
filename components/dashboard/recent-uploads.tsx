"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Image, Check, AlertCircle, Clock, Loader2, FileUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/context"

type Upload = {
  id: string
  client_id: string
  client_name: string
  file_type: string
  file_name: string
  uploaded_at: string
  xero_status: string
}

function getFileIcon(fileType: string) {
  if (fileType === "Receipt" || fileType.includes("jpg") || fileType.includes("png")) {
    return <Image className="h-4 w-4" />
  }
  return <FileText className="h-4 w-4" />
}

function getFileTypeBadge(fileType: string) {
  const colors: Record<string, string> = {
    "Receipt": "bg-blue-50 text-blue-700 border-blue-200",
    "Invoice": "bg-purple-50 text-purple-700 border-purple-200",
    "Bank Statement": "bg-green-50 text-green-700 border-green-200",
    "Contract": "bg-orange-50 text-orange-700 border-orange-200",
    "Payslip": "bg-pink-50 text-pink-700 border-pink-200",
    "Other": "bg-gray-50 text-gray-700 border-gray-200",
  }
  return colors[fileType] || colors["Other"]
}

export function RecentUploads() {
  const { t, locale } = useI18n()
  const [uploads, setUploads] = useState<Upload[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchUploads() {
      try {
        const response = await fetch('/api/uploads?limit=5')
        if (response.ok) {
          const { data } = await response.json()
          setUploads(data || [])
        }
      } catch (error) {
        console.error('Failed to fetch uploads:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchUploads()
  }, [])

  function getXeroStatus(status: string) {
    switch ((status || '').toLowerCase()) {
      case "synced":
        return (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <Check className="h-3.5 w-3.5" />
            {t("uploads.status.synced")}
          </span>
        )
      case "failed":
      case "error":
        return (
          <span className="flex items-center gap-1 text-xs text-red-600">
            <AlertCircle className="h-3.5 w-3.5" />
            {t("uploads.status.failed")}
          </span>
        )
      case "pending":
        return (
          <span className="flex items-center gap-1 text-xs text-amber-600">
            <Clock className="h-3.5 w-3.5" />
            {t("uploads.status.pending")}
          </span>
        )
      default:
        return null
    }
  }

  function formatUploadTime(dateStr: string) {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) {
      return locale === "en" ? `${diffMins} min ago` : `${diffMins} 分钟前`
    } else if (diffHours < 24) {
      return locale === "en" ? `${diffHours}h ago` : `${diffHours} 小时前`
    } else {
      return locale === "en" ? `${diffDays}d ago` : `${diffDays} 天前`
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">{t("dashboard.recentUploads")}</CardTitle>
        <Link href="/dashboard/uploads" className="text-sm text-primary hover:underline">
          {t("dashboard.recentUploads.viewAll")}
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : uploads.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            <FileUp className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>{locale === "en" ? "No uploads yet" : "暂无上传记录"}</p>
            <p className="text-xs mt-1">{locale === "en" ? "Files uploaded by clients will appear here" : "客户上传的文件将显示在这里"}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {uploads.map((upload) => (
              <div key={upload.id} className={cn(
                "flex items-center justify-between px-6 py-3 hover:bg-muted/50 transition-colors",
                (upload.xero_status || '').toLowerCase() === "failed" && "border-l-2 border-l-red-500"
              )}>
                <div className="flex items-center gap-4 min-w-0">
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    {getFileIcon(upload.file_type)}
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/clients/${upload.client_id}`}
                      className="font-medium text-sm hover:text-primary transition-colors block truncate"
                    >
                      {upload.client_name}
                    </Link>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {upload.file_name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className={cn("text-xs shrink-0", getFileTypeBadge(upload.file_type))}>
                    {upload.file_type}
                  </Badge>
                  <span className="text-xs text-muted-foreground shrink-0 w-20 text-right">
                    {formatUploadTime(upload.uploaded_at)}
                  </span>
                  <div className="w-20 shrink-0">
                    {getXeroStatus(upload.xero_status)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
