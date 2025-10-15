// React Query hooks for Relation CRUD operations

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createRelation,
  getRelations,
  getOutgoingRelations,
  getIncomingRelations,
  deleteRelation,
  getRelationCount,
} from '@/services/database/relations';
import { getNote } from '@/services/database/notes';
import type { Relation, CreateRelationInput, Note } from '@/types';

// Query keys
export const relationKeys = {
  all: ['relations'] as const,
  lists: () => [...relationKeys.all, 'list'] as const,
  list: (noteId: string) => [...relationKeys.lists(), noteId] as const,
  outgoing: (noteId: string) => [...relationKeys.all, 'outgoing', noteId] as const,
  incoming: (noteId: string) => [...relationKeys.all, 'incoming', noteId] as const,
  count: (noteId: string) => [...relationKeys.all, 'count', noteId] as const,
  relatedNotes: (noteId: string) => [...relationKeys.all, 'relatedNotes', noteId] as const,
};

/**
 * Get all relations for a note (bidirectional)
 */
export function useRelations(noteId: string) {
  return useQuery({
    queryKey: relationKeys.list(noteId),
    queryFn: () => getRelations(noteId),
    enabled: !!noteId,
  });
}

/**
 * Get outgoing relations from a note
 */
export function useOutgoingRelations(noteId: string) {
  return useQuery({
    queryKey: relationKeys.outgoing(noteId),
    queryFn: () => getOutgoingRelations(noteId),
    enabled: !!noteId,
  });
}

/**
 * Get incoming relations to a note
 */
export function useIncomingRelations(noteId: string) {
  return useQuery({
    queryKey: relationKeys.incoming(noteId),
    queryFn: () => getIncomingRelations(noteId),
    enabled: !!noteId,
  });
}

/**
 * Get relation count for a note
 */
export function useRelationCount(noteId: string) {
  return useQuery({
    queryKey: relationKeys.count(noteId),
    queryFn: () => getRelationCount(noteId),
    enabled: !!noteId,
  });
}

/**
 * Get related notes with their details
 * This combines relations with note data for display
 */
export interface RelatedNoteWithDetails {
  relation: Relation;
  note: Note;
  direction: 'outgoing' | 'incoming';
}

export function useRelatedNotes(noteId: string) {
  return useQuery({
    queryKey: relationKeys.relatedNotes(noteId),
    queryFn: async (): Promise<RelatedNoteWithDetails[]> => {
      const relations = await getRelations(noteId);

      // Fetch all related notes
      const relatedNotesPromises = relations.map(async (relation) => {
        const direction = relation.from_note_id === noteId ? 'outgoing' : 'incoming';
        const relatedNoteId = direction === 'outgoing' ? relation.to_note_id : relation.from_note_id;

        const note = await getNote(relatedNoteId);

        if (!note || note.deleted_at) {
          return null;
        }

        return {
          relation,
          note,
          direction,
        } as RelatedNoteWithDetails;
      });

      const results = await Promise.all(relatedNotesPromises);
      return results.filter((item): item is RelatedNoteWithDetails => item !== null);
    },
    enabled: !!noteId,
  });
}

/**
 * Create a new relation
 */
export function useCreateRelation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateRelationInput) => createRelation(input),
    onSuccess: (newRelation) => {
      // Invalidate relation queries for both notes
      queryClient.invalidateQueries({ queryKey: relationKeys.list(newRelation.from_note_id) });
      queryClient.invalidateQueries({ queryKey: relationKeys.list(newRelation.to_note_id) });
      queryClient.invalidateQueries({ queryKey: relationKeys.relatedNotes(newRelation.from_note_id) });
      queryClient.invalidateQueries({ queryKey: relationKeys.relatedNotes(newRelation.to_note_id) });
      queryClient.invalidateQueries({ queryKey: relationKeys.count(newRelation.from_note_id) });
      queryClient.invalidateQueries({ queryKey: relationKeys.count(newRelation.to_note_id) });
    },
  });
}

/**
 * Delete a relation
 */
export function useDeleteRelation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (relationId: string) => deleteRelation(relationId),
    onSuccess: (_, relationId) => {
      // Invalidate all relation queries (we don't know which notes were affected)
      queryClient.invalidateQueries({ queryKey: relationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: relationKeys.all });
    },
  });
}
