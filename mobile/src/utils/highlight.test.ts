import {
  highlightText,
  getHighlightedExcerpt,
  countOccurrences,
  containsSearchTerm,
} from './highlight';

describe('highlight utility', () => {
  describe('highlightText', () => {
    it('should return single segment for empty search term', () => {
      const result = highlightText('Hello world', '');
      expect(result).toEqual([{ text: 'Hello world', isHighlighted: false }]);
    });

    it('should highlight exact match', () => {
      const result = highlightText('Hello world', 'world');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ text: 'Hello ', isHighlighted: false });
      expect(result[1]).toEqual({ text: 'world', isHighlighted: true });
    });

    it('should highlight case-insensitive by default', () => {
      const result = highlightText('Hello World', 'world');
      expect(result).toHaveLength(2);
      expect(result[1]).toEqual({ text: 'World', isHighlighted: true });
    });

    it('should highlight case-sensitive when specified', () => {
      const result = highlightText('Hello World', 'world', true);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ text: 'Hello World', isHighlighted: false });
    });

    it('should highlight multiple occurrences', () => {
      const result = highlightText('test test test', 'test');
      expect(result).toHaveLength(5); // test + space + test + space + test
      expect(result.filter(s => s.isHighlighted)).toHaveLength(3);
    });

    it('should escape special regex characters', () => {
      const result = highlightText('Hello (world)', '(world)');
      expect(result).toHaveLength(2);
      expect(result[1]).toEqual({ text: '(world)', isHighlighted: true });
    });
  });

  describe('getHighlightedExcerpt', () => {
    it('should return null for empty search term', () => {
      const result = getHighlightedExcerpt('Hello world', '');
      expect(result).toBeNull();
    });

    it('should return null when term not found', () => {
      const result = getHighlightedExcerpt('Hello world', 'test');
      expect(result).toBeNull();
    });

    it('should return excerpt with highlighted term', () => {
      const text = 'This is a long text with the word test in the middle';
      const result = getHighlightedExcerpt(text, 'test');
      expect(result).not.toBeNull();
      expect(result!.some(s => s.isHighlighted && s.text.toLowerCase() === 'test')).toBe(true);
    });

    it('should add ellipsis when truncating', () => {
      const text = 'A'.repeat(200) + 'test' + 'B'.repeat(200);
      const result = getHighlightedExcerpt(text, 'test', 10);
      expect(result).not.toBeNull();
      const fullText = result!.map(s => s.text).join('');
      expect(fullText).toContain('...');
    });
  });

  describe('countOccurrences', () => {
    it('should return 0 for empty search term', () => {
      expect(countOccurrences('Hello world', '')).toBe(0);
    });

    it('should count single occurrence', () => {
      expect(countOccurrences('Hello world', 'world')).toBe(1);
    });

    it('should count multiple occurrences', () => {
      expect(countOccurrences('test test test', 'test')).toBe(3);
    });

    it('should count case-insensitive by default', () => {
      expect(countOccurrences('Hello HELLO hello', 'hello')).toBe(3);
    });

    it('should count case-sensitive when specified', () => {
      expect(countOccurrences('Hello HELLO hello', 'hello', true)).toBe(1);
    });
  });

  describe('containsSearchTerm', () => {
    it('should return false for empty search term', () => {
      expect(containsSearchTerm('Hello world', '')).toBe(false);
    });

    it('should return true when term exists', () => {
      expect(containsSearchTerm('Hello world', 'world')).toBe(true);
    });

    it('should return false when term does not exist', () => {
      expect(containsSearchTerm('Hello world', 'test')).toBe(false);
    });

    it('should be case-insensitive by default', () => {
      expect(containsSearchTerm('Hello World', 'world')).toBe(true);
    });

    it('should be case-sensitive when specified', () => {
      expect(containsSearchTerm('Hello World', 'world', true)).toBe(false);
      expect(containsSearchTerm('Hello World', 'World', true)).toBe(true);
    });
  });
});
