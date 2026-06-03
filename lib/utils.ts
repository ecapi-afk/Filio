import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sanitize filename for safe upload to Xero and other cloud storage.
 * - Removes characters that are problematic for Xero API: < > : " / \ | ? * @ # ^ & + = ( )
 * - Replaces spaces with underscores
 * - Keeps Unicode characters (including Chinese)
 * - Trims leading/trailing dots and spaces
 * - Limits length to 200 characters (Xero limit is typically 255)
 */
export function sanitizeFilename(filename: string): string {
  return filename
    // Replace spaces with underscores
    .replace(/\s+/g, '_')
    // Remove problematic characters for Xero/cloud storage (including parentheses per Xero API docs)
    .replace(/[<>:"|?*@#^&+=()]/g, '')
    // Remove leading/trailing dots and spaces
    .replace(/^[._\s]+|[._\s]+$/g, '')
    // Limit length to 200 characters (leaving room for extension)
    .substring(0, 200)
}

export function formatRelativeTime(isoString: string | null | undefined): string {
  if (!isoString) return 'Never';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins === 1) return '1 minute ago';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
