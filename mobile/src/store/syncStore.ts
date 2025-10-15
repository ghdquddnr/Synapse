/**
 * Sync state management store (Zustand)
 * Manages sync status, progress, and error state
 */

import { create } from 'zustand';
import { SyncResult } from '@/services/sync/orchestrator';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export interface SyncProgress {
  processed: number;
  total: number;
  currentPhase: 'push' | 'pull' | null;
}

export interface SyncError {
  message: string;
  timestamp: number;
  skipReason?: string;
}

export interface SyncState {
  // Sync status
  status: SyncStatus;
  progress: SyncProgress;
  error: SyncError | null;

  // Sync history
  lastSyncTime: number | null;
  lastSyncSuccess: boolean;

  // Auto-sync configuration
  autoSyncEnabled: boolean;

  // Actions
  setStatus: (status: SyncStatus) => void;
  setProgress: (progress: Partial<SyncProgress>) => void;
  setError: (error: string | null, skipReason?: string) => void;
  updateLastSync: (success: boolean) => void;
  handleSyncResult: (result: SyncResult) => void;
  setAutoSyncEnabled: (enabled: boolean) => void;
  reset: () => void;
}

const initialProgress: SyncProgress = {
  processed: 0,
  total: 0,
  currentPhase: null,
};

export const useSyncStore = create<SyncState>((set, get) => ({
  // Initial state
  status: 'idle',
  progress: initialProgress,
  error: null,
  lastSyncTime: null,
  lastSyncSuccess: false,
  autoSyncEnabled: true,

  // Set sync status
  setStatus: (status) => {
    set({ status });

    // Reset progress when starting new sync
    if (status === 'syncing') {
      set({ progress: initialProgress, error: null });
    }
  },

  // Update sync progress
  setProgress: (progressUpdate) => {
    const currentProgress = get().progress;
    set({
      progress: { ...currentProgress, ...progressUpdate },
    });
  },

  // Set sync error
  setError: (errorMessage, skipReason) => {
    if (errorMessage) {
      set({
        status: 'error',
        error: {
          message: errorMessage,
          timestamp: Date.now(),
          skipReason,
        },
      });
    } else {
      set({ error: null });
    }
  },

  // Update last sync timestamp
  updateLastSync: (success) => {
    set({
      lastSyncTime: Date.now(),
      lastSyncSuccess: success,
    });
  },

  // Handle sync result from orchestrator
  handleSyncResult: (result) => {
    if (result.skipped) {
      // Sync was skipped (not an error, just informational)
      set({
        status: 'idle',
        error: {
          message: result.skipReason || 'Sync skipped',
          timestamp: Date.now(),
          skipReason: result.skipReason,
        },
      });
      return;
    }

    if (result.success) {
      // Calculate total progress
      const pushProcessed = result.pushResult?.totalProcessed || 0;
      const pullProcessed = result.pullResult?.totalProcessed || 0;

      set({
        status: 'success',
        progress: {
          processed: pushProcessed + pullProcessed,
          total: pushProcessed + pullProcessed,
          currentPhase: null,
        },
        error: null,
        lastSyncTime: Date.now(),
        lastSyncSuccess: true,
      });

      // Auto-reset to idle after 3 seconds
      setTimeout(() => {
        if (get().status === 'success') {
          set({ status: 'idle' });
        }
      }, 3000);
    } else {
      // Sync failed
      set({
        status: 'error',
        error: {
          message: result.error || 'Sync failed',
          timestamp: Date.now(),
        },
        lastSyncTime: Date.now(),
        lastSyncSuccess: false,
      });
    }
  },

  // Toggle auto-sync
  setAutoSyncEnabled: (enabled) => {
    set({ autoSyncEnabled: enabled });
  },

  // Reset sync state
  reset: () => {
    set({
      status: 'idle',
      progress: initialProgress,
      error: null,
    });
  },
}));
