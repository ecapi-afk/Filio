'use client'

import { useState, useMemo } from 'react'
import {
  Search,
  Download,
  FileText,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { useI18n } from '@/lib/i18n/context'
import {
  getClientAvatarBg,
  getExt,
  getExtBadgeBg,
  DOC_CATEGORIES,
} from '@/lib/file-types'
import type { DocCategory } from '@/lib/file-types'

type XeroFilter = 'All' | 'Synced' | 'Failed' | 'Pending'
type ChannelFilter = 'All' | 'Portal' | 'Magic Email' | 'Manual'

interface UploadHistoryItem {
  id: string
  clientId: string
  clientName: string
  clientHealthStatus: string
  filename: string
  fileType: string | null
  fileSize: number | null
  xeroStatus: string
  channel: string
  uploadedAt: string
}

interface UploadStats {
  totalUploads: number
  uploadThisMonth: number
  pendingSync: number
  failedSync: number
}

function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateStr: string, locale: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getClientInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function classifyUpload(filename: string): DocCategory {
  const f = filename.toLowerCase()
  if (f.includes('bank') || f.includes('statement')) return 'Bank Statement'
  if (f.includes('invoice') || f.includes('inv_')) return 'Invoice'
  if (f.includes('receipt')) return 'Receipt'
  if (f.includes('payslip') || f.includes('pay_slip') || f.includes('salary')) return 'Payslip'
  if (f.includes('contract') || f.includes('agreement')) return 'Contract'
  return 'Uncategorized'
}

function getDisplayFileType(filename: string, storedType: string | null): DocCategory {
  if (storedType && (DOC_CATEGORIES as readonly string[]).includes(storedType)) {
    return storedType as DocCategory
  }
  if (!storedType) return 'Uncategorized'
  return classifyUpload(filename)
}

function getChannelBadge(
  channel: string
): { label: string; className: string } {
  if (channel === 'portal')
    return { label: 'Portal', className: 'bg-purple-50 text-purple-700' }
  if (channel === 'magic_email' || channel === 'Magic Email' || channel === 'email')
    return { label: 'Magic Email', className: 'bg-sky-50 text-sky-700' }
  return { label: 'Manual', className: 'bg-gray-100 text-gray-600' }
}

function getStatusBadge(
  status: string
): { label: string; className: string } {
  const s = status.toLowerCase()
  if (s === 'synced')
    return { label: 'Synced', className: 'bg-emerald-50 text-emerald-700' }
  if (s === 'error' || s === 'failed')
    return { label: 'Failed', className: 'bg-red-50 text-red-600' }
  return { label: 'Pending', className: 'bg-amber-50 text-amber-700' }
}

export function UploadsClient({
  initialUploads,
  initialStats,
}: {
  initialUploads: UploadHistoryItem[]
  initialStats: UploadStats
}) {
  const { t, locale } = useI18n()
  const [search, setSearch] = useState('')
  const [xeroFilter, setXeroFilter] = useState<XeroFilter>('All')
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('All')

  const filtered = useMemo(() => {
    return initialUploads.filter((u) => {
      const matchSearch =
        search === '' ||
        u.filename.toLowerCase().includes(search.toLowerCase()) ||
        u.clientName.toLowerCase().includes(search.toLowerCase())
      const matchXero =
        xeroFilter === 'All' ||
        (xeroFilter === 'Failed'
          ? u.xeroStatus.toLowerCase() === 'error' || u.xeroStatus.toLowerCase() === 'failed'
          : u.xeroStatus.toLowerCase() === xeroFilter.toLowerCase())
      const normalizedChannel = u.channel === 'email' ? 'magic_email' : u.channel.toLowerCase()
      const matchChannel =
        channelFilter === 'All' ||
        normalizedChannel === channelFilter.toLowerCase().replace(' ', '_')
      return matchSearch && matchXero && matchChannel
    })
  }, [initialUploads, search, xeroFilter, channelFilter])

  const syncedCount = initialUploads.filter((u) => u.xeroStatus.toLowerCase() === 'synced').length
  const failedCount = initialUploads.filter((u) => u.xeroStatus.toLowerCase() === 'error' || u.xeroStatus.toLowerCase() === 'failed').length
  const pendingCount = initialUploads.filter((u) => u.xeroStatus.toLowerCase() === 'pending').length

  const handleRetry = async (uploadId: string) => {
    const toastId = toast.loading('Retrying Xero sync…')
    try {
      const res = await fetch(`/api/uploads/${uploadId}/retry`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Retry failed')
      toast.success('Synced to Xero', { id: toastId })
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Retry failed', { id: toastId })
    }
  }

  const handleExportCsv = () => {
    const headers = ['Client', 'Filename', 'Uploaded', 'Channel', 'Xero Status']
    const rows = filtered.map(u => [
      `"${u.clientName.replace(/"/g, '""')}"`,
      `"${u.filename.replace(/"/g, '""')}"`,
      new Date(u.uploadedAt).toISOString().slice(0, 10),
      u.channel,
      u.xeroStatus,
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `uploads-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Synced to Xero */}
        <div className="border rounded-xl p-4 flex items-center gap-4 bg-gradient-to-br from-emerald-50/50 to-white">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-emerald-50">
            <CheckCircle2 size={20} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">
              {syncedCount}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('uploads.syncedSuccess')}
            </p>
          </div>
        </div>

        {/* Failed to sync */}
        <div className="border rounded-xl p-4 flex items-center gap-4 bg-gradient-to-br from-red-50/50 to-white">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-red-50">
            <AlertCircle size={20} className="text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600 tabular-nums">
              {failedCount}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('uploads.syncFailed')}
            </p>
          </div>
          {failedCount > 0 && (
            <button
              onClick={() => {
                const failedIds = initialUploads
                  .filter(u => u.xeroStatus.toLowerCase() === 'error' || u.xeroStatus.toLowerCase() === 'failed')
                  .map(u => u.id)
                failedIds.forEach(id => handleRetry(id))
              }}
              className="ml-auto text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw size={12} /> {t('common.retry')}
            </button>
          )}
        </div>

        {/* Pending sync */}
        <div className="border rounded-xl p-4 flex items-center gap-4 bg-gradient-to-br from-amber-50/50 to-white">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-amber-50">
            <Clock size={20} className="text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-600 tabular-nums">
              {pendingCount}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('uploads.status.pending')}
            </p>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="border rounded-xl overflow-hidden">
        {/* Filter Bar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b bg-muted/30">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder={t('uploads.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-sm pl-9 pr-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all"
            />
          </div>

          {/* Xero Status Filter */}
          <div className="flex gap-1.5">
            {(['All', 'Synced', 'Failed', 'Pending'] as XeroFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setXeroFilter(f)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={
                  xeroFilter === f
                    ? {
                        background:
                          f === 'Failed'
                            ? '#DC2626'
                            : f === 'Pending'
                              ? '#D97706'
                              : '#059669',
                        color: 'white',
                      }
                    : { background: '#F3F4F6', color: '#6B7280' }
                }
              >
                {f}
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-border" />

          {/* Channel Filter */}
          <div className="flex gap-1.5">
            {(['All', 'Portal', 'Magic Email', 'Manual'] as ChannelFilter[]).map(
              (f) => (
                <button
                  key={f}
                  onClick={() => setChannelFilter(f)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={
                    channelFilter === f
                      ? { background: '#064E3B', color: 'white' }
                      : { background: '#F3F4F6', color: '#6B7280' }
                  }
                >
                  {f}
                </button>
              )
            )}
          </div>

          {/* Export CSV */}
          <button
            onClick={handleExportCsv}
            className="ml-auto text-xs font-medium px-3 py-1.5 rounded-lg border bg-background hover:bg-muted transition-colors flex items-center gap-1.5 text-muted-foreground"
          >
            <Download size={12} /> {t('uploads.exportCsv')}
          </button>
        </div>

        {/* Table */}
        {filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('uploads.table.file')}
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground min-w-[120px]">
                    {t('uploads.table.client')}
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-0 min-w-[100px]">
                    {t('uploads.table.type')}
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-0 min-w-[100px]">
                    {t('uploads.table.channel')}
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('uploads.table.size')}
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('uploads.table.uploadDate')}
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('uploads.table.xeroStatus')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((upload) => {
                  const displayType = getDisplayFileType(upload.filename, upload.fileType)
                  const channelBadge = getChannelBadge(upload.channel)
                  const statusBadge = getStatusBadge(upload.xeroStatus)
                  const initials = getClientInitials(upload.clientName)
                  const avatarBg = getClientAvatarBg(upload.clientHealthStatus)

                  return (
                    <tr
                      key={upload.id}
                      className="border-b border-border/50 hover:bg-muted/30 transition-all"
                    >
                      {/* File */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${getExtBadgeBg(upload.filename)}`}>
                            {getExt(upload.filename)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-foreground line-clamp-2">
                              {upload.filename}
                            </p>
                            {upload.originalFilename && (
                              <p className="text-[10px] text-muted-foreground truncate">
                                Original: {upload.originalFilename}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Client */}
                      <td className="px-5 py-3.5 min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0 ${avatarBg}`}
                          >
                            {initials}
                          </div>
                          <span className="text-xs font-medium text-foreground truncate">
                            {upload.clientName}
                          </span>
                        </div>
                      </td>

                      {/* File Type (category, no background color) */}
                      <td className="px-5 py-3.5 w-0 min-w-[100px]">
                        <span className="text-xs font-medium text-foreground whitespace-nowrap">
                          {displayType}
                        </span>
                      </td>

                      {/* Channel */}
                      <td className="px-5 py-3.5 w-0 min-w-[100px]">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${channelBadge.className}`}
                        >
                          {channelBadge.label}
                        </span>
                      </td>

                      {/* Size */}
                      <td className="px-5 py-3.5 text-xs text-muted-foreground tabular-nums">
                        {formatFileSize(upload.fileSize)}
                      </td>

                      {/* Uploaded */}
                      <td className="px-5 py-3.5 text-xs text-muted-foreground">
                        {formatDate(upload.uploadedAt, locale)}
                      </td>

                      {/* Xero Status */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusBadge.className}`}
                          >
                            {statusBadge.label}
                          </span>
                          {(upload.xeroStatus.toLowerCase() === 'error' || upload.xeroStatus.toLowerCase() === 'failed') && (
                            <button
                              onClick={() => handleRetry(upload.id)}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                              title={t('uploads.retrySyc')}
                            >
                              <RefreshCw size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Empty State */
          <div className="py-16 text-center">
            <FileText size={36} className="mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {search || xeroFilter !== 'All' || channelFilter !== 'All'
                ? 'No uploads match your filter'
                : t('uploads.noUploads')}
            </p>
          </div>
        )}

        {/* Footer info */}
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t bg-muted/30 text-xs text-muted-foreground">
            {t('uploads.showing')} {filtered.length} {t('uploads.of')}{' '}
            {initialUploads.length} {t('uploads.records')}
          </div>
        )}
      </div>
    </div>
  )
}
