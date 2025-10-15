/**
 * Validation Utility Tests
 */

import {
  isValidNoteBody,
  isValidUrl,
  isValidEmail,
  isValidDateString,
  isValidImportance,
  isValidWeekKey,
  sanitizeText,
  isValidUUIDv7,
  isValidReflectionContent,
  isValidRelationType,
} from './validation';

describe('Validation Utilities', () => {
  describe('isValidNoteBody()', () => {
    it('should accept valid note body', () => {
      expect(isValidNoteBody('Valid note')).toBe(true);
    });

    it('should reject empty string', () => {
      expect(isValidNoteBody('')).toBe(false);
    });

    it('should reject whitespace-only string', () => {
      expect(isValidNoteBody('   ')).toBe(false);
    });

    it('should reject body exceeding 5000 characters', () => {
      const longBody = 'a'.repeat(5001);
      expect(isValidNoteBody(longBody)).toBe(false);
    });

    it('should accept body with exactly 5000 characters', () => {
      const maxBody = 'a'.repeat(5000);
      expect(isValidNoteBody(maxBody)).toBe(true);
    });

    it('should trim whitespace before checking', () => {
      expect(isValidNoteBody('  Valid note  ')).toBe(true);
    });
  });

  describe('isValidUrl()', () => {
    it('should accept valid HTTP URL', () => {
      expect(isValidUrl('http://example.com')).toBe(true);
    });

    it('should accept valid HTTPS URL', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
    });

    it('should accept URL with path', () => {
      expect(isValidUrl('https://example.com/path/to/resource')).toBe(true);
    });

    it('should accept URL with query parameters', () => {
      expect(isValidUrl('https://example.com?key=value')).toBe(true);
    });

    it('should reject empty string', () => {
      expect(isValidUrl('')).toBe(false);
    });

    it('should reject invalid URL format', () => {
      expect(isValidUrl('not a url')).toBe(false);
    });

    it('should reject FTP protocol', () => {
      expect(isValidUrl('ftp://example.com')).toBe(false);
    });

    it('should reject file protocol', () => {
      expect(isValidUrl('file:///path/to/file')).toBe(false);
    });

    it('should reject whitespace-only string', () => {
      expect(isValidUrl('   ')).toBe(false);
    });
  });

  describe('isValidEmail()', () => {
    it('should accept valid email', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
    });

    it('should accept email with subdomain', () => {
      expect(isValidEmail('user@mail.example.com')).toBe(true);
    });

    it('should accept email with plus sign', () => {
      expect(isValidEmail('user+tag@example.com')).toBe(true);
    });

    it('should reject email without @', () => {
      expect(isValidEmail('userexample.com')).toBe(false);
    });

    it('should reject email without domain', () => {
      expect(isValidEmail('user@')).toBe(false);
    });

    it('should reject email without TLD', () => {
      expect(isValidEmail('user@example')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidEmail('')).toBe(false);
    });

    it('should reject email with spaces', () => {
      expect(isValidEmail('user name@example.com')).toBe(false);
    });
  });

  describe('isValidDateString()', () => {
    it('should accept valid date string', () => {
      expect(isValidDateString('2024-01-15')).toBe(true);
    });

    it('should reject invalid format', () => {
      expect(isValidDateString('15-01-2024')).toBe(false);
      expect(isValidDateString('2024/01/15')).toBe(false);
      expect(isValidDateString('2024-1-15')).toBe(false);
    });

    it('should reject invalid date', () => {
      expect(isValidDateString('2024-02-30')).toBe(false);
      expect(isValidDateString('2024-13-01')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidDateString('')).toBe(false);
    });

    it('should accept leap year date', () => {
      expect(isValidDateString('2024-02-29')).toBe(true);
    });

    it('should reject non-leap year Feb 29', () => {
      expect(isValidDateString('2023-02-29')).toBe(false);
    });
  });

  describe('isValidImportance()', () => {
    it('should accept importance 1', () => {
      expect(isValidImportance(1)).toBe(true);
    });

    it('should accept importance 2', () => {
      expect(isValidImportance(2)).toBe(true);
    });

    it('should accept importance 3', () => {
      expect(isValidImportance(3)).toBe(true);
    });

    it('should reject importance 0', () => {
      expect(isValidImportance(0)).toBe(false);
    });

    it('should reject importance 4', () => {
      expect(isValidImportance(4)).toBe(false);
    });

    it('should reject negative importance', () => {
      expect(isValidImportance(-1)).toBe(false);
    });
  });

  describe('isValidWeekKey()', () => {
    it('should accept valid week key', () => {
      expect(isValidWeekKey('2024-W01')).toBe(true);
      expect(isValidWeekKey('2024-W52')).toBe(true);
    });

    it('should reject invalid format', () => {
      expect(isValidWeekKey('2024-1')).toBe(false);
      expect(isValidWeekKey('2024W01')).toBe(false);
      expect(isValidWeekKey('24-W01')).toBe(false);
    });

    it('should reject week 0', () => {
      expect(isValidWeekKey('2024-W00')).toBe(false);
    });

    it('should reject week > 53', () => {
      expect(isValidWeekKey('2024-W54')).toBe(false);
    });

    it('should accept week 53', () => {
      expect(isValidWeekKey('2024-W53')).toBe(true);
    });

    it('should reject empty string', () => {
      expect(isValidWeekKey('')).toBe(false);
    });
  });

  describe('sanitizeText()', () => {
    it('should trim whitespace', () => {
      expect(sanitizeText('  text  ')).toBe('text');
    });

    it('should remove control characters', () => {
      const textWithControl = 'hello\x00\x01world';
      expect(sanitizeText(textWithControl)).toBe('helloworld');
    });

    it('should preserve newlines', () => {
      expect(sanitizeText('line1\nline2')).toBe('line1\nline2');
    });

    it('should preserve tabs', () => {
      expect(sanitizeText('col1\tcol2')).toBe('col1\tcol2');
    });

    it('should handle empty string', () => {
      expect(sanitizeText('')).toBe('');
    });

    it('should handle already clean text', () => {
      expect(sanitizeText('clean text')).toBe('clean text');
    });
  });

  describe('isValidUUIDv7()', () => {
    it('should accept valid UUIDv7', () => {
      const uuid = '01234567-89ab-7def-89ab-0123456789ab';
      expect(isValidUUIDv7(uuid)).toBe(true);
    });

    it('should reject UUID with wrong version', () => {
      const uuid = '01234567-89ab-4def-89ab-0123456789ab'; // Version 4
      expect(isValidUUIDv7(uuid)).toBe(false);
    });

    it('should reject invalid format', () => {
      expect(isValidUUIDv7('not-a-uuid')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidUUIDv7('')).toBe(false);
    });

    it('should accept uppercase UUID', () => {
      const uuid = '01234567-89AB-7DEF-89AB-0123456789AB';
      expect(isValidUUIDv7(uuid)).toBe(true);
    });

    it('should accept lowercase UUID', () => {
      const uuid = '01234567-89ab-7def-89ab-0123456789ab';
      expect(isValidUUIDv7(uuid)).toBe(true);
    });
  });

  describe('isValidReflectionContent()', () => {
    it('should accept valid reflection content', () => {
      expect(isValidReflectionContent('오늘의 회고')).toBe(true);
    });

    it('should reject empty string', () => {
      expect(isValidReflectionContent('')).toBe(false);
    });

    it('should reject whitespace-only string', () => {
      expect(isValidReflectionContent('   ')).toBe(false);
    });

    it('should reject content exceeding 500 characters', () => {
      const longContent = 'a'.repeat(501);
      expect(isValidReflectionContent(longContent)).toBe(false);
    });

    it('should accept content with exactly 500 characters', () => {
      const maxContent = 'a'.repeat(500);
      expect(isValidReflectionContent(maxContent)).toBe(true);
    });

    it('should trim whitespace before checking', () => {
      expect(isValidReflectionContent('  Valid reflection  ')).toBe(true);
    });
  });

  describe('isValidRelationType()', () => {
    it('should accept "related" type', () => {
      expect(isValidRelationType('related')).toBe(true);
    });

    it('should accept "causes" type', () => {
      expect(isValidRelationType('causes')).toBe(true);
    });

    it('should accept "caused_by" type', () => {
      expect(isValidRelationType('caused_by')).toBe(true);
    });

    it('should accept "references" type', () => {
      expect(isValidRelationType('references')).toBe(true);
    });

    it('should reject invalid type', () => {
      expect(isValidRelationType('invalid')).toBe(false);
      expect(isValidRelationType('links_to')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidRelationType('')).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(isValidRelationType('Related')).toBe(false);
      expect(isValidRelationType('CAUSES')).toBe(false);
    });
  });
});
