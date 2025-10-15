// Sync protocol types

import { ChangeLogEntry } from './index';

export interface SyncPushRequest {
  device_id: string;
  changes: ChangeLogEntry[];
}

export interface SyncPushItemResult {
  entity_id: string;
  success: boolean;
  error?: string;
}

export interface SyncPushResponse {
  success_count: number;
  failure_count: number;
  results: SyncPushItemResult[];
  new_checkpoint: string;
}

export interface SyncPullRequest {
  device_id: string;
  checkpoint?: string;
}

export interface Delta {
  entity_type: 'note' | 'relation' | 'reflection' | 'note_keyword';
  entity_id: string;
  operation: 'upsert' | 'delete';
  data?: unknown; // Entity data for upsert
  updated_at: string; // ISO 8601
  server_timestamp: string; // ISO 8601
}

export interface SyncPullResponse {
  has_more: boolean;
  changes: Delta[];
  new_checkpoint: string;
  total_changes: number;
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
