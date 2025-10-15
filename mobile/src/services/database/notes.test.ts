// Note CRUD operations tests

import { dbManager } from './connection';
import {
  createNote,
  getNote,
  updateNote,
  deleteNote,
  getNotes,
  getNotesCount,
  getTodayNotes,
  hardDeleteNote,
} from './notes';
import { CreateNoteInput, UpdateNoteInput, Note } from '@/types';
import { DatabaseError } from '@/types/database';
import * as SQLite from 'expo-sqlite';

// Mock storage for notes
let mockNotesStorage: Map<string, Note>;

// Mock expo-sqlite implementation
jest.mock('expo-sqlite');

describe('Note CRUD Operations', () => {
  beforeEach(async () => {
    // Reset mock storage
    mockNotesStorage = new Map<string, Note>();

    // Setup mock implementations
    const mockDb = await SQLite.openDatabaseAsync('test.db');

    // Mock runAsync for INSERT and UPDATE
    (mockDb.runAsync as jest.Mock).mockImplementation(async (query: string, params?: any[]) => {
      if (query.includes('INSERT INTO notes')) {
        if (!params) throw new Error('Missing params for INSERT');
        const note: Note = {
          id: params[0],
          body: params[1],
          importance: params[2],
          source_url: params[3],
          image_path: params[4],
          created_at: params[5],
          updated_at: params[6],
        };
        mockNotesStorage.set(note.id, note);
        return { changes: 1, lastInsertRowId: 1 };
      }

      if (query.includes('UPDATE notes') && query.includes('deleted_at')) {
        if (!params) throw new Error('Missing params for UPDATE deleted_at');
        const id = params[params.length - 1];
        const note = mockNotesStorage.get(id);
        if (note) {
          note.deleted_at = params[0];
          note.updated_at = params[1];
          return { changes: 1, lastInsertRowId: 0 };
        }
        return { changes: 0, lastInsertRowId: 0 };
      }

      if (query.includes('UPDATE notes')) {
        if (!params) throw new Error('Missing params for UPDATE');
        // Handle update operations
        const id = params[params.length - 1];
        const note = mockNotesStorage.get(id);
        if (note && !note.deleted_at) {
          // Update fields based on query
          let paramIndex = 0;
          if (query.includes('body = ?')) {
            note.body = params[paramIndex++];
          }
          if (query.includes('importance = ?')) {
            note.importance = params[paramIndex++];
          }
          if (query.includes('source_url = ?')) {
            note.source_url = params[paramIndex++];
          }
          if (query.includes('image_path = ?')) {
            note.image_path = params[paramIndex++];
          }
          note.updated_at = params[paramIndex];
          return { changes: 1, lastInsertRowId: 0 };
        }
        return { changes: 0, lastInsertRowId: 0 };
      }

      if (query.includes('DELETE FROM notes')) {
        if (!params) throw new Error('Missing params for DELETE');
        const id = params[0];
        mockNotesStorage.delete(id);
        return { changes: 1, lastInsertRowId: 0 };
      }

      return { changes: 0, lastInsertRowId: 0 };
    });

    // Mock getFirstAsync for SELECT single row
    (mockDb.getFirstAsync as jest.Mock).mockImplementation(async (query: string, params?: any[]) => {
      if (query.includes('SELECT * FROM notes WHERE id')) {
        if (!params) throw new Error('Missing params for SELECT');
        const id = params[0];
        const note = mockNotesStorage.get(id);
        if (note && !note.deleted_at) {
          return note;
        }
        return null;
      }

      if (query.includes('COUNT(*)')) {
        let count = 0;
        for (const note of mockNotesStorage.values()) {
          if (!query.includes('deleted_at IS NULL') || !note.deleted_at) {
            count++;
          }
        }
        return { count };
      }

      return null;
    });

    // Mock getAllAsync for SELECT multiple rows
    (mockDb.getAllAsync as jest.Mock).mockImplementation(async (query: string, params?: any[]) => {
      const results: Note[] = [];
      for (const note of mockNotesStorage.values()) {
        // Apply filters
        if (!query.includes('deleted_at IS NULL') || !note.deleted_at) {
          results.push(note);
        }
      }

      // Sort by updated_at DESC
      results.sort((a, b) => b.updated_at.localeCompare(a.updated_at));

      return results;
    });

    // Mock withTransactionAsync
    (mockDb.withTransactionAsync as jest.Mock).mockImplementation(async (callback: Function) => {
      await callback();
    });

    // Initialize database manager
    await dbManager.resetDatabase();
    await dbManager.getDatabase();
  });

  afterAll(async () => {
    // Clean up after all tests
    await dbManager.closeDatabase();
  });

  describe('createNote', () => {
    it('should create a note with all fields', async () => {
      const input: CreateNoteInput = {
        body: 'Test note with all fields',
        importance: 2,
        source_url: 'https://example.com',
        image_path: '/path/to/image.jpg',
      };

      const note = await createNote(input);

      expect(note.id).toBeTruthy();
      expect(note.body).toBe(input.body);
      expect(note.importance).toBe(input.importance);
      expect(note.source_url).toBe(input.source_url);
      expect(note.image_path).toBe(input.image_path);
      expect(note.created_at).toBeTruthy();
      expect(note.updated_at).toBeTruthy();
      expect(note.deleted_at).toBeUndefined();
    });

    it('should create a note with only required fields', async () => {
      const input: CreateNoteInput = {
        body: 'Minimal note',
        importance: 1,
      };

      const note = await createNote(input);

      expect(note.id).toBeTruthy();
      expect(note.body).toBe(input.body);
      expect(note.importance).toBe(input.importance);
      expect(note.source_url).toBeUndefined();
      expect(note.image_path).toBeUndefined();
    });

    it('should create notes with unique IDs', async () => {
      const input: CreateNoteInput = {
        body: 'Test note',
        importance: 1,
      };

      const note1 = await createNote(input);
      const note2 = await createNote(input);

      expect(note1.id).not.toBe(note2.id);
    });

    it('should set created_at and updated_at to the same value', async () => {
      const input: CreateNoteInput = {
        body: 'Test note',
        importance: 1,
      };

      const note = await createNote(input);

      expect(note.created_at).toBe(note.updated_at);
    });
  });

  describe('getNote', () => {
    it('should retrieve an existing note', async () => {
      const input: CreateNoteInput = {
        body: 'Retrievable note',
        importance: 2,
      };

      const created = await createNote(input);
      const retrieved = await getNote(created.id);

      expect(retrieved).toBeTruthy();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.body).toBe(created.body);
    });

    it('should return null for non-existent note', async () => {
      const result = await getNote('non-existent-id');

      expect(result).toBeNull();
    });

    it('should not retrieve soft-deleted notes', async () => {
      const input: CreateNoteInput = {
        body: 'To be deleted',
        importance: 1,
      };

      const created = await createNote(input);
      await deleteNote(created.id);

      const retrieved = await getNote(created.id);

      expect(retrieved).toBeNull();
    });
  });

  describe('updateNote', () => {
    it('should update note body', async () => {
      const created = await createNote({
        body: 'Original body',
        importance: 1,
      });

      const updates: UpdateNoteInput = {
        body: 'Updated body',
      };

      const updated = await updateNote(created.id, updates);

      expect(updated.body).toBe('Updated body');
      expect(updated.importance).toBe(1); // Unchanged
      expect(updated.updated_at).not.toBe(created.updated_at);
    });

    it('should update importance level', async () => {
      const created = await createNote({
        body: 'Test note',
        importance: 1,
      });

      const updated = await updateNote(created.id, { importance: 3 });

      expect(updated.importance).toBe(3);
      expect(updated.body).toBe(created.body); // Unchanged
    });

    it('should update multiple fields', async () => {
      const created = await createNote({
        body: 'Original',
        importance: 1,
      });

      const updates: UpdateNoteInput = {
        body: 'Updated',
        importance: 3,
        source_url: 'https://example.com',
      };

      const updated = await updateNote(created.id, updates);

      expect(updated.body).toBe('Updated');
      expect(updated.importance).toBe(3);
      expect(updated.source_url).toBe('https://example.com');
    });

    it('should update updated_at timestamp', async () => {
      const created = await createNote({
        body: 'Test',
        importance: 1,
      });

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await updateNote(created.id, { body: 'Updated' });

      expect(updated.updated_at).not.toBe(created.updated_at);
      expect(new Date(updated.updated_at).getTime()).toBeGreaterThan(
        new Date(created.updated_at).getTime()
      );
    });

    it('should throw error for non-existent note', async () => {
      await expect(
        updateNote('non-existent-id', { body: 'Updated' })
      ).rejects.toThrow(DatabaseError);
    });

    it('should not update deleted notes', async () => {
      const created = await createNote({
        body: 'Test',
        importance: 1,
      });

      await deleteNote(created.id);

      await expect(
        updateNote(created.id, { body: 'Updated' })
      ).rejects.toThrow(DatabaseError);
    });
  });

  describe('deleteNote', () => {
    it('should soft delete a note', async () => {
      const created = await createNote({
        body: 'To be deleted',
        importance: 1,
      });

      await deleteNote(created.id);

      const retrieved = await getNote(created.id);

      expect(retrieved).toBeNull();
    });

    it('should throw error for non-existent note', async () => {
      await expect(deleteNote('non-existent-id')).rejects.toThrow(DatabaseError);
    });

    it('should throw error when deleting already deleted note', async () => {
      const created = await createNote({
        body: 'Test',
        importance: 1,
      });

      await deleteNote(created.id);

      await expect(deleteNote(created.id)).rejects.toThrow(DatabaseError);
    });
  });

  describe('getNotes', () => {
    beforeEach(async () => {
      // Create test notes
      await createNote({ body: 'High importance', importance: 3 });
      await createNote({ body: 'Medium importance', importance: 2 });
      await createNote({ body: 'Low importance', importance: 1 });
    });

    it('should retrieve all non-deleted notes', async () => {
      const notes = await getNotes();

      expect(notes.length).toBe(3);
    });

    it('should filter by importance', async () => {
      const notes = await getNotes({ importance: 3 });

      expect(notes.length).toBe(1);
      expect(notes[0].importance).toBe(3);
    });

    it('should exclude deleted notes by default', async () => {
      const allNotes = await getNotes();
      await deleteNote(allNotes[0].id);

      const notes = await getNotes();

      expect(notes.length).toBe(2);
    });

    it('should include deleted notes when requested', async () => {
      const allNotes = await getNotes();
      await deleteNote(allNotes[0].id);

      const notes = await getNotes({ include_deleted: true });

      expect(notes.length).toBe(3);
    });

    it('should respect limit parameter', async () => {
      const notes = await getNotes({ limit: 2 });

      expect(notes.length).toBe(2);
    });

    it('should respect offset parameter', async () => {
      const allNotes = await getNotes();
      const offsetNotes = await getNotes({ offset: 1 });

      expect(offsetNotes.length).toBe(2);
      expect(offsetNotes[0].id).not.toBe(allNotes[0].id);
    });

    it('should order by updated_at DESC', async () => {
      const notes = await getNotes();

      for (let i = 0; i < notes.length - 1; i++) {
        const current = new Date(notes[i].updated_at).getTime();
        const next = new Date(notes[i + 1].updated_at).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });
  });

  describe('getNotesCount', () => {
    beforeEach(async () => {
      await createNote({ body: 'Note 1', importance: 3 });
      await createNote({ body: 'Note 2', importance: 2 });
      await createNote({ body: 'Note 3', importance: 1 });
    });

    it('should count all non-deleted notes', async () => {
      const count = await getNotesCount();

      expect(count).toBe(3);
    });

    it('should count notes with specific importance', async () => {
      const count = await getNotesCount({ importance: 3 });

      expect(count).toBe(1);
    });

    it('should exclude deleted notes by default', async () => {
      const allNotes = await getNotes();
      await deleteNote(allNotes[0].id);

      const count = await getNotesCount();

      expect(count).toBe(2);
    });

    it('should include deleted notes when requested', async () => {
      const allNotes = await getNotes();
      await deleteNote(allNotes[0].id);

      const count = await getNotesCount({ include_deleted: true });

      expect(count).toBe(3);
    });

    it('should return 0 when no notes exist', async () => {
      await dbManager.resetDatabase();
      await dbManager.getDatabase();

      const count = await getNotesCount();

      expect(count).toBe(0);
    });
  });

  describe('getTodayNotes', () => {
    it('should retrieve only today\'s notes', async () => {
      // Create a note today
      const todayNote = await createNote({
        body: 'Today\'s note',
        importance: 1,
      });

      const todayNotes = await getTodayNotes();

      expect(todayNotes.length).toBe(1);
      expect(todayNotes[0].id).toBe(todayNote.id);
    });

    it('should return empty array when no notes today', async () => {
      // Don't create any notes
      const todayNotes = await getTodayNotes();

      expect(todayNotes).toEqual([]);
    });
  });

  describe('hardDeleteNote', () => {
    it('should permanently delete a note', async () => {
      const created = await createNote({
        body: 'To be hard deleted',
        importance: 1,
      });

      await hardDeleteNote(created.id);

      // Should not be retrievable even with include_deleted
      const notes = await getNotes({ include_deleted: true });

      expect(notes.find((n) => n.id === created.id)).toBeUndefined();
    });

    it('should not throw error for non-existent note', async () => {
      // Should not throw
      await hardDeleteNote('non-existent-id');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty body string', async () => {
      const note = await createNote({
        body: '',
        importance: 1,
      });

      expect(note.body).toBe('');
    });

    it('should handle very long body text', async () => {
      const longBody = 'A'.repeat(10000);
      const note = await createNote({
        body: longBody,
        importance: 1,
      });

      expect(note.body).toBe(longBody);
    });

    it('should handle special characters in body', async () => {
      const specialBody = 'Test with "quotes", \'apostrophes\', and 特殊文字';
      const note = await createNote({
        body: specialBody,
        importance: 1,
      });

      expect(note.body).toBe(specialBody);
    });

    it('should handle null source_url and image_path', async () => {
      const note = await createNote({
        body: 'Test',
        importance: 1,
        source_url: undefined,
        image_path: undefined,
      });

      expect(note.source_url).toBeUndefined();
      expect(note.image_path).toBeUndefined();
    });
  });
});
