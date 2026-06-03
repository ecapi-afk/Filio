"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Send, Copy, ExternalLink, FileText, Mail, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/context"
import { ClientListItem } from "@/lib/context/clients-context"

interface ClientPreviewSheetProps {
  client: ClientListItem | null
  onClose: () => void
}

const mockUploads = [
  { name: "Receipt_20260405.jpg", date: "2 天前", type: "Receipt" },
  { name: "Invoice_20260403.pdf", date: "4 天前", type: "Invoice" },
  { name: "BankStatement_20260401.pdf", date: "1 周前", type: "Bank Statement" },
]

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'Overdue': "bg-red-500",
    'Due Soon': "bg-amber-500",
    'Not Started': "bg-blue-500",
    'In Progress': "bg-yellow-500",
    'Complete': "bg-green-500",
    'No Action': "bg-gray-400",
  }
  return colors[status] || "bg-gray-400"
}

export function ClientPreviewSheet({ client, onClose }: ClientPreviewSheetProps) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  if (!client) return null

  const email = client.email || client.portal_email || "-"
  const uploaded = client.upload_progress?.uploaded || 0
  const required = client.upload_progress?.required || 5
  const progressPercent = required > 0 ? (uploaded / required) * 100 : 0
  const activeShortCode = client.short_links?.find((sl: any) => sl.is_active)?.short_code
  const portalUrl = typeof window !== "undefined"
    ? activeShortCode
      ? `${window.location.origin}/m/${activeShortCode}`
      : client.portal_token
        ? `${window.location.origin}/portal/${client.portal_token}`
        : null
    : null

  const copyToClipboard = async (text: string, setCopiedState: React.Dispatch<React.SetStateAction<boolean>>) => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return
    try {
      await navigator.clipboard.writeText(text)
      setCopiedState(true)
      setTimeout(() => setCopiedState(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  return (
    <Sheet open={!!client} onOpenChange={() => onClose()}>
      <SheetContent className="sm:max-w-[540px] w-full p-0 flex flex-col overflow-hidden">
        <SheetTitle className="sr-only">Client Preview</SheetTitle>
        {/* Header with avatar */}
        <div className="px-8 py-6 border-b bg-muted/30">
          <div className="flex items-start gap-4">
            {/* Avatar with initial */}
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary shrink-0">
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight truncate">{client.name}</h2>
                {client.is_starred && <Star className="h-4 w-4 text-amber-500 fill-amber-500 shrink-0" />}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5 truncate">{email}</p>
              {/* Status indicators */}
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-2 h-2 rounded-full", getStatusColor(client.health_status))} />
                  <span className="text-xs text-muted-foreground capitalize">
                    {client.health_status}
                  </span>
                </div>
                {client.portal_status !== "Active" && (
                  <Badge variant="outline" className="text-xs bg-red-50 text-red-600 border-red-200">
                    {client.portal_status}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          {/* Upload Progress Card */}
          <div className="p-4 rounded-xl border bg-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                {t("clients.preview.uploadProgress")}
              </h3>
              <span className="text-sm font-mono font-medium">
                {uploaded}/{required}
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
            {client.next_deadline && (
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <span>Next deadline:</span>
                <Badge variant="secondary" className="text-xs">
                  {client.next_deadline.type}
                </Badge>
                <span>{new Date(client.next_deadline.date).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* Overdue Warning */}
          {client.health_status === "Overdue" && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200">
              <p className="text-sm font-medium text-red-700">
                {t("clients.preview.overdueMessage")}
              </p>
              <p className="text-sm text-red-600 mt-0.5">
                {t("clients.preview.missingFiles")}
              </p>
              <Button
                size="sm"
                className="mt-3 bg-red-600 hover:bg-red-700 w-full"
                onClick={() => {}}
              >
                <Send className="h-4 w-4 mr-2" />
                {t("clients.sendReminder")}
              </Button>
            </div>
          )}

          {/* Due Soon Warning */}
          {client.health_status === "Due Soon" && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-sm font-medium text-amber-700">
                {t("clients.preview.dueSoonMessage")}
              </p>
              <Button
                size="sm"
                className="mt-3 bg-amber-600 hover:bg-amber-700 w-full"
                onClick={() => {}}
              >
                <Send className="h-4 w-4 mr-2" />
                {t("clients.sendUploadLink")}
              </Button>
            </div>
          )}

          <Separator />

          {/* Recent Uploads */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
              {t("clients.preview.recentUploads")}
            </h3>
            <div className="space-y-2">
              {mockUploads.map((upload, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{upload.name}</p>
                      <p className="text-xs text-muted-foreground">{upload.type}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">
                    {upload.date}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Magic Link */}
          {client.magic_email_slug && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                {t("clientDetail.magicEmail")}
              </h3>
              <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <code className="text-sm font-mono truncate">{client.magic_email_slug}</code>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(client.magic_email_slug!, setCopied)}
                  className="shrink-0"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  {copied ? t("clientDetail.copied") : t("clientDetail.copy")}
                </Button>
              </div>
              {portalUrl && (
                <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                    <code className="text-sm font-mono truncate">{portalUrl}</code>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(portalUrl, setCopiedLink)}
                    className="shrink-0"
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    {copiedLink ? t("clientDetail.copied") : t("clientDetail.copy")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fixed bottom actions */}
        <div className="px-8 py-6 border-t bg-background mt-auto space-y-3">
          <div className="flex gap-3">
            <Button className="flex-1 h-11 text-md" onClick={() => {}}>
              <Send className="h-4 w-4 mr-2" />
              {t("clients.sendMagicLink")}
            </Button>
            <Button variant="outline" className="flex-1 h-11 text-md" onClick={() => {}}>
              <Copy className="h-4 w-4 mr-2" />
              {t("clients.copyUploadLink")}
            </Button>
          </div>
          <Button variant="ghost" className="w-full h-10" asChild>
            <Link href={`/dashboard/clients/${client.client_number ?? client.id}`}>
              {t("clients.viewFullDetails")}
              <ExternalLink className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
