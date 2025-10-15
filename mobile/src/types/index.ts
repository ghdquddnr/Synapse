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
  weight: number; // TF-IDF score
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
  id: string; // UUIDv7
  content: string;
  date: string; // YYYY-MM-DD
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
  entity_type: 'note' | 'relation' | 'reflection' | 'note_keyword';
  entity_id: string;
  operation: 'insert' | 'update' | 'delete';
  payload: string; // JSON stringified entity data
  client_timestamp: string; // ISO 8601
  synced_at?: string;
  retry_count: number;
  last_error?: string;
  created_at: string;
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
