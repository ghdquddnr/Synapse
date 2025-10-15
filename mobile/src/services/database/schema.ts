// SQLite schema definition and creation functions

import * as SQLite from 'expo-sqlite';
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
  IDX_NOTES_UPDATED_AT,
  IDX_NOTES_IMPORTANCE,
  IDX_NOTES_DELETED,
  IDX_CHANGE_LOG_SYNCED,
  IDX_CHANGE_LOG_ENTITY,
  IDX_NOTE_KEYWORDS_NOTE,
  IDX_RELATIONS_FROM,
  IDX_RELATIONS_TO,
} from '@/constants/database';
import { SchemaError } from '@/types/database';

// PRAGMA settings for optimal SQLite performance
const PRAGMA_SETTINGS = [
  'PRAGMA journal_mode=WAL',
  'PRAGMA foreign_keys=ON',
  'PRAGMA cache_size=-64000', // 64MB cache
  'PRAGMA temp_store=MEMORY',
  'PRAGMA synchronous=NORMAL',
];

// Table creation SQL statements
const CREATE_NOTES_TABLE = `
CREATE TABLE IF NOT EXISTS ${TABLE_NOTES} (
  id TEXT PRIMARY KEY NOT NULL,
  body TEXT NOT NULL,
  importance INTEGER NOT NULL CHECK(importance IN (1, 2, 3)),
  source_url TEXT,
  image_path TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  server_timestamp TEXT
)`;

const CREATE_KEYWORDS_TABLE = `
CREATE TABLE IF NOT EXISTS ${TABLE_KEYWORDS} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
)`;

const CREATE_NOTE_KEYWORDS_TABLE = `
CREATE TABLE IF NOT EXISTS ${TABLE_NOTE_KEYWORDS} (
  note_id TEXT NOT NULL,
  keyword_id INTEGER NOT NULL,
  weight REAL NOT NULL,
  source TEXT NOT NULL CHECK(source IN ('ai', 'manual')),
  created_at TEXT NOT NULL,
  PRIMARY KEY (note_id, keyword_id),
  FOREIGN KEY (note_id) REFERENCES ${TABLE_NOTES}(id) ON DELETE CASCADE,
  FOREIGN KEY (keyword_id) REFERENCES ${TABLE_KEYWORDS}(id) ON DELETE CASCADE
)`;

const CREATE_RELATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS ${TABLE_RELATIONS} (
  id TEXT PRIMARY KEY NOT NULL,
  from_note_id TEXT NOT NULL,
  to_note_id TEXT NOT NULL,
  relation_type TEXT NOT NULL CHECK(relation_type IN ('related', 'parent_child', 'similar', 'custom')),
  rationale TEXT,
  source TEXT NOT NULL CHECK(source IN ('ai', 'manual')),
  created_at TEXT NOT NULL,
  FOREIGN KEY (from_note_id) REFERENCES ${TABLE_NOTES}(id) ON DELETE CASCADE,
  FOREIGN KEY (to_note_id) REFERENCES ${TABLE_NOTES}(id) ON DELETE CASCADE,
  UNIQUE(from_note_id, to_note_id, relation_type)
)`;

const CREATE_REFLECTIONS_TABLE = `
CREATE TABLE IF NOT EXISTS ${TABLE_REFLECTIONS} (
  id TEXT PRIMARY KEY NOT NULL,
  content TEXT NOT NULL,
  date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)`;

const CREATE_WEEKLY_REPORTS_TABLE = `
CREATE TABLE IF NOT EXISTS ${TABLE_WEEKLY_REPORTS} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_key TEXT NOT NULL UNIQUE,
  summary TEXT NOT NULL,
  top_keywords TEXT NOT NULL,
  created_at TEXT NOT NULL
)`;

const CREATE_CHANGE_LOG_TABLE = `
CREATE TABLE IF NOT EXISTS ${TABLE_CHANGE_LOG} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL CHECK(entity_type IN ('note', 'relation', 'reflection', 'note_keyword')),
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK(operation IN ('insert', 'update', 'delete')),
  payload TEXT NOT NULL,
  client_timestamp TEXT NOT NULL,
  synced_at TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`;

const CREATE_SYNC_STATE_TABLE = `
CREATE TABLE IF NOT EXISTS ${TABLE_SYNC_STATE} (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
)`;

const CREATE_SEARCH_HISTORY_TABLE = `
CREATE TABLE IF NOT EXISTS ${TABLE_SEARCH_HISTORY} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query TEXT NOT NULL,
  searched_at TEXT NOT NULL
)`;

// FTS5 virtual table for full-text search
const CREATE_NOTES_FTS_TABLE = `
CREATE VIRTUAL TABLE IF NOT EXISTS ${TABLE_NOTES_FTS} USING fts5(
  body,
  content=${TABLE_NOTES},
  content_rowid=rowid,
  tokenize='unicode61 remove_diacritics 2'
)`;

// FTS5 synchronization triggers
const CREATE_FTS_INSERT_TRIGGER = `
CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON ${TABLE_NOTES} BEGIN
  INSERT INTO ${TABLE_NOTES_FTS}(rowid, body) VALUES (new.rowid, new.body);
