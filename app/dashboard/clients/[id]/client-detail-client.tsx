'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Star, Send, ExternalLink, Upload, FileText,
  Bell, Settings, Shield, CheckCircle2, Clock, AlertCircle,
  Mail, Copy, RefreshCw, Trash2, ChevronRight, Plus,
  ToggleLeft, ToggleRight, Download, MoreHorizontal, AlertTriangle
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

  // Debug: log short links data
  console.log('Client short_links:', shortLinksData, 'shortCode:', shortCode, 'portalUrl:', portalUrl)

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

    console.log('Save clicked, clientId:', clientId)
    console.log('VAT group:', vatQuarterGroup, 'FY end:', financialYearEnd)
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
      console.log('Response status:', response.status)
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

  // Real uploads from client.uploads (fetched server-side)
  const realUploads = (client.uploads as any[]) || []

  // formatFileSize, formatUploadedAt, getExt, getExtBadgeBg, getCategoryBadgeColor
  // are imported from @/lib/file-types

  const deadlineDays = client.next_deadline ?
    Math.ceil((new Date(client.next_deadline.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0

  // Debug logging
  console.log('Overview render:', {
    clientId: client.id,
    nextDeadline: client.next_deadline,
    deadlineDays,
    requestsCount: client.requests?.length || 0
  })

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
        <div className="filio-card p-5 flex items-center gap-5">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg shrink-0"
            style={{ background: '#059669' }}
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
          <div className="flex gap-6 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">
                {client.upload_progress?.uploaded || 0}/{client.upload_progress?.required || 5}
              </p>
              <p className="text-xs text-gray-400">Files uploaded</p>
            </div>
            <div className="w-px bg-gray-100" />
            <div>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">0</p>
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
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getCategoryBadgeColor(u.file_type || 'Uncategorized')}`}>
                      {u.file_type || 'Uncategorized'}
                    </span>
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
                    <button onClick={() => {
                      navigator.clipboard.writeText(u.filename)
                      toast.success('Filename copied!')
                    }} className="text-xs text-gray-500 hover:text-gray-700">
                      <Copy size={14} />
                    </button>
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
            <button onClick={() => toast.info('Feature coming soon')} className="btn-secondary text-xs px-3 py-1.5">
              <Download size={13} /> Export PDF
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {[
              { action: 'File uploaded', detail: 'Receipt via Portal', time: '2 hours ago', user: 'Client' },
              { action: 'Reminder sent', detail: 'Auto reminder · 7 days before VAT deadline', time: '25 Mar 2026, 08:00', user: 'System' },
              { action: 'Token regenerated', detail: 'Old upload link invalidated', time: '20 Mar 2026, 14:23', user: 'accountant@firm.com' },
              { action: 'File uploaded', detail: 'Invoice via Manual', time: '18 Mar 2026, 11:05', user: 'accountant@firm.com' },
              { action: 'Client created', detail: 'Imported from Xero', time: '01 Mar 2026, 09:00', user: 'accountant@firm.com' },
            ].map((log, i) => (
              <div key={i} className="flex items-start gap-4 px-5 py-3.5">
                <Shield size={14} className="text-gray-300 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-800">{log.action}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{log.detail}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-gray-400">{log.time}</p>
                  <p className="text-[10px] font-medium text-gray-500">{log.user}</p>
                </div>
              </div>
            ))}
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
          loading={regeneratingToken || regeneratingMagicEmail}
        />
      )}
    </div>
  )
}
