/**
 * Shared file type & category utilities for upload/document displays.
 * Used across portal-upload, client-detail-v3, and client-detail-client.
 */

import { Image, FileText, File as FileIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { HealthStatus } from '@/lib/supabase/types'

// ── Client Health Status → Avatar Background Color ────────────────────────────

/**
 * Returns the avatar background color for a client's health status.
 * This is used for the colored circle initials shown next to client names.
 */
export function getClientAvatarBg(healthStatus: string | null | undefined): string {
  const status = (healthStatus ?? 'No Action') as HealthStatus
  switch (status) {
    case 'Overdue':     return 'bg-red-500'
    case 'Due Soon':    return 'bg-amber-400'
    case 'Not Started': return 'bg-blue-400'
    case 'In Progress': return 'bg-yellow-400'
    case 'Complete':    return 'bg-green-500'
    case 'No Action':  return 'bg-zinc-400'
    default:            return 'bg-zinc-400'
  }
}

// ── Document Categories ──────────────────────────────────────────────────────

export const DOC_CATEGORIES = ['Receipt', 'Invoice', 'Bank Statement', 'Payslip', 'Contract', 'Other', 'Uncategorized'] as const
export type DocCategory = typeof DOC_CATEGORIES[number]

// ── File Extension → Display Label ──────────────────────────────────────────

/** Returns a human-readable file type label from a filename, e.g. "PDF", "Image", "Spreadsheet" */
export function getFileTypeLabel(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  if (['jpg', 'jpeg', 'png', 'heic', 'gif', 'webp', 'avif', 'bmp', 'tif', 'tiff'].includes(ext)) return 'Image'
  if (ext === 'pdf') return 'PDF'
  if (['doc', 'docx', 'odt', 'rtf', 'txt'].includes(ext)) return 'Document'
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) return 'Spreadsheet'
  if (['ppt', 'pptx'].includes(ext)) return 'Presentation'
  if (['zip', 'rar', '7z'].includes(ext)) return 'Archive'
  if (['msg', 'eml'].includes(ext)) return 'Email'
  return 'File'
}

// ── File Extension → Badge Tailwind Classes ───────────────────────────────────

/** Returns Tailwind classes for the File Type Badge (displayed next to filename) */
export function getFileTypeBadgeColor(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  if (['jpg', 'jpeg', 'png', 'heic', 'gif', 'webp', 'avif', 'bmp', 'tif', 'tiff'].includes(ext))
    return 'bg-blue-100 text-blue-700 border-blue-200'
  if (ext === 'pdf') return 'bg-red-100 text-red-700 border-red-200'
  if (['doc', 'docx', 'odt', 'rtf', 'txt'].includes(ext))
    return 'bg-indigo-100 text-indigo-700 border-indigo-200'
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext))
    return 'bg-green-100 text-green-700 border-green-200'
  if (['ppt', 'pptx'].includes(ext))
    return 'bg-orange-100 text-orange-700 border-orange-200'
  if (['zip', 'rar', '7z'].includes(ext))
    return 'bg-yellow-100 text-yellow-700 border-yellow-200'
  if (['msg', 'eml'].includes(ext))
    return 'bg-sky-100 text-sky-700 border-sky-200'
  return 'bg-gray-100 text-gray-600 border-gray-200'
}

// ── Document Category → Badge Tailwind Classes ────────────────────────────────

/** Returns Tailwind classes for the Category Badge (user-selected document type dropdown) */
export function getCategoryBadgeColor(category: string): string {
  switch (category) {
    case 'Receipt':        return 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200'
    case 'Invoice':        return 'bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-200'
    case 'Bank Statement': return 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200'
    case 'Payslip':        return 'bg-cyan-100 text-cyan-700 border-cyan-200 hover:bg-cyan-200'
    case 'Contract':       return 'bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200'
    case 'Other':          return 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
    case 'Uncategorized':  return 'bg-zinc-100 text-zinc-500 border-zinc-200 hover:bg-zinc-200'
    default:               return 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
  }
}

// ── File Extension → Lucide Icon ──────────────────────────────────────────────

/** Returns the appropriate Lucide icon for a given MIME type or extension */
export function getFileIcon(type: string): LucideIcon {
  if (type.startsWith('image/')) return Image
  if (type.includes('pdf')) return FileText
  return FileIcon
}

// ── Filename → Uppercase Extension ────────────────────────────────────────────

/** Returns the uppercase file extension, e.g. "PDF", "DOCX", "XLS" */
export function getExt(name: string): string {
  return name.split('.').pop()?.toUpperCase() || 'FILE'
}

// ── Filename → Extension Badge Tailwind Classes ────────────────────────────────

/** Returns Tailwind classes for the small colored square that displays the file extension (left icon square) */
export function getExtBadgeBg(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  if (['jpg', 'jpeg', 'png', 'heic', 'gif', 'webp', 'avif', 'bmp', 'tif', 'tiff'].includes(ext))
    return 'bg-blue-100 text-blue-700'
  if (ext === 'pdf') return 'bg-red-100 text-red-700'
  if (['doc', 'docx', 'odt', 'rtf', 'txt'].includes(ext))
    return 'bg-indigo-100 text-indigo-700'
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext))
    return 'bg-green-100 text-green-700'
  if (['ppt', 'pptx'].includes(ext))
    return 'bg-orange-100 text-orange-700'
  if (['zip', 'rar', '7z'].includes(ext))
    return 'bg-yellow-100 text-yellow-700'
  if (['msg', 'eml'].includes(ext))
    return 'bg-sky-100 text-sky-700'
  return 'bg-gray-100 text-gray-600'
}

// ── File Size Formatter ───────────────────────────────────────────────────────

/** Formats bytes as "245 KB" or "1.2 MB" */
export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ── Upload Date Formatter ─────────────────────────────────────────────────────

/** Formats ISO date string as relative time, e.g. "2 hours ago", "3 days ago" */
export function formatUploadedAt(dateString: string | null | undefined): string {
  if (!dateString) return '—'

  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`

  // For older dates, show formatted date
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── MIME Type Allowlist ───────────────────────────────────────────────────────

export const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/tiff', 'image/bmp', 'image/heic', 'image/webp',
  // Documents
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain', 'text/rtf', 'application/rtf', 'application/vnd.oasis.opendocument.text',
  // Spreadsheets
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv', 'application/vnd.oasis.opendocument.spreadsheet',
  // Presentations
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Archives
  'application/zip', 'application/x-zip-compressed',
  // Email
  'message/rfc822', 'application/vnd.ms-outlook',
] as const

// ── Extension → MIME Type (for validation) ───────────────────────────────────

export const EXT_TO_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',  '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif',  '.tif': 'image/tiff',  '.tiff': 'image/tiff',
  '.bmp': 'image/bmp',  '.heic': 'image/heic', '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain', '.rtf': 'text/rtf',
  '.odt': 'application/vnd.oasis.opendocument.text',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.csv': 'text/csv',   '.ods': 'application/vnd.oasis.opendocument.spreadsheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.zip': 'application/zip',
  '.msg': 'message/rfc822', '.eml': 'message/rfc822',
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
