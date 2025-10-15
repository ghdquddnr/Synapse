/**
 * Date Utilities
 *
 * Helper functions for date formatting and calculations.
 */

/**
 * Format date to YYYY-MM-DD string
 * @param date - Date object or ISO string
 * @returns Formatted date string
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date to human-readable string (e.g., "2024년 1월 15일")
 * @param date - Date object or ISO string
 * @returns Human-readable date string in Korean
 */
export function formatDateKorean(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${year}년 ${month}월 ${day}일`;
}

/**
 * Format timestamp to relative time (e.g., "방금 전", "5분 전", "3시간 전")
 * @param timestamp - ISO timestamp string or Date object
 * @returns Relative time string in Korean
 */
export function formatRelativeTime(timestamp: Date | string): string {
  const now = new Date();
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return '방금 전';
  } else if (diffMins < 60) {
    return `${diffMins}분 전`;
  } else if (diffHours < 24) {
    return `${diffHours}시간 전`;
  } else if (diffDays < 7) {
    return `${diffDays}일 전`;
  } else {
    return formatDate(date);
  }
}

/**
 * Get start of day (00:00:00)
 * @param date - Date object or ISO string
 * @returns Date object at start of day
 */
export function getStartOfDay(date: Date | string = new Date()): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get end of day (23:59:59.999)
 * @param date - Date object or ISO string
 * @returns Date object at end of day
 */
export function getEndOfDay(date: Date | string = new Date()): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Get week key in ISO 8601 format (YYYY-WW)
 * @param date - Date object or ISO string
 * @returns Week key string (e.g., "2024-W03")
 */
export function getWeekKey(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);

  // ISO 8601 week calculation
  // Week starts on Monday, first week contains Jan 4th
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7; // Monday = 0
  target.setDate(target.getDate() - dayNr + 3); // Thursday of this week
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const firstThursdayDay = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstThursdayDay + 3);

  const weekNumber =
    1 + Math.round((target.getTime() - firstThursday.getTime()) / 604800000);

  return `${target.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

/**
 * Get start and end dates for a given week key
 * @param weekKey - Week key in format YYYY-WW
 * @returns Object with start and end Date objects
 */
export function getWeekDateRange(weekKey: string): {
  start: Date;
  end: Date;
} {
  const [yearStr, weekStr] = weekKey.split('-W');
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekStr, 10);

  // Find first Thursday of the year
  const jan4 = new Date(year, 0, 4);
  const jan4Day = (jan4.getDay() + 6) % 7;
  const firstThursday = new Date(year, 0, 4 - jan4Day + 3);

  // Calculate target Thursday
  const targetThursday = new Date(
    firstThursday.getTime() + (week - 1) * 604800000,
  );

  // Monday of this week
  const monday = new Date(targetThursday);
  monday.setDate(monday.getDate() - 3);
  monday.setHours(0, 0, 0, 0);

  // Sunday of this week
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { start: monday, end: sunday };
}

/**
 * Check if two dates are on the same day (UTC comparison)
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if same day
 */
export function isSameDay(
  date1: Date | string,
  date2: Date | string,
): boolean {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;

  // Compare UTC dates to avoid timezone issues
  return (
    d1.getUTCFullYear() === d2.getUTCFullYear() &&
    d1.getUTCMonth() === d2.getUTCMonth() &&
    d1.getUTCDate() === d2.getUTCDate()
  );
}

/**
 * Get today's date as YYYY-MM-DD string
 * @returns Today's date string
 */
export function getTodayString(): string {
  return formatDate(new Date());
}
