/**
 * UUID Utility Tests
 */

import {
  generateUUIDv7,
  extractTimestampFromUUIDv7,
  isValidUUIDv7,
} from './uuid';

describe('UUID Utilities', () => {
  describe('generateUUIDv7()', () => {
    it('should generate a valid UUIDv7', () => {
      const uuid = generateUUIDv7();
      expect(uuid).toBeTruthy();
      expect(typeof uuid).toBe('string');
      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('should have version 7 in the correct position', () => {
      const uuid = generateUUIDv7();
      const parts = uuid.split('-');
      expect(parts[2][0]).toBe('7');
    });

    it('should have variant bits set correctly', () => {
      const uuid = generateUUIDv7();
      const parts = uuid.split('-');
      const variantChar = parts[3][0].toLowerCase();
      expect(['8', '9', 'a', 'b']).toContain(variantChar);
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = generateUUIDv7();
      const uuid2 = generateUUIDv7();
      expect(uuid1).not.toBe(uuid2);
    });

    it('should generate time-ordered UUIDs', () => {
      const uuid1 = generateUUIDv7();
      // Small delay to ensure different timestamp
      const start = Date.now();
      while (Date.now() - start < 5) {
        // busy wait 5ms
      }
      const uuid2 = generateUUIDv7();

      // UUIDs should be lexicographically ordered due to timestamp prefix
      expect(uuid1 < uuid2).toBe(true);
    });
  });

  describe('extractTimestampFromUUIDv7()', () => {
    it('should extract timestamp from UUIDv7', () => {
      const before = Date.now();
      const uuid = generateUUIDv7();
      const after = Date.now();

      const timestamp = extractTimestampFromUUIDv7(uuid);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    it('should handle UUID with hyphens', () => {
      const uuid = generateUUIDv7();
      const timestamp = extractTimestampFromUUIDv7(uuid);
      expect(typeof timestamp).toBe('number');
      expect(timestamp).toBeGreaterThan(0);
    });

    it('should return consistent timestamp', () => {
      const uuid = generateUUIDv7();
      const timestamp1 = extractTimestampFromUUIDv7(uuid);
      const timestamp2 = extractTimestampFromUUIDv7(uuid);
      expect(timestamp1).toBe(timestamp2);
    });
  });

  describe('isValidUUIDv7()', () => {
    it('should validate correct UUIDv7', () => {
      const uuid = generateUUIDv7();
      expect(isValidUUIDv7(uuid)).toBe(true);
    });

    it('should reject UUID with wrong version', () => {
      const uuid = '01234567-89ab-4def-89ab-0123456789ab'; // Version 4
      expect(isValidUUIDv7(uuid)).toBe(false);
    });

    it('should reject UUID with wrong format', () => {
      expect(isValidUUIDv7('not-a-uuid')).toBe(false);
      expect(isValidUUIDv7('01234567-89ab-7def-89ab')).toBe(false);
      expect(isValidUUIDv7('01234567-89ab-7def-89ab-0123456789ab-extra')).toBe(
        false,
      );
    });

    it('should reject empty string', () => {
      expect(isValidUUIDv7('')).toBe(false);
    });

    it('should reject UUID with invalid variant', () => {
      const uuid = '01234567-89ab-7def-7fab-0123456789ab'; // Variant bit wrong
      expect(isValidUUIDv7(uuid)).toBe(false);
    });

    it('should accept uppercase UUIDs', () => {
      const uuid = generateUUIDv7().toUpperCase();
      expect(isValidUUIDv7(uuid)).toBe(true);
    });

    it('should accept lowercase UUIDs', () => {
      const uuid = generateUUIDv7().toLowerCase();
      expect(isValidUUIDv7(uuid)).toBe(true);
    });
  });
});
