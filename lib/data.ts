// ============================================================
// FILIO MOCK DATA — Scheme 2: Data-Driven
// British names, GBP amounts, DD/MM/YYYY dates
// ============================================================

export type ClientStatus = 'Overdue' | 'Due Soon' | 'Not Started' | 'In Progress' | 'Complete' | 'No Action' | 'Frozen';

export interface Client {
  id: string;
  name: string;
  email: string;
  initials: string;
  color: string;
  status: ClientStatus;
  progress: number;
  progressTotal: number;
  nextDeadline: string;
  deadlineType: 'VAT' | 'Annual';
  deadlineDays: number; // negative = overdue
  lastUpload: string;
  starred: boolean;
  portalStatus: 'Active' | 'Frozen' | 'Email Conflict';
  vatGroup: 'A' | 'B' | 'C';
  uploads: number;
}

export const clients: Client[] = [
  {
    id: '1', name: 'Bright Spark Ltd', email: 'james@brightspark.co.uk',
    initials: 'BS', color: '#DC2626', status: 'Overdue',
    progress: 1, progressTotal: 5, nextDeadline: '29 Mar 2026', deadlineType: 'VAT',
    deadlineDays: -3, lastUpload: '14 days ago', starred: true,
    portalStatus: 'Active', vatGroup: 'A', uploads: 12
  },
  {
    id: '2', name: 'Oak Tree Consulting', email: 'info@oaktree.co.uk',
    initials: 'OT', color: '#D97706', status: 'Due Soon',
    progress: 3, progressTotal: 5, nextDeadline: '06 Apr 2026', deadlineType: 'Annual',
    deadlineDays: 5, lastUpload: '2 days ago', starred: true,
    portalStatus: 'Active', vatGroup: 'B', uploads: 28
  },
  {
    id: '3', name: 'Meridian Designs', email: 'hello@meridian.co.uk',
    initials: 'MD', color: '#D97706', status: 'Due Soon',
    progress: 2, progressTotal: 5, nextDeadline: '10 Apr 2026', deadlineType: 'VAT',
    deadlineDays: 9, lastUpload: '5 days ago', starred: false,
    portalStatus: 'Active', vatGroup: 'A', uploads: 8
  },
  {
    id: '4', name: 'Harlow & Sons', email: 'accounts@harlow.co.uk',
    initials: 'HS', color: '#2563EB', status: 'In Progress',
    progress: 4, progressTotal: 5, nextDeadline: '19 Apr 2026', deadlineType: 'VAT',
    deadlineDays: 18, lastUpload: 'Today', starred: false,
    portalStatus: 'Active', vatGroup: 'C', uploads: 34
  },
  {
    id: '5', name: 'Fernwood Retail', email: 'fern@fernwood.co.uk',
    initials: 'FR', color: '#059669', status: 'Complete',
    progress: 5, progressTotal: 5, nextDeadline: '13 May 2026', deadlineType: 'Annual',
    deadlineDays: 42, lastUpload: 'Yesterday', starred: false,
    portalStatus: 'Active', vatGroup: 'B', uploads: 19
  },
  {
    id: '6', name: 'Blue Horizon Tech', email: 'admin@bluehorizon.io',
    initials: 'BH', color: '#059669', status: 'Complete',
    progress: 5, progressTotal: 5, nextDeadline: '25 May 2026', deadlineType: 'VAT',
    deadlineDays: 55, lastUpload: '3 days ago', starred: false,
    portalStatus: 'Active', vatGroup: 'A', uploads: 41
  },
  {
    id: '7', name: 'Thornton & Partners', email: 'info@thornton.co.uk',
    initials: 'TP', color: '#6B7280', status: 'No Action',
    progress: 0, progressTotal: 5, nextDeadline: '30 Jun 2026', deadlineType: 'VAT',
    deadlineDays: 90, lastUpload: '3 weeks ago', starred: false,
    portalStatus: 'Active', vatGroup: 'C', uploads: 5
  },
  {
    id: '8', name: 'Castleford Media', email: 'billing@castleford.co.uk',
    initials: 'CM', color: '#6B7280', status: 'Frozen',
    progress: 0, progressTotal: 5, nextDeadline: '—', deadlineType: 'VAT',
    deadlineDays: 999, lastUpload: '2 months ago', starred: false,
    portalStatus: 'Frozen', vatGroup: 'A', uploads: 3
  },
];

