/**
 * Sync orchestrator service
 * Coordinates push/pull sync with auto-trigger logic and locking mechanism
 */

import { pushChanges, PushResult } from './push';
import { pullChanges, PullResult } from './pull';
import { networkMonitor } from './networkMonitor';
import { appStateMonitor } from './appStateMonitor';
import { getQueueSize, shouldPauseSync } from './queue';

export interface SyncResult {
  success: boolean;
  pushResult?: PushResult;
  pullResult?: PullResult;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

export interface SyncOrchestratorConfig {
  autoSyncOnForeground?: boolean;
  autoSyncOnNetworkRecovery?: boolean;
  minSyncInterval?: number; // milliseconds
}

const DEFAULT_CONFIG: Required<SyncOrchestratorConfig> = {
  autoSyncOnForeground: true,
  autoSyncOnNetworkRecovery: true,
  minSyncInterval: 30000, // 30 seconds
};

class SyncOrchestrator {
  private config: Required<SyncOrchestratorConfig> = DEFAULT_CONFIG;
  private isSyncing: boolean = false;
  private lastSyncTime: number = 0;
  private lockExpirationTime: number = 5 * 60 * 1000; // 5 minutes

  /**
   * Initialize sync orchestrator with auto-trigger setup
   */
  initialize(config: SyncOrchestratorConfig = {}): void {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Setup network monitoring
    if (this.config.autoSyncOnNetworkRecovery) {
      networkMonitor.initialize({
        onConnectionRecovered: () => {
          this.triggerAutoSync('network_recovery');
        },
      });
    }

    // Setup app state monitoring
    if (this.config.autoSyncOnForeground) {
      appStateMonitor.initialize({
        onForeground: () => {
          this.triggerAutoSync('foreground');
        },
      });
    }
  }

  /**
   * Trigger automatic sync with reason logging
   */
  private async triggerAutoSync(reason: string): Promise<void> {
    console.log(`[SyncOrchestrator] Auto-sync triggered: ${reason}`);

    // Check if minimum interval has passed
    const now = Date.now();
    if (now - this.lastSyncTime < this.config.minSyncInterval) {
      console.log(`[SyncOrchestrator] Skipping sync - too soon (last sync ${now - this.lastSyncTime}ms ago)`);
      return;
    }

    await this.sync();
  }

  /**
   * Manual sync trigger (e.g., from settings screen button)
   */
  async manualSync(): Promise<SyncResult> {
    console.log('[SyncOrchestrator] Manual sync triggered');
    return this.sync();
  }

  /**
   * Execute full sync (push + pull)
   */
  async sync(): Promise<SyncResult> {
    // Check if already syncing
    if (this.isSyncing) {
      // Check for stale lock (deadlock prevention)
      const lockAge = Date.now() - this.lastSyncTime;
      if (lockAge < this.lockExpirationTime) {
        console.log('[SyncOrchestrator] Sync already in progress');
        return {
          success: false,
          skipped: true,
          skipReason: 'sync_in_progress',
        };
      } else {
        console.warn('[SyncOrchestrator] Stale sync lock detected, forcing release');
        this.isSyncing = false;
      }
    }

    // Check network connectivity
    const isOnline = await networkMonitor.isConnected();
    if (!isOnline) {
      console.log('[SyncOrchestrator] Skipping sync - offline');
      return {
        success: false,
        skipped: true,
        skipReason: 'offline',
      };
    }

    // Check queue health (pause if overloaded)
    const shouldPause = await shouldPauseSync();
    if (shouldPause) {
      console.warn('[SyncOrchestrator] Sync paused - queue overloaded');
      return {
        success: false,
        skipped: true,
        skipReason: 'queue_overloaded',
      };
    }

    // Acquire sync lock
    this.isSyncing = true;
    this.lastSyncTime = Date.now();

    try {
      // Step 1: Push local changes to server
      console.log('[SyncOrchestrator] Starting push sync...');
      const pushResult = await pushChanges();

      if (!pushResult.success) {
        console.error('[SyncOrchestrator] Push sync failed:', pushResult.error);
        return {
          success: false,
          pushResult,
          error: pushResult.error,
        };
      }

      console.log('[SyncOrchestrator] Push sync completed:', {
        totalProcessed: pushResult.totalProcessed,
        totalSucceeded: pushResult.totalSucceeded,
        totalFailed: pushResult.totalFailed,
      });

      // Step 2: Pull remote changes from server
      console.log('[SyncOrchestrator] Starting pull sync...');
      const pullResult = await pullChanges();

      if (!pullResult.success) {
        console.error('[SyncOrchestrator] Pull sync failed:', pullResult.error);
        return {
          success: false,
          pushResult,
          pullResult,
          error: pullResult.error,
        };
      }

      console.log('[SyncOrchestrator] Pull sync completed:', {
        totalProcessed: pullResult.totalProcessed,
        upsertedCount: pullResult.upsertedCount,
        deletedCount: pullResult.deletedCount,
        conflictsResolved: pullResult.conflictsResolved,
      });

      // Both push and pull succeeded
      return {
        success: true,
        pushResult,
        pullResult,
      };
    } catch (error) {
      console.error('[SyncOrchestrator] Sync failed with exception:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      // Release sync lock
      this.isSyncing = false;
    }
  }

  /**
   * Check if sync is currently running
   */
  isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  /**
   * Get time since last sync (milliseconds)
   */
  getTimeSinceLastSync(): number {
    return Date.now() - this.lastSyncTime;
  }

  /**
   * Get last sync timestamp
   */
  getLastSyncTime(): number {
    return this.lastSyncTime;
  }

  /**
   * Cleanup and stop monitoring
   */
  cleanup(): void {
    networkMonitor.cleanup();
    appStateMonitor.cleanup();
  }
}

// Singleton instance
export const syncOrchestrator = new SyncOrchestrator();
