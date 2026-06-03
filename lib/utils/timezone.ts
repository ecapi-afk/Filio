/**
 * Timezone utilities for consistent date/time handling across the application
 *
 * All dates in the database are stored in UTC (timestamptz)
 * This module provides utilities to convert between UTC and firm timezone
 */

/**
 * Get the start of the current month in the firm's timezone
 * @param timezone IANA timezone identifier (e.g., 'Europe/London', 'America/New_York')
 * @returns Date object representing the start of the month in UTC
 */
export function getMonthStartInTimezone(timezone: string = 'UTC'): Date {
  const now = new Date()

  // Format the date in the firm's timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  const parts = formatter.formatToParts(now)
  const year = parseInt(parts.find(p => p.type === 'year')!.value)
  const month = parseInt(parts.find(p => p.type === 'month')!.value) - 1 // 0-indexed

  // Create a date at midnight in the firm's timezone for the 1st of the month
  const localDateStr = `${year}-${String(month + 1).padStart(2, '0')}-01T00:00:00`

  // Parse this as if it were in the firm's timezone
  const localDate = new Date(localDateStr)
  const utcDate = new Date(localDate.toLocaleString('en-US', { timeZone: 'UTC' }))

  // Get the offset between the two
  const offset = localDate.getTime() - utcDate.getTime()

  // Apply the offset to get the correct UTC time
  return new Date(Date.UTC(year, month, 1) - offset)
}

/**
 * Get the start of today in the firm's timezone
 * @param timezone IANA timezone identifier
 * @returns Date object representing the start of today in UTC
 */
export function getTodayStartInTimezone(timezone: string = 'UTC'): Date {
  const now = new Date()

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  const parts = formatter.formatToParts(now)
  const year = parseInt(parts.find(p => p.type === 'year')!.value)
  const month = parseInt(parts.find(p => p.type === 'month')!.value) - 1
  const day = parseInt(parts.find(p => p.type === 'day')!.value)

  const localDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00`
  const localDate = new Date(localDateStr)
  const utcDate = new Date(localDate.toLocaleString('en-US', { timeZone: 'UTC' }))
  const offset = localDate.getTime() - utcDate.getTime()

  return new Date(Date.UTC(year, month, day) - offset)
}

/**
 * Get the current date string (YYYY-MM-DD) in the firm's timezone
 */
export function getTodayStrInTimezone(timezone: string = 'Europe/London'): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const year = parts.find(p => p.type === 'year')!.value
  const month = parts.find(p => p.type === 'month')!.value
  const day = parts.find(p => p.type === 'day')!.value
  return `${year}-${month}-${day}`
}

/**
 * Format a date in the firm's timezone
 * @param date Date to format
 * @param timezone IANA timezone identifier
 * @param options Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export function formatDateInTimezone(
  date: Date | string,
  timezone: string = 'UTC',
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date

  return new Intl.DateTimeFormat('en-GB', {
    ...options,
    timeZone: timezone,
  }).format(dateObj)
}

/**
 * Common timezone options for UK accounting firms
 */
export const COMMON_TIMEZONES = [
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Dublin', label: 'Dublin (GMT/IST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'America/New_York', label: 'New York (EST/EDT)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT/AEST)' },
] as const

/**
 * Validate if a timezone string is valid
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone })
    return true
  } catch {
    return false
  }
}

/**
 * Get current year-month string (YYYY-MM) in the firm's timezone
 */
export function getCurrentMonthKeyInTimezone(timezone: string = 'Europe/London'): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit' }).formatToParts(new Date());
  const year = parts.find(p => p.type === 'year')!.value;
  const month = parts.find(p => p.type === 'month')!.value;
  return `${year}-${month}`;
}

/**
 * Get the last N month keys (YYYY-MM) ending with the current month, in the firm's timezone.
 * Returned in chronological order (oldest → newest).
 */
export function getLastNMonthKeys(timezone: string = 'Europe/London', n: number = 10): string[] {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit' })
  const parts = formatter.formatToParts(now)
  const currentYear = parseInt(parts.find(p => p.type === 'year')!.value)
  const currentMonth = parseInt(parts.find(p => p.type === 'month')!.value)

  const keys: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    let month = currentMonth - i
    let year = currentYear
    while (month <= 0) { month += 12; year-- }
    keys.push(`${year}-${String(month).padStart(2, '0')}`)
  }
  return keys
}

/**
 * Get previous year-month string (YYYY-MM) in the firm's timezone
 */
export function getPreviousMonthKeyInTimezone(timezone: string = 'Europe/London'): string {
  const now = new Date();
  
  // Create a date corresponding to the middle of the previous month
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find(p => p.type === 'year')!.value);
  const month = parseInt(parts.find(p => p.type === 'month')!.value);
  
  // Calculate previous month
  let prevMonth = month - 1;
  let prevYear = year;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear -= 1;
  }
  
  return `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
}