END`;

const CREATE_FTS_DELETE_TRIGGER = `
CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON ${TABLE_NOTES} BEGIN
  INSERT INTO ${TABLE_NOTES_FTS}(${TABLE_NOTES_FTS}, rowid, body) VALUES('delete', old.rowid, old.body);
END`;

const CREATE_FTS_UPDATE_TRIGGER = `
CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON ${TABLE_NOTES} BEGIN
  INSERT INTO ${TABLE_NOTES_FTS}(${TABLE_NOTES_FTS}, rowid, body) VALUES('delete', old.rowid, old.body);
  INSERT INTO ${TABLE_NOTES_FTS}(rowid, body) VALUES (new.rowid, new.body);
END`;

// Index creation SQL statements
const CREATE_INDEXES = [
  `CREATE INDEX IF NOT EXISTS ${IDX_NOTES_UPDATED_AT} ON ${TABLE_NOTES}(updated_at DESC)`,
  `CREATE INDEX IF NOT EXISTS ${IDX_NOTES_IMPORTANCE} ON ${TABLE_NOTES}(importance DESC)`,
  `CREATE INDEX IF NOT EXISTS ${IDX_NOTES_DELETED} ON ${TABLE_NOTES}(deleted_at)`,
  `CREATE INDEX IF NOT EXISTS ${IDX_CHANGE_LOG_SYNCED} ON ${TABLE_CHANGE_LOG}(synced_at)`,
  `CREATE INDEX IF NOT EXISTS ${IDX_CHANGE_LOG_ENTITY} ON ${TABLE_CHANGE_LOG}(entity_type, entity_id)`,
  `CREATE INDEX IF NOT EXISTS ${IDX_NOTE_KEYWORDS_NOTE} ON ${TABLE_NOTE_KEYWORDS}(note_id)`,
  `CREATE INDEX IF NOT EXISTS ${IDX_RELATIONS_FROM} ON ${TABLE_RELATIONS}(from_note_id)`,
  `CREATE INDEX IF NOT EXISTS ${IDX_RELATIONS_TO} ON ${TABLE_RELATIONS}(to_note_id)`,
];

/**
 * Apply PRAGMA settings to the database
 */
export async function applyPragmaSettings(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    for (const pragma of PRAGMA_SETTINGS) {
      await db.execAsync(pragma);
    }
  } catch (error) {
    throw new SchemaError(
      `Failed to apply PRAGMA settings: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Create all database tables
 */
export async function createTables(db: SQLite.SQLiteDatabase): Promise<void> {
  const tables = [
    CREATE_NOTES_TABLE,
    CREATE_KEYWORDS_TABLE,
    CREATE_NOTE_KEYWORDS_TABLE,
    CREATE_RELATIONS_TABLE,
    CREATE_REFLECTIONS_TABLE,
    CREATE_WEEKLY_REPORTS_TABLE,
    CREATE_CHANGE_LOG_TABLE,
    CREATE_SYNC_STATE_TABLE,
    CREATE_SEARCH_HISTORY_TABLE,
  ];

  try {
    for (const sql of tables) {
      await db.execAsync(sql);
    }
  } catch (error) {
    throw new SchemaError(
      `Failed to create tables: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Create FTS5 virtual table and triggers
 */
export async function createFTSTables(db: SQLite.SQLiteDatabase): Promise<void> {
  const ftsStatements = [
    CREATE_NOTES_FTS_TABLE,
    CREATE_FTS_INSERT_TRIGGER,
    CREATE_FTS_DELETE_TRIGGER,
    CREATE_FTS_UPDATE_TRIGGER,
  ];

  try {
    for (const sql of ftsStatements) {
      await db.execAsync(sql);
    }
  } catch (error) {
    throw new SchemaError(
      `Failed to create FTS tables and triggers: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Create all database indexes
 */
export async function createIndexes(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    for (const sql of CREATE_INDEXES) {
      await db.execAsync(sql);
    }
  } catch (error) {
    throw new SchemaError(
      `Failed to create indexes: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Initialize the complete database schema
 */
export async function initializeSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    await applyPragmaSettings(db);
    await createTables(db);
    await createFTSTables(db);
    await createIndexes(db);
  } catch (error) {
    throw new SchemaError(
      `Failed to initialize database schema: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Verify schema integrity
 */
export async function verifySchema(db: SQLite.SQLiteDatabase): Promise<boolean> {
  try {
    const result = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );

    const tableNames = result.map((row) => row.name);
    const requiredTables = [
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
    ];

    return requiredTables.every((table) => tableNames.includes(table));
  } catch (error) {
    return false;
  }
}

/**
 * Drop all tables (use with caution - for testing only)
 */
export async function dropAllTables(db: SQLite.SQLiteDatabase): Promise<void> {
  const tables = [
    TABLE_NOTES_FTS,
    TABLE_SEARCH_HISTORY,
    TABLE_SYNC_STATE,
    TABLE_CHANGE_LOG,
    TABLE_WEEKLY_REPORTS,
    TABLE_REFLECTIONS,
    TABLE_RELATIONS,
    TABLE_NOTE_KEYWORDS,
    TABLE_KEYWORDS,
    TABLE_NOTES,
  ];

  try {
    for (const table of tables) {
      await db.execAsync(`DROP TABLE IF EXISTS ${table}`);
    }
  } catch (error) {
    throw new SchemaError(
      `Failed to drop tables: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : undefined
    );
  }
}
