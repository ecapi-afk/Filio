'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Star, Send, ExternalLink, Upload, FileText,
  Bell, Settings, Shield, CheckCircle2, Clock, AlertCircle,
  Mail, Copy, RefreshCw, Trash2, ChevronRight, Plus,
  ToggleLeft, ToggleRight, Download, MoreHorizontal, AlertTriangle, X, Info
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
  DOC_CATEGORIES,
} from '@/lib/file-types'
import { Card } from '@/components/ui/card'

type Tab = 'overview' | 'documents' | 'reminders' | 'settings' | 'audit'

type ClientStatus = 'Overdue' | 'Due Soon' | 'Not Started' | 'In Progress' | 'Complete' | 'No Action'

const statusConfig: Record<ClientStatus, { label: string; dot: string; cls: string }> = {
  'Overdue': { label: 'Overdue', dot: '#DC2626', cls: 'status-overdue' },
  'Due Soon': { label: 'Due Soon', dot: '#D97706', cls: 'status-due-soon' },
  'Not Started': { label: 'Not Started', dot: '#2563EB', cls: 'status-not-started' },
  'In Progress': { label: 'In Progress', dot: '#2563EB', cls: 'status-in-progress' },
  'Complete': { label: 'Complete', dot: '#059669', cls: 'status-complete' },
  'No Action': { label: 'No Action', dot: '#9CA3AF', cls: 'status-no-action' },
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

interface ClientDetailClientProps {
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

export function ClientDetailClient({ client }: ClientDetailClientProps) {
  const router = useRouter()
  const { t } = useI18n()
  const clientId = client.id
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [starred, setStarred] = useState(client.is_starred || false)
  const [autoReminder, setAutoReminder] = useState(client.auto_reminders_enabled ?? true)
  const [vatQuarterGroup, setVatQuarterGroup] = useState(client.vat_quarter_group || 'A')

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
  const [showOverflowMenu, setShowOverflowMenu] = useState(false)
  const [isDormant, setIsDormant] = useState((client as any).management_status === 'dormant')
  const [auditLogs, setAuditLogs] = useState<{ id: string; action: string; metadata: Record<string, unknown>; timestamp: string; actor: string }[]>([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [reclassifyingId, setReclassifyingId] = useState<string | null>(null)
  const [reclassifyCategory, setReclassifyCategory] = useState('')
  const [reclassifySaving, setReclassifySaving] = useState(false)
  const [localFileTypes, setLocalFileTypes] = useState<Record<string, string>>({})
  const [settingStatus, setSettingStatus] = useState(false)
  const [deletingClient, setDeletingClient] = useState(false)
  const [dismissedBanners, setDismissedBanners] = useState<string[]>([])
  const [quotaExceededOpen, setQuotaExceededOpen] = useState(false)
  const [quotaLimit, setQuotaLimit] = useState(20)
  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string
    description: string
    confirmLabel: string
    onConfirm: () => Promise<void>
  } | null>(null)

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

  // Fetch real audit logs when audit tab becomes active
  useEffect(() => {
    if (activeTab !== 'audit') return
    setAuditLoading(true)
    fetch(`/api/clients/${clientId}/audit-logs`)
      .then(r => r.json())
      .then(d => setAuditLogs(d.logs ?? []))
      .catch(() => {})
      .finally(() => setAuditLoading(false))
  }, [activeTab, clientId])

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

  const openDeleteConfirm = () => {
    setShowOverflowMenu(false)
    setConfirmConfig({
      title: 'Delete Client?',
      description: `This will permanently remove ${client.name} and all associated data. This action cannot be undone.`,
      confirmLabel: 'Delete Client',
      onConfirm: handleDeleteClient,
    })
    setConfirmOpen(true)
  }

  const handleDeleteClient = async () => {
    setDeletingClient(true)
    try {
      const res = await fetch(`/api/clients/${clientId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Client deleted')
        router.push('/dashboard/clients')
      } else {
        toast.error('Failed to delete client')
        setConfirmOpen(false)
      }
    } catch {
      toast.error('Failed to delete client')
      setConfirmOpen(false)
    } finally {
      setDeletingClient(false)
    }
  }

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
      banner_dismissed: 'Banner dismissed',
      client_created: 'Client created',
      xero_synced: 'Synced to Xero',
    }
    const base = labels[action] ?? action.replace(/_/g, ' ')
    const reason = metadata?.reason as string | undefined
    return reason ? `${base} — ${reason}` : base
  }

  const handleExportAuditPdf = () => {
    const rows = auditLogs.map(l => `
      <tr>
        <td>${new Date(l.timestamp).toLocaleString('en-GB')}</td>
        <td>${formatAuditLabel(l.action, l.metadata)}</td>
        <td>${l.actor}</td>
      </tr>`).join('')

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Audit Log — ${client.name}</title>
<style>
  body { font-family: sans-serif; font-size: 12px; color: #111; padding: 24px; }
  h1 { font-size: 16px; margin-bottom: 4px; }
  p { color: #555; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f3f4f6; text-align: left; padding: 6px 10px; font-size: 11px; border-bottom: 1px solid #e5e7eb; }
  td { padding: 6px 10px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
</style>
</head><body>
<h1>Audit Log: ${client.name}</h1>
<p>Exported ${new Date().toLocaleDateString('en-GB')} · ${auditLogs.length} entries</p>
<table>
  <thead><tr><th>Date / Time</th><th>Action</th><th>Actor</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<script>window.onload=function(){window.print();}</script>
</body></html>`

    const win = window.open('', '_blank')
    if (win) { win.document.write(html); win.document.close() }
  }

  const handleReclassify = async (uploadId: string) => {
    if (!reclassifyCategory) return
    setReclassifySaving(true)
    try {
      const res = await fetch(`/api/uploads/${uploadId}/reclassify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_type: reclassifyCategory }),
      })
      if (res.ok) {
        setLocalFileTypes(prev => ({ ...prev, [uploadId]: reclassifyCategory }))
        setReclassifyingId(null)
        toast.success('File reclassified')
      } else {
        const body = await res.json().catch(() => ({}))
        toast.error(body.error ?? 'Failed to reclassify')
      }
    } catch {
      toast.error('Failed to reclassify')
    } finally {
      setReclassifySaving(false)
    }
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
        toast.error('Failed to save settings')
      }
    } catch {
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

  // Real uploads from client.uploads (fetched server-side)
  const realUploads = (client.uploads as any[]) || []

  // formatFileSize, formatUploadedAt, getExt, getExtBadgeBg, getCategoryBadgeColor
  // are imported from @/lib/file-types

  const deadlineDays = client.next_deadline ?
    Math.ceil((new Date(client.next_deadline.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0

  const formatDays = (days: number) => {
    if (days < 0) return `${Math.abs(days)} days overdue`
    if (days <= 14) return `${days} days`
    return `${days} days`
  }

  // Format: "Never", "2 hours ago", or "18 Mar 2026"
  const formatRelativeUpload = (dateStr: string | undefined | null) => {
    if (!dateStr) return 'Never'
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffHours < 24) return `${diffHours} hours ago`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div>
      {/* Back + Header */}
      <div className="mb-5">
        <Link href="/dashboard/clients" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
            <ArrowLeft size={15} /> Back to Clients
          </Link>

        {/* Client Header Card */}
        <div className="filio-card p-5">
          <div className="flex flex-wrap items-center gap-4 lg:gap-5">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg shrink-0"
              style={{ background: '#059669' }}
            >
              {client.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-lg font-bold text-gray-900">{client.name}</h2>
                {isDormant
                  ? <span className="status-badge" style={{ background: '#F3F4F6', color: '#6B7280' }}><span className="w-1.5 h-1.5 rounded-full bg-gray-400" />Dormant</span>
                  : <StatusBadge status={(client.health_status as ClientStatus) || 'Not Started'} />
                }
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
            <div className="hidden sm:flex gap-6 text-center shrink-0">
              <div>
                <p className="text-2xl font-bold text-gray-900 tabular-nums">
                  {client.upload_progress?.uploaded || 0}/{client.upload_progress?.required || 5}
                </p>
                <p className="text-xs text-gray-400">Files uploaded</p>
              </div>
              <div className="w-px bg-gray-100" />
              <div>
                <p className="text-2xl font-bold text-gray-900 tabular-nums">{realUploads.length}</p>
                <p className="text-xs text-gray-400">Total uploads</p>
              </div>
              <div className="w-px bg-gray-100" />
              <div>
                <p className={`text-2xl font-bold tabular-nums ${deadlineDays < 0 ? 'text-red-600' : deadlineDays <= 14 ? 'text-amber-600' : 'text-gray-900'}`}>
                  {deadlineDays < 0 ? Math.abs(deadlineDays) + 'd' : deadlineDays + 'd'}
                </p>
                <p className="text-xs text-gray-400">{deadlineDays < 0 ? 'Overdue' : 'Until deadline'}</p>
              </div>
            </div>

            {/* Action buttons: 2 primary + ⋯ overflow */}
            <div className="flex items-center gap-2 shrink-0 lg:border-l border-gray-100 lg:pl-5 lg:ml-1 w-full lg:w-auto justify-end lg:justify-start">
              <button
                onClick={() => {
                  setActiveTab('reminders')
                  toast.success(`Reminder sent to ${client.name}`)
                }}
                className="btn-primary text-xs"
              >
                <Send size={13} /> Send Reminder
              </button>
              {portalUrl ? (
                <a href={portalUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs">
                  <ExternalLink size={13} /> View Portal
                </a>
              ) : (
                <button
                  onClick={() => setActiveTab('settings')}
                  className="btn-secondary text-xs"
                >
                  <ExternalLink size={13} /> Set up Portal
                </button>
              )}
              {/* ⋯ overflow menu */}
              <div className="relative">
                <button
                  onClick={() => setShowOverflowMenu(v => !v)}
                  className="btn-secondary text-xs px-2 py-2"
                  aria-label="More actions"
                >
                  <MoreHorizontal size={15} />
                </button>
                {showOverflowMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowOverflowMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                      <button
                        onClick={() => {
                          setShowOverflowMenu(false)
                          toast.success(`Magic link sent to ${client.email || client.name}`)
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Mail size={14} className="text-gray-400" /> Send Magic Link
                      </button>
                      <button
                        onClick={() => { setShowOverflowMenu(false); openRegenerateTokenConfirm() }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <RefreshCw size={14} className="text-gray-400" /> Regenerate Portal Link
                      </button>
                      <button
                        onClick={() => { setShowOverflowMenu(false); openRegenerateMagicEmailConfirm() }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <RefreshCw size={14} className="text-gray-400" /> Regenerate Magic Email
                      </button>
                      <div className="h-px bg-gray-100 my-1" />
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
                      <div className="h-px bg-gray-100 my-1" />
                      <button
                        onClick={openDeleteConfirm}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={14} /> Delete Client
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Priority banners (D-05): max 1 shown, rest collapsed */}
      {(() => {
        const failedUploads = realUploads.filter((u: any) => u.xero_status === 'failed' || u.xero_status === 'error')
        const allBanners = [
          // Priority: xero_not_found > overdue > xero_failed > no_portal
          ...((client as any).xero_not_found ? [{
            id: 'xero_not_found',
            type: 'error' as const,
            message: 'This Xero contact can no longer be found. Uploads will fail until the contact is re-linked.',
          }] : []),
          ...(client.health_status === 'Overdue' ? [{
            id: 'overdue',
            type: 'error' as const,
            message: `This client is overdue. Send a reminder or update the deadline.`,
          }] : []),
          ...(failedUploads.length > 0 ? [{
            id: 'xero_failed',
            type: 'warning' as const,
            message: `${failedUploads.length} document${failedUploads.length > 1 ? 's' : ''} failed to sync to Xero. Retry in the Documents tab.`,
          }] : []),
          ...(!shortCode ? [{
            id: 'no_portal',
            type: 'info' as const,
            message: 'No portal link configured. Set up portal access in Settings.',
          }] : []),
        ].filter(b => !dismissedBanners.includes(b.id))

        if (allBanners.length === 0) return null
        const [primary, ...rest] = allBanners
        const bannerStyle: Record<string, { bg: string; border: string; icon: string; text: string }> = {
          error: { bg: '#FEF2F2', border: '#FECACA', icon: '#DC2626', text: '#991B1B' },
          warning: { bg: '#FFFBEB', border: '#FDE68A', icon: '#D97706', text: '#92400E' },
          info: { bg: '#EFF6FF', border: '#BFDBFE', icon: '#2563EB', text: '#1E40AF' },
        }
        const s = bannerStyle[primary.type]
        return (
          <div className="mb-4 space-y-2">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border text-sm" style={{ background: s.bg, borderColor: s.border }}>
              <AlertCircle size={15} style={{ color: s.icon }} className="shrink-0" />
              <span className="flex-1 text-xs font-medium" style={{ color: s.text }}>{primary.message}</span>
              <button
                onClick={async () => {
                  setDismissedBanners(d => [...d, primary.id])
                  if (primary.id === 'overdue') {
                    // Write dismissal to audit log so compliance record is preserved
                    await fetch(`/api/clients/${clientId}/log-event`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'overdue_banner_dismissed' }),
                    }).catch(() => {})
                  }
                }}
                className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
              >
                <X size={14} style={{ color: s.text }} />
              </button>
            </div>
            {rest.length > 0 && (
              <p className="text-xs text-gray-400 pl-1">
                +{rest.length} more alert{rest.length > 1 ? 's' : ''} — dismiss the above to reveal
              </p>
            )}
          </div>
        )
      })()}

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: Deadline & Progress */}
          <div className="col-span-2 space-y-5">
            {/* Deadline Card */}
            <div className="filio-card p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Deadlines & Progress</h3>
              <div className="space-y-4">
                <div 
                  className="flex items-center justify-between p-4 rounded-xl"
                  style={{ background: deadlineDays < 0 ? '#FEF2F2' : '#F9FAFB' }}
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{client.next_deadline?.type || 'Document Request'} Deadline</p>
                    <p className="text-xs text-gray-500 mt-0.5">{client.next_deadline?.date || 'No deadline set'}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold tabular-nums ${deadlineDays < 0 ? 'text-red-600' : deadlineDays <= 14 ? 'text-amber-600' : 'text-gray-700'}`}>
                      {formatDays(deadlineDays)}
                    </p>
                    <StatusBadge status={(client.health_status as ClientStatus) || 'Not Started'} />
                  </div>
                </div>

                {/* Document Checklist */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-gray-700">Document Checklist</p>
                    <span className="text-xs text-gray-400">{client.upload_progress?.uploaded || 0} of {client.upload_progress?.required || 5} uploaded</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-100 mb-3 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all" 
                      style={{
                        width: `${((client.upload_progress?.uploaded || 0) / (client.upload_progress?.required || 5)) * 100}%`,
                        background: client.health_status === 'Complete' ? '#059669' : client.health_status === 'Overdue' ? '#DC2626' : '#2563EB'
                      }} 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {['Receipt', 'Invoice', 'Bank Statement', 'Payslip', 'Contract', 'Other'].map((doc, i) => (
                      <div key={doc} className="flex items-center gap-2 text-sm">
                        {i < (client.upload_progress?.uploaded || 0)
                          ? <CheckCircle2 size={16} style={{ color: '#059669' }} />
                          : <Clock size={16} className="text-gray-300" />
                        }
                        <span className={i < (client.upload_progress?.uploaded || 0) ? 'text-gray-700' : 'text-gray-400'}>{doc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Uploads */}
            <div className="filio-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-900">Recent Uploads</h3>
                <button onClick={() => setActiveTab('documents')} className="text-xs font-medium flex items-center gap-1" style={{ color: '#059669' }}>
                  View all <ChevronRight size={13} />
                </button>
              </div>
              {realUploads.length > 0 ? (
                <div className="space-y-2">
                  {realUploads.slice(0, 3).map(u => (
                    <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold ${getExtBadgeBg(u.filename)}`}>
                        {getExt(u.filename)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{u.filename}</p>
                        <p className="text-[10px] text-gray-400">{formatUploadedAt(u.uploaded_at)} · {formatFileSize(u.file_size)}</p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        (u.xero_status || '').toLowerCase() === 'synced' ? 'bg-emerald-50 text-emerald-700' :
                        ((u.xero_status || '').toLowerCase() === 'error' || (u.xero_status || '').toLowerCase() === 'failed') ? 'bg-red-50 text-red-600' :
                        'bg-amber-50 text-amber-700'
                      }`}>
                        {(u.xero_status || '').toLowerCase() === 'synced' ? 'Synced' : ((u.xero_status || '').toLowerCase() === 'error' || (u.xero_status || '').toLowerCase() === 'failed') ? 'Failed' : 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <Upload size={28} className="mx-auto mb-2 text-gray-200" />
                  <p className="text-sm text-gray-400">No uploads yet</p>
                </div>
              )}
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
                  <span className="text-xs text-gray-500">VAT Group</span>
                  <span className="text-xs font-semibold text-gray-700">Group {client.vat_quarter_group || 'A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Last upload</span>
                  <span className="text-xs text-gray-700">{formatRelativeUpload(client.last_upload)}</span>
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

            <div className="filio-card p-5">
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
              <button
                onClick={openRegenerateMagicEmailConfirm}
                disabled={regeneratingMagicEmail}
                className="btn-secondary w-full justify-center text-xs py-2 mt-3 disabled:opacity-50"
              >
                <RefreshCw size={13} className={regeneratingMagicEmail ? 'animate-spin' : ''} />
                {regeneratingMagicEmail ? 'Regenerating...' : 'Regenerate Magic Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="filio-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-bold text-gray-900">All Documents</h3>
              <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                <Info size={11} className="shrink-0" />
                Files are stored in Xero, not Filio — Filio tracks metadata only
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => toast.info('Export CSV — coming soon')} className="btn-secondary text-xs px-3 py-1.5">
                <Download size={13} /> Export CSV
              </button>
              <button onClick={() => toast.info('Manual upload — coming soon')} className="btn-primary text-xs px-3 py-1.5">
                <Plus size={13} /> Manual Upload
              </button>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">File</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Type</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Channel</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Uploaded</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Xero</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Action</th>
              </tr>
            </thead>
            <tbody>
              {realUploads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                    <Upload size={24} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No uploads yet</p>
                    <p className="text-xs mt-1">Send your client a link to get started</p>
                  </td>
                </tr>
              ) : realUploads.map(u => (
                <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-all">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${getExtBadgeBg(u.filename)}`}>
                        {getExt(u.filename)}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-800 truncate max-w-[320px]">{u.filename}</p>
                        <p className="text-[10px] text-gray-400 truncate max-w-[320px]">{u.original_filename || u.filename} · {formatFileSize(u.file_size)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {(() => {
                      const cat = localFileTypes[u.id] ?? u.file_type ?? 'Uncategorized'
                      return (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getCategoryBadgeColor(cat)}`}>
                          {cat}
                        </span>
                      )
                    })()}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs text-gray-500 capitalize">{u.channel || 'Portal'}</span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-500">{formatUploadedAt(u.uploaded_at)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      (u.xero_status || '').toLowerCase() === 'synced' ? 'bg-emerald-50 text-emerald-700' :
                      ((u.xero_status || '').toLowerCase() === 'error' || (u.xero_status || '').toLowerCase() === 'failed') ? 'bg-red-50 text-red-600' :
                      'bg-amber-50 text-amber-700'
                    }`}>
                      {(u.xero_status || '').toLowerCase() === 'synced' ? 'Synced' : ((u.xero_status || '').toLowerCase() === 'error' || (u.xero_status || '').toLowerCase() === 'failed') ? 'Failed' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {reclassifyingId === u.id ? (
                      <div className="flex items-center gap-1.5">
                        <select
                          value={reclassifyCategory}
                          onChange={e => setReclassifyCategory(e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        >
                          <option value="">Pick type…</option>
                          {DOC_CATEGORIES.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleReclassify(u.id)}
                          disabled={!reclassifyCategory || reclassifySaving}
                          className="text-[10px] font-semibold text-white bg-emerald-600 px-2 py-1 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {reclassifySaving ? '…' : 'Save'}
                        </button>
                        <button
                          onClick={() => setReclassifyingId(null)}
                          className="text-[10px] text-gray-400 hover:text-gray-600"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button onClick={() => {
                          navigator.clipboard.writeText(u.filename)
                          toast.success('Filename copied!')
                        }} className="text-xs text-gray-400 hover:text-gray-600" title="Copy filename">
                          <Copy size={13} />
                        </button>
                        <button
                          onClick={() => {
                            setReclassifyingId(u.id)
                            setReclassifyCategory(localFileTypes[u.id] ?? u.file_type ?? '')
                          }}
                          className="text-[10px] text-gray-400 hover:text-emerald-600 font-medium"
                          title="Reclassify file type"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
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
            <button
              onClick={handleExportAuditPdf}
              disabled={auditLogs.length === 0}
              className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download size={13} /> Export PDF
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {auditLoading ? (
              <div className="flex items-center justify-center py-10">
                <RefreshCw size={18} className="animate-spin text-gray-300" />
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="py-10 text-center">
                <Shield size={24} className="mx-auto mb-2 text-gray-200" />
                <p className="text-xs text-gray-400">No audit events recorded yet</p>
              </div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-4 px-5 py-3.5">
                  <Shield size={14} className="text-gray-300 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-800">{formatAuditLabel(log.action, log.metadata)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-gray-400">{new Date(log.timestamp).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                    <p className="text-[10px] font-medium text-gray-500">{log.actor}</p>
                  </div>
                </div>
              ))
            )}
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
          loading={regeneratingToken || regeneratingMagicEmail || deletingClient || settingStatus}
        />
      )}

      {/* Quota Exceeded Dialog */}
      <Dialog.Root open={quotaExceededOpen} onOpenChange={setQuotaExceededOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl border border-gray-100 p-6 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-amber-500" />
              </div>
              <div>
                <Dialog.Title className="text-sm font-bold text-gray-900 mb-1">Client Limit Reached</Dialog.Title>
                <Dialog.Description className="text-sm text-gray-500 leading-relaxed">
                  Your plan allows up to <strong>{quotaLimit} active clients</strong>. Set another client to dormant first, or upgrade your plan to reactivate this client.
                </Dialog.Description>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Dialog.Close asChild>
                <button className="btn-secondary text-xs px-4 py-2">Close</button>
              </Dialog.Close>
              <a
                href="/dashboard/settings?tab=billing"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all"
                style={{ background: '#059669' }}
              >
                Upgrade Plan
              </a>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