export interface UploadRecord {
  id: string;
  fileName: string;
  originalName: string;
  clientName: string;
  clientInitials: string;
  clientColor: string;
  fileType: 'Receipt' | 'Invoice' | 'Bank Statement' | 'Contract' | 'Payslip' | 'Other' | 'UNCLASSED';
  channel: 'Portal' | 'Magic Email' | 'Manual';
  size: string;
  uploadedAt: string;
  xeroStatus: 'Synced' | 'Failed' | 'Pending';
}

export const uploadRecords: UploadRecord[] = [
  {
    id: 'u1', fileName: 'HarlowSons_Receipt_20260401.jpg', originalName: 'IMG_4521.jpg',
    clientName: 'Harlow & Sons', clientInitials: 'HS', clientColor: '#2563EB',
    fileType: 'Receipt', channel: 'Portal', size: '2.1 MB', uploadedAt: '2 hours ago', xeroStatus: 'Synced'
  },
  {
    id: 'u2', fileName: 'BlueHorizon_Invoice_20260401.pdf', originalName: 'invoice_march.pdf',
    clientName: 'Blue Horizon Tech', clientInitials: 'BH', clientColor: '#059669',
    fileType: 'Invoice', channel: 'Magic Email', size: '845 KB', uploadedAt: '5 hours ago', xeroStatus: 'Synced'
  },
  {
    id: 'u3', fileName: 'OakTree_BankStatement_20260331.pdf', originalName: 'statement.pdf',
    clientName: 'Oak Tree Consulting', clientInitials: 'OT', clientColor: '#D97706',
    fileType: 'Bank Statement', channel: 'Portal', size: '1.3 MB', uploadedAt: 'Yesterday', xeroStatus: 'Synced'
  },
  {
    id: 'u4', fileName: 'Meridian_Receipt_20260330.png', originalName: 'photo.png',
    clientName: 'Meridian Designs', clientInitials: 'MD', clientColor: '#D97706',
    fileType: 'Receipt', channel: 'Portal', size: '3.2 MB', uploadedAt: '2 days ago', xeroStatus: 'Failed'
  },
  {
    id: 'u5', fileName: 'BrightSpark_Invoice_20260329.pdf', originalName: 'inv-2026-03.pdf',
    clientName: 'Bright Spark Ltd', clientInitials: 'BS', clientColor: '#DC2626',
    fileType: 'Invoice', channel: 'Manual', size: '512 KB', uploadedAt: '3 days ago', xeroStatus: 'Synced'
  },
  {
    id: 'u6', fileName: 'Fernwood_Payslip_20260328.pdf', originalName: 'payslip_march.pdf',
    clientName: 'Fernwood Retail', clientInitials: 'FR', clientColor: '#059669',
    fileType: 'Payslip', channel: 'Portal', size: '234 KB', uploadedAt: '4 days ago', xeroStatus: 'Synced'
  },
  {
    id: 'u7', fileName: 'HarlowSons_Contract_20260327.docx', originalName: 'contract_signed.docx',
    clientName: 'Harlow & Sons', clientInitials: 'HS', clientColor: '#2563EB',
    fileType: 'Contract', channel: 'Manual', size: '178 KB', uploadedAt: '5 days ago', xeroStatus: 'Pending'
  },
];

export const recentActivity = [
  { id: 'a1', type: 'upload', client: 'Harlow & Sons', desc: 'uploaded 3 receipts via Portal', time: '2 hours ago', synced: true },
  { id: 'a2', type: 'email', client: 'Blue Horizon Tech', desc: 'sent 2 files via Magic Email', time: '5 hours ago', synced: true },
  { id: 'a3', type: 'reminder', client: 'Oak Tree Consulting', desc: 'Reminder sent', time: 'Yesterday, 9:02 AM', synced: false },
  { id: 'a4', type: 'upload', client: 'Fernwood Retail', desc: 'uploaded invoice', time: 'Yesterday, 3:45 PM', synced: true },
];

export const upcomingDeadlines = [
  { id: 'd1', client: 'Bright Spark Ltd', type: 'VAT Q1', days: -3, color: '#DC2626' },
  { id: 'd2', client: 'Oak Tree Consulting', type: 'Annual Accounts', days: 5, color: '#D97706' },
  { id: 'd3', client: 'Meridian Designs', type: 'VAT Q1', days: 9, color: '#D97706' },
  { id: 'd4', client: 'Harlow & Sons', type: 'VAT Q1', days: 18, color: '#6B7280' },
];
