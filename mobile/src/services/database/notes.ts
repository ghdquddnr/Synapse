// Note CRUD operations with change log tracking

import { getDatabase } from './connection';
import { TABLE_NOTES } from '@/constants/database';
import {
  Note,
  CreateNoteInput,
  UpdateNoteInput,
  NoteFilters,
} from '@/types';
import { DatabaseError } from '@/types/database';
import { generateUUIDv7 } from '@/utils/uuid';

/**
 * Create a new note
 */
export async function createNote(input: CreateNoteInput): Promise<Note> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const id = generateUUIDv7();

  const note: Note = {
    id,
    body: input.body,
    importance: input.importance,
    source_url: input.source_url,
    image_path: input.image_path,
    created_at: now,
    updated_at: now,
  };

  try {
    await db.runAsync(
      `INSERT INTO ${TABLE_NOTES} (id, body, importance, source_url, image_path, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        note.id,
        note.body,
        note.importance,
        note.source_url || null,
        note.image_path || null,
        note.created_at,
        note.updated_at,
      ]
    );

    // TODO: Log change for sync (Phase 2.8)
    // await logChange('note', note.id, 'insert', note);

    return note;
  } catch (error) {
    throw new DatabaseError(
      `Failed to create note: ${error instanceof Error ? error.message : String(error)}`,
      'CREATE_NOTE_ERROR',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Get a single note by ID
 */
export async function getNote(id: string): Promise<Note | null> {
  const db = await getDatabase();

  try {
    const result = await db.getFirstAsync<Note>(
      `SELECT * FROM ${TABLE_NOTES} WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );

    return result || null;
  } catch (error) {
    throw new DatabaseError(
      `Failed to get note: ${error instanceof Error ? error.message : String(error)}`,
      'GET_NOTE_ERROR',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Update an existing note
 */
export async function updateNote(
  id: string,
  updates: UpdateNoteInput
): Promise<Note> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  try {
    // First, check if note exists
    const existing = await getNote(id);
    if (!existing) {
      throw new DatabaseError('Note not found', 'NOTE_NOT_FOUND');
    }

    // Build dynamic update query based on provided fields
    const updateFields: string[] = [];
    const values: any[] = [];

    if (updates.body !== undefined) {
      updateFields.push('body = ?');
      values.push(updates.body);
    }
    if (updates.importance !== undefined) {
      updateFields.push('importance = ?');
      values.push(updates.importance);
    }
    if (updates.source_url !== undefined) {
      updateFields.push('source_url = ?');
      values.push(updates.source_url || null);
    }
    if (updates.image_path !== undefined) {
      updateFields.push('image_path = ?');
      values.push(updates.image_path || null);
    }

    // Always update updated_at
    updateFields.push('updated_at = ?');
    values.push(now);

    // Add id to WHERE clause
    values.push(id);

    if (updateFields.length === 1) {
      // Only updated_at changed, no actual update
      return { ...existing, updated_at: now };
    }

    await db.runAsync(
      `UPDATE ${TABLE_NOTES} SET ${updateFields.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
      values
    );

    // Get updated note
    const updatedNote = await getNote(id);
    if (!updatedNote) {
      throw new DatabaseError('Failed to retrieve updated note', 'UPDATE_NOTE_ERROR');
    }

    // TODO: Log change for sync (Phase 2.8)
    // await logChange('note', id, 'update', updatedNote);

    return updatedNote;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(
      `Failed to update note: ${error instanceof Error ? error.message : String(error)}`,
      'UPDATE_NOTE_ERROR',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Delete a note (soft delete)
 */
export async function deleteNote(id: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  try {
    // Check if note exists
    const existing = await getNote(id);
    if (!existing) {
      throw new DatabaseError('Note not found', 'NOTE_NOT_FOUND');
    }

    await db.runAsync(
      `UPDATE ${TABLE_NOTES} SET deleted_at = ?, updated_at = ? WHERE id = ?`,
      [now, now, id]
    );

    // TODO: Log change for sync (Phase 2.8)
    // await logChange('note', id, 'delete', { id, deleted_at: now });
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new DatabaseError(
      `Failed to delete note: ${error instanceof Error ? error.message : String(error)}`,
      'DELETE_NOTE_ERROR',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Get notes with optional filters
 */
export async function getNotes(filters?: NoteFilters): Promise<Note[]> {
  const db = await getDatabase();

  try {
    const conditions: string[] = [];
    const values: any[] = [];

    // Default: exclude deleted notes unless explicitly requested
    if (!filters?.include_deleted) {
      conditions.push('deleted_at IS NULL');
    }

    if (filters?.importance !== undefined) {
      conditions.push('importance = ?');
      values.push(filters.importance);
    }

    if (filters?.start_date) {
      conditions.push('created_at >= ?');
      values.push(filters.start_date);
    }

    if (filters?.end_date) {
      conditions.push('created_at <= ?');
      values.push(filters.end_date);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters?.limit || 100;
    const offset = filters?.offset || 0;

    const query = `
      SELECT * FROM ${TABLE_NOTES}
      ${whereClause}
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?
    `;

    const results = await db.getAllAsync<Note>(query, [...values, limit, offset]);

    return results;
  } catch (error) {
    throw new DatabaseError(
      `Failed to get notes: ${error instanceof Error ? error.message : String(error)}`,
      'GET_NOTES_ERROR',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Get notes count with optional filters
 */
export async function getNotesCount(filters?: NoteFilters): Promise<number> {
  const db = await getDatabase();

  try {
    const conditions: string[] = [];
    const values: any[] = [];

    // Default: exclude deleted notes unless explicitly requested
    if (!filters?.include_deleted) {
      conditions.push('deleted_at IS NULL');
    }

    if (filters?.importance !== undefined) {
      conditions.push('importance = ?');
      values.push(filters.importance);
    }

    if (filters?.start_date) {
      conditions.push('created_at >= ?');
      values.push(filters.start_date);
    }

    if (filters?.end_date) {
      conditions.push('created_at <= ?');
      values.push(filters.end_date);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${TABLE_NOTES} ${whereClause}`,
      values
    );

    return result?.count || 0;
  } catch (error) {
    throw new DatabaseError(
      `Failed to count notes: ${error instanceof Error ? error.message : String(error)}`,
      'COUNT_NOTES_ERROR',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Get today's notes
 */
export async function getTodayNotes(): Promise<Note[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.toISOString();

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStart = tomorrow.toISOString();

  return getNotes({
    start_date: todayStart,
    end_date: tomorrowStart,
  });
}

/**
 * Hard delete a note (for testing purposes only)
 */
export async function hardDeleteNote(id: string): Promise<void> {
  const db = await getDatabase();

  try {
    await db.runAsync(`DELETE FROM ${TABLE_NOTES} WHERE id = ?`, [id]);
  } catch (error) {
    throw new DatabaseError(
      `Failed to hard delete note: ${error instanceof Error ? error.message : String(error)}`,
      'HARD_DELETE_NOTE_ERROR',
      error instanceof Error ? error : undefined
    );
  }
}
