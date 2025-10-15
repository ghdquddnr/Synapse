/**
 * Highlight utility for search term highlighting
 * Provides functions to identify and mark search terms in text
 */

export interface HighlightSegment {
  text: string;
  isHighlighted: boolean;
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Split text into segments with highlighted search terms
 * @param text - The text to process
 * @param searchTerm - The term to highlight
 * @param caseSensitive - Whether to match case-sensitively (default: false)
 * @returns Array of segments with highlight flags
 */
export function highlightText(
  text: string,
  searchTerm: string,
  caseSensitive: boolean = false
): HighlightSegment[] {
  if (!searchTerm || !searchTerm.trim()) {
    return [{ text, isHighlighted: false }];
  }

  const escapedTerm = escapeRegex(searchTerm.trim());
  const flags = caseSensitive ? 'g' : 'gi';
  const regex = new RegExp(`(${escapedTerm})`, flags);

  const parts = text.split(regex);
  const segments: HighlightSegment[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    const isMatch = caseSensitive
      ? part === searchTerm.trim()
      : part.toLowerCase() === searchTerm.trim().toLowerCase();

    segments.push({
      text: part,
      isHighlighted: isMatch,
    });
  }

  return segments;
}

/**
 * Get highlighted excerpt around search term
 * @param text - The full text
 * @param searchTerm - The term to highlight
 * @param contextLength - Number of characters before/after match (default: 50)
 * @returns Highlighted excerpt or null if no match
 */
export function getHighlightedExcerpt(
  text: string,
  searchTerm: string,
  contextLength: number = 50
): HighlightSegment[] | null {
  if (!searchTerm || !searchTerm.trim()) {
    return null;
  }

  const escapedTerm = escapeRegex(searchTerm.trim());
  const regex = new RegExp(escapedTerm, 'i');
  const match = text.match(regex);

  if (!match || match.index === undefined) {
    return null;
  }

  const matchStart = match.index;
  const matchEnd = matchStart + match[0].length;

  // Calculate excerpt boundaries
  const start = Math.max(0, matchStart - contextLength);
  const end = Math.min(text.length, matchEnd + contextLength);

  // Extract excerpt
  let excerpt = text.substring(start, end);

  // Add ellipsis if truncated
  if (start > 0) {
    excerpt = '...' + excerpt;
  }
  if (end < text.length) {
    excerpt = excerpt + '...';
  }

  // Highlight the search term in excerpt
  return highlightText(excerpt, searchTerm);
}

/**
 * Count occurrences of search term in text
 * @param text - The text to search
 * @param searchTerm - The term to count
 * @param caseSensitive - Whether to match case-sensitively (default: false)
 * @returns Number of occurrences
 */
export function countOccurrences(
  text: string,
  searchTerm: string,
  caseSensitive: boolean = false
): number {
  if (!searchTerm || !searchTerm.trim()) {
    return 0;
  }

  const escapedTerm = escapeRegex(searchTerm.trim());
  const flags = caseSensitive ? 'g' : 'gi';
  const regex = new RegExp(escapedTerm, flags);

  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

/**
 * Check if text contains search term
 * @param text - The text to search
 * @param searchTerm - The term to find
 * @param caseSensitive - Whether to match case-sensitively (default: false)
 * @returns Whether the text contains the search term
 */
export function containsSearchTerm(
  text: string,
  searchTerm: string,
  caseSensitive: boolean = false
): boolean {
  if (!searchTerm || !searchTerm.trim()) {
    return false;
  }

  if (caseSensitive) {
    return text.includes(searchTerm.trim());
  }

  return text.toLowerCase().includes(searchTerm.trim().toLowerCase());
}
