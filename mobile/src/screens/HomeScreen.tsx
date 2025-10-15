import React, { useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import NoteInput from '@/components/NoteInput';
import NoteCard from '@/components/NoteCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useCreateNote, useTodayNotes, useDeleteNote } from '@/hooks/useNotes';
import { Colors, IMPORTANCE_MEDIUM } from '@/constants';
import type { Note } from '@/types';
import type { RootStackParamList } from '@/navigation/RootNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [showOptions, setShowOptions] = useState(false);

  // React Query hooks
  const { data: todayNotes = [], isLoading, error, refetch, isRefetching } = useTodayNotes();
  const createNoteMutation = useCreateNote();
  const deleteNoteMutation = useDeleteNote();

  const handleSaveNote = async (body: string, importance: number, sourceUrl?: string) => {
    try {
      await createNoteMutation.mutateAsync({
        body,
        importance: importance as 1 | 2 | 3,
        source_url: sourceUrl,
      });
    } catch (error) {
      Alert.alert(
        '저장 실패',
        `노트 저장 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      );
    }
  };

  const handleDeleteNote = (note: Note) => {
    Alert.alert('노트 삭제', '이 노트를 삭제하시겠습니까?', [
      {
        text: '취소',
        style: 'cancel',
      },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteNoteMutation.mutateAsync(note.id);
          } catch (error) {
            Alert.alert(
              '삭제 실패',
              `노트 삭제 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
            );
          }
        },
      },
    ]);
  };

  const handlePressNote = (note: Note) => {
    navigation.navigate('NoteDetail', { noteId: note.id });
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState} testID="empty-state">
      <Ionicons name="document-text-outline" size={64} color={Colors.light.textPlaceholder} />
      <Text style={styles.emptyStateText}>오늘 작성한 노트가 없습니다</Text>
      <Text style={styles.emptyStateSubtext}>위에서 첫 노트를 작성해보세요</Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorState} testID="error-state">
      <Ionicons name="alert-circle-outline" size={64} color={Colors.light.error} />
      <Text style={styles.errorText}>노트를 불러올 수 없습니다</Text>
      <Text style={styles.errorSubtext}>
        {error instanceof Error ? error.message : '알 수 없는 오류'}
      </Text>
      <TouchableOpacity style={styles.retryButton} onPress={() => refetch()} testID="retry-button">
        <Text style={styles.retryButtonText}>다시 시도</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <NoteInput onSave={handleSaveNote} />
          <LoadingSpinner />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={todayNotes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NoteCard note={item} onPress={handlePressNote} onDelete={handleDeleteNote} />
        )}
        ListHeaderComponent={
          <>
            <NoteInput onSave={handleSaveNote} />

            {/* Options Section - Collapsible */}
            <View style={styles.optionsSection}>
              <TouchableOpacity
                style={styles.optionsHeader}
                onPress={() => setShowOptions(!showOptions)}
                activeOpacity={0.7}
                testID="options-toggle"
              >
                <Text style={styles.optionsHeaderText}>옵션</Text>
                <Ionicons
                  name={showOptions ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={Colors.light.textSecondary}
                />
              </TouchableOpacity>

              {showOptions && (
                <View style={styles.optionsContent} testID="options-content">
                  <View style={styles.optionRow}>
                    <Ionicons
                      name="information-circle-outline"
                      size={20}
                      color={Colors.light.textSecondary}
                    />
                    <Text style={styles.optionText}>
                      오늘 작성한 노트: {todayNotes.length}개
                    </Text>
                  </View>
                  {/* Future: Add filter options, sort options, etc. */}
                </View>
              )}
            </View>

            {/* Section Title */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>오늘의 노트</Text>
              <Text style={styles.sectionCount}>{todayNotes.length}</Text>
            </View>
          </>
        }
        ListEmptyComponent={error ? renderError() : renderEmptyState()}
        contentContainerStyle={[
          styles.content,
          todayNotes.length === 0 && styles.contentCentered,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={Colors.light.primary}
            colors={[Colors.light.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
        testID="notes-list"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    padding: 16,
  },
  contentCentered: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  optionsSection: {
    backgroundColor: Colors.light.card,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  optionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  optionsHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  optionsContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  optionText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    backgroundColor: Colors.light.backgroundSecondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
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
  errorState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.error,
    marginTop: 16,
  },
  errorSubtext: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.light.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
