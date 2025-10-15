// Relation management tests

import { dbManager } from './connection';
import {
  createRelation,
  getRelations,
  getOutgoingRelations,
  getIncomingRelations,
  getRelation,
  deleteRelation,
  relationExists,
  getRelationCount,
  deleteNoteRelations,
} from './relations';
import { createNote } from './notes';
import { CreateRelationInput } from '@/types';
import { DatabaseError } from '@/types/database';

describe('Relation Management', () => {
  let note1Id: string;
  let note2Id: string;
  let note3Id: string;

  beforeEach(async () => {
    // Reset database before each test
    await dbManager.resetDatabase();
    await dbManager.getDatabase();

    // Create test notes
    const note1 = await createNote({ body: 'Test note 1', importance: 1 });
    const note2 = await createNote({ body: 'Test note 2', importance: 1 });
    const note3 = await createNote({ body: 'Test note 3', importance: 1 });

    note1Id = note1.id;
    note2Id = note2.id;
    note3Id = note3.id;
  });

  afterAll(async () => {
    await dbManager.closeDatabase();
  });

  describe('createRelation', () => {
    it('should create a relation with all fields', async () => {
      const input: CreateRelationInput = {
        from_note_id: note1Id,
        to_note_id: note2Id,
        relation_type: 'parent_child',
        rationale: 'Note 1 is parent of Note 2',
        source: 'manual',
      };

      const relation = await createRelation(input);

      expect(relation.id).toBeTruthy();
      expect(relation.from_note_id).toBe(note1Id);
      expect(relation.to_note_id).toBe(note2Id);
      expect(relation.relation_type).toBe('parent_child');
      expect(relation.rationale).toBe('Note 1 is parent of Note 2');
      expect(relation.source).toBe('manual');
      expect(relation.created_at).toBeTruthy();
    });

    it('should create a relation with only required fields', async () => {
      const input: CreateRelationInput = {
        from_note_id: note1Id,
        to_note_id: note2Id,
      };

      const relation = await createRelation(input);

      expect(relation.id).toBeTruthy();
      expect(relation.from_note_id).toBe(note1Id);
      expect(relation.to_note_id).toBe(note2Id);
      expect(relation.relation_type).toBe('related'); // Default
      expect(relation.source).toBe('manual'); // Default
      expect(relation.rationale).toBeUndefined();
    });

    it('should throw error for self-referential relation', async () => {
      const input: CreateRelationInput = {
        from_note_id: note1Id,
        to_note_id: note1Id,
      };

      await expect(createRelation(input)).rejects.toThrow(DatabaseError);
      await expect(createRelation(input)).rejects.toThrow('self-referential');
    });

    it('should create relations with unique IDs', async () => {
      const input: CreateRelationInput = {
        from_note_id: note1Id,
        to_note_id: note2Id,
      };

      const relation1 = await createRelation(input);
      const relation2 = await createRelation({ ...input, to_note_id: note3Id });

      expect(relation1.id).not.toBe(relation2.id);
    });
  });

  describe('getRelations', () => {
    it('should retrieve all relations for a note (bidirectional)', async () => {
      // Create outgoing relation from note1 to note2
      await createRelation({
        from_note_id: note1Id,
        to_note_id: note2Id,
      });

      // Create incoming relation from note3 to note1
      await createRelation({
        from_note_id: note3Id,
        to_note_id: note1Id,
      });

      const relations = await getRelations(note1Id);

      expect(relations.length).toBe(2);
    });

    it('should return empty array when no relations exist', async () => {
      const relations = await getRelations(note1Id);

      expect(relations).toEqual([]);
    });

    it('should order relations by created_at DESC', async () => {
      await createRelation({ from_note_id: note1Id, to_note_id: note2Id });
      await new Promise((resolve) => setTimeout(resolve, 10));
      await createRelation({ from_note_id: note1Id, to_note_id: note3Id });

      const relations = await getRelations(note1Id);

      const timestamps = relations.map((r) => new Date(r.created_at).getTime());
      for (let i = 0; i < timestamps.length - 1; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i + 1]);
      }
    });
  });

  describe('getOutgoingRelations', () => {
    it('should retrieve only outgoing relations', async () => {
      await createRelation({ from_note_id: note1Id, to_note_id: note2Id });
      await createRelation({ from_note_id: note3Id, to_note_id: note1Id });

      const outgoing = await getOutgoingRelations(note1Id);

      expect(outgoing.length).toBe(1);
      expect(outgoing[0].from_note_id).toBe(note1Id);
      expect(outgoing[0].to_note_id).toBe(note2Id);
    });

    it('should return empty array when no outgoing relations', async () => {
      await createRelation({ from_note_id: note2Id, to_note_id: note1Id });

      const outgoing = await getOutgoingRelations(note1Id);

      expect(outgoing).toEqual([]);
    });
  });

  describe('getIncomingRelations', () => {
    it('should retrieve only incoming relations', async () => {
      await createRelation({ from_note_id: note1Id, to_note_id: note2Id });
      await createRelation({ from_note_id: note3Id, to_note_id: note1Id });

      const incoming = await getIncomingRelations(note1Id);

      expect(incoming.length).toBe(1);
      expect(incoming[0].from_note_id).toBe(note3Id);
      expect(incoming[0].to_note_id).toBe(note1Id);
    });

    it('should return empty array when no incoming relations', async () => {
      await createRelation({ from_note_id: note1Id, to_note_id: note2Id });

      const incoming = await getIncomingRelations(note1Id);

      expect(incoming).toEqual([]);
    });
  });

  describe('getRelation', () => {
    it('should retrieve a specific relation by ID', async () => {
      const created = await createRelation({
        from_note_id: note1Id,
        to_note_id: note2Id,
      });

      const retrieved = await getRelation(created.id);

      expect(retrieved).toBeTruthy();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.from_note_id).toBe(note1Id);
      expect(retrieved?.to_note_id).toBe(note2Id);
    });

    it('should return null for non-existent relation', async () => {
      const result = await getRelation('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('deleteRelation', () => {
    it('should delete a relation', async () => {
      const created = await createRelation({
        from_note_id: note1Id,
        to_note_id: note2Id,
      });

      await deleteRelation(created.id);

      const retrieved = await getRelation(created.id);
      expect(retrieved).toBeNull();
    });

    it('should throw error for non-existent relation', async () => {
      await expect(deleteRelation('non-existent-id')).rejects.toThrow(
        DatabaseError
      );
    });

    it('should remove relation from both notes', async () => {
      const created = await createRelation({
        from_note_id: note1Id,
        to_note_id: note2Id,
      });

      await deleteRelation(created.id);

      const note1Relations = await getRelations(note1Id);
      const note2Relations = await getRelations(note2Id);

      expect(note1Relations.length).toBe(0);
      expect(note2Relations.length).toBe(0);
    });
  });

  describe('relationExists', () => {
    it('should return true when relation exists', async () => {
      await createRelation({
        from_note_id: note1Id,
        to_note_id: note2Id,
        relation_type: 'related',
      });

      const exists = await relationExists(note1Id, note2Id);

      expect(exists).toBe(true);
    });

    it('should return false when relation does not exist', async () => {
      const exists = await relationExists(note1Id, note2Id);

      expect(exists).toBe(false);
    });

    it('should check relation type when specified', async () => {
      await createRelation({
        from_note_id: note1Id,
        to_note_id: note2Id,
        relation_type: 'parent_child',
      });

      const existsWithType = await relationExists(note1Id, note2Id, 'parent_child');
      const existsWithWrongType = await relationExists(note1Id, note2Id, 'similar');

      expect(existsWithType).toBe(true);
      expect(existsWithWrongType).toBe(false);
    });

    it('should be directional (from -> to)', async () => {
      await createRelation({
        from_note_id: note1Id,
        to_note_id: note2Id,
      });

      const forwardExists = await relationExists(note1Id, note2Id);
      const reverseExists = await relationExists(note2Id, note1Id);

      expect(forwardExists).toBe(true);
      expect(reverseExists).toBe(false);
    });
  });

  describe('getRelationCount', () => {
    it('should count all relations for a note', async () => {
      await createRelation({ from_note_id: note1Id, to_note_id: note2Id });
      await createRelation({ from_note_id: note1Id, to_note_id: note3Id });
      await createRelation({ from_note_id: note2Id, to_note_id: note1Id });

      const count = await getRelationCount(note1Id);

      expect(count).toBe(3); // 2 outgoing + 1 incoming
    });

    it('should return 0 when no relations exist', async () => {
      const count = await getRelationCount(note1Id);

      expect(count).toBe(0);
    });
  });

  describe('deleteNoteRelations', () => {
    it('should delete all relations for a note', async () => {
      await createRelation({ from_note_id: note1Id, to_note_id: note2Id });
      await createRelation({ from_note_id: note1Id, to_note_id: note3Id });
      await createRelation({ from_note_id: note2Id, to_note_id: note1Id });

      const deletedCount = await deleteNoteRelations(note1Id);

      expect(deletedCount).toBe(3);

      const count = await getRelationCount(note1Id);
      expect(count).toBe(0);
    });

    it('should return 0 when no relations to delete', async () => {
      const deletedCount = await deleteNoteRelations(note1Id);

      expect(deletedCount).toBe(0);
    });

    it('should not affect other notes relations', async () => {
      await createRelation({ from_note_id: note1Id, to_note_id: note2Id });
      await createRelation({ from_note_id: note2Id, to_note_id: note3Id });

      await deleteNoteRelations(note1Id);

      const note2Count = await getRelationCount(note2Id);
      expect(note2Count).toBe(1); // Only the relation to note3 should remain
    });
  });

  describe('Edge cases', () => {
    it('should handle multiple relations between same notes with different types', async () => {
      await createRelation({
        from_note_id: note1Id,
        to_note_id: note2Id,
        relation_type: 'related',
      });
      await createRelation({
        from_note_id: note1Id,
        to_note_id: note2Id,
        relation_type: 'similar',
      });

      const relations = await getRelations(note1Id);

      expect(relations.length).toBe(2);
    });

    it('should handle long rationale text', async () => {
      const longRationale = 'A'.repeat(1000);
      const relation = await createRelation({
        from_note_id: note1Id,
        to_note_id: note2Id,
        rationale: longRationale,
      });

      expect(relation.rationale).toBe(longRationale);
    });

    it('should handle special characters in rationale', async () => {
      const specialRationale = 'Test with "quotes", \'apostrophes\', and 特殊文字';
      const relation = await createRelation({
        from_note_id: note1Id,
        to_note_id: note2Id,
        rationale: specialRationale,
      });

      expect(relation.rationale).toBe(specialRationale);
    });
  });
});
