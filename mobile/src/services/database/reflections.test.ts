/**
 * Tests for Reflection Database Operations
 */

import {
  createReflection,
  getReflection,
  updateReflection,
  deleteReflection,
  getReflectionsByRange,
  getWeeklyKeywords,
  getReflectionCount,
  getRecentReflections,
} from './reflections';
import { DatabaseManager, getDatabase } from './connection';
import { initializeSchema } from './schema';
import { DatabaseError } from '@/types/database';

describe('Reflections Database Operations', () => {
  beforeEach(async () => {
    const dbManager = DatabaseManager.getInstance();
    await dbManager.resetDatabase();
    const db = await dbManager.getDatabase();
    await initializeSchema(db);
  });

  afterAll(async () => {
    const dbManager = DatabaseManager.getInstance();
    await dbManager.closeDatabase();
  });

  describe('createReflection', () => {
    it('should create a new reflection', async () => {
      const date = '2025-01-15';
      const content = 'Today I learned about SQLite transactions';

      const reflection = await createReflection(content, date);

      expect(reflection).toMatchObject({
        date,
        content,
      });
      expect(reflection.created_at).toBeDefined();
      expect(reflection.updated_at).toBeDefined();
    });

    it('should trim whitespace from content', async () => {
      const date = '2025-01-15';
      const content = '  Whitespace test  ';

      const reflection = await createReflection(content, date);

      expect(reflection.content).toBe('Whitespace test');
    });

    it('should reject empty content', async () => {
      const date = '2025-01-15';

      await expect(createReflection('', date)).rejects.toThrow(DatabaseError);
      await expect(createReflection('   ', date)).rejects.toThrow(DatabaseError);
    });

    it('should reject invalid date format', async () => {
      const content = 'Valid content';

      await expect(createReflection(content, '2025-1-15')).rejects.toThrow(DatabaseError);
      await expect(createReflection(content, '15-01-2025')).rejects.toThrow(DatabaseError);
      await expect(createReflection(content, '2025/01/15')).rejects.toThrow(DatabaseError);
      await expect(createReflection(content, 'invalid')).rejects.toThrow(DatabaseError);
    });

    it('should reject invalid dates', async () => {
      const content = 'Valid content';

      await expect(createReflection(content, '2025-02-30')).rejects.toThrow(DatabaseError);
      await expect(createReflection(content, '2025-13-01')).rejects.toThrow(DatabaseError);
      await expect(createReflection(content, '2025-00-01')).rejects.toThrow(DatabaseError);
    });

    it('should reject duplicate date', async () => {
      const date = '2025-01-15';
      const content1 = 'First reflection';
      const content2 = 'Second reflection';

      await createReflection(content1, date);

      await expect(createReflection(content2, date)).rejects.toThrow(DatabaseError);
    });

    it('should handle leap year dates', async () => {
      const leapDate = '2024-02-29';
      const content = 'Leap year reflection';

      const reflection = await createReflection(content, leapDate);

      expect(reflection.date).toBe(leapDate);
    });
  });

  describe('getReflection', () => {
    it('should retrieve existing reflection', async () => {
      const date = '2025-01-15';
      const content = 'Test reflection';

      await createReflection(content, date);
      const reflection = await getReflection(date);

      expect(reflection).toMatchObject({
        date,
        content,
      });
    });

    it('should return null for non-existent reflection', async () => {
      const reflection = await getReflection('2025-01-15');

      expect(reflection).toBeNull();
    });

    it('should reject invalid date format', async () => {
      await expect(getReflection('invalid-date')).rejects.toThrow(DatabaseError);
    });
  });

  describe('updateReflection', () => {
    it('should update reflection content', async () => {
      const date = '2025-01-15';
      const originalContent = 'Original content';
      const updatedContent = 'Updated content';

      await createReflection(originalContent, date);
      const reflection = await updateReflection(date, updatedContent);

      expect(reflection.content).toBe(updatedContent);
      expect(reflection.updated_at).not.toBe(reflection.created_at);
    });

    it('should trim whitespace from updated content', async () => {
      const date = '2025-01-15';
      await createReflection('Original', date);

      const reflection = await updateReflection(date, '  Updated  ');

      expect(reflection.content).toBe('Updated');
    });

    it('should reject empty content', async () => {
      const date = '2025-01-15';
      await createReflection('Original', date);

      await expect(updateReflection(date, '')).rejects.toThrow(DatabaseError);
      await expect(updateReflection(date, '   ')).rejects.toThrow(DatabaseError);
    });

    it('should reject non-existent reflection', async () => {
      await expect(updateReflection('2025-01-15', 'New content')).rejects.toThrow(
        DatabaseError
      );
    });

    it('should reject invalid date format', async () => {
      await expect(updateReflection('invalid-date', 'Content')).rejects.toThrow(
        DatabaseError
      );
    });

    it('should preserve created_at timestamp', async () => {
      const date = '2025-01-15';
      const created = await createReflection('Original', date);

      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await updateReflection(date, 'Updated');

      expect(updated.created_at).toBe(created.created_at);
    });
  });

  describe('deleteReflection', () => {
    it('should delete existing reflection', async () => {
      const date = '2025-01-15';
      await createReflection('Test', date);

      await deleteReflection(date);
      const reflection = await getReflection(date);

      expect(reflection).toBeNull();
    });

    it('should reject non-existent reflection', async () => {
      await expect(deleteReflection('2025-01-15')).rejects.toThrow(DatabaseError);
    });

    it('should reject invalid date format', async () => {
      await expect(deleteReflection('invalid-date')).rejects.toThrow(DatabaseError);
    });

    it('should allow re-creating after deletion', async () => {
      const date = '2025-01-15';
      const originalContent = 'Original';
      const newContent = 'New';

      await createReflection(originalContent, date);
      await deleteReflection(date);
      const newReflection = await createReflection(newContent, date);

      expect(newReflection.content).toBe(newContent);
    });
  });

  describe('getReflectionsByRange', () => {
    beforeEach(async () => {
      // Create reflections for a week
      await createReflection('Monday reflection', '2025-01-13');
      await createReflection('Tuesday reflection', '2025-01-14');
      await createReflection('Wednesday reflection', '2025-01-15');
      await createReflection('Thursday reflection', '2025-01-16');
      await createReflection('Friday reflection', '2025-01-17');
      await createReflection('Saturday reflection', '2025-01-18');
      await createReflection('Sunday reflection', '2025-01-19');
    });

    it('should retrieve reflections within date range', async () => {
      const reflections = await getReflectionsByRange('2025-01-14', '2025-01-16');

      expect(reflections).toHaveLength(3);
      expect(reflections[0].date).toBe('2025-01-16'); // Descending order
      expect(reflections[1].date).toBe('2025-01-15');
      expect(reflections[2].date).toBe('2025-01-14');
    });

    it('should return empty array for range with no reflections', async () => {
      const reflections = await getReflectionsByRange('2025-02-01', '2025-02-28');

      expect(reflections).toHaveLength(0);
    });

    it('should include boundary dates', async () => {
      const reflections = await getReflectionsByRange('2025-01-13', '2025-01-19');

      expect(reflections).toHaveLength(7);
    });

    it('should handle single-day range', async () => {
      const reflections = await getReflectionsByRange('2025-01-15', '2025-01-15');

      expect(reflections).toHaveLength(1);
      expect(reflections[0].date).toBe('2025-01-15');
    });

    it('should reject invalid date formats', async () => {
      await expect(getReflectionsByRange('invalid', '2025-01-15')).rejects.toThrow(
        DatabaseError
      );
      await expect(getReflectionsByRange('2025-01-15', 'invalid')).rejects.toThrow(
        DatabaseError
      );
    });

    it('should reject inverted date range', async () => {
      await expect(getReflectionsByRange('2025-01-20', '2025-01-15')).rejects.toThrow(
        DatabaseError
      );
    });

    it('should order by date descending', async () => {
      const reflections = await getReflectionsByRange('2025-01-13', '2025-01-19');

      for (let i = 0; i < reflections.length - 1; i++) {
        expect(reflections[i].date > reflections[i + 1].date).toBe(true);
      }
    });
  });

  describe('getWeeklyKeywords', () => {
    beforeEach(async () => {
      // Create notes with keywords for week 2025-03 (Jan 13-19)
      const db = await getDatabase();

      // Insert notes
      await db.runAsync(
        `INSERT INTO notes (id, body, importance, created_at, updated_at)
         VALUES
           ('note1', 'Learning TypeScript', 2, '2025-01-14T10:00:00Z', '2025-01-14T10:00:00Z'),
           ('note2', 'TypeScript generics', 2, '2025-01-15T10:00:00Z', '2025-01-15T10:00:00Z'),
           ('note3', 'React hooks', 2, '2025-01-16T10:00:00Z', '2025-01-16T10:00:00Z'),
           ('note4', 'TypeScript and React', 2, '2025-01-17T10:00:00Z', '2025-01-17T10:00:00Z')`
      );

      // Insert keywords
      await db.runAsync(
        `INSERT INTO keywords (id, name) VALUES
           ('kw1', 'TypeScript'),
           ('kw2', 'React'),
           ('kw3', 'generics'),
           ('kw4', 'hooks')`
      );

      // Link notes to keywords
      await db.runAsync(
        `INSERT INTO note_keywords (note_id, keyword_id, score) VALUES
           ('note1', 'kw1', 0.9),
           ('note2', 'kw1', 0.8),
           ('note2', 'kw3', 0.7),
           ('note3', 'kw2', 0.9),
           ('note3', 'kw4', 0.8),
           ('note4', 'kw1', 0.85),
           ('note4', 'kw2', 0.75)`
      );
    });

    it('should aggregate keywords for a week', async () => {
      const keywords = await getWeeklyKeywords('2025-03');

      expect(keywords).toHaveLength(4);
      expect(keywords[0]).toEqual({ name: 'TypeScript', count: 3 });
      expect(keywords[1]).toEqual({ name: 'React', count: 2 });
    });

    it('should order keywords by count descending', async () => {
      const keywords = await getWeeklyKeywords('2025-03');

      for (let i = 0; i < keywords.length - 1; i++) {
        expect(keywords[i].count >= keywords[i + 1].count).toBe(true);
      }
    });

    it('should return empty array for week with no notes', async () => {
      const keywords = await getWeeklyKeywords('2025-10');

      expect(keywords).toHaveLength(0);
    });

    it('should exclude deleted notes', async () => {
      const db = await getDatabase();
      await db.runAsync(
        `UPDATE notes SET deleted_at = '2025-01-18T10:00:00Z' WHERE id = 'note1'`
      );

      const keywords = await getWeeklyKeywords('2025-03');

      const typescript = keywords.find((k) => k.name === 'TypeScript');
      expect(typescript?.count).toBe(2); // note2 and note4 only
    });

    it('should reject invalid week key format', async () => {
      await expect(getWeeklyKeywords('invalid')).rejects.toThrow(DatabaseError);
      await expect(getWeeklyKeywords('2025-1')).rejects.toThrow(DatabaseError);
      await expect(getWeeklyKeywords('25-03')).rejects.toThrow(DatabaseError);
    });

    it('should reject invalid week numbers', async () => {
      await expect(getWeeklyKeywords('2025-00')).rejects.toThrow(DatabaseError);
      await expect(getWeeklyKeywords('2025-54')).rejects.toThrow(DatabaseError);
    });

    it('should handle week 01 (start of year)', async () => {
      const db = await getDatabase();
      await db.runAsync(
        `INSERT INTO notes (id, body, importance, created_at, updated_at)
         VALUES ('note5', 'New year', 2, '2025-01-01T10:00:00Z', '2025-01-01T10:00:00Z')`
      );
      await db.runAsync(
        `INSERT INTO note_keywords (note_id, keyword_id, score) VALUES ('note5', 'kw1', 0.9)`
      );

      const keywords = await getWeeklyKeywords('2025-01');

      expect(keywords.length).toBeGreaterThan(0);
    });

    it('should handle week 52-53 (end of year)', async () => {
      const db = await getDatabase();
      await db.runAsync(
        `INSERT INTO notes (id, body, importance, created_at, updated_at)
         VALUES ('note6', 'Year end', 2, '2025-12-29T10:00:00Z', '2025-12-29T10:00:00Z')`
      );
      await db.runAsync(
        `INSERT INTO note_keywords (note_id, keyword_id, score) VALUES ('note6', 'kw1', 0.9)`
      );

      const keywords = await getWeeklyKeywords('2025-52');

      expect(keywords.length).toBeGreaterThan(0);
    });
  });

  describe('getReflectionCount', () => {
    it('should return 0 for empty database', async () => {
      const count = await getReflectionCount();

      expect(count).toBe(0);
    });

    it('should return correct count', async () => {
      await createReflection('First', '2025-01-15');
      await createReflection('Second', '2025-01-16');
      await createReflection('Third', '2025-01-17');

      const count = await getReflectionCount();

      expect(count).toBe(3);
    });

    it('should update count after deletion', async () => {
      await createReflection('First', '2025-01-15');
      await createReflection('Second', '2025-01-16');
      await deleteReflection('2025-01-15');

      const count = await getReflectionCount();

      expect(count).toBe(1);
    });
  });

  describe('getRecentReflections', () => {
    beforeEach(async () => {
      // Create 10 reflections
      for (let i = 1; i <= 10; i++) {
        const date = `2025-01-${String(i).padStart(2, '0')}`;
        await createReflection(`Reflection ${i}`, date);
      }
    });

    it('should return last 7 reflections by default', async () => {
      const reflections = await getRecentReflections();

      expect(reflections).toHaveLength(7);
      expect(reflections[0].date).toBe('2025-01-10'); // Most recent first
      expect(reflections[6].date).toBe('2025-01-04');
    });

    it('should respect custom limit', async () => {
      const reflections = await getRecentReflections(5);

      expect(reflections).toHaveLength(5);
      expect(reflections[0].date).toBe('2025-01-10');
      expect(reflections[4].date).toBe('2025-01-06');
    });

    it('should handle limit greater than total count', async () => {
      const reflections = await getRecentReflections(20);

      expect(reflections).toHaveLength(10);
    });

    it('should order by date descending', async () => {
      const reflections = await getRecentReflections();

      for (let i = 0; i < reflections.length - 1; i++) {
        expect(reflections[i].date > reflections[i + 1].date).toBe(true);
      }
    });

    it('should return empty array when no reflections', async () => {
      const db = await getDatabase();
      await db.runAsync('DELETE FROM reflections');

      const reflections = await getRecentReflections();

      expect(reflections).toHaveLength(0);
    });

    it('should reject non-positive limit', async () => {
      await expect(getRecentReflections(0)).rejects.toThrow(DatabaseError);
      await expect(getRecentReflections(-1)).rejects.toThrow(DatabaseError);
    });
  });

  describe('Edge Cases and Integration', () => {
    it('should handle multiple operations in sequence', async () => {
      const date = '2025-01-15';

      // Create
      const created = await createReflection('Original', date);
      expect(created.content).toBe('Original');

      // Update
      const updated = await updateReflection(date, 'Updated');
      expect(updated.content).toBe('Updated');

      // Retrieve
      const retrieved = await getReflection(date);
      expect(retrieved?.content).toBe('Updated');

      // Delete
      await deleteReflection(date);
      const deleted = await getReflection(date);
      expect(deleted).toBeNull();
    });

    it('should handle unicode content', async () => {
      const date = '2025-01-15';
      const content = '오늘은 좋은 날! 🌟 Today was great!';

      const reflection = await createReflection(content, date);

      expect(reflection.content).toBe(content);
    });

    it('should handle very long content', async () => {
      const date = '2025-01-15';
      const content = 'A'.repeat(10000);

      const reflection = await createReflection(content, date);

      expect(reflection.content).toBe(content);
    });

    it('should maintain data integrity across range queries', async () => {
      await createReflection('Week 1', '2025-01-06');
      await createReflection('Week 2', '2025-01-13');
      await createReflection('Week 3', '2025-01-20');

      const week2 = await getReflectionsByRange('2025-01-13', '2025-01-19');

      expect(week2).toHaveLength(1);
      expect(week2[0].content).toBe('Week 2');
    });

    it('should handle concurrent date ranges', async () => {
      for (let i = 1; i <= 31; i++) {
        const date = `2025-01-${String(i).padStart(2, '0')}`;
        await createReflection(`Day ${i}`, date);
      }

      const firstHalf = await getReflectionsByRange('2025-01-01', '2025-01-15');
      const secondHalf = await getReflectionsByRange('2025-01-16', '2025-01-31');

      expect(firstHalf).toHaveLength(15);
      expect(secondHalf).toHaveLength(16);
    });
  });
});
