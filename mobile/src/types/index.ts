// Core entity types for Synapse mobile app

export interface Note {
  id: string; // UUIDv7
  body: string;
  importance: 1 | 2 | 3;
  source_url?: string;
  image_path?: string;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  deleted_at?: string; // ISO 8601, soft delete
  server_timestamp?: string; // From server after sync
}

export interface Keyword {
  id: number;
  name: string;
  created_at: string;
}

export interface NoteKeyword {
  note_id: string;
  keyword_id: number;
  score: number; // TF-IDF score
  source: 'ai' | 'manual';
  created_at: string;
}

export interface Relation {
  id: string; // UUIDv7
  from_note_id: string;
  to_note_id: string;
  relation_type: 'related' | 'parent_child' | 'similar' | 'custom';
  rationale?: string;
  source: 'ai' | 'manual';
  created_at: string;
}

export interface Reflection {
  date: string; // YYYY-MM-DD (primary key)
  content: string;
  created_at: string;
  updated_at: string;
}

export interface WeeklyReport {
  id: number;
  week_key: string; // YYYY-WW format
  summary: string;
  top_keywords: string; // JSON array of keywords
  created_at: string;
}

export interface ChangeLogEntry {
  id: number;
  entity_type: string;
  entity_id: string;
  operation: 'insert' | 'update' | 'delete';
  payload: string | Record<string, unknown>; // JSON stringified entity data or parsed object
  priority: number; // Sync priority (1-3, higher = more urgent)
  created_at: string; // ISO 8601
  synced_at: string | null; // ISO 8601, null if not synced
  retry_count: number;
  last_error: string | null;
}

export interface SyncState {
  key: string; // 'checkpoint' or other sync metadata
  value: string;
  updated_at: string;
}

export interface SearchHistoryEntry {
  id: number;
  query: string;
  searched_at: string;
}

export interface SearchResult {
  note: Note;
  snippet: string;
  rank: number;
}

// Input types for creating entities
export interface CreateNoteInput {
  body: string;
  importance: 1 | 2 | 3;
  source_url?: string;
  image_path?: string;
}

export interface UpdateNoteInput {
  body?: string;
  importance?: 1 | 2 | 3;
  source_url?: string;
  image_path?: string;
}

export interface CreateRelationInput {
  from_note_id: string;
  to_note_id: string;
  relation_type?: 'related' | 'parent_child' | 'similar' | 'custom';
  rationale?: string;
  source?: 'ai' | 'manual';
}

// Filter types
export interface NoteFilters {
  importance?: 1 | 2 | 3;
  start_date?: string;
  end_date?: string;
  include_deleted?: boolean;
  limit?: number;
  offset?: number;
}

// Search result type
export interface SearchResult {
  note: Note;
  snippet: string; // Highlighted snippet
  rank: number; // FTS5 rank
}
