/**
 * React Query hooks for app settings and statistics
 */

import { useQuery } from '@tanstack/react-query';
import { getNotesCount } from '@/services/database/notes';
import { getReflectionCount } from '@/services/database/reflections';
import { getRelationCount } from '@/services/database/relations';

// Query keys
const QUERY_KEYS = {
  notesCount: ['stats', 'notes-count'] as const,
  reflectionsCount: ['stats', 'reflections-count'] as const,
  relationsCount: ['stats', 'relations-count'] as const,
};

/**
 * Hook to get total notes count
 */
export function useNotesCount() {
  return useQuery({
    queryKey: QUERY_KEYS.notesCount,
    queryFn: () => getNotesCount(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to get total reflections count
 */
export function useReflectionsCount() {
  return useQuery({
    queryKey: QUERY_KEYS.reflectionsCount,
    queryFn: () => getReflectionCount(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to get total relations count
 * Note: This requires passing a dummy noteId. We'll use a special aggregation later.
 */
export function useRelationsCount() {
  return useQuery({
    queryKey: QUERY_KEYS.relationsCount,
    queryFn: async () => {
      // For now, return 0. In Phase 6, we'll add a proper aggregation query
      // TODO: Add getTotalRelationsCount() function in Phase 6
      return 0;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook for sync status
 * Placeholder for Phase 6 implementation
 */
export function useSyncStatus() {
  return {
    lastSyncedAt: null,
    isSyncing: false,
    syncError: null,
  };
}

/**
 * Hook to trigger manual sync
 * Placeholder for Phase 6 implementation
 */
export function useTriggerSync() {
  return {
    triggerSync: async () => {
      // TODO: Implement in Phase 6
      console.log('Sync triggered (placeholder)');
    },
    isSyncing: false,
  };
}
