// Tests for full-text search functionality

import * as SQLite from 'expo-sqlite';
import { initializeSchema } from './schema';
import {
  searchNotes,
  saveSearchHistory,
  getSearchHistory,
  clearSearchHistory,
  getSearchSuggestions,
  countSearchResults,
} from './search';
import { TABLE_NOTES } from '@/constants/database';

describe('Search Functions', () => {
  let db: SQLite.SQLiteDatabase;

  beforeEach(async () => {
    // Create in-memory database for testing
    db = await SQLite.openDatabaseAsync(':memory:');
    await initializeSchema(db);

    // Insert test notes
    const testNotes = [
      {
        id: '01234567-89ab-cdef-0123-456789abcde1',
        body: 'Learn React Native and Expo for mobile development',
        importance: 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '01234567-89ab-cdef-0123-456789abcde2',
        body: 'Study TypeScript advanced patterns and best practices',
        importance: 2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '01234567-89ab-cdef-0123-456789abcde3',
        body: 'Build offline-first app with SQLite and React Native',
        importance: 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '01234567-89ab-cdef-0123-456789abcde4',
        body: 'Implement full-text search with FTS5',
        importance: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '01234567-89ab-cdef-0123-456789abcde5',
        body: 'This note is deleted and should not appear in search',
        importance: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: new Date().toISOString(),
      },
    ];

    for (const note of testNotes) {
      await db.runAsync(
        `INSERT INTO ${TABLE_NOTES} (id, body, importance, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          note.id,
          note.body,
          note.importance,
          note.created_at,
          note.updated_at,
          note.deleted_at || null,
        ]
      );
    }
  });

  afterEach(async () => {
    await db.closeAsync();
  });

  describe('searchNotes', () => {
    it('should find notes matching single word', async () => {
      const results = await searchNotes('React');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.note.body.includes('React'))).toBe(true);
    });

    it('should find notes matching multiple words', async () => {
      const results = await searchNotes('React Native');
      expect(results.length).toBeGreaterThan(0);
      expect(
        results.every((r) => r.note.body.includes('React') || r.note.body.includes('Native'))
      ).toBe(true);
    });

    it('should return empty array for empty query', async () => {
      const results = await searchNotes('');
      expect(results).toEqual([]);
    });

    it('should return empty array for whitespace-only query', async () => {
      const results = await searchNotes('   ');
      expect(results).toEqual([]);
    });

    it('should not include deleted notes', async () => {
      const results = await searchNotes('deleted');
      expect(results.length).toBe(0);
    });

    it('should return results with snippets', async () => {
      const results = await searchNotes('React');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].snippet).toBeDefined();
      expect(typeof results[0].snippet).toBe('string');
    });

    it('should include rank in results', async () => {
      const results = await searchNotes('React');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].rank).toBeDefined();
      expect(typeof results[0].rank).toBe('number');
    });

    it('should respect limit parameter', async () => {
      const results = await searchNotes('React', 1);
      expect(results.length).toBeLessThanOrEqual(1);
    });

    it('should return results ordered by rank', async () => {
      const results = await searchNotes('React Native');
      expect(results.length).toBeGreaterThan(0);

      // Check that ranks are in descending order (lower rank = better match)
      for (let i = 1; i < results.length; i++) {
        expect(results[i].rank).toBeGreaterThanOrEqual(results[i - 1].rank);
      }
    });

    it('should handle special characters in query', async () => {
      await expect(searchNotes('React-Native')).resolves.not.toThrow();
    });

    it('should be case-insensitive', async () => {
      const results1 = await searchNotes('react');
      const results2 = await searchNotes('REACT');
      const results3 = await searchNotes('React');

      expect(results1.length).toBe(results2.length);
      expect(results2.length).toBe(results3.length);
    });
  });

  describe('saveSearchHistory', () => {
    it('should save search query to history', async () => {
      await saveSearchHistory('React Native');
      const history = await getSearchHistory();
      expect(history).toContain('React Native');
    });

    it('should trim whitespace from query', async () => {
      await saveSearchHistory('  React Native  ');
      const history = await getSearchHistory();
      expect(history).toContain('React Native');
    });

    it('should not save empty query', async () => {
      await saveSearchHistory('');
      const history = await getSearchHistory();
      expect(history.length).toBe(0);
    });

    it('should not save whitespace-only query', async () => {
      await saveSearchHistory('   ');
      const history = await getSearchHistory();
      expect(history.length).toBe(0);
    });

    it('should maintain history limit', async () => {
      // Save more than MAX_SEARCH_HISTORY queries
      for (let i = 0; i < 60; i++) {
        await saveSearchHistory(`Query ${i}`);
      }

      const history = await getSearchHistory(100);
      expect(history.length).toBeLessThanOrEqual(50); // MAX_SEARCH_HISTORY
    });
  });

  describe('getSearchHistory', () => {
    beforeEach(async () => {
      await saveSearchHistory('React');
      await saveSearchHistory('TypeScript');
      await saveSearchHistory('SQLite');
    });

    it('should return recent search history', async () => {
      const history = await getSearchHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    it('should return history in reverse chronological order', async () => {
      const history = await getSearchHistory();
      expect(history[0]).toBe('SQLite'); // Most recent
      expect(history[1]).toBe('TypeScript');
      expect(history[2]).toBe('React');
    });

    it('should respect limit parameter', async () => {
      const history = await getSearchHistory(2);
      expect(history.length).toBe(2);
    });

    it('should return empty array when no history', async () => {
      await clearSearchHistory();
      const history = await getSearchHistory();
      expect(history).toEqual([]);
    });

    it('should return distinct queries', async () => {
      await saveSearchHistory('React');
      await saveSearchHistory('React');
      const history = await getSearchHistory();

      const uniqueQueries = new Set(history);
      expect(history.length).toBe(uniqueQueries.size);
    });
  });

  describe('clearSearchHistory', () => {
    beforeEach(async () => {
      await saveSearchHistory('React');
      await saveSearchHistory('TypeScript');
    });

    it('should clear all search history', async () => {
      await clearSearchHistory();
      const history = await getSearchHistory();
      expect(history).toEqual([]);
    });
  });

  describe('getSearchSuggestions', () => {
    beforeEach(async () => {
      await saveSearchHistory('React Native');
      await saveSearchHistory('React Query');
      await saveSearchHistory('TypeScript');
      await saveSearchHistory('Redux');
    });

    it('should return suggestions matching prefix', async () => {
      const suggestions = await getSearchSuggestions('React');
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.every((s) => s.startsWith('React'))).toBe(true);
    });

    it('should return empty array for empty query', async () => {
      const suggestions = await getSearchSuggestions('');
      expect(suggestions).toEqual([]);
    });

    it('should return empty array for no matches', async () => {
      const suggestions = await getSearchSuggestions('Nonexistent');
      expect(suggestions).toEqual([]);
    });

    it('should respect limit parameter', async () => {
      const suggestions = await getSearchSuggestions('React', 1);
      expect(suggestions.length).toBeLessThanOrEqual(1);
    });

    it('should return suggestions in reverse chronological order', async () => {
      const suggestions = await getSearchSuggestions('React');
      expect(suggestions[0]).toBe('React Query'); // Most recent
    });
  });

  describe('countSearchResults', () => {
    it('should count matching notes', async () => {
      const count = await countSearchResults('React');
      expect(count).toBeGreaterThan(0);
    });

    it('should return 0 for empty query', async () => {
      const count = await countSearchResults('');
      expect(count).toBe(0);
    });

    it('should return 0 for no matches', async () => {
      const count = await countSearchResults('NonexistentKeyword');
      expect(count).toBe(0);
    });

    it('should not count deleted notes', async () => {
      const count = await countSearchResults('deleted');
      expect(count).toBe(0);
    });

    it('should match searchNotes result count', async () => {
      const results = await searchNotes('React', 100);
      const count = await countSearchResults('React');
      expect(count).toBe(results.length);
    });
  });

  describe('FTS5 Integration', () => {
    it('should automatically update FTS index on insert', async () => {
      const newNote = {
        id: '01234567-89ab-cdef-0123-456789abcde6',
        body: 'New note about GraphQL and Apollo',
        importance: 2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await db.runAsync(
        `INSERT INTO ${TABLE_NOTES} (id, body, importance, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        [newNote.id, newNote.body, newNote.importance, newNote.created_at, newNote.updated_at]
      );

      const results = await searchNotes('GraphQL');
      expect(results.length).toBe(1);
      expect(results[0].note.id).toBe(newNote.id);
    });

    it('should automatically update FTS index on update', async () => {
      const noteId = '01234567-89ab-cdef-0123-456789abcde1';

      await db.runAsync(
        `UPDATE ${TABLE_NOTES}
         SET body = ?, updated_at = ?
         WHERE id = ?`,
        ['Updated note about Vue.js framework', new Date().toISOString(), noteId]
      );

      const results = await searchNotes('Vue');
      expect(results.length).toBe(1);
      expect(results[0].note.id).toBe(noteId);

      // Original content should no longer be found
      const oldResults = await searchNotes('Learn React');
      expect(oldResults.some((r) => r.note.id === noteId)).toBe(false);
    });

    it('should automatically update FTS index on delete', async () => {
      const noteId = '01234567-89ab-cdef-0123-456789abcde1';

      await db.runAsync(`DELETE FROM ${TABLE_NOTES} WHERE id = ?`, [noteId]);

      const results = await searchNotes('React');
      expect(results.some((r) => r.note.id === noteId)).toBe(false);
    });
  });
});
