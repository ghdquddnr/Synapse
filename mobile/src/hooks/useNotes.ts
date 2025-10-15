// React Query hooks for Note CRUD operations

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createNote,
  getNote,
  updateNote,
  deleteNote,
  getNotes,
  getNotesCount,
  getTodayNotes,
} from '@/services/database/notes';
import type {
  Note,
  CreateNoteInput,
  UpdateNoteInput,
  NoteFilters,
} from '@/types';

// Query keys
export const noteKeys = {
  all: ['notes'] as const,
  lists: () => [...noteKeys.all, 'list'] as const,
  list: (filters?: NoteFilters) => [...noteKeys.lists(), { filters }] as const,
  today: () => [...noteKeys.all, 'today'] as const,
  count: (filters?: NoteFilters) => [...noteKeys.all, 'count', { filters }] as const,
  detail: (id: string) => [...noteKeys.all, 'detail', id] as const,
};

/**
 * Get a single note by ID
 */
export function useNote(id: string) {
  return useQuery({
    queryKey: noteKeys.detail(id),
    queryFn: () => getNote(id),
    enabled: !!id,
  });
}

/**
 * Get notes list with optional filters
 */
export function useNotes(filters?: NoteFilters) {
  return useQuery({
    queryKey: noteKeys.list(filters),
    queryFn: () => getNotes(filters),
  });
}

/**
 * Get today's notes
 */
export function useTodayNotes() {
  return useQuery({
    queryKey: noteKeys.today(),
    queryFn: getTodayNotes,
  });
}

/**
 * Get notes count
 */
export function useNotesCount(filters?: NoteFilters) {
  return useQuery({
    queryKey: noteKeys.count(filters),
    queryFn: () => getNotesCount(filters),
  });
}

/**
 * Create a new note
 */
export function useCreateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateNoteInput) => createNote(input),
    onSuccess: (newNote) => {
      // Invalidate all notes queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
      queryClient.invalidateQueries({ queryKey: noteKeys.today() });
      queryClient.invalidateQueries({ queryKey: noteKeys.all });

      // Optimistically add the note to the cache
      queryClient.setQueryData(noteKeys.detail(newNote.id), newNote);
    },
  });
}

/**
 * Update an existing note
 */
export function useUpdateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateNoteInput }) =>
      updateNote(id, updates),
    onSuccess: (updatedNote) => {
      // Update the note in cache
      queryClient.setQueryData(noteKeys.detail(updatedNote.id), updatedNote);

      // Invalidate lists to reflect changes
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
      queryClient.invalidateQueries({ queryKey: noteKeys.today() });
    },
  });
}

/**
 * Delete a note (soft delete)
 */
export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteNote(id),
    onSuccess: (_, deletedId) => {
      // Remove the note from detail cache
      queryClient.removeQueries({ queryKey: noteKeys.detail(deletedId) });

      // Invalidate lists to reflect deletion
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
      queryClient.invalidateQueries({ queryKey: noteKeys.today() });
      queryClient.invalidateQueries({ queryKey: noteKeys.all });
    },
  });
}
