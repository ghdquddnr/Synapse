// Full-text search functionality using FTS5

import { getDatabase } from './connection';
import {
  TABLE_NOTES,
  TABLE_NOTES_FTS,
  TABLE_SEARCH_HISTORY,
  SEARCH_RESULT_LIMIT,
  MAX_SEARCH_HISTORY,
} from '@/constants/database';
import { Note, SearchResult } from '@/types';
import { QueryError } from '@/types/database';

/**
 * Search notes using FTS5 full-text search
 * @param query Search query string
 * @param limit Maximum number of results (default: SEARCH_RESULT_LIMIT)
 * @returns Array of search results with highlighted snippets
 */
export async function searchNotes(
  query: string,
  limit: number = SEARCH_RESULT_LIMIT
): Promise<SearchResult[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const db = await getDatabase();

  try {
    // FTS5 query with ranking and snippet
    const sql = `
      SELECT
        n.id,
        n.body,
        n.importance,
        n.source_url,
        n.image_path,
        n.created_at,
        n.updated_at,
        n.deleted_at,
        n.server_timestamp,
        snippet(${TABLE_NOTES_FTS}, 0, '<mark>', '</mark>', '...', 32) as snippet,
        rank as rank
      FROM ${TABLE_NOTES_FTS} fts
      INNER JOIN ${TABLE_NOTES} n ON n.rowid = fts.rowid
      WHERE ${TABLE_NOTES_FTS} MATCH ?
        AND n.deleted_at IS NULL
      ORDER BY rank
      LIMIT ?
    `;

    const results = await db.getAllAsync<
      Note & { snippet: string; rank: number }
    >(sql, [query, limit]);

    return results.map((row) => ({
      note: {
        id: row.id,
        body: row.body,
        importance: row.importance,
        source_url: row.source_url,
        image_path: row.image_path,
        created_at: row.created_at,
        updated_at: row.updated_at,
        deleted_at: row.deleted_at,
        server_timestamp: row.server_timestamp,
      },
      snippet: row.snippet,
      rank: row.rank,
    }));
  } catch (error) {
    throw new QueryError(
      `Failed to search notes: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Save search query to history
 * @param query Search query to save
 */
export async function saveSearchHistory(query: string): Promise<void> {
  if (!query || query.trim().length === 0) {
    return;
  }

  const db = await getDatabase();

  try {
    // Insert search query
    await db.runAsync(
      `INSERT INTO ${TABLE_SEARCH_HISTORY} (query, searched_at) VALUES (?, ?)`,
      [query.trim(), new Date().toISOString()]
    );

    // Clean up old history if exceeds limit
    await db.runAsync(
      `DELETE FROM ${TABLE_SEARCH_HISTORY}
       WHERE id NOT IN (
         SELECT id FROM ${TABLE_SEARCH_HISTORY}
         ORDER BY searched_at DESC
         LIMIT ?
       )`,
      [MAX_SEARCH_HISTORY]
    );
  } catch (error) {
    throw new QueryError(
      `Failed to save search history: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Get recent search history
 * @param limit Maximum number of history entries (default: 10)
 * @returns Array of recent search queries (most recent first)
 */
export async function getSearchHistory(limit: number = 10): Promise<string[]> {
  const db = await getDatabase();

  try {
    const results = await db.getAllAsync<{ query: string }>(
      `SELECT DISTINCT query
       FROM ${TABLE_SEARCH_HISTORY}
       ORDER BY searched_at DESC
       LIMIT ?`,
      [limit]
    );

    return results.map((row) => row.query);
  } catch (error) {
    throw new QueryError(
      `Failed to get search history: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Clear all search history
 */
export async function clearSearchHistory(): Promise<void> {
  const db = await getDatabase();

  try {
    await db.runAsync(`DELETE FROM ${TABLE_SEARCH_HISTORY}`);
  } catch (error) {
    throw new QueryError(
      `Failed to clear search history: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Search notes with autocomplete suggestions
 * @param query Partial query string
 * @param limit Maximum number of suggestions (default: 5)
 * @returns Array of suggested search queries
 */
export async function getSearchSuggestions(
  query: string,
  limit: number = 5
): Promise<string[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const db = await getDatabase();

  try {
    // Get suggestions from search history
    const results = await db.getAllAsync<{ query: string }>(
      `SELECT DISTINCT query
       FROM ${TABLE_SEARCH_HISTORY}
       WHERE query LIKE ?
       ORDER BY searched_at DESC
       LIMIT ?`,
      [`${query.trim()}%`, limit]
    );

    return results.map((row) => row.query);
  } catch (error) {
    throw new QueryError(
      `Failed to get search suggestions: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Count total search results for a query (without limit)
 * @param query Search query string
 * @returns Total number of matching notes
 */
export async function countSearchResults(query: string): Promise<number> {
  if (!query || query.trim().length === 0) {
    return 0;
  }

  const db = await getDatabase();

  try {
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count
       FROM ${TABLE_NOTES_FTS} fts
       INNER JOIN ${TABLE_NOTES} n ON n.rowid = fts.rowid
       WHERE ${TABLE_NOTES_FTS} MATCH ?
         AND n.deleted_at IS NULL`,
      [query]
    );

    return result?.count || 0;
  } catch (error) {
    throw new QueryError(
      `Failed to count search results: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : undefined
    );
  }
}
