/**
 * LWW (Last-Write-Wins) conflict resolution for sync
 * Phase 6.4: Conflict Resolution
 */

import { getDatabase } from '../database/connection';
import type { Note, Relation, Reflection } from '../../types';
import type { ConflictLog } from '../../types/sync';

/**
 * Entity with timestamps for conflict resolution
 */
type TimestampedEntity = {
  updated_at: string; // ISO 8601
  server_timestamp?: string; // ISO 8601
  id?: string; // For entity_id
  date?: string; // For Reflection (uses date as primary key)
};

/**
 * LWW conflict resolution: compare updated_at timestamps
 * Returns true if remote should win (update local), false if local should win (keep local)
 *
 * Resolution rules:
 * 1. Compare updated_at (ISO 8601 string comparison)
 * 2. If equal, compare server_timestamp
 * 3. If still equal, compare entity_id (lexicographic order)
 */
export function shouldUpdate(
  local: TimestampedEntity,
  remote: TimestampedEntity
): boolean {
  // Rule 1: Compare updated_at timestamps
  if (remote.updated_at > local.updated_at) {
    return true; // Remote is newer
  }
  if (remote.updated_at < local.updated_at) {
    return false; // Local is newer
  }

  // Rule 2: If updated_at equal, compare server_timestamp
  const localServerTs = local.server_timestamp || local.updated_at;
  const remoteServerTs = remote.server_timestamp || remote.updated_at;

  if (remoteServerTs > localServerTs) {
    return true; // Remote is newer
  }
  if (remoteServerTs < localServerTs) {
    return false; // Local is newer
  }

  // Rule 3: If both equal, use entity_id lexicographic order (fallback)
  const localId = local.id || local.date || '';
  const remoteId = remote.id || remote.date || '';

  // Remote wins if its ID is lexicographically greater
  return remoteId > localId;
}

/**
 * Log conflict resolution to conflict_log table
 */
export async function logConflict(
  entityType: string,
  entityId: string,
  localData: Record<string, unknown>,
  remoteData: Record<string, unknown>,
  resolution: 'local_wins' | 'remote_wins'
): Promise<void> {
  const db = await getDatabase();

  const resolvedAt = new Date().toISOString();

  await db.execAsync(
    `INSERT INTO conflict_log (entity_type, entity_id, local_data, remote_data, resolution, resolved_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      entityType,
      entityId,
      JSON.stringify(localData),
      JSON.stringify(remoteData),
      resolution,
      resolvedAt,
    ]
  );
}

/**
 * Resolve conflicts for Note entities
 */
export async function resolveNoteConflict(
  local: Note,
  remote: Note
): Promise<{ shouldUpdate: boolean; note: Note }> {
  const shouldUpdateLocal = shouldUpdate(local, remote);

  if (shouldUpdateLocal) {
    await logConflict('note', local.id, local, remote, 'remote_wins');
    return { shouldUpdate: true, note: remote };
  } else {
    await logConflict('note', local.id, local, remote, 'local_wins');
    return { shouldUpdate: false, note: local };
  }
}

/**
 * Resolve conflicts for Relation entities
 */
export async function resolveRelationConflict(
  local: Relation,
  remote: Relation
): Promise<{ shouldUpdate: boolean; relation: Relation }> {
  const shouldUpdateLocal = shouldUpdate(
    { ...local, updated_at: local.created_at },
    { ...remote, updated_at: remote.created_at }
  );

  if (shouldUpdateLocal) {
    await logConflict('relation', local.id, local, remote, 'remote_wins');
    return { shouldUpdate: true, relation: remote };
  } else {
    await logConflict('relation', local.id, local, remote, 'local_wins');
    return { shouldUpdate: false, relation: local };
  }
}

/**
 * Resolve conflicts for Reflection entities
 */
export async function resolveReflectionConflict(
  local: Reflection,
  remote: Reflection
): Promise<{ shouldUpdate: boolean; reflection: Reflection }> {
  const shouldUpdateLocal = shouldUpdate(local, remote);

  if (shouldUpdateLocal) {
    await logConflict('reflection', local.date, local, remote, 'remote_wins');
    return { shouldUpdate: true, reflection: remote };
  } else {
    await logConflict('reflection', local.date, local, remote, 'local_wins');
    return { shouldUpdate: false, reflection: local };
  }
}

/**
 * Get conflict logs for debugging
 */
export async function getConflictLogs(
  limit: number = 50
): Promise<ConflictLog[]> {
  const db = await getDatabase();

  const result = await db.getAllAsync<ConflictLog>(
    `SELECT * FROM conflict_log ORDER BY resolved_at DESC LIMIT ?`,
    [limit]
  );

  return result;
}

/**
 * Clear old conflict logs (older than daysOld)
 */
export async function clearOldConflictLogs(
  daysOld: number = 30
): Promise<number> {
  const db = await getDatabase();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  const cutoffISO = cutoffDate.toISOString();

  const result = await db.runAsync(
    `DELETE FROM conflict_log WHERE resolved_at < ?`,
    [cutoffISO]
  );

  return result.changes;
}
