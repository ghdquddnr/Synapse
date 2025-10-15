/**
 * React Query hooks for app settings and statistics
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { getNotesCount } from '@/services/database/notes';
import { getReflectionCount } from '@/services/database/reflections';
import { getRelationCount } from '@/services/database/relations';
import { syncOrchestrator } from '@/services/sync/orchestrator';
import { useSyncStore } from '@/store/syncStore';

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
 * Uses Zustand sync store
 */
export function useSyncStatus() {
  const status = useSyncStore((state) => state.status);
  const lastSyncTime = useSyncStore((state) => state.lastSyncTime);
  const error = useSyncStore((state) => state.error);

  return {
    lastSyncedAt: lastSyncTime ? new Date(lastSyncTime).toISOString() : null,
    isSyncing: status === 'syncing',
    syncError: error?.message || null,
  };
}

/**
 * Hook to trigger manual sync
 * Uses sync orchestrator and updates sync store
 */
export function useTriggerSync() {
  const setStatus = useSyncStore((state) => state.setStatus);
  const handleSyncResult = useSyncStore((state) => state.handleSyncResult);
  const status = useSyncStore((state) => state.status);

  const mutation = useMutation({
    mutationFn: async () => {
      setStatus('syncing');
      const result = await syncOrchestrator.manualSync();
      return result;
    },
    onSuccess: (result) => {
      handleSyncResult(result);
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      handleSyncResult({
        success: false,
        error: errorMessage,
      });
    },
  });

  return {
    triggerSync: mutation.mutateAsync,
    isSyncing: status === 'syncing' || mutation.isPending,
  };
}
