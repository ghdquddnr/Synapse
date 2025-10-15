// Tests for database schema creation

import * as SQLite from 'expo-sqlite';
import {
  applyPragmaSettings,
  createTables,
  createFTSTables,
  createIndexes,
  initializeSchema,
  verifySchema,
  dropAllTables,
} from './schema';
import {
  TABLE_NOTES,
  TABLE_KEYWORDS,
  TABLE_NOTE_KEYWORDS,
  TABLE_RELATIONS,
  TABLE_REFLECTIONS,
  TABLE_WEEKLY_REPORTS,
  TABLE_CHANGE_LOG,
  TABLE_SYNC_STATE,
  TABLE_SEARCH_HISTORY,
  TABLE_NOTES_FTS,
} from '@/constants/database';

describe('Database Schema', () => {
  let db: SQLite.SQLiteDatabase;

  beforeEach(async () => {
    // Create in-memory database for testing
    db = await SQLite.openDatabaseAsync(':memory:');
  });

  afterEach(async () => {
    await db.closeAsync();
  });

  describe('applyPragmaSettings', () => {
    it('should apply PRAGMA settings without errors', async () => {
      await expect(applyPragmaSettings(db)).resolves.not.toThrow();
    });

    it('should set journal_mode to WAL', async () => {
      await applyPragmaSettings(db);
      const result = await db.getFirstAsync<{ journal_mode: string }>(
        'PRAGMA journal_mode'
      );
      expect(result?.journal_mode).toBe('wal');
    });

    it('should enable foreign keys', async () => {
      await applyPragmaSettings(db);
      const result = await db.getFirstAsync<{ foreign_keys: number }>(
        'PRAGMA foreign_keys'
      );
      expect(result?.foreign_keys).toBe(1);
    });
  });

  describe('createTables', () => {
    it('should create all tables without errors', async () => {
      await expect(createTables(db)).resolves.not.toThrow();
    });

    it('should create notes table with correct structure', async () => {
      await createTables(db);
      const result = await db.getAllAsync<{ name: string }>(
        `PRAGMA table_info(${TABLE_NOTES})`
      );
      const columnNames = result.map((col) => col.name);

      expect(columnNames).toContain('id');
      expect(columnNames).toContain('body');
      expect(columnNames).toContain('importance');
      expect(columnNames).toContain('source_url');
      expect(columnNames).toContain('image_path');
      expect(columnNames).toContain('created_at');
      expect(columnNames).toContain('updated_at');
      expect(columnNames).toContain('deleted_at');
      expect(columnNames).toContain('server_timestamp');
    });

    it('should create keywords table', async () => {
      await createTables(db);
      const result = await db.getFirstAsync<{ name: string }>(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='${TABLE_KEYWORDS}'`
      );
      expect(result?.name).toBe(TABLE_KEYWORDS);
    });

    it('should create note_keywords table with foreign keys', async () => {
      await createTables(db);
      const result = await db.getAllAsync<{ table: string }>(
        `PRAGMA foreign_key_list(${TABLE_NOTE_KEYWORDS})`
      );
      expect(result.length).toBe(2); // Should have 2 foreign keys
    });

    it('should create relations table', async () => {
      await createTables(db);
      const result = await db.getFirstAsync<{ name: string }>(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='${TABLE_RELATIONS}'`
      );
      expect(result?.name).toBe(TABLE_RELATIONS);
    });

    it('should create change_log table', async () => {
      await createTables(db);
      const result = await db.getFirstAsync<{ name: string }>(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='${TABLE_CHANGE_LOG}'`
      );
      expect(result?.name).toBe(TABLE_CHANGE_LOG);
    });
  });

  describe('createFTSTables', () => {
    beforeEach(async () => {
      await createTables(db); // FTS needs notes table to exist
    });

    it('should create FTS5 virtual table', async () => {
      await createFTSTables(db);
      const result = await db.getFirstAsync<{ name: string }>(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='${TABLE_NOTES_FTS}'`
      );
      expect(result?.name).toBe(TABLE_NOTES_FTS);
    });

    it('should create FTS insert trigger', async () => {
      await createFTSTables(db);
      const result = await db.getFirstAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='trigger' AND name='notes_ai'"
      );
      expect(result?.name).toBe('notes_ai');
    });

    it('should create FTS delete trigger', async () => {
      await createFTSTables(db);
      const result = await db.getFirstAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='trigger' AND name='notes_ad'"
      );
      expect(result?.name).toBe('notes_ad');
    });

    it('should create FTS update trigger', async () => {
      await createFTSTables(db);
      const result = await db.getFirstAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='trigger' AND name='notes_au'"
      );
      expect(result?.name).toBe('notes_au');
    });
  });

  describe('createIndexes', () => {
    beforeEach(async () => {
      await createTables(db);
    });

    it('should create all indexes without errors', async () => {
      await expect(createIndexes(db)).resolves.not.toThrow();
    });

    it('should create indexes on notes table', async () => {
      await createIndexes(db);
      const result = await db.getAllAsync<{ name: string }>(
        `PRAGMA index_list(${TABLE_NOTES})`
      );
      const indexNames = result.map((idx) => idx.name);

      expect(indexNames.some((name) => name.includes('updated_at'))).toBe(true);
      expect(indexNames.some((name) => name.includes('importance'))).toBe(true);
      expect(indexNames.some((name) => name.includes('deleted'))).toBe(true);
    });
  });

  describe('initializeSchema', () => {
    it('should initialize complete schema', async () => {
      await expect(initializeSchema(db)).resolves.not.toThrow();
    });

    it('should create all required tables', async () => {
      await initializeSchema(db);
      const result = await db.getAllAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      );
      const tableNames = result.map((row) => row.name);

      expect(tableNames).toContain(TABLE_NOTES);
      expect(tableNames).toContain(TABLE_KEYWORDS);
      expect(tableNames).toContain(TABLE_NOTE_KEYWORDS);
      expect(tableNames).toContain(TABLE_RELATIONS);
      expect(tableNames).toContain(TABLE_REFLECTIONS);
      expect(tableNames).toContain(TABLE_WEEKLY_REPORTS);
      expect(tableNames).toContain(TABLE_CHANGE_LOG);
      expect(tableNames).toContain(TABLE_SYNC_STATE);
      expect(tableNames).toContain(TABLE_SEARCH_HISTORY);
      expect(tableNames).toContain(TABLE_NOTES_FTS);
    });
  });

  describe('verifySchema', () => {
    it('should return false for empty database', async () => {
      const isValid = await verifySchema(db);
      expect(isValid).toBe(false);
    });

    it('should return true for fully initialized database', async () => {
      await initializeSchema(db);
      const isValid = await verifySchema(db);
      expect(isValid).toBe(true);
    });

    it('should return false if some tables are missing', async () => {
      await createTables(db);
      // FTS table is missing
      const isValid = await verifySchema(db);
      expect(isValid).toBe(false);
    });
  });

  describe('dropAllTables', () => {
    beforeEach(async () => {
      await initializeSchema(db);
    });

    it('should drop all tables', async () => {
      await dropAllTables(db);
      const result = await db.getAllAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table'"
      );
      // Only sqlite internal tables should remain
      expect(result.length).toBeLessThanOrEqual(1); // sqlite_sequence might remain
    });

    it('should allow re-initialization after dropping', async () => {
      await dropAllTables(db);
      await expect(initializeSchema(db)).resolves.not.toThrow();
      const isValid = await verifySchema(db);
      expect(isValid).toBe(true);
    });
  });

  describe('Data Integrity Constraints', () => {
    beforeEach(async () => {
      await initializeSchema(db);
    });

    it('should enforce importance CHECK constraint on notes', async () => {
      const invalidNote = {
        id: '01234567-89ab-cdef-0123-456789abcdef',
        body: 'Test note',
        importance: 5, // Invalid - must be 1, 2, or 3
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await expect(
        db.runAsync(
          `INSERT INTO ${TABLE_NOTES} (id, body, importance, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
          invalidNote.id,
          invalidNote.body,
          invalidNote.importance,
          invalidNote.created_at,
          invalidNote.updated_at
        )
      ).rejects.toThrow();
    });

    it('should enforce foreign key constraints', async () => {
      await applyPragmaSettings(db);

      // Try to insert note_keyword with non-existent note_id
      await expect(
        db.runAsync(
          `INSERT INTO ${TABLE_NOTE_KEYWORDS} (note_id, keyword_id, weight, source, created_at) VALUES (?, ?, ?, ?, ?)`,
          'non-existent-id',
          1,
          0.5,
          'ai',
          new Date().toISOString()
        )
      ).rejects.toThrow();
    });

    it('should enforce UNIQUE constraint on keywords.name', async () => {
      const keyword = {
        name: 'test-keyword',
        created_at: new Date().toISOString(),
      };

      await db.runAsync(
        `INSERT INTO ${TABLE_KEYWORDS} (name, created_at) VALUES (?, ?)`,
        keyword.name,
        keyword.created_at
      );

      // Try to insert duplicate keyword
      await expect(
        db.runAsync(
          `INSERT INTO ${TABLE_KEYWORDS} (name, created_at) VALUES (?, ?)`,
          keyword.name,
          keyword.created_at
        )
      ).rejects.toThrow();
    });
  });
});
