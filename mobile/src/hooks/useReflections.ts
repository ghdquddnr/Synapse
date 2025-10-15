/**
 * React Query hooks for reflection operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createReflection,
  getReflection,
  updateReflection,
  deleteReflection,
  getRecentReflections,
  getWeeklyKeywords,
} from '@/services/database/reflections';
import type { Reflection } from '@/types';

// Query keys
const QUERY_KEYS = {
  reflection: (date: string) => ['reflection', date] as const,
  recentReflections: (limit: number) => ['reflections', 'recent', limit] as const,
  weeklyKeywords: (weekKey: string) => ['reflections', 'keywords', weekKey] as const,
};

/**
 * Hook to fetch a single reflection by date
 */
export function useReflection(date: string) {
  return useQuery({
    queryKey: QUERY_KEYS.reflection(date),
    queryFn: () => getReflection(date),
    enabled: !!date,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch recent reflections
 */
export function useRecentReflections(limit = 7) {
  return useQuery({
    queryKey: QUERY_KEYS.recentReflections(limit),
    queryFn: () => getRecentReflections(limit),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch weekly keywords
 */
export function useWeeklyKeywords(weekKey: string) {
  return useQuery({
    queryKey: QUERY_KEYS.weeklyKeywords(weekKey),
    queryFn: () => getWeeklyKeywords(weekKey),
    enabled: !!weekKey,
    staleTime: 1000 * 60 * 30, // 30 minutes (keywords don't change often)
  });
}

/**
 * Hook to create or update a reflection
 * Automatically detects if reflection exists and uses appropriate operation
 */
export function useSaveReflection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ date, content }: { date: string; content: string }) => {
      const existing = await getReflection(date);
      if (existing) {
        return updateReflection(date, content);
      } else {
        return createReflection(content, date);
      }
    },
    onSuccess: (data) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.reflection(data.date) });
      queryClient.invalidateQueries({ queryKey: ['reflections', 'recent'] });
    },
  });
}

/**
 * Hook to delete a reflection
 */
export function useDeleteReflection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (date: string) => deleteReflection(date),
    onSuccess: (_data, date) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.reflection(date) });
      queryClient.invalidateQueries({ queryKey: ['reflections', 'recent'] });
    },
  });
}

/**
 * Helper to get current week key in YYYY-WW format (ISO week)
 */
export function getCurrentWeekKey(): string {
  const now = new Date();
  const year = now.getFullYear();

  // Get ISO week number
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setDate(jan4.getDate() - jan4Day + 1);

  const diffMs = now.getTime() - week1Monday.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const week = Math.floor(diffDays / 7) + 1;

  return `${year}-${String(week).padStart(2, '0')}`;
}

/**
 * Helper to format date to YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Helper to get today's date in YYYY-MM-DD format
 */
export function getTodayDate(): string {
  return formatDate(new Date());
}
