// Relation management functions for note connections

import { getDatabase } from './connection';
import { TABLE_RELATIONS } from '@/constants/database';
import { Relation, CreateRelationInput } from '@/types';
import { DatabaseError } from '@/types/database';
import { generateUUIDv7 } from '@/utils/uuid';

/**
 * Create a new relation between notes
 */
export async function createRelation(
  input: CreateRelationInput
): Promise<Relation> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const id = generateUUIDv7();

  const relation: Relation = {
    id,
    from_note_id: input.from_note_id,
    to_note_id: input.to_note_id,
    relation_type: input.relation_type || 'related',
    rationale: input.rationale,
    source: input.source || 'manual',
    created_at: now,
  };

  try {
    // Validate that from and to notes are different
    if (input.from_note_id === input.to_note_id) {
      throw new DatabaseError(
        'Cannot create self-referential relation',
        'INVALID_RELATION'
      );
    }

    await db.runAsync(
      `INSERT INTO ${TABLE_RELATIONS} (id, from_note_id, to_note_id, relation_type, rationale, source, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        relation.id,
        relation.from_note_id,
        relation.to_note_id,
        relation.relation_type,
        relation.rationale || null,
        relation.source,
        relation.created_at,
      ]
    );

    // TODO: Log change for sync (Phase 2.8)
    // await logChange('relation', relation.id, 'insert', relation);

    return relation;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(
      `Failed to create relation: ${error instanceof Error ? error.message : String(error)}`,
      'CREATE_RELATION_ERROR',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Get all relations for a note (both outgoing and incoming)
 * Returns relations where the note is either from_note_id or to_note_id
 */
export async function getRelations(noteId: string): Promise<Relation[]> {
  const db = await getDatabase();

  try {
    const results = await db.getAllAsync<Relation>(
      `SELECT * FROM ${TABLE_RELATIONS}
       WHERE from_note_id = ? OR to_note_id = ?
       ORDER BY created_at DESC`,
      [noteId, noteId]
    );

    return results;
  } catch (error) {
    throw new DatabaseError(
      `Failed to get relations: ${error instanceof Error ? error.message : String(error)}`,
      'GET_RELATIONS_ERROR',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Get outgoing relations from a note (where note is from_note_id)
 */
export async function getOutgoingRelations(noteId: string): Promise<Relation[]> {
  const db = await getDatabase();

  try {
    const results = await db.getAllAsync<Relation>(
      `SELECT * FROM ${TABLE_RELATIONS}
       WHERE from_note_id = ?
       ORDER BY created_at DESC`,
      [noteId]
    );

    return results;
  } catch (error) {
    throw new DatabaseError(
      `Failed to get outgoing relations: ${error instanceof Error ? error.message : String(error)}`,
      'GET_OUTGOING_RELATIONS_ERROR',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Get incoming relations to a note (where note is to_note_id)
 */
export async function getIncomingRelations(noteId: string): Promise<Relation[]> {
  const db = await getDatabase();

  try {
    const results = await db.getAllAsync<Relation>(
      `SELECT * FROM ${TABLE_RELATIONS}
       WHERE to_note_id = ?
       ORDER BY created_at DESC`,
      [noteId]
    );

    return results;
  } catch (error) {
    throw new DatabaseError(
      `Failed to get incoming relations: ${error instanceof Error ? error.message : String(error)}`,
      'GET_INCOMING_RELATIONS_ERROR',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Get a specific relation by ID
 */
export async function getRelation(id: string): Promise<Relation | null> {
  const db = await getDatabase();

  try {
    const result = await db.getFirstAsync<Relation>(
      `SELECT * FROM ${TABLE_RELATIONS} WHERE id = ?`,
      [id]
    );

    return result || null;
  } catch (error) {
    throw new DatabaseError(
      `Failed to get relation: ${error instanceof Error ? error.message : String(error)}`,
      'GET_RELATION_ERROR',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Delete a relation
 */
export async function deleteRelation(id: string): Promise<void> {
  const db = await getDatabase();

  try {
    // Check if relation exists
    const existing = await getRelation(id);
    if (!existing) {
      throw new DatabaseError('Relation not found', 'RELATION_NOT_FOUND');
    }

    await db.runAsync(`DELETE FROM ${TABLE_RELATIONS} WHERE id = ?`, [id]);

    // TODO: Log change for sync (Phase 2.8)
    // await logChange('relation', id, 'delete', { id });
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(
      `Failed to delete relation: ${error instanceof Error ? error.message : String(error)}`,
      'DELETE_RELATION_ERROR',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Check if a relation already exists between two notes
 */
export async function relationExists(
  fromNoteId: string,
  toNoteId: string,
  relationType?: string
): Promise<boolean> {
  const db = await getDatabase();

  try {
    let query = `
      SELECT COUNT(*) as count FROM ${TABLE_RELATIONS}
      WHERE from_note_id = ? AND to_note_id = ?
    `;
    const params: any[] = [fromNoteId, toNoteId];

    if (relationType) {
      query += ' AND relation_type = ?';
      params.push(relationType);
    }

    const result = await db.getFirstAsync<{ count: number }>(query, params);

    return (result?.count || 0) > 0;
  } catch (error) {
    throw new DatabaseError(
      `Failed to check relation existence: ${error instanceof Error ? error.message : String(error)}`,
      'CHECK_RELATION_ERROR',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Get count of relations for a note
 */
export async function getRelationCount(noteId: string): Promise<number> {
  const db = await getDatabase();

  try {
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${TABLE_RELATIONS}
       WHERE from_note_id = ? OR to_note_id = ?`,
      [noteId, noteId]
    );

    return result?.count || 0;
  } catch (error) {
    throw new DatabaseError(
      `Failed to count relations: ${error instanceof Error ? error.message : String(error)}`,
      'COUNT_RELATIONS_ERROR',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Delete all relations for a note (used when deleting a note)
 */
export async function deleteNoteRelations(noteId: string): Promise<number> {
  const db = await getDatabase();

  try {
    const result = await db.runAsync(
      `DELETE FROM ${TABLE_RELATIONS}
       WHERE from_note_id = ? OR to_note_id = ?`,
      [noteId, noteId]
    );

    // TODO: Log changes for sync (Phase 2.8)
    // for each deleted relation

    return result.changes || 0;
  } catch (error) {
    throw new DatabaseError(
      `Failed to delete note relations: ${error instanceof Error ? error.message : String(error)}`,
      'DELETE_NOTE_RELATIONS_ERROR',
      error instanceof Error ? error : undefined
    );
  }
}
