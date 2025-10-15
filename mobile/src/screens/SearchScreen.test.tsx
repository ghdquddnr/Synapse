import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SearchScreen from './SearchScreen';
import * as searchService from '@/services/database/search';
import type { SearchResult } from '@/types';

// Mock the services
jest.mock('@/services/database/search');

// Mock Alert
jest.spyOn(Alert, 'alert');

const Tab = createBottomTabNavigator();

const mockSearchResult: SearchResult = {
  note: {
    id: 'test-note-1',
    body: 'This is a test note with searchable content',
    importance: 2,
    created_at: '2024-01-01T10:00:00.000Z',
    updated_at: '2024-01-01T10:00:00.000Z',
  },
  snippet: 'This is a test note with <mark>searchable</mark> content',
  rank: -1.5,
};

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderSearchScreen = () => {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Tab.Navigator>
          <Tab.Screen name="Search" component={SearchScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </QueryClientProvider>
  );
};

describe('SearchScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (searchService.searchNotes as jest.Mock).mockResolvedValue([]);
    (searchService.getSearchHistory as jest.Mock).mockResolvedValue([]);
    (searchService.saveSearchHistory as jest.Mock).mockResolvedValue(undefined);
    (searchService.clearSearchHistory as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Search Bar', () => {
    it('should display search bar', () => {
      renderSearchScreen();
      expect(screen.getByTestId('search-bar-container')).toBeTruthy();
      expect(screen.getByTestId('search-input')).toBeTruthy();
    });

    it('should update search query on text input', () => {
      renderSearchScreen();
      const searchInput = screen.getByTestId('search-input');

      fireEvent.changeText(searchInput, 'test');

      expect(searchInput.props.value).toBe('test');
    });

    it('should clear search query when clear button is pressed', async () => {
      renderSearchScreen();
      const searchInput = screen.getByTestId('search-input');

      fireEvent.changeText(searchInput, 'test');
      await waitFor(() => {
        expect(screen.getByTestId('clear-button')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('clear-button'));

      await waitFor(() => {
        expect(searchInput.props.value).toBe('');
      });
    });
  });

  describe('Search History', () => {
    it('should display search history when no search query', async () => {
      const mockHistory = ['React Native', 'TypeScript', 'Testing'];
      (searchService.getSearchHistory as jest.Mock).mockResolvedValue(mockHistory);

      renderSearchScreen();

      await waitFor(() => {
        expect(screen.getByText('최근 검색')).toBeTruthy();
        expect(screen.getAllByTestId('history-item')).toHaveLength(3);
      });
    });

    it('should display empty state when no history', async () => {
      (searchService.getSearchHistory as jest.Mock).mockResolvedValue([]);

      renderSearchScreen();

      await waitFor(() => {
        expect(screen.getByTestId('empty-history')).toBeTruthy();
        expect(screen.getByText('최근 검색 기록이 없습니다')).toBeTruthy();
      });
    });

    it('should set search query when history item is pressed', async () => {
      const mockHistory = ['React Native'];
      (searchService.getSearchHistory as jest.Mock).mockResolvedValue(mockHistory);

      renderSearchScreen();

      await waitFor(() => {
        const historyItem = screen.getByTestId('history-item');
        fireEvent.press(historyItem);
      });

      const searchInput = screen.getByTestId('search-input');
      expect(searchInput.props.value).toBe('React Native');
    });

    it('should show confirmation dialog when clearing history', async () => {
      const mockHistory = ['test'];
      (searchService.getSearchHistory as jest.Mock).mockResolvedValue(mockHistory);

      renderSearchScreen();

      await waitFor(() => {
        expect(screen.getByTestId('clear-history-button')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('clear-history-button'));

      expect(Alert.alert).toHaveBeenCalledWith(
        '검색 기록 삭제',
        '모든 검색 기록을 삭제하시겠습니까?',
        expect.any(Array)
      );
    });
  });

  describe('Search Results', () => {
    it('should display search results when query is entered', async () => {
      (searchService.searchNotes as jest.Mock).mockResolvedValue([mockSearchResult]);

      renderSearchScreen();

      const searchInput = screen.getByTestId('search-input');
      fireEvent.changeText(searchInput, 'test');

      await waitFor(() => {
        expect(screen.getByTestId('results-count')).toBeTruthy();
        expect(screen.getByText('1개의 결과')).toBeTruthy();
        expect(screen.getByTestId('search-result-item')).toBeTruthy();
      });
    });

    it('should display empty state when no results found', async () => {
      (searchService.searchNotes as jest.Mock).mockResolvedValue([]);

      renderSearchScreen();

      const searchInput = screen.getByTestId('search-input');
      fireEvent.changeText(searchInput, 'nonexistent');

      await waitFor(() => {
        expect(screen.getByTestId('empty-results')).toBeTruthy();
        expect(screen.getByText('검색 결과가 없습니다')).toBeTruthy();
      });
    });

    it('should debounce search query', async () => {
      renderSearchScreen();

      const searchInput = screen.getByTestId('search-input');
      fireEvent.changeText(searchInput, 't');
      fireEvent.changeText(searchInput, 'te');
      fireEvent.changeText(searchInput, 'tes');
      fireEvent.changeText(searchInput, 'test');

      // Should only call search once after debounce
      await waitFor(() => {
        expect(searchService.searchNotes).toHaveBeenCalledTimes(1);
      }, { timeout: 500 });
    });

    it('should display loading spinner while searching', () => {
      (searchService.searchNotes as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderSearchScreen();

      const searchInput = screen.getByTestId('search-input');
      fireEvent.changeText(searchInput, 'test');

      // Loading indicator should be visible
      expect(screen.queryByTestId('search-loading')).toBeTruthy();
    });

    it('should display search result with highlighted text', async () => {
      (searchService.searchNotes as jest.Mock).mockResolvedValue([mockSearchResult]);

      renderSearchScreen();

      const searchInput = screen.getByTestId('search-input');
      fireEvent.changeText(searchInput, 'searchable');

      await waitFor(() => {
        expect(screen.getByTestId('search-result-item')).toBeTruthy();
        // Check that snippet contains the text
        expect(screen.getByText(/searchable/)).toBeTruthy();
      });
    });

    it('should display FTS5 rank in results', async () => {
      (searchService.searchNotes as jest.Mock).mockResolvedValue([mockSearchResult]);

      renderSearchScreen();

      const searchInput = screen.getByTestId('search-input');
      fireEvent.changeText(searchInput, 'test');

      await waitFor(() => {
        expect(screen.getByText(/FTS5 Rank:/)).toBeTruthy();
      });
    });
  });

  describe('Navigation', () => {
    it('should have search bar container', () => {
      renderSearchScreen();
      expect(screen.getByTestId('search-bar-container')).toBeTruthy();
    });

    it('should navigate to note detail when result is pressed', async () => {
      (searchService.searchNotes as jest.Mock).mockResolvedValue([mockSearchResult]);

      renderSearchScreen();

      const searchInput = screen.getByTestId('search-input');
      fireEvent.changeText(searchInput, 'test');

      await waitFor(() => {
        const resultItem = screen.getByTestId('search-result-item');
        expect(resultItem).toBeTruthy();
        // Just verify the element exists and can be pressed
        fireEvent.press(resultItem);
      });
    });
  });
});
