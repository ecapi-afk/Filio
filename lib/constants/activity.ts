import { Upload, Mail, Bell, Send, FileText, Users, Trash2, Moon, Settings, Edit3, StickyNote, type LucideIcon } from 'lucide-react'

export type ActivityType = 'upload' | 'email' | 'reminder' | 'client_added' | 'status_change' | 'client_dormant' | 'client_deleted' | 'config_change' | 'info_change' | 'note_added'

export interface ActivityStyle {
  icon: LucideIcon
  bg: string
  color: string
}

export const ACTIVITY_STYLES: Record<ActivityType, ActivityStyle> = {
  upload: { icon: Upload, bg: '#ECFDF5', color: '#059669' },
  email: { icon: Mail, bg: '#EFF6FF', color: '#2563EB' },
  reminder: { icon: Bell, bg: '#FFFBEB', color: '#D97706' },
  client_added: { icon: Users, bg: '#F3E8FF', color: '#9333EA' },
  status_change: { icon: FileText, bg: '#FEF3C7', color: '#92400E' },
  client_dormant: { icon: Moon, bg: '#F1F5F9', color: '#475569' }, // Slate Blue/Gray for sleeping
  client_deleted: { icon: Trash2, bg: '#FEF2F2', color: '#DC2626' }, // Red for deleted
  config_change: { icon: Settings, bg: '#FDF4FF', color: '#C026D3' }, // Fuchsia for config
  info_change: { icon: Edit3, bg: '#F0FDFA', color: '#0D9488' }, // Teal for edits
  note_added: { icon: StickyNote, bg: '#FEFCE8', color: '#CA8A04' }, // Yellow for notes
}

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  upload: 'Upload',
  email: 'Email',
  reminder: 'Reminder',
  client_added: 'Client Added',
  status_change: 'Status Change',
  client_dormant: 'Client Dormant',
  client_deleted: 'Client Deleted',
  config_change: 'Config Changed',
  info_change: 'Info Updated',
  note_added: 'Note Added',
}

export type XeroSyncStatus = 'synced' | 'pending' | 'failed'

export interface XeroStatusStyle {
  label: string
  className: string
}

export const XERO_STATUS_STYLES: Record<XeroSyncStatus, XeroStatusStyle> = {
  synced: { label: 'Synced ✓', className: 'text-emerald-600 font-medium' },
  pending: { label: 'Pending', className: 'text-amber-600 font-medium' },
  failed: { label: 'Sync Failed', className: 'text-red-600 font-medium' },
}
