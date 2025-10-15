/**
 * Reflection Database Operations
 *
 * Provides CRUD operations for reflections (daily one-liners).
 * Each reflection is uniquely identified by date (YYYY-MM-DD).
 */

import { getDatabase } from './connection';
import type { Reflection } from '@/types';
import { DatabaseError } from '@/types/database';

/**
 * Create a new reflection for a specific date
 * @param content - Reflection content (one-liner)
 * @param date - Date in YYYY-MM-DD format
 * @returns Created reflection
 * @throws DatabaseError if date already has a reflection
 */
export async function createReflection(
  content: string,
  date: string
): Promise<Reflection> {
  const db = await getDatabase();

  if (!content?.trim()) {
    throw new DatabaseError('Reflection content cannot be empty', 'VALIDATION_ERROR');
  }

  if (!isValidDate(date)) {
    throw new DatabaseError('Invalid date format. Expected YYYY-MM-DD', 'VALIDATION_ERROR');
  }

  // Check if reflection already exists for this date
  const existing = await getReflection(date);
  if (existing) {
    throw new DatabaseError(
      `Reflection already exists for date ${date}`,
      'DUPLICATE_ERROR'
    );
  }

  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO reflections (date, content, created_at, updated_at)
     VALUES (?, ?, ?, ?)`,
    [date, content.trim(), now, now]
  );

  // TODO: Record change log for sync (Phase 2.8)
  // await logChange('reflection', date, 'insert', { date, content });

  const reflection = await getReflection(date);
  if (!reflection) {
    throw new DatabaseError('Failed to retrieve created reflection', 'UNKNOWN_ERROR');
  }

  return reflection;
}

/**
 * Get reflection for a specific date
 * @param date - Date in YYYY-MM-DD format
 * @returns Reflection or null if not found
 */
export async function getReflection(date: string): Promise<Reflection | null> {
  const db = await getDatabase();

  if (!isValidDate(date)) {
    throw new DatabaseError('Invalid date format. Expected YYYY-MM-DD', 'VALIDATION_ERROR');
  }

  const result = await db.getFirstAsync<Reflection>(
    'SELECT date, content, created_at, updated_at FROM reflections WHERE date = ?',
    [date]
  );

  return result || null;
}

/**
 * Update reflection content for a specific date
 * @param date - Date in YYYY-MM-DD format
 * @param content - New reflection content
 * @returns Updated reflection
 * @throws DatabaseError if reflection not found
 */
export async function updateReflection(
  date: string,
  content: string
): Promise<Reflection> {
  const db = await getDatabase();

  if (!content?.trim()) {
    throw new DatabaseError('Reflection content cannot be empty', 'VALIDATION_ERROR');
  }

  if (!isValidDate(date)) {
    throw new DatabaseError('Invalid date format. Expected YYYY-MM-DD', 'VALIDATION_ERROR');
  }

  // Check if reflection exists
  const existing = await getReflection(date);
  if (!existing) {
    throw new DatabaseError(`Reflection not found for date ${date}`, 'NOT_FOUND');
  }

  const now = new Date().toISOString();

  const result = await db.runAsync(
    'UPDATE reflections SET content = ?, updated_at = ? WHERE date = ?',
    [content.trim(), now, date]
  );

  if (result.changes === 0) {
    throw new DatabaseError(`Failed to update reflection for date ${date}`, 'UNKNOWN_ERROR');
  }

  // TODO: Record change log for sync (Phase 2.8)
  // await logChange('reflection', date, 'update', { date, content });

  const updated = await getReflection(date);
  if (!updated) {
    throw new DatabaseError('Failed to retrieve updated reflection', 'UNKNOWN_ERROR');
  }

  return updated;
}

/**
 * Delete reflection for a specific date
 * @param date - Date in YYYY-MM-DD format
 * @throws DatabaseError if reflection not found
 */
export async function deleteReflection(date: string): Promise<void> {
  const db = await getDatabase();

  if (!isValidDate(date)) {
    throw new DatabaseError('Invalid date format. Expected YYYY-MM-DD', 'VALIDATION_ERROR');
  }

  // Check if reflection exists
  const existing = await getReflection(date);
  if (!existing) {
    throw new DatabaseError(`Reflection not found for date ${date}`, 'NOT_FOUND');
  }

  const result = await db.runAsync('DELETE FROM reflections WHERE date = ?', [date]);

  if (result.changes === 0) {
    throw new DatabaseError(`Failed to delete reflection for date ${date}`, 'UNKNOWN_ERROR');
  }

  // TODO: Record change log for sync (Phase 2.8)
  // await logChange('reflection', date, 'delete', { date });
}

/**
 * Get all reflections within a date range
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @returns Array of reflections ordered by date descending
 */
export async function getReflectionsByRange(
  startDate: string,
  endDate: string
): Promise<Reflection[]> {
  const db = await getDatabase();

  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    throw new DatabaseError(
      'Invalid date format. Expected YYYY-MM-DD for both dates',
      'VALIDATION_ERROR'
    );
  }

  if (startDate > endDate) {
    throw new DatabaseError('Start date must be before or equal to end date', 'VALIDATION_ERROR');
  }

  const results = await db.getAllAsync<Reflection>(
    `SELECT date, content, created_at, updated_at
     FROM reflections
     WHERE date BETWEEN ? AND ?
     ORDER BY date DESC`,
    [startDate, endDate]
  );

  return results;
}

/**
 * Get weekly keywords aggregated from note_keywords table
 * @param weekKey - Week key in YYYY-WW format (ISO week number)
 * @returns Array of keywords with counts, ordered by count descending
 */
export async function getWeeklyKeywords(
  weekKey: string
): Promise<Array<{ name: string; count: number }>> {
  const db = await getDatabase();

  if (!isValidWeekKey(weekKey)) {
    throw new DatabaseError('Invalid week key format. Expected YYYY-WW', 'VALIDATION_ERROR');
  }

  // Convert week key to date range (Monday to Sunday)
  const { startDate, endDate } = weekKeyToDateRange(weekKey);

  const results = await db.getAllAsync<{ name: string; count: number }>(
    `SELECT k.name, COUNT(*) as count
     FROM keywords k
     INNER JOIN note_keywords nk ON k.id = nk.keyword_id
     INNER JOIN notes n ON nk.note_id = n.id
     WHERE n.created_at BETWEEN ? AND ?
       AND n.deleted_at IS NULL
     GROUP BY k.name
     ORDER BY count DESC`,
    [startDate, endDate]
  );

  return results;
}

/**
 * Get total count of reflections
 * @returns Total number of reflections
 */
export async function getReflectionCount(): Promise<number> {
  const db = await getDatabase();

  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM reflections'
  );

  return result?.count ?? 0;
}

/**
 * Get the most recent N reflections
 * @param limit - Maximum number of reflections to return (default: 7)
 * @returns Array of reflections ordered by date descending
 */
export async function getRecentReflections(limit = 7): Promise<Reflection[]> {
  const db = await getDatabase();

  if (limit <= 0) {
    throw new DatabaseError('Limit must be a positive number', 'VALIDATION_ERROR');
  }

  const results = await db.getAllAsync<Reflection>(
    `SELECT date, content, created_at, updated_at
     FROM reflections
     ORDER BY date DESC
     LIMIT ?`,
    [limit]
  );

  return results;
}

// Helper functions

/**
 * Validate date format (YYYY-MM-DD)
 */
function isValidDate(date: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(date)) {
    return false;
  }

  const [year, month, day] = date.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);

  return (
    dateObj.getFullYear() === year &&
    dateObj.getMonth() === month - 1 &&
    dateObj.getDate() === day
  );
}

/**
 * Validate week key format (YYYY-WW)
 */
function isValidWeekKey(weekKey: string): boolean {
  const regex = /^\d{4}-\d{2}$/;
  if (!regex.test(weekKey)) {
    return false;
  }

  const [year, week] = weekKey.split('-').map(Number);
  return year >= 2000 && year <= 2100 && week >= 1 && week <= 53;
}

/**
 * Convert week key (YYYY-WW) to date range (Monday to Sunday)
 * Uses ISO 8601 week date system
 */
function weekKeyToDateRange(weekKey: string): { startDate: string; endDate: string } {
  const [year, week] = weekKey.split('-').map(Number);

  // Get the first day of the year
  const jan4 = new Date(year, 0, 4); // January 4th is always in week 1
  const jan4Day = jan4.getDay() || 7; // Sunday = 7, Monday = 1

  // Find the Monday of week 1
  const week1Monday = new Date(jan4);
  week1Monday.setDate(jan4.getDate() - jan4Day + 1);

  // Calculate the Monday of the target week
  const targetMonday = new Date(week1Monday);
  targetMonday.setDate(week1Monday.getDate() + (week - 1) * 7);

  // Calculate the Sunday of the target week
  const targetSunday = new Date(targetMonday);
  targetSunday.setDate(targetMonday.getDate() + 6);

  const startDate = formatDate(targetMonday);
  const endDate = formatDate(targetSunday);

  return { startDate, endDate };
}

/**
 * Format Date object to YYYY-MM-DD string
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
