import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import SearchBar from '@/components/SearchBar';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useSearchNotes, useSearchHistory, useSaveSearchHistory, useClearSearchHistory } from '@/hooks/useSearch';
import { highlightText, type HighlightSegment } from '@/utils/highlight';
import { Colors } from '@/constants';
import type { SearchResult } from '@/types';
import type { RootStackParamList } from '@/navigation/RootNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SearchScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // React Query hooks
  const { data: searchResults = [], isLoading: isSearching } = useSearchNotes(
    debouncedQuery,
    50,
    debouncedQuery.length > 0
  );
  const { data: searchHistory = [], isLoading: isLoadingHistory } = useSearchHistory(10);
  const saveSearchMutation = useSaveSearchHistory();
  const clearHistoryMutation = useClearSearchHistory();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Save search to history when user performs search
  useEffect(() => {
    if (debouncedQuery.trim().length > 0 && searchResults.length > 0) {
      saveSearchMutation.mutate(debouncedQuery.trim());
    }
  }, [debouncedQuery, searchResults.length]);

  const handleSearchQueryChange = (text: string) => {
    setSearchQuery(text);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setDebouncedQuery('');
  };

  const handleHistoryItemPress = (query: string) => {
    setSearchQuery(query);
    setDebouncedQuery(query);
  };

  const handleClearHistory = () => {
    Alert.alert('검색 기록 삭제', '모든 검색 기록을 삭제하시겠습니까?', [
      {
        text: '취소',
        style: 'cancel',
      },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          clearHistoryMutation.mutate();
        },
      },
    ]);
  };

  const handleResultPress = (result: SearchResult) => {
    navigation.navigate('NoteDetail', { noteId: result.note.id });
  };

  const renderHighlightedText = (segments: HighlightSegment[]) => {
    return (
      <Text style={styles.resultSnippet}>
        {segments.map((segment, index) => (
          <Text
            key={index}
            style={[
              styles.snippetText,
              segment.isHighlighted && styles.highlightedText,
            ]}
          >
            {segment.text}
          </Text>
        ))}
      </Text>
    );
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => {
    const highlightedSnippet = highlightText(item.snippet || item.note.body, debouncedQuery);

    return (
      <TouchableOpacity
        style={styles.resultCard}
        onPress={() => handleResultPress(item)}
        activeOpacity={0.7}
        testID="search-result-item"
      >
        <View style={styles.resultHeader}>
          <Ionicons name="document-text-outline" size={20} color={Colors.light.textSecondary} />
          <Text style={styles.resultRank} testID="result-rank">
            #{Math.abs(Math.round(item.rank))}
          </Text>
        </View>

        <View style={styles.resultBody}>
          {renderHighlightedText(highlightedSnippet)}
        </View>

        <View style={styles.resultFooter}>
          <Ionicons name="search" size={14} color={Colors.light.textTertiary} />
          <Text style={styles.resultMeta}>
            FTS5 Rank: {item.rank.toFixed(2)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHistoryItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.historyItem}
      onPress={() => handleHistoryItemPress(item)}
      activeOpacity={0.7}
      testID="history-item"
    >
      <Ionicons name="time-outline" size={20} color={Colors.light.textSecondary} />
      <Text style={styles.historyText}>{item}</Text>
      <Ionicons name="arrow-forward" size={16} color={Colors.light.textTertiary} />
    </TouchableOpacity>
  );

  const renderEmptyResults = () => (
    <View style={styles.emptyState} testID="empty-results">
      <Ionicons name="search-outline" size={64} color={Colors.light.textTertiary} />
      <Text style={styles.emptyStateText}>검색 결과가 없습니다</Text>
      <Text style={styles.emptyStateSubtext}>다른 검색어를 입력해보세요</Text>
    </View>
  );

  const renderEmptyHistory = () => (
    <View style={styles.emptyState} testID="empty-history">
      <Ionicons name="time-outline" size={64} color={Colors.light.textTertiary} />
      <Text style={styles.emptyStateText}>최근 검색 기록이 없습니다</Text>
      <Text style={styles.emptyStateSubtext}>검색을 시작해보세요</Text>
    </View>
  );

  const showSearchResults = debouncedQuery.length > 0;
  const showHistory = !showSearchResults && !isLoadingHistory;

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={handleSearchQueryChange}
          onClear={handleClearSearch}
          placeholder="노트 검색..."
          autoFocus
          loading={isSearching}
        />
      </View>

      {/* Results or History */}
      {showSearchResults ? (
        <>
          {/* Results Header */}
          {searchResults.length > 0 && (
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsCount} testID="results-count">
                {searchResults.length}개의 결과
              </Text>
            </View>
          )}

          {/* Results List */}
          {isSearching ? (
            <LoadingSpinner />
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.note.id}
              renderItem={renderSearchResult}
              ListEmptyComponent={renderEmptyResults()}
              contentContainerStyle={[
                styles.listContent,
                searchResults.length === 0 && styles.listContentCentered,
              ]}
              showsVerticalScrollIndicator={false}
              testID="search-results-list"
            />
          )}
        </>
      ) : showHistory ? (
        <>
          {/* History Header */}
          {searchHistory.length > 0 && (
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>최근 검색</Text>
              <TouchableOpacity
                onPress={handleClearHistory}
                testID="clear-history-button"
              >
                <Text style={styles.clearHistoryText}>전체 삭제</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* History List */}
          <FlatList
            data={searchHistory}
            keyExtractor={(item, index) => `${item}-${index}`}
            renderItem={renderHistoryItem}
            ListEmptyComponent={renderEmptyHistory()}
            contentContainerStyle={[
              styles.listContent,
              searchHistory.length === 0 && styles.listContentCentered,
            ]}
            showsVerticalScrollIndicator={false}
            testID="search-history-list"
          />
        </>
      ) : (
        <LoadingSpinner />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  searchBarContainer: {
    padding: 16,
    backgroundColor: Colors.light.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  listContent: {
    padding: 16,
  },
  listContentCentered: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  resultCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  resultRank: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  resultBody: {
    marginBottom: 8,
  },
  resultSnippet: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.text,
  },
  snippetText: {
    fontSize: 14,
    color: Colors.light.text,
  },
  highlightedText: {
    backgroundColor: Colors.light.highlight,
    color: Colors.light.highlightText,
    fontWeight: '600',
  },
  resultFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resultMeta: {
    fontSize: 12,
    color: Colors.light.textTertiary,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  clearHistoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.error,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.light.card,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  historyText: {
    flex: 1,
    fontSize: 15,
    color: Colors.light.text,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.light.textTertiary,
    marginTop: 8,
  },
});
