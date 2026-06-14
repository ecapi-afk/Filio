'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Star, Send, ExternalLink, Upload, FileText, File as FileIcon, Image,
  Bell, Settings, Shield, CheckCircle2, Clock, AlertCircle,
  Mail, Copy, RefreshCw, Trash2, ChevronRight, Plus,
  ToggleLeft, ToggleRight, Download, MoreHorizontal, AlertTriangle, Lock
} from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { toast } from 'sonner'
import { XeroIcon } from '@/components/ui/xero-icon'
import { useI18n } from '@/lib/i18n/context'
import type { ClientWithRelations } from '@/lib/data/clients'
import {
  getExt,
  getExtBadgeBg,
  formatFileSize,
  formatUploadedAt,
  getCategoryBadgeColor,
  getClientAvatarBg,
  DOC_CATEGORIES,
} from '@/lib/file-types'
import { Card } from '@/components/ui/card'

type Tab = 'overview' | 'documents' | 'reminders' | 'settings' | 'audit'

type ClientStatus = 'Overdue' | 'Due Soon' | 'Not Started' | 'In Progress' | 'Complete' | 'No Action'

const statusConfig: Record<ClientStatus, { label: string; dot: string; cls: string }> = {
  'Overdue': { label: 'Overdue', dot: '#DC2626', cls: 'status-overdue' },
  'Due Soon': { label: 'Due Soon', dot: '#D97706', cls: 'status-due-soon' },
  'Not Started': { label: 'Not Started', dot: '#2563EB', cls: 'status-not-started' },
  'In Progress': { label: 'In Progress', dot: '#854D0E', cls: 'status-in-progress' },
  'Complete': { label: 'Complete', dot: '#059669', cls: 'status-complete' },
  'No Action': { label: 'No Action', dot: '#9CA3AF', cls: 'status-no-action' },
}

const VAT_GROUP_INFO: Record<'A' | 'B' | 'C', { quarters: string[]; filingMonths: string[] }> = {
  A: { quarters: ['Jan', 'Apr', 'Jul', 'Oct'], filingMonths: ['Mar', 'Jun', 'Sep', 'Dec'] },
  B: { quarters: ['Feb', 'May', 'Aug', 'Nov'], filingMonths: ['Apr', 'Jul', 'Oct', 'Jan'] },
  C: { quarters: ['Mar', 'Jun', 'Sep', 'Dec'], filingMonths: ['May', 'Aug', 'Nov', 'Feb'] },
}

function StatusBadge({ status }: { status: ClientStatus }) {
  const cfg = statusConfig[status]
  return (
    <span className={`status-badge ${cfg.cls}`}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  )
}

interface ClientDetailV3Props {
  client: ClientWithRelations
}

