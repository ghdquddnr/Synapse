// API request and response types

import { Delta } from './sync';

// Authentication
export interface LoginRequest {
  email: string;
  password: string;
  device_id: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface RefreshRequest {
  refresh_token: string;
}

// Sync
export interface SyncPushRequest {
  changes: {
    entity_type: string;
    entity_id: string;
    operation: string;
    payload: any;
    client_timestamp: string;
  }[];
  checkpoint: string;
  device_id: string;
}

export interface SyncPullRequest {
  checkpoint: string;
  limit?: number;
}

// Recommendations
export interface RecommendationResult {
  note_id: string;
  score: number;
  reason: string;
  note_preview: string;
  created_at: string;
}

export interface RecommendationResponse {
  recommendations: RecommendationResult[];
  total_count: number;
}

// Weekly Report
export interface ClusterSummary {
  cluster_id: number;
  note_count: number;
  representative_sentence: string;
  keywords: string[];
}

export interface WeeklyReportResponse {
  week_key: string;
  summary: string;
  clusters: ClusterSummary[];
  top_keywords: { name: string; count: number }[];
  new_keywords: string[];
  repeated_keywords: string[];
  suggested_connections: {
    from_note_id: string;
    to_note_id: string;
    similarity: number;
  }[];
  created_at: string;
}

// Error response
export interface APIError {
  detail: string;
  code?: string;
  field?: string;
}
