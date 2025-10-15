// React Query hooks for Search operations

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  searchNotes,
  saveSearchHistory,
  getSearchHistory,
  clearSearchHistory,
  getSearchSuggestions,
  countSearchResults,
} from '@/services/database/search';
import type { SearchResult } from '@/types';

// Query keys
export const searchKeys = {
  all: ['search'] as const,
  results: (query: string) => [...searchKeys.all, 'results', query] as const,
  count: (query: string) => [...searchKeys.all, 'count', query] as const,
  history: () => [...searchKeys.all, 'history'] as const,
  suggestions: (prefix: string) => [...searchKeys.all, 'suggestions', prefix] as const,
};

/**
 * Search notes with FTS5
 * @param query - Search query string
 * @param limit - Maximum number of results (default: 50)
 * @param enabled - Whether to enable the query (default: true)
 */
export function useSearchNotes(query: string, limit: number = 50, enabled: boolean = true) {
  return useQuery({
    queryKey: searchKeys.results(query),
    queryFn: () => searchNotes(query, limit),
    enabled: enabled && query.trim().length > 0,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Count search results
 * @param query - Search query string
 * @param enabled - Whether to enable the query (default: true)
 */
export function useSearchCount(query: string, enabled: boolean = true) {
  return useQuery({
    queryKey: searchKeys.count(query),
    queryFn: () => countSearchResults(query),
    enabled: enabled && query.trim().length > 0,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Get search history
 * @param limit - Maximum number of history items (default: 10)
 */
export function useSearchHistory(limit: number = 10) {
  return useQuery({
    queryKey: searchKeys.history(),
    queryFn: () => getSearchHistory(limit),
    staleTime: 60000, // 1 minute
  });
}

/**
 * Get search suggestions based on prefix
 * @param prefix - Prefix to search for
 * @param limit - Maximum number of suggestions (default: 5)
 * @param enabled - Whether to enable the query (default: true)
 */
export function useSearchSuggestions(
  prefix: string,
  limit: number = 5,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: searchKeys.suggestions(prefix),
    queryFn: () => getSearchSuggestions(prefix, limit),
    enabled: enabled && prefix.trim().length > 0,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Save search to history
 */
export function useSaveSearchHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (query: string) => saveSearchHistory(query),
    onSuccess: () => {
      // Invalidate search history to refresh
      queryClient.invalidateQueries({ queryKey: searchKeys.history() });
    },
  });
}

/**
 * Clear all search history
 */
export function useClearSearchHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => clearSearchHistory(),
    onSuccess: () => {
      // Invalidate search history to refresh
      queryClient.invalidateQueries({ queryKey: searchKeys.history() });
    },
  });
}