// ── Reusable confirm dialog ────────────────────────────────────────────
function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  onConfirm,
  loading = false,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  onConfirm: () => void
  loading?: boolean
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl border border-gray-100 p-6 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <div className="flex items-start gap-4 mb-5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <AlertTriangle size={18} className="text-amber-500" />
            </div>
            <div>
              <Dialog.Title className="text-sm font-bold text-gray-900 mb-1">{title}</Dialog.Title>
              <Dialog.Description className="text-sm text-gray-500 leading-relaxed">{description}</Dialog.Description>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Dialog.Close asChild>
              <button className="btn-secondary text-xs px-4 py-2" disabled={loading}>Cancel</button>
            </Dialog.Close>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: '#DC2626' }}
            >
              {loading && <RefreshCw size={12} className="animate-spin" />}
              {loading ? 'Processing...' : confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
// ───────────────────────────────────────────────────────────────────────

export function ClientDetailV3({ client }: ClientDetailV3Props) {
  const router = useRouter()
  const { t } = useI18n()
  const clientId = client.id
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [starred, setStarred] = useState(client.is_starred || false)
  const [autoReminder, setAutoReminder] = useState(client.auto_reminders_enabled ?? true)
  const [vatQuarterGroup, setVatQuarterGroup] = useState(client.vat_quarter_group || 'A')

  // Notes state
  const [notes, setNotes] = useState(client.internal_notes || '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)

  // Upload filter state
  const [uploadFilter, setUploadFilter] = useState<string>('All')

  // Audit log state
  const [auditLogs, setAuditLogs] = useState<{ id: string; action: string; metadata: Record<string, unknown>; timestamp: string; actor: string }[]>([])
  const [auditLoading, setAuditLoading] = useState(false)

  useEffect(() => {
    if (activeTab !== 'audit') return
    setAuditLoading(true)
    fetch(`/api/clients/${clientId}/audit-logs`)
      .then(r => r.json())
      .then(d => setAuditLogs(d.logs ?? []))
      .catch(() => {})
      .finally(() => setAuditLoading(false))
  }, [activeTab, clientId])

  const formatAuditLabel = (action: string, metadata: Record<string, unknown>): string => {
    const labels: Record<string, string> = {
      client_reactivated: 'Client reactivated',
      client_set_dormant: 'Client set to dormant',
      client_deleted: 'Client deleted',
      client_restored: 'Client restored',
      portal_link_regenerated: 'Portal link regenerated',
      magic_email_regenerated: 'Magic email regenerated',
      reminder_sent: 'Reminder sent',
      magic_link_sent: 'Magic link sent',
      file_uploaded: 'File uploaded',
      file_reclassified: 'File reclassified',
      overdue_banner_dismissed: 'Overdue banner dismissed',
      client_created: 'Client created',
      xero_synced: 'Synced to Xero',
      credentials_generated: 'Credentials generated',
      portal_token_regenerated: 'Portal link regenerated',
    }
    const base = labels[action] ?? action.replace(/_/g, ' ')
    const reason = metadata?.reason as string | undefined
    return reason ? `${base} — ${reason}` : base
  }

  const handleExportAuditPdf = () => {
    const rows = auditLogs.map(l => `
      <tr>
        <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:12px;">${formatAuditLabel(l.action, l.metadata)}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:12px;color:#6b7280;">${new Date(l.timestamp).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;font-size:12px;color:#6b7280;">${l.actor}</td>
      </tr>`).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Audit Log — ${client.name}</title>
      <style>body{font-family:sans-serif;padding:32px}h1{font-size:18px;margin-bottom:4px}p{font-size:12px;color:#6b7280;margin-bottom:24px}table{width:100%;border-collapse:collapse}th{text-align:left;padding:8px 12px;background:#f9fafb;font-size:11px;color:#374151;border-bottom:2px solid #e5e7eb}</style>
      </head><body>
      <h1>Audit Log — ${client.name}</h1>
      <p>Exported ${new Date().toLocaleDateString('en-GB')} · ${auditLogs.length} entries</p>
      <table><thead><tr><th>Event</th><th>Date &amp; Time</th><th>Actor</th></tr></thead><tbody>${rows}</tbody></table>
      </body></html>`
    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close(); w.print() }
  }

  // Parse financial year end from "Month Day" format
  const parseFinancialYearEnd = (value: string) => {
    if (!value) return { month: '', day: '' }
    const parts = value.split(' ')
    return { month: parts[0] || '', day: parts[1] || '' }
  }
  const initialFY = parseFinancialYearEnd(client.financial_year_end || '')
  const [financialYearMonth, setFinancialYearMonth] = useState(initialFY.month)
  const [financialYearDay, setFinancialYearDay] = useState(initialFY.day)

  // Get available days based on selected month
  const getAvailableDays = (month: string) => {
    const always = ['1', '15']
    switch (month) {
      case 'February':
        return [...always, '28']
      case 'April':
      case 'June':
      case 'September':
      case 'November':
        return [...always, '30']
      case 'January':
      case 'March':
      case 'May':
      case 'July':
      case 'August':
      case 'October':
      case 'December':
        return [...always, '31']
      default:
        return ['1', '15']
    }
  }
  const availableDays = getAvailableDays(financialYearMonth)

  const [portalEmail, setPortalEmail] = useState(client.portal_email || client.email || '')
  const [portalLanguage, setPortalLanguage] = useState('en')
  const [saving, setSaving] = useState(false)
  const [regeneratingToken, setRegeneratingToken] = useState(false)
  const [regeneratingMagicEmail, setRegeneratingMagicEmail] = useState(false)
  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string
    description: string
    confirmLabel: string
    onConfirm: () => Promise<void>
  } | null>(null)

  // Dormant / activate state
  const [isDormant, setIsDormant] = useState((client as any).management_status === 'dormant')
  const [showOverflowMenu, setShowOverflowMenu] = useState(false)
  const [settingStatus, setSettingStatus] = useState(false)
  const [quotaExceededOpen, setQuotaExceededOpen] = useState(false)
  const [quotaLimit, setQuotaLimit] = useState(20)

  // Loading states for Mark as Complete buttons
  const [completingRequestId, setCompletingRequestId] = useState<string | null>(null)

  // Show confirm dialog then mark a specific request as complete
  const showCompleteConfirm = (requestId: string, requestTitle: string) => {
    setConfirmOpen(true)
    setConfirmConfig({
      title: 'Confirm Completion',
      description: `You are marking "${requestTitle}" as complete. This will stop all automatic reminders for this task. Continue?`,
      confirmLabel: 'Mark as Complete',
      onConfirm: async () => {
        setCompletingRequestId(requestId)
        try {
          const res = await fetch(`/api/requests/${requestId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Complete' }),
          })
          if (!res.ok) throw new Error('Failed to mark as complete')
          toast.success(`${requestTitle} marked as complete!`)
          router.refresh()
        } catch {
          toast.error('Failed to mark as complete')
        } finally {
          setCompletingRequestId(null)
          setConfirmOpen(false)
        }
      },
    })
  }

  const handleActivate = async () => {
    setSettingStatus(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/activate`, { method: 'POST' })
      if (res.ok) {
        setIsDormant(false)
        toast.success('Client reactivated')
      } else {
        const body = await res.json().catch(() => ({}))
        if (body.error === 'quota_exceeded') {
          setQuotaLimit(body.limit ?? 20)
          setQuotaExceededOpen(true)
        } else {
          toast.error('Failed to reactivate client')
        }
      }
    } catch {
      toast.error('Failed to reactivate client')
    } finally {
      setSettingStatus(false)
    }
  }

  const handleSetDormant = async () => {
    setSettingStatus(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/set-dormant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'manual' }),
      })
      if (res.ok) {
        setIsDormant(true)
        toast.success('Client marked as dormant')
      } else {
        toast.error('Failed to set client dormant')
      }
    } catch {
      toast.error('Failed to set client dormant')
    } finally {
      setSettingStatus(false)
      setConfirmOpen(false)
    }
  }

  const openSetDormantConfirm = () => {
    setShowOverflowMenu(false)
    setConfirmConfig({
      title: 'Set Client to Dormant?',
      description: `${client.name} will be marked as dormant. Their portal will remain accessible but they will be excluded from active reminders and reports. You can reactivate them at any time.`,
      confirmLabel: 'Set Dormant',
      onConfirm: handleSetDormant,
    })
    setConfirmOpen(true)
  }

  // Get active short code from short_links array
  const shortLinksData = (client as any).short_links
  const activeShortLink = shortLinksData?.find((sl: any) => sl.is_active)
  const shortCode = activeShortLink?.short_code

  // Build portal URL (client-side only to avoid hydration mismatch)
  const [portalUrl, setPortalUrl] = useState<string | null>(null)

  useEffect(() => {
    if (shortCode) {
      setPortalUrl(`${window.location.origin}/m/${shortCode}`)
    }
  }, [shortCode])

  // Reset day if current day is not available for the selected month
  useEffect(() => {
    if (financialYearMonth && !availableDays.includes(financialYearDay)) {
      setFinancialYearDay('')
    }
  }, [financialYearMonth, availableDays, financialYearDay])

  const handleRegenerateToken = async () => {
    setRegeneratingToken(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/regenerate-token`, { method: 'POST' })
      if (res.ok) {
        toast.success('Portal link regenerated! Reloading...')
        setTimeout(() => window.location.reload(), 1000)
      } else {
        toast.error('Failed to regenerate token')
      }
    } catch {
      toast.error('Failed to regenerate token')
    } finally {
      setRegeneratingToken(false)
      setConfirmOpen(false)
    }
  }

  const handleRegenerateMagicEmail = async () => {
    setRegeneratingMagicEmail(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/regenerate-magic-email`, { method: 'POST' })
      if (res.ok) {
        toast.success('Magic email regenerated! Reloading...')
        setTimeout(() => window.location.reload(), 1000)
      } else {
        toast.error('Failed to regenerate magic email')
      }
    } catch {
      toast.error('Failed to regenerate magic email')
    } finally {
      setRegeneratingMagicEmail(false)
      setConfirmOpen(false)
    }
  }

  const openRegenerateTokenConfirm = () => {
    setConfirmConfig({
      title: 'Regenerate Portal Link?',
      description: 'The current portal link will be permanently invalidated. Your client will need to use the new link to access their portal.',
      confirmLabel: 'Regenerate Link',
      onConfirm: handleRegenerateToken,
    })
    setConfirmOpen(true)
  }

  const openRegenerateMagicEmailConfirm = () => {
    setConfirmConfig({
      title: 'Regenerate Magic Email?',
      description: 'The current magic email address will be permanently invalidated. Documents sent to the old address will no longer be processed.',
      confirmLabel: 'Regenerate Email',
      onConfirm: handleRegenerateMagicEmail,
    })
    setConfirmOpen(true)
  }

  const handleSaveSettings = async () => {
    // Construct financial year end from month and day
    const financialYearEnd = financialYearMonth && financialYearDay
      ? `${financialYearMonth} ${financialYearDay}`
      : financialYearMonth || null

    setSaving(true)
    try {
      const response = await fetch(`/api/clients/${clientId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vat_quarter_group: vatQuarterGroup,
          financial_year_end: financialYearEnd,
          auto_reminders_enabled: autoReminder,
          portal_email: portalEmail,
          portal_language: portalLanguage,
        }),
      })
      if (response.ok) {
        toast.success('Client settings saved. Reloading...')
        // Use timeout to allow toast to show before reload
        setTimeout(() => {
          window.location.reload()
        }, 500)
      } else {
        const errorText = await response.text()
        console.error('Error response:', errorText)
        toast.error('Failed to save settings')
      }
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <FileText size={15} /> },
    { id: 'documents', label: 'Documents', icon: <Upload size={15} /> },
    { id: 'reminders', label: 'Reminders', icon: <Bell size={15} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={15} /> },
    { id: 'audit', label: 'Audit Log', icon: <Shield size={15} /> },
  ]

  // ── Handle save notes ────────────────────────────────────────────────
  const handleSaveNotes = async () => {
    setSavingNotes(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internal_notes: notes }),
      })
      if (res.ok) {
        setNotesSaved(true)
        toast.success('Notes saved')
        setTimeout(() => setNotesSaved(false), 3000)
      } else {
        toast.error('Failed to save notes')
      }
    } catch {
      toast.error('Failed to save notes')
    } finally {
      setSavingNotes(false)
    }
  }

  // ── Deadline helpers ─────────────────────────────────────────────────
  const isVatRegistered = client.vat_quarter_group && client.vat_quarter_group !== 'none'

  // Find Annual Accounts request from DB requests (first pending, sorted by date)
  const annualRequests = (client.requests as any[] | undefined)
    ?.filter(r => (r.title || '').toLowerCase().includes('annual') && r.status === 'pending')
    ?.sort((a: any, b: any) => a.deadline_date.localeCompare(b.deadline_date))
  const annualRequest = annualRequests?.[0]

  // Find VAT Return request from DB requests (soonest pending)
  const vatRequests = (client.requests as any[] | undefined)
    ?.filter(r => (r.title || '').toLowerCase().includes('vat') && r.status === 'pending')
    ?.sort((a: any, b: any) => a.deadline_date.localeCompare(b.deadline_date))
  const vatRequest = vatRequests?.[0]

  const calcDeadlineDays = (dateStr: string) =>
    Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  const formatDeadlineDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  const deadlineDaysColor = (days: number) => {
    if (days < 0) return '#DC2626'
    if (days <= 14) return '#D97706'
    return '#059669'
  }

  const deadlineDaysLabel = (days: number) => {
    if (days < 0) return `${Math.abs(days)} days overdue`
    return `${days} days left`
  }

  // Maps day count to a ClientStatus for the status badge
  const deadlineDaysStatus = (days: number): ClientStatus => {
    if (days < 0) return 'Overdue'
    if (days <= 14) return 'Due Soon'
    return 'Not Started'
  }

  // Format date as YYYY-MM-DD for display under the title
  const formatDeadlineDateShort = (dateStr: string) =>
    new Date(dateStr).toISOString().slice(0, 10)

  const DOC_CATEGORIES = ['Receipt', 'Invoice', 'Bank Statement', 'Payslip', 'Contract', 'Other', 'Uncategorized'] as const
  type DocCategory = typeof DOC_CATEGORIES[number]

  const classifyUpload = (filename: string): DocCategory => {
    const f = filename.toLowerCase()
    if (f.includes('bank') || f.includes('statement')) return 'Bank Statement'
    if (f.includes('invoice') || f.includes('inv_')) return 'Invoice'
    if (f.includes('receipt')) return 'Receipt'
    if (f.includes('payslip') || f.includes('pay_slip') || f.includes('salary')) return 'Payslip'
    if (f.includes('contract') || f.includes('agreement')) return 'Contract'
    return 'Uncategorized'
  }

  // Get display file type: use stored file_type if it's a document type, otherwise classify from filename
  const getDisplayFileType = (upload: any): string => {
    const storedType = upload.file_type || ''
    if (!storedType) return 'Uncategorized'
    if (DOC_CATEGORIES.includes(storedType as DocCategory)) {
      return storedType
    }
    return classifyUpload(upload.filename)
  }

  const realUploads: any[] = (client.uploads as any[] | undefined) || []

  const categoryCounts: Record<string, number> = { All: realUploads.length }
  for (const cat of DOC_CATEGORIES) {
    categoryCounts[cat] = realUploads.filter(u => classifyUpload(u.filename) === cat).length
  }

  const filteredUploads = uploadFilter === 'All'
    ? realUploads
    : realUploads.filter(u => classifyUpload(u.filename) === uploadFilter)

  // formatFileSize, getExt, getExtBadgeBg, formatUploadedAt, getCategoryBadgeColor
  // are imported from @/lib/file-types

  const deadlineDays = client.next_deadline ?
    Math.ceil((new Date(client.next_deadline.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0

  const headerDeadlines: Array<{ days: number; label: string }> = []
  if (annualRequest) {
    headerDeadlines.push({ days: calcDeadlineDays(annualRequest.deadline_date), label: 'Annual' })
  }
  if (vatRequest) {
    headerDeadlines.push({ days: calcDeadlineDays(vatRequest.deadline_date), label: 'VAT Return' })
  }
  if (headerDeadlines.length === 0 && client.next_deadline) {
    headerDeadlines.push({ days: deadlineDays, label: client.next_deadline.type || 'Deadline' })
  }

  return (
    <div>
      {/* Back + Header */}
      <div className="mb-5">
        <Link href="/dashboard/clients" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
            <ArrowLeft size={15} /> Back to Clients
          </Link>

        {/* Client Header Card */}
        <div className="filio-card p-5 flex items-center gap-5">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg shrink-0 ${getClientAvatarBg(client.health_status)}`}
          >
            {client.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-lg font-bold text-gray-900">{client.name}</h2>
              <StatusBadge status={(client.health_status as ClientStatus) || 'Not Started'} />
              <button
                onClick={async () => {
                  const newStarred = !starred
                  setStarred(newStarred)
                  try {
                    const res = await fetch(`/api/clients/${clientId}/star`, { method: 'POST' })
                    if (!res.ok) throw new Error()
                  } catch {
                    setStarred(!newStarred)
                    toast.error('Failed to update star')
                  }
                }}
                title={starred ? 'Remove from starred' : 'Star this client'}
              >
                <Star size={18} fill={starred ? '#D97706' : 'none'} style={{ color: starred ? '#D97706' : '#D1D5DB' }} />
              </button>
            </div>
            <div className="flex flex-col gap-0.5">
              {client.email && (
                <div className="flex items-center gap-1.5">
                  <p className="text-sm text-gray-500">{client.email}</p>
                  {client.xero_contact_id && (
                    <XeroIcon size={13} className="shrink-0 opacity-80" tooltip={t('clientDetail.xeroImported')} />
                  )}
                </div>
              )}
              {(client as any).xero_phone && (
                <div className="flex items-center gap-1.5">
                  <p className="text-sm text-gray-500">{(client as any).xero_phone}</p>
                  {client.xero_contact_id && (
                    <XeroIcon size={13} className="shrink-0 opacity-80" tooltip={t('clientDetail.xeroImported')} />
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-6 text-center items-center">
            <div>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{realUploads.length}</p>
              <p className="text-xs text-gray-400">Total uploads</p>
            </div>
            {headerDeadlines[0] && (
              <>
                <div className="w-px bg-gray-300 self-stretch" />
                <div>
                  <p className={`text-2xl font-bold tabular-nums ${headerDeadlines[0].days < 0 ? 'text-red-600' : headerDeadlines[0].days <= 14 ? 'text-amber-600' : 'text-gray-900'}`}>
                    {Math.abs(headerDeadlines[0].days)}d
                  </p>
                  <p className="text-xs text-gray-400">
                    {headerDeadlines[0].days < 0 ? `${headerDeadlines[0].label} overdue` : `Until ${headerDeadlines[0].label}`}
                  </p>
                </div>
              </>
            )}
            {headerDeadlines[1] && (
              <>
                <div className="w-px bg-gray-300 self-stretch" />
                <div>
                  <p className={`text-2xl font-bold tabular-nums ${headerDeadlines[1].days < 0 ? 'text-red-600' : headerDeadlines[1].days <= 14 ? 'text-amber-600' : 'text-gray-900'}`}>
                    {Math.abs(headerDeadlines[1].days)}d
                  </p>
                  <p className="text-xs text-gray-400">
                    {headerDeadlines[1].days < 0 ? `${headerDeadlines[1].label} overdue` : `Until ${headerDeadlines[1].label}`}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Overflow menu */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowOverflowMenu(v => !v)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <MoreHorizontal size={18} />
            </button>
            {showOverflowMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowOverflowMenu(false)} />
                <div className="absolute right-0 top-9 z-20 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 overflow-hidden">
                  {isDormant ? (
                    <button
                      onClick={() => { setShowOverflowMenu(false); handleActivate() }}
                      disabled={settingStatus}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      <ToggleLeft size={14} className="text-gray-400" /> Reactivate Client
                    </button>
                  ) : (
                    <button
                      onClick={openSetDormantConfirm}
                      disabled={settingStatus}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      <ToggleRight size={14} className="text-emerald-500" /> Set as Dormant
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all -mb-px ${
              activeTab === tab.id
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-3 gap-5">
          {/* Left: Deadlines + Uploads + Notes */}
          <div className="col-span-2 space-y-5">

            {/* ── Deadline Card ─────────────────────────────────────────── */}
            <div className="filio-card p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Deadlines</h3>
              <div className={`flex gap-4 ${isVatRegistered && vatRequest ? '' : 'flex-col'}`}>

                {/* Annual Accounts */}
                {annualRequest && (() => {
                  const annualDays = calcDeadlineDays(annualRequest.deadline_date)
                  return (
                    <div className="flex-1 flex flex-col gap-3">
                      <div className="p-4 rounded-xl bg-gray-50">
                        {/* Top row: title+date left, days+status right */}
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-bold text-gray-900">Annual Accounts Deadline</p>
                            <p className="text-xs text-gray-400 mt-1">{formatDeadlineDateShort(annualRequest.deadline_date)}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xl font-bold tabular-nums leading-tight" style={{ color: deadlineDaysColor(annualDays) }}>
                              {deadlineDaysLabel(annualDays)}
                            </p>
                            <div className="mt-1">
                              <StatusBadge status={deadlineDaysStatus(annualDays)} />
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Bottom buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toast.success(`Reminder sent to ${client.name}`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
                          style={{ background: '#059669' }}
                        >
                          <Bell size={12} /> Send Reminder
                        </button>
                        <button
                          onClick={() => showCompleteConfirm(annualRequest.id, 'Annual Accounts')}
                          disabled={completingRequestId === annualRequest.id || annualRequest.status === 'Complete'}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                          style={{
                            background: annualRequest.status === 'Complete' ? '#D1FAE5' : '#fff',
                            color: annualRequest.status === 'Complete' ? '#065F46' : '#059669',
                            border: annualRequest.status === 'Complete' ? '1px solid #6EE7B7' : '1px solid #059669',
                          }}
                        >
                          {completingRequestId === annualRequest.id ? (
                            <><RefreshCw size={12} className="animate-spin" /> Processing...</>
                          ) : annualRequest.status === 'Complete' ? (
                            <><CheckCircle2 size={12} /> Completed</>
                          ) : (
                            <><CheckCircle2 size={12} /> Mark as Complete</>
                          )}
                        </button>
                      </div>
                    </div>
                  )
                })()}

                {/* VAT Return — only if registered */}
                {isVatRegistered && vatRequest && (() => {
                  const vatDays = calcDeadlineDays(vatRequest.deadline_date)
                  return (
                    <div className="flex-1 flex flex-col gap-3">
                      <div className="p-4 rounded-xl bg-gray-50">
                        {/* Top row: title+date left, days+status right */}
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-bold text-gray-900">VAT Return Deadline</p>
                            <p className="text-xs text-gray-400 mt-1">{formatDeadlineDateShort(vatRequest.deadline_date)}</p>
                            {client.vat_quarter_group && client.vat_quarter_group !== 'none' && (() => {
                              const grp = client.vat_quarter_group as 'A' | 'B' | 'C'
                              const info = VAT_GROUP_INFO[grp]
                              return (
                                <p className="text-[10px] text-gray-400 mt-1.5">
                                  Group {grp} · {info.quarters.join(' / ')}
                                </p>
                              )
                            })()}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xl font-bold tabular-nums leading-tight" style={{ color: deadlineDaysColor(vatDays) }}>
                              {deadlineDaysLabel(vatDays)}
                            </p>
                            <div className="mt-1">
                              <StatusBadge status={deadlineDaysStatus(vatDays)} />
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Bottom buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toast.success(`Reminder sent to ${client.name}`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
                          style={{ background: '#059669' }}
                        >
                          <Bell size={12} /> Send Reminder
                        </button>
                        <button
                          onClick={() => showCompleteConfirm(vatRequest.id, 'VAT Return')}
                          disabled={completingRequestId === vatRequest.id || vatRequest.status === 'Complete'}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                          style={{
                            background: vatRequest.status === 'Complete' ? '#D1FAE5' : '#fff',
                            color: vatRequest.status === 'Complete' ? '#065F46' : '#059669',
                            border: vatRequest.status === 'Complete' ? '1px solid #6EE7B7' : '1px solid #059669',
                          }}
                        >
                          {completingRequestId === vatRequest.id ? (
                            <><RefreshCw size={12} className="animate-spin" /> Processing...</>
                          ) : vatRequest.status === 'Complete' ? (
                            <><CheckCircle2 size={12} /> Completed</>
                          ) : (
                            <><CheckCircle2 size={12} /> Mark as Complete</>
                          )}
                        </button>
                      </div>
                    </div>
                  )
                })()}

                {/* If no requests at all */}
                {!annualRequest && !(isVatRegistered && vatRequest) && (
                  <div className="py-6 text-center">
                    <Clock size={24} className="mx-auto mb-2 text-gray-200" />
                    <p className="text-sm text-gray-400">No deadlines configured</p>
                    <p className="text-xs text-gray-300 mt-1">Set up VAT group or financial year end in Settings</p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Uploads Card ──────────────────────────────────────────── */}
            <div className="filio-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-900">Uploads</h3>
                <button onClick={() => setActiveTab('documents')} className="text-xs font-medium flex items-center gap-1" style={{ color: '#059669' }}>
                  View all <ChevronRight size={13} />
                </button>
              </div>

              {/* Filter tabs */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {(['All', ...DOC_CATEGORIES] as string[]).map(cat => {
                  const count = categoryCounts[cat] || 0
                  const isActive = uploadFilter === cat
                  return (
                    <button
                      key={cat}
                      onClick={() => setUploadFilter(cat)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                      style={isActive
                        ? { background: '#059669', color: 'white' }
                        : { background: 'transparent', color: '#6B7280', border: '1px solid #E5E7EB' }
                      }
                    >
                      {cat} {count > 0 && `(${count})`}
                    </button>
                  )
                })}
              </div>

              {filteredUploads.length > 0 ? (
                <div className="space-y-2">
                  {filteredUploads.slice(0, 5).map((u: any) => {
                    const s = (u.xero_status || '').toLowerCase()
                    const isSynced = s === 'synced'
                    const isFailed = s === 'error' || s === 'failed'
                    return (
                    <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${getExtBadgeBg(u.filename)}`}>
                        {getExt(u.filename)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{u.filename}</p>
                        <p className="text-[10px] text-gray-400">{formatUploadedAt(u.uploaded_at)} · {formatFileSize(u.file_size)}</p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        isSynced ? 'bg-emerald-50 text-emerald-700' :
                        isFailed ? 'bg-red-50 text-red-600' :
                        'bg-amber-50 text-amber-700'
                      }`}>
                        {isSynced ? 'Synced' : isFailed ? 'Failed' : 'Pending'}
                      </span>
                    </div>
                  )})}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <Upload size={28} className="mx-auto mb-2 text-gray-200" />
                  <p className="text-sm text-gray-400">
                    {uploadFilter === 'All' ? 'No uploads yet' : `No ${uploadFilter} files found`}
                  </p>
                </div>
              )}
            </div>

            {/* ── Notes Card ────────────────────────────────────────────── */}
            <div className="filio-card p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Notes</h3>
              <textarea
                value={notes}
                onChange={e => { setNotes(e.target.value); setNotesSaved(false) }}
                placeholder="Add notes about this client here..."
                rows={4}
                className="w-full text-sm px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:border-emerald-400 focus:bg-white transition-all resize-none text-gray-700 placeholder-gray-400"
              />
              <div className="flex items-center justify-end gap-2 mt-2">
                {notesSaved && (
                  <span className="text-xs font-medium" style={{ color: '#059669' }}>Saved ✓</span>
                )}
                <button
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-50"
                  style={{ background: '#059669' }}
                >
                  {savingNotes ? <RefreshCw size={11} className="animate-spin" /> : null}
                  {savingNotes ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>

          </div>

          {/* Right: Portal & Magic Email */}
          <div className="space-y-4">
            <div className="filio-card p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Portal Access</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Status</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    client.portal_status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {client.portal_status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Last upload</span>
                  <span className="text-xs text-gray-700">{formatUploadedAt(client.last_upload)}</span>
                </div>
              </div>
              {portalUrl && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 border border-gray-200 mt-4">
                  <ExternalLink size={13} className="text-gray-400 shrink-0" />
                  <span className="text-xs text-gray-600 truncate flex-1">{portalUrl}</span>
                  <button onClick={() => {
                    navigator.clipboard.writeText(portalUrl)
                    toast.success('Copied!')
                  }}>
                    <Copy size={13} className="text-gray-400 hover:text-gray-600" />
                  </button>
                </div>
              )}
              <div className="mt-4 space-y-2">
                <button onClick={() => toast.success('Magic Link sent!')} className="btn-primary w-full justify-center text-xs py-2">
                  <Mail size={13} /> Send Magic Link
                </button>
                <button
                  onClick={openRegenerateTokenConfirm}
                  disabled={regeneratingToken}
                  className="btn-secondary w-full justify-center text-xs py-2 disabled:opacity-50"
                >
                  <RefreshCw size={13} className={regeneratingToken ? 'animate-spin' : ''} />
                  {regeneratingToken ? 'Regenerating...' : 'Regenerate Link'}
                </button>
              </div>
            </div>

            <div className="filio-card p-5 relative overflow-hidden">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Magic Email</h3>
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 border border-gray-200 mb-3">
                <Mail size={13} className="text-gray-400 shrink-0" />
                <span className="text-xs text-gray-600 truncate flex-1">{client.magic_email_slug || 'Not configured'}</span>
                <button onClick={() => {
                  if (client.magic_email_slug) {
                    navigator.clipboard.writeText(client.magic_email_slug)
                    toast.success('Copied!')
                  }
                }}>
                  <Copy size={13} className="text-gray-400 hover:text-gray-600" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Sender verification</span>
                <button onClick={() => toast.info('Feature coming soon')} className="text-emerald-600">
                  <ToggleRight size={20} />
                </button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500">Last upload</span>
                <span className="text-xs text-gray-700">{formatUploadedAt(client.last_upload)}</span>
              </div>
              <button
                onClick={openRegenerateMagicEmailConfirm}
                disabled={regeneratingMagicEmail}
                className="btn-secondary w-full justify-center text-xs py-2 mt-3 disabled:opacity-50"
              >
                <RefreshCw size={13} className={regeneratingMagicEmail ? 'animate-spin' : ''} />
                {regeneratingMagicEmail ? 'Regenerating...' : 'Regenerate Magic Email'}
              </button>
              {!client.isPro && (
                <div className="absolute inset-0 bg-white/85 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 rounded-xl">
                  <Lock size={16} className="text-gray-300" />
                  <p className="text-xs font-semibold text-gray-400">Professional plan required</p>
                  <p className="text-[10px] text-gray-300">Upgrade to send files via email</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="filio-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">All Documents</h3>
            <div className="flex gap-2">
              <button onClick={() => toast.info('Feature coming soon')} className="btn-secondary text-xs px-3 py-1.5">
                <Download size={13} /> Export CSV
              </button>
              <button onClick={() => toast.info('Feature coming soon')} className="btn-primary text-xs px-3 py-1.5">
                <Plus size={13} /> Manual Upload
              </button>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 w-[40%]">File</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Type</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Channel</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Uploaded</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Xero</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Mode</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Action</th>
              </tr>
            </thead>
            <tbody>
              {realUploads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                    <Upload size={24} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No uploads yet</p>
                    <p className="text-xs mt-1">Send your client a link to get started</p>
                  </td>
                </tr>
              ) : realUploads.map(u => {
                const displayType = getDisplayFileType(u)
                const s = (u.xero_status || '').toLowerCase()
                const xeroStatus = s === 'synced' ? 'Synced' : (s === 'error' || s === 'failed') ? 'Failed' : 'Pending'
                // Mode: upload-level setting if present, else fall back to firm's global setting
                const firmUploadMode = (client.firms as any)?.xero_upload_mode || 'attachments'
                const effectiveMode = u.xero_upload_mode || firmUploadMode
                return (
                <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-all">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      {/* Extension badge — matches portal upload page style */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${getExtBadgeBg(u.filename)}`}>
                        {getExt(u.filename)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-800 truncate max-w-[320px]">{u.filename}</p>
                        <p className="text-[10px] text-gray-400 truncate max-w-[320px]">
                          {u.original_filename && u.original_filename !== u.filename ? `原始：${u.original_filename} · ` : ''}{formatFileSize(u.file_size)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <select
                      value={displayType}
                      onChange={async (e) => {
                        const newType = e.target.value
                        try {
                          const res = await fetch(`/api/uploads/${u.id}/reclassify`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ file_type: newType })
                          })
                          if (res.ok) {
                            toast.success(`File type changed to ${newType}`)
                            // Refresh page data
                            router.refresh()
                          } else {
                            toast.error('Failed to update file type')
                          }
                        } catch {
                          toast.error('Failed to update file type')
                        }
                      }}
                      className={`text-xs font-medium px-2 py-0.5 rounded-full border-none cursor-pointer transition-colors ${getCategoryBadgeColor(displayType)}`}
                    >
                      {DOC_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs text-gray-500 capitalize">{u.channel || 'Portal'}</span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-500">
                    {u.uploaded_at ? formatUploadedAt(u.uploaded_at) : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      xeroStatus === 'Synced' ? 'bg-emerald-50 text-emerald-700' :
                      xeroStatus === 'Failed' ? 'bg-red-50 text-red-600' :
                      'bg-amber-50 text-amber-700'
                    }`}>
                      {xeroStatus}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      effectiveMode === 'attachments'
                        ? 'bg-violet-50 text-violet-700'
                        : 'bg-cyan-50 text-cyan-700'
                    }`}>
                      {effectiveMode === 'attachments' ? 'Attachment' : 'Inbox'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <button onClick={() => {
                        navigator.clipboard.writeText(u.original_filename || u.filename)
                        toast.success('Filename copied!')
                      }} className="text-xs text-gray-500 hover:text-gray-700" title="Copy filename">
                        <Copy size={14} />
                      </button>
                      {s === 'synced' && (u as any).xero_attachment_id && (
                        <a
                          href={`/api/uploads/${u.id}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:text-blue-700"
                          title="Download from Xero"
                        >
                          <Download size={14} />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'reminders' && (
        <div className="space-y-4">
          <div className="filio-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">Reminder Settings</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Auto reminders</span>
                <button onClick={() => setAutoReminder(!autoReminder)}>
                  {autoReminder
                    ? <ToggleRight size={22} style={{ color: '#059669' }} />
                    : <ToggleLeft size={22} className="text-gray-300" />
                  }
                </button>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[30, 14, 7, 1].map(days => (
                <div key={days} className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                  <CheckCircle2 size={14} style={{ color: '#059669' }} />
                  <span className="text-xs font-medium text-emerald-700">{days}d before</span>
                </div>
              ))}
            </div>
            <button onClick={() => toast.success(`Reminder sent to ${client.name}`)} className="btn-primary">
              <Send size={14} /> Send Reminder Now
            </button>
          </div>

          <div className="filio-card p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Reminder History</h3>
            <div className="space-y-3">
              {[
                { date: '25 Mar 2026', type: 'Auto · 7 days before', status: 'Delivered', statusColor: '#059669' },
                { date: '18 Mar 2026', type: 'Auto · 14 days before', status: 'Delivered', statusColor: '#059669' },
                { date: '01 Mar 2026', type: 'Manual', status: 'Delivered', statusColor: '#059669' },
                { date: '01 Feb 2026', type: 'Auto · 30 days before', status: 'Failed', statusColor: '#DC2626' },
              ].map((r, i) => (
                <div key={i} className="flex items-center gap-4 py-2.5 border-b border-gray-50 last:border-0">
                  <Bell size={14} className="text-gray-300 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-700">{r.type}</p>
                    <p className="text-[10px] text-gray-400">{r.date}</p>
                  </div>
                  <span className="text-xs font-semibold" style={{ color: r.statusColor }}>{r.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-2xl space-y-5">
          <div className="filio-card p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Portal Access</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Portal Contact Email</label>
                <input
                  type="email"
                  value={portalEmail}
                  onChange={(e) => setPortalEmail(e.target.value)}
                  className="mt-1.5 w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-emerald-400 transition-all"
                />
                <p className="text-[10px] text-gray-400 mt-1">Must be unique within your firm</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Portal Language</label>
                <select
                  value={portalLanguage}
                  onChange={(e) => setPortalLanguage(e.target.value)}
                  className="mt-1.5 w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-emerald-400 transition-all"
                >
                  <option value="en">English (default)</option>
                  <option value="zh">简体中文</option>
                </select>
              </div>
            </div>
          </div>

          <div className="filio-card p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Deadlines</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">VAT Quarter Group</label>
                <select
                  value={vatQuarterGroup}
                  onChange={(e) => setVatQuarterGroup(e.target.value)}
                  className="mt-1.5 w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-emerald-400 transition-all"
                >
                  <option value="none">Not VAT Registered / None</option>
                  <option value="A">Group A (Jan/Apr/Jul/Oct)</option>
                  <option value="B">Group B (Feb/May/Aug/Nov)</option>
                  <option value="C">Group C (Mar/Jun/Sep/Dec)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Financial Year End</label>
                <div className="mt-1.5 flex gap-2">
                  <select
                    value={financialYearMonth}
                    onChange={(e) => setFinancialYearMonth(e.target.value)}
                    className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-emerald-400 transition-all"
                  >
                    <option value="">Month</option>
                    <option value="January">January</option>
                    <option value="February">February</option>
                    <option value="March">March</option>
                    <option value="April">April</option>
                    <option value="May">May</option>
                    <option value="June">June</option>
                    <option value="July">July</option>
                    <option value="August">August</option>
                    <option value="September">September</option>
                    <option value="October">October</option>
                    <option value="November">November</option>
                    <option value="December">December</option>
                  </select>
                  <select
                    value={financialYearDay}
                    onChange={(e) => setFinancialYearDay(e.target.value)}
                    className="w-24 text-sm px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-emerald-400 transition-all"
                  >
                    <option value="">Day</option>
                    {availableDays.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={handleSaveSettings} disabled={saving} className="btn-primary disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button onClick={() => toast.info('Reset to global defaults')} className="btn-secondary">Reset to Defaults</button>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="filio-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">Audit Log</h3>
            <button onClick={handleExportAuditPdf} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5">
              <Download size={13} /> Export PDF
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {auditLoading ? (
              <div className="flex items-center justify-center py-12 text-gray-400 text-sm">Loading…</div>
            ) : auditLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Shield size={24} className="text-gray-200" />
                <p className="text-sm text-gray-400">No audit events yet</p>
              </div>
            ) : (
              auditLogs.map((log) => {
                const { label, detail } = formatAuditLabel(log.action, log.metadata)
                const ts = new Date(log.timestamp)
                const timeStr = ts.toLocaleString('en-GB', {
                  day: '2-digit', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })
                return (
                  <div key={log.id} className="flex items-start gap-4 px-5 py-3.5">
                    <Shield size={14} className="text-gray-300 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-gray-800">{label}</p>
                      {detail && <p className="text-[10px] text-gray-500 mt-0.5">{detail}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-gray-400">{timeStr}</p>
                      <p className="text-[10px] font-medium text-gray-500">{log.actor}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
      {/* Quota Exceeded Dialog */}
      {quotaExceededOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                <AlertTriangle size={16} className="text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">Client Limit Reached</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Your plan allows up to <strong>{quotaLimit} active clients</strong>. Set another client to dormant first, or upgrade your plan to reactivate this client.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setQuotaExceededOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <a
                href="/dashboard/settings?tab=billing"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all"
                style={{ background: '#059669' }}
              >
                Upgrade Plan
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmConfig && (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={confirmConfig.title}
          description={confirmConfig.description}
          confirmLabel={confirmConfig.confirmLabel}
          onConfirm={confirmConfig.onConfirm}
          loading={regeneratingToken || regeneratingMagicEmail || !!completingRequestId || settingStatus}
        />
      )}
    </div>
  )
}
