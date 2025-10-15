/**
 * Pull sync implementation - Fetch changes from server
 * Phase 6.3: Pull Sync
 */

import { getDatabase } from '../database/connection';
import { apiClient } from '../api/client';
import { getDeviceId } from '../../utils/device';
import { shouldUpdate } from './conflict';
import type { SyncPullRequest, SyncPullResponse, Delta } from '../../types/sync';
import type { Note, Relation, Reflection } from '../../types';

export interface PullResult {
  success: boolean;
  pulled_count: number;
  conflicts_count: number;
  error?: string;
  new_checkpoint?: string;
}

/**
 * Pull changes from server and apply to local database
 * Handles conflicts with LWW (Last-Write-Wins) strategy
 */
export async function pullChanges(): Promise<PullResult> {
  try {
    const db = await getDatabase();
    const deviceId = await getDeviceId();

    // Get current checkpoint
    const checkpointResult = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM sync_state WHERE key = 'checkpoint'`
    );
    const checkpoint = checkpointResult?.value;

    // Request delta from server
    const pullRequest: SyncPullRequest = {
      device_id: deviceId,
      checkpoint,
    };

    const response = await apiClient.post<SyncPullResponse>(
      '/sync/pull',
      pullRequest
    );

    const { changes, new_checkpoint, has_more } = response.data;

    // Process changes in transaction
    let pulledCount = 0;
    let conflictsCount = 0;

    await db.withTransactionAsync(async () => {
      for (const delta of changes) {
        try {
          if (delta.operation === 'upsert') {
            const conflict = await applyUpsertDelta(delta);
            if (conflict) {
              conflictsCount++;
            }
            pulledCount++;
          } else if (delta.operation === 'delete') {
            await applyDeleteDelta(delta);
            pulledCount++;
          }
        } catch (error) {
          console.error(
            `Failed to apply delta for ${delta.entity_type}:${delta.entity_id}`,
            error
          );
          // Continue processing other deltas
        }
      }

      // Update checkpoint
      await db.runAsync(
        `INSERT OR REPLACE INTO sync_state (key, value, updated_at)
         VALUES ('checkpoint', ?, ?)`,
        [new_checkpoint, new Date().toISOString()]
      );
    });

    // If has_more, recursively pull next batch
    if (has_more) {
      const nextResult = await pullChanges();
      return {
        success: true,
        pulled_count: pulledCount + nextResult.pulled_count,
        conflicts_count: conflictsCount + nextResult.conflicts_count,
        new_checkpoint: nextResult.new_checkpoint,
      };
    }

    return {
      success: true,
      pulled_count: pulledCount,
      conflicts_count: conflictsCount,
      new_checkpoint,
    };
  } catch (error) {
    console.error('Pull sync failed:', error);
    return {
      success: false,
      pulled_count: 0,
      conflicts_count: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Pull single batch (non-recursive, for testing/manual control)
 */
export async function pullSingleBatch(): Promise<PullResult> {
  try {
    const db = await getDatabase();
    const deviceId = await getDeviceId();

    // Get current checkpoint
    const checkpointResult = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM sync_state WHERE key = 'checkpoint'`
    );
    const checkpoint = checkpointResult?.value;

    // Request delta from server
    const pullRequest: SyncPullRequest = {
      device_id: deviceId,
      checkpoint,
    };

    const response = await apiClient.post<SyncPullResponse>(
      '/sync/pull',
      pullRequest
    );

    const { changes, new_checkpoint } = response.data;

    // Process changes in transaction
    let pulledCount = 0;
    let conflictsCount = 0;

    await db.withTransactionAsync(async () => {
      for (const delta of changes) {
        try {
          if (delta.operation === 'upsert') {
            const conflict = await applyUpsertDelta(delta);
            if (conflict) {
              conflictsCount++;
            }
            pulledCount++;
          } else if (delta.operation === 'delete') {
            await applyDeleteDelta(delta);
            pulledCount++;
          }
        } catch (error) {
          console.error(
            `Failed to apply delta for ${delta.entity_type}:${delta.entity_id}`,
            error
          );
        }
      }

      // Update checkpoint
      await db.runAsync(
        `INSERT OR REPLACE INTO sync_state (key, value, updated_at)
         VALUES ('checkpoint', ?, ?)`,
        [new_checkpoint, new Date().toISOString()]
      );
    });

    return {
      success: true,
      pulled_count: pulledCount,
      conflicts_count: conflictsCount,
      new_checkpoint,
    };
  } catch (error) {
    console.error('Pull single batch failed:', error);
    return {
      success: false,
      pulled_count: 0,
      conflicts_count: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Apply upsert delta (insert or update local record)
 * Returns true if conflict occurred
 */
async function applyUpsertDelta(delta: Delta): Promise<boolean> {
  const db = await getDatabase();
  let hadConflict = false;

  switch (delta.entity_type) {
    case 'note':
      hadConflict = await upsertNote(delta);
      break;
    case 'relation':
      hadConflict = await upsertRelation(delta);
      break;
    case 'reflection':
      hadConflict = await upsertReflection(delta);
      break;
    case 'note_keyword':
      // Note keywords are managed by server, direct upsert
      await upsertNoteKeyword(delta);
      break;
    default:
      console.warn(`Unknown entity type: ${delta.entity_type}`);
  }

  return hadConflict;
}

/**
 * Apply delete delta (soft delete or hard delete)
 */
async function applyDeleteDelta(delta: Delta): Promise<void> {
  const db = await getDatabase();

  switch (delta.entity_type) {
    case 'note':
      // Soft delete: set deleted_at
      await db.runAsync(
        `UPDATE notes SET deleted_at = ?, updated_at = ?, server_timestamp = ?
         WHERE id = ?`,
        [delta.updated_at, delta.updated_at, delta.server_timestamp, delta.entity_id]
      );
      break;
    case 'relation':
      // Hard delete
      await db.runAsync(`DELETE FROM relations WHERE id = ?`, [delta.entity_id]);
      break;
    case 'reflection':
      // Hard delete
      await db.runAsync(`DELETE FROM reflections WHERE date = ?`, [delta.entity_id]);
      break;
    case 'note_keyword':
      // Hard delete (note_id + keyword_id composite key)
      // For simplicity, skip if entity_id doesn't contain separator
      if (delta.entity_id.includes(':')) {
        const [noteId, keywordId] = delta.entity_id.split(':');
        await db.runAsync(
          `DELETE FROM note_keywords WHERE note_id = ? AND keyword_id = ?`,
          [noteId, parseInt(keywordId, 10)]
        );
      }
      break;
    default:
      console.warn(`Unknown entity type: ${delta.entity_type}`);
  }
}

/**
 * Upsert Note with LWW conflict resolution
 */
async function upsertNote(delta: Delta): Promise<boolean> {
  const db = await getDatabase();
  const remote = delta.data as Note;

  // Check if local note exists
  const local = await db.getFirstAsync<Note>(
    `SELECT * FROM notes WHERE id = ?`,
    [delta.entity_id]
  );

  if (local) {
    // Conflict: compare timestamps
    const shouldUpdateLocal = shouldUpdate(local, remote);

    if (shouldUpdateLocal) {
      // Remote wins: update local
      await db.runAsync(
        `UPDATE notes SET body = ?, importance = ?, source_url = ?, image_path = ?,
         updated_at = ?, deleted_at = ?, server_timestamp = ?
         WHERE id = ?`,
        [
          remote.body,
          remote.importance,
          remote.source_url || null,
          remote.image_path || null,
          remote.updated_at,
          remote.deleted_at || null,
          remote.server_timestamp || delta.server_timestamp,
          delta.entity_id,
        ]
      );
      return true; // Conflict occurred
    } else {
      // Local wins: keep local, no update
      return true; // Conflict occurred
    }
  } else {
    // No local record: insert
    await db.runAsync(
      `INSERT INTO notes (id, body, importance, source_url, image_path, created_at, updated_at, deleted_at, server_timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        delta.entity_id,
        remote.body,
        remote.importance,
        remote.source_url || null,
        remote.image_path || null,
        remote.created_at,
        remote.updated_at,
        remote.deleted_at || null,
        remote.server_timestamp || delta.server_timestamp,
      ]
    );
    return false; // No conflict
  }
}

/**
 * Upsert Relation with LWW conflict resolution
 */
async function upsertRelation(delta: Delta): Promise<boolean> {
  const db = await getDatabase();
  const remote = delta.data as Relation;

  // Check if local relation exists
  const local = await db.getFirstAsync<Relation>(
    `SELECT * FROM relations WHERE id = ?`,
    [delta.entity_id]
  );

  if (local) {
    // Conflict: compare created_at (Relations are immutable after creation in our model)
    // For simplicity, use created_at as updated_at
    const shouldUpdateLocal = shouldUpdate(
      { ...local, updated_at: local.created_at },
      { ...remote, updated_at: remote.created_at }
    );

    if (shouldUpdateLocal) {
      // Remote wins: update local (though relations are usually immutable)
      await db.runAsync(
        `UPDATE relations SET from_note_id = ?, to_note_id = ?, relation_type = ?,
         rationale = ?, source = ?, created_at = ?
         WHERE id = ?`,
        [
          remote.from_note_id,
          remote.to_note_id,
          remote.relation_type,
          remote.rationale || null,
          remote.source,
          remote.created_at,
          delta.entity_id,
        ]
      );
      return true; // Conflict occurred
    } else {
      // Local wins: keep local
      return true; // Conflict occurred
    }
  } else {
    // No local record: insert
    await db.runAsync(
      `INSERT INTO relations (id, from_note_id, to_note_id, relation_type, rationale, source, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        delta.entity_id,
        remote.from_note_id,
        remote.to_note_id,
        remote.relation_type,
        remote.rationale || null,
        remote.source,
        remote.created_at,
      ]
    );
    return false; // No conflict
  }
}

/**
 * Upsert Reflection with LWW conflict resolution
 */
async function upsertReflection(delta: Delta): Promise<boolean> {
  const db = await getDatabase();
  const remote = delta.data as Reflection;

  // Check if local reflection exists (date is primary key)
  const local = await db.getFirstAsync<Reflection>(
    `SELECT * FROM reflections WHERE date = ?`,
    [delta.entity_id]
  );

  if (local) {
    // Conflict: compare updated_at
    const shouldUpdateLocal = shouldUpdate(local, remote);

    if (shouldUpdateLocal) {
      // Remote wins: update local
      await db.runAsync(
        `UPDATE reflections SET content = ?, updated_at = ?
         WHERE date = ?`,
        [remote.content, remote.updated_at, delta.entity_id]
      );
      return true; // Conflict occurred
    } else {
      // Local wins: keep local
      return true; // Conflict occurred
    }
  } else {
    // No local record: insert
    await db.runAsync(
      `INSERT INTO reflections (date, content, created_at, updated_at)
       VALUES (?, ?, ?, ?)`,
      [delta.entity_id, remote.content, remote.created_at, remote.updated_at]
    );
    return false; // No conflict
  }
}

/**
 * Upsert NoteKeyword (direct upsert, no conflict resolution needed)
 */
async function upsertNoteKeyword(delta: Delta): Promise<void> {
  const db = await getDatabase();
  const data = delta.data as any;

  // Parse entity_id if it contains note_id:keyword_id
  let noteId = data.note_id;
  let keywordId = data.keyword_id;

  if (delta.entity_id.includes(':')) {
    const [nId, kId] = delta.entity_id.split(':');
    noteId = nId;
    keywordId = parseInt(kId, 10);
  }

  // Check if keyword exists, if not insert
  const keywordExists = await db.getFirstAsync<{ id: number }>(
    `SELECT id FROM keywords WHERE id = ?`,
    [keywordId]
  );

  if (!keywordExists && data.keyword_name) {
    await db.runAsync(
      `INSERT OR IGNORE INTO keywords (id, name, created_at) VALUES (?, ?, ?)`,
      [keywordId, data.keyword_name, new Date().toISOString()]
    );
  }

  // Upsert note_keyword
  await db.runAsync(
    `INSERT OR REPLACE INTO note_keywords (note_id, keyword_id, score, source, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [noteId, keywordId, data.score || 0.0, data.source || 'ai', new Date().toISOString()]
  );
}
