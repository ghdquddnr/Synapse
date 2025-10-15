// Sync protocol types

import { ChangeLogEntry } from './index';

export interface SyncBatch {
  changes: ChangeLogEntry[];
  checkpoint: string;
  device_id: string;
}

export interface SyncPushResponse {
  success_count: number;
  failed_items: {
    id: number;
    error: string;
  }[];
  new_checkpoint: string;
}

export interface Delta {
  operation: 'upsert' | 'delete';
  entity_type: 'note' | 'relation' | 'reflection' | 'note_keyword';
  entity_id: string;
  data?: any; // Entity data for upsert
  server_timestamp: string;
}

export interface SyncPullResponse {
  deltas: Delta[];
  new_checkpoint: string;
  has_more: boolean;
}

export interface SyncResult {
  push_success: boolean;
  pull_success: boolean;
  pushed_count: number;
  pulled_count: number;
  conflicts_count: number;
  error?: string;
}

export interface QueueStatus {
  size: number;
  limit: number;
  is_full: boolean;
  is_readonly: boolean;
}

export interface ConflictLog {
  id: number;
  entity_type: string;
  entity_id: string;
  local_data: string; // JSON
  remote_data: string; // JSON
  resolution: 'local_wins' | 'remote_wins';
  resolved_at: string;
}
