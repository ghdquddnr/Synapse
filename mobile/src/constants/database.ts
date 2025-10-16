// Database schema constants

export const DB_NAME = 'synapse.db';
export const DB_VERSION = 1;

// Table names
export const TABLE_NOTES = 'notes';
export const TABLE_KEYWORDS = 'keywords';
export const TABLE_NOTE_KEYWORDS = 'note_keywords';
export const TABLE_RELATIONS = 'relations';
export const TABLE_REFLECTIONS = 'reflections';
export const TABLE_WEEKLY_REPORTS = 'weekly_reports';
export const TABLE_CHANGE_LOG = 'change_log';
export const TABLE_CONFLICT_LOG = 'conflict_log';
export const TABLE_SYNC_STATE = 'sync_state';
export const TABLE_SEARCH_HISTORY = 'search_history';
export const TABLE_NOTES_FTS = 'notes_fts';

// Index names
export const IDX_NOTES_UPDATED_AT = 'idx_notes_updated_at';
export const IDX_NOTES_IMPORTANCE = 'idx_notes_importance';
export const IDX_NOTES_DELETED = 'idx_notes_deleted';
export const IDX_CHANGE_LOG_SYNCED = 'idx_change_log_synced';
export const IDX_CHANGE_LOG_ENTITY = 'idx_change_log_entity';
export const IDX_NOTE_KEYWORDS_NOTE = 'idx_note_keywords_note';
export const IDX_RELATIONS_FROM = 'idx_relations_from';
export const IDX_RELATIONS_TO = 'idx_relations_to';

// Sync constants
export const SYNC_CHECKPOINT_KEY = 'checkpoint';
export const SYNC_BATCH_MAX_SIZE = 100; // Max entries per sync batch
export const SYNC_BATCH_SIZE = 100; // Deprecated, use SYNC_BATCH_MAX_SIZE
export const SYNC_BATCH_MAX_BYTES = 1024 * 1024; // 1MB max payload size
export const SYNC_MAX_PAYLOAD_SIZE = 1024 * 1024; // Deprecated, use SYNC_BATCH_MAX_BYTES
export const SYNC_MAX_RETRY_COUNT = 3; // Max retry attempts before marking as failed
export const SYNC_QUEUE_WARNING_SIZE = 8000; // Warning threshold (80% of max)
export const SYNC_QUEUE_MAX_SIZE = 10000; // Max change log entries before read-only mode
export const MAX_CHANGE_LOG_SIZE = 10000; // Deprecated, use SYNC_QUEUE_MAX_SIZE

// Search constants
export const MAX_SEARCH_HISTORY = 50;
export const SEARCH_RESULT_LIMIT = 50;

// Importance levels
export const IMPORTANCE_LOW = 1;
export const IMPORTANCE_MEDIUM = 2;
export const IMPORTANCE_HIGH = 3;
