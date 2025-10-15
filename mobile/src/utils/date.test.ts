/**
 * Date Utility Tests
 */

import {
  formatDate,
  formatDateKorean,
  formatRelativeTime,
  getStartOfDay,
  getEndOfDay,
  getWeekKey,
  getWeekDateRange,
  isSameDay,
  getTodayString,
} from './date';

describe('Date Utilities', () => {
  describe('formatDate()', () => {
    it('should format Date object to YYYY-MM-DD', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const formatted = formatDate(date);
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should format ISO string to YYYY-MM-DD', () => {
      const dateStr = '2024-01-15T10:30:00Z';
      const formatted = formatDate(dateStr);
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should pad single-digit months and days', () => {
      const date = new Date('2024-01-05T00:00:00Z');
      const formatted = formatDate(date);
      expect(formatted).toContain('-01-');
      expect(formatted).toContain('-05');
    });
  });

  describe('formatDateKorean()', () => {
    it('should format date to Korean format', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const formatted = formatDateKorean(date);
      expect(formatted).toContain('년');
      expect(formatted).toContain('월');
      expect(formatted).toContain('일');
    });

    it('should format ISO string to Korean format', () => {
      const dateStr = '2024-01-15T10:30:00Z';
      const formatted = formatDateKorean(dateStr);
      expect(formatted).toContain('2024년');
      expect(formatted).toContain('월');
      expect(formatted).toContain('일');
    });
  });

  describe('formatRelativeTime()', () => {
    it('should return "방금 전" for recent timestamps', () => {
      const now = new Date();
      const result = formatRelativeTime(now);
      expect(result).toBe('방금 전');
    });

    it('should return minutes for timestamps within an hour', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const result = formatRelativeTime(fiveMinutesAgo);
      expect(result).toContain('분 전');
    });

    it('should return hours for timestamps within a day', () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
      const result = formatRelativeTime(threeHoursAgo);
      expect(result).toContain('시간 전');
    });

    it('should return days for timestamps within a week', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const result = formatRelativeTime(threeDaysAgo);
      expect(result).toContain('일 전');
    });

    it('should return formatted date for old timestamps', () => {
      const longAgo = new Date('2023-01-01T00:00:00Z');
      const result = formatRelativeTime(longAgo);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('getStartOfDay()', () => {
    it('should return start of day with time 00:00:00', () => {
      const date = new Date('2024-01-15T15:30:45.123Z');
      const start = getStartOfDay(date);
      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
      expect(start.getSeconds()).toBe(0);
      expect(start.getMilliseconds()).toBe(0);
    });

    it('should use current date if no argument provided', () => {
      const start = getStartOfDay();
      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
      expect(start.getSeconds()).toBe(0);
    });

    it('should handle ISO string input', () => {
      const dateStr = '2024-01-15T15:30:45.123Z';
      const start = getStartOfDay(dateStr);
      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
    });
  });

  describe('getEndOfDay()', () => {
    it('should return end of day with time 23:59:59.999', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const end = getEndOfDay(date);
      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);
      expect(end.getSeconds()).toBe(59);
      expect(end.getMilliseconds()).toBe(999);
    });

    it('should use current date if no argument provided', () => {
      const end = getEndOfDay();
      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);
      expect(end.getSeconds()).toBe(59);
    });

    it('should handle ISO string input', () => {
      const dateStr = '2024-01-15T10:30:00Z';
      const end = getEndOfDay(dateStr);
      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);
    });
  });

  describe('getWeekKey()', () => {
    it('should return week key in YYYY-WW format', () => {
      const date = new Date('2024-01-15T00:00:00Z');
      const weekKey = getWeekKey(date);
      expect(weekKey).toMatch(/^\d{4}-W\d{2}$/);
    });

    it('should return same week key for dates in same week', () => {
      const monday = new Date('2024-01-15T00:00:00Z'); // Monday
      const friday = new Date('2024-01-19T00:00:00Z'); // Friday
      expect(getWeekKey(monday)).toBe(getWeekKey(friday));
    });

    it('should use current date if no argument provided', () => {
      const weekKey = getWeekKey();
      expect(weekKey).toMatch(/^\d{4}-W\d{2}$/);
    });

    it('should handle ISO string input', () => {
      const dateStr = '2024-01-15T00:00:00Z';
      const weekKey = getWeekKey(dateStr);
      expect(weekKey).toMatch(/^\d{4}-W\d{2}$/);
    });
  });

  describe('getWeekDateRange()', () => {
    it('should return start and end dates for week', () => {
      const weekKey = '2024-W03';
      const range = getWeekDateRange(weekKey);

      expect(range.start).toBeInstanceOf(Date);
      expect(range.end).toBeInstanceOf(Date);
      expect(range.start.getTime()).toBeLessThan(range.end.getTime());
    });

    it('should return Monday as start and Sunday as end', () => {
      const weekKey = '2024-W03';
      const range = getWeekDateRange(weekKey);

      // Monday = 1 in getDay()
      expect(range.start.getDay()).toBe(1);
      // Sunday = 0 in getDay()
      expect(range.end.getDay()).toBe(0);
    });

    it('should span exactly 7 days', () => {
      const weekKey = '2024-W03';
      const range = getWeekDateRange(weekKey);

      const daysDiff =
        (range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24);
      expect(daysDiff).toBeCloseTo(6.999, 1); // ~7 days minus 1ms
    });

    it('should be reversible with getWeekKey', () => {
      const originalWeekKey = '2024-W03';
      const range = getWeekDateRange(originalWeekKey);
      const derivedWeekKey = getWeekKey(range.start);

      expect(derivedWeekKey).toBe(originalWeekKey);
    });
  });

  describe('isSameDay()', () => {
    it('should return true for same day dates', () => {
      const date1 = new Date('2024-01-15T10:00:00Z');
      const date2 = new Date('2024-01-15T20:00:00Z');
      expect(isSameDay(date1, date2)).toBe(true);
    });

    it('should return false for different days', () => {
      const date1 = new Date('2024-01-15T23:59:59Z');
      const date2 = new Date('2024-01-16T00:00:01Z');
      expect(isSameDay(date1, date2)).toBe(false);
    });

    it('should handle ISO string inputs', () => {
      const dateStr1 = '2024-01-15T10:00:00Z';
      const dateStr2 = '2024-01-15T20:00:00Z';
      expect(isSameDay(dateStr1, dateStr2)).toBe(true);
    });

    it('should handle mixed Date and string inputs', () => {
      const date = new Date('2024-01-15T10:00:00Z');
      const dateStr = '2024-01-15T20:00:00Z';
      expect(isSameDay(date, dateStr)).toBe(true);
    });
  });

  describe('getTodayString()', () => {
    it('should return today date in YYYY-MM-DD format', () => {
      const today = getTodayString();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should match formatDate of current date', () => {
      const today = getTodayString();
      const expected = formatDate(new Date());
      expect(today).toBe(expected);
    });
  });
});
