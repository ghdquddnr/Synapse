/**
 * Validation Utilities
 *
 * Helper functions for data validation.
 */

/**
 * Validate note body length
 * @param body - Note body text
 * @returns True if valid
 */
export function isValidNoteBody(body: string): boolean {
  return body.trim().length > 0 && body.length <= 5000;
}

/**
 * Validate URL format
 * @param url - URL string
 * @returns True if valid URL format
 */
export function isValidUrl(url: string): boolean {
  if (!url || url.trim().length === 0) {
    return false;
  }

  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate email format
 * @param email - Email string
 * @returns True if valid email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate date string format (YYYY-MM-DD)
 * @param dateStr - Date string
 * @returns True if valid date format
 */
export function isValidDateString(dateStr: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) {
    return false;
  }

  // Parse parts manually to avoid timezone issues
  const [year, month, day] = dateStr.split('-').map(Number);

  // Check month validity
  if (month < 1 || month > 12) {
    return false;
  }

  // Check day validity based on month
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  // Leap year check
  const isLeapYear =
    (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  if (isLeapYear && month === 2) {
    daysInMonth[1] = 29;
  }

  return day >= 1 && day <= daysInMonth[month - 1];
}

/**
 * Validate importance value (1, 2, or 3)
 * @param importance - Importance number
 * @returns True if valid importance
 */
export function isValidImportance(importance: number): boolean {
  return [1, 2, 3].includes(importance);
}

/**
 * Validate week key format (YYYY-WW)
 * @param weekKey - Week key string
 * @returns True if valid week key format
 */
export function isValidWeekKey(weekKey: string): boolean {
  const weekKeyRegex = /^\d{4}-W\d{2}$/;
  if (!weekKeyRegex.test(weekKey)) {
    return false;
  }

  const [, weekStr] = weekKey.split('-W');
  const week = parseInt(weekStr, 10);
  return week >= 1 && week <= 53;
}

/**
 * Sanitize text input (trim and remove control characters)
 * @param text - Input text
 * @returns Sanitized text
 */
export function sanitizeText(text: string): string {
  // Remove control characters except newline and tab
  return text.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '').trim();
}

/**
 * Validate UUIDv7 format
 * @param uuid - UUID string
 * @returns True if valid UUIDv7
 */
export function isValidUUIDv7(uuid: string): boolean {
  const uuidv7Regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidv7Regex.test(uuid);
}

/**
 * Validate reflection content length
 * @param content - Reflection content
 * @returns True if valid (non-empty and <= 500 chars)
 */
export function isValidReflectionContent(content: string): boolean {
  const trimmed = content.trim();
  return trimmed.length > 0 && trimmed.length <= 500;
}

/**
 * Validate relation type
 * @param relationType - Relation type string
 * @returns True if valid relation type
 */
export function isValidRelationType(relationType: string): boolean {
  const validTypes = ['related', 'causes', 'caused_by', 'references'];
  return validTypes.includes(relationType);
}
