import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  FlatList,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useRelatedNotes, useCreateRelation, useDeleteRelation } from '@/hooks/useRelations';
import { useTodayNotes } from '@/hooks/useNotes';
import { Colors } from '@/constants';
import type { Note, Relation } from '@/types';

interface RelationListProps {
  noteId: string;
  onNotePress?: (noteId: string) => void;
}

export default function RelationList({ noteId, onNotePress }: RelationListProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // React Query hooks
  const { data: relatedNotes = [], isLoading, error, refetch } = useRelatedNotes(noteId);
  const createRelationMutation = useCreateRelation();
  const deleteRelationMutation = useDeleteRelation();

  // Get available notes for adding relations (excluding current note and already related)
  const { data: allNotes = [] } = useTodayNotes();

  const handleAddRelation = async () => {
    if (!selectedNoteId) {
      Alert.alert('노트 선택', '연결할 노트를 선택해주세요.');
      return;
    }

    try {
      await createRelationMutation.mutateAsync({
        from_note_id: noteId,
        to_note_id: selectedNoteId,
        relation_type: 'related',
        source: 'manual',
      });

      setShowAddModal(false);
      setSelectedNoteId(null);
      setSearchQuery('');
      Alert.alert('연결 완료', '노트가 연결되었습니다.');
    } catch (error) {
      Alert.alert(
        '연결 실패',
        `노트 연결 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      );
    }
  };

  const handleDeleteRelation = (relationId: string, noteTitle: string) => {
    Alert.alert('연결 삭제', `"${noteTitle}"와(과)의 연결을 삭제하시겠습니까?`, [
      {
        text: '취소',
        style: 'cancel',
      },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteRelationMutation.mutateAsync(relationId);
          } catch (error) {
            Alert.alert(
              '삭제 실패',
              `연결 삭제 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
            );
          }
        },
      },
    ]);
  };

  const getFirstLine = (body: string, maxLength: number = 40): string => {
    const firstLine = body.split('\n')[0];
    if (firstLine.length > maxLength) {
      return firstLine.substring(0, maxLength) + '...';
    }
    return firstLine;
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return format(date, 'MM/dd HH:mm', { locale: ko });
    } catch {
      return '';
    }
  };

  const getRelationTypeLabel = (type: string): string => {
    switch (type) {
      case 'related':
        return '연결됨';
      case 'parent_child':
        return '부모-자식';
      case 'similar':
        return '유사함';
      case 'custom':
        return '사용자 정의';
      default:
        return type;
    }
  };

  const getDirectionIcon = (direction: 'outgoing' | 'incoming'): keyof typeof Ionicons.glyphMap => {
    return direction === 'outgoing' ? 'arrow-forward' : 'arrow-back';
  };

  // Filter available notes
  const relatedNoteIds = new Set(relatedNotes.map((rn) => rn.note.id));
  const availableNotes = allNotes.filter(
    (note) =>
      note.id !== noteId &&
      !relatedNoteIds.has(note.id) &&
      note.body.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderRelatedNote = ({
    item,
  }: {
    item: { relation: Relation; note: Note; direction: 'outgoing' | 'incoming' };
  }) => (
    <View style={styles.relationCard}>
      <TouchableOpacity
        style={styles.relationContent}
        onPress={() => onNotePress?.(item.note.id)}
        activeOpacity={0.7}
      >
        <View style={styles.relationHeader}>
          <View style={styles.relationTitleRow}>
            <Ionicons
              name={getDirectionIcon(item.direction)}
              size={16}
              color={Colors.light.textSecondary}
            />
            <Text style={styles.relationTitle} numberOfLines={1}>
              {getFirstLine(item.note.body)}
            </Text>
          </View>
          <Text style={styles.relationType}>{getRelationTypeLabel(item.relation.relation_type)}</Text>
        </View>

        {item.relation.rationale && (
          <Text style={styles.rationale} numberOfLines={2}>
            {item.relation.rationale}
          </Text>
        )}

        <View style={styles.relationFooter}>
          <Text style={styles.relationDate}>{formatDate(item.relation.created_at)}</Text>
          {item.relation.source === 'ai' && (
            <View style={styles.aiSourceBadge}>
              <Ionicons name="sparkles" size={12} color={Colors.light.primary} />
              <Text style={styles.aiSourceText}>AI</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteRelation(item.relation.id, getFirstLine(item.note.body))}
        testID="delete-relation-button"
      >
        <Ionicons name="close-circle" size={20} color={Colors.light.error} />
      </TouchableOpacity>
    </View>
  );

  const renderAvailableNote = ({ item }: { item: Note }) => (
    <TouchableOpacity
      style={[
        styles.availableNoteCard,
        selectedNoteId === item.id && styles.availableNoteCardSelected,
      ]}
      onPress={() => setSelectedNoteId(item.id)}
      activeOpacity={0.7}
      testID="available-note-item"
    >
      <View style={styles.availableNoteContent}>
        <Text style={styles.availableNoteTitle} numberOfLines={1}>
          {getFirstLine(item.body)}
        </Text>
        <Text style={styles.availableNoteDate}>{formatDate(item.created_at)}</Text>
      </View>
      {selectedNoteId === item.id && (
        <Ionicons name="checkmark-circle" size={24} color={Colors.light.primary} />
      )}
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={Colors.light.primary} />
        <Text style={styles.loadingText}>연결 불러오는 중...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={32} color={Colors.light.error} />
        <Text style={styles.errorText}>연결을 불러올 수 없습니다</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.count}>{relatedNotes.length}개 연결됨</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
          testID="add-relation-button"
        >
          <Ionicons name="add-circle-outline" size={20} color={Colors.light.primary} />
          <Text style={styles.addButtonText}>추가</Text>
        </TouchableOpacity>
      </View>

      {relatedNotes.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="git-network-outline" size={48} color={Colors.light.textTertiary} />
          <Text style={styles.emptyStateText}>연결된 노트가 없습니다</Text>
          <Text style={styles.emptyStateSubtext}>관련 노트를 연결해보세요</Text>
        </View>
      ) : (
        <FlatList
          data={relatedNotes}
          keyExtractor={(item) => item.relation.id}
          renderItem={renderRelatedNote}
          scrollEnabled={false}
          testID="relations-list"
        />
      )}

      {/* Add Relation Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>노트 연결</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)} testID="close-modal-button">
                <Ionicons name="close" size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="노트 검색..."
              placeholderTextColor={Colors.light.textPlaceholder}
              testID="search-input"
            />

            <FlatList
              data={availableNotes}
              keyExtractor={(item) => item.id}
              renderItem={renderAvailableNote}
              ListEmptyComponent={
                <View style={styles.emptySearch}>
                  <Text style={styles.emptySearchText}>연결 가능한 노트가 없습니다</Text>
                </View>
              }
              style={styles.availableNotesList}
              testID="available-notes-list"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowAddModal(false);
                  setSelectedNoteId(null);
                  setSearchQuery('');
                }}
                testID="cancel-button"
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, !selectedNoteId && styles.confirmButtonDisabled]}
                onPress={handleAddRelation}
                disabled={!selectedNoteId || createRelationMutation.isPending}
                testID="confirm-button"
              >
                {createRelationMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmButtonText}>연결</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  count: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.textSecondary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.primary,
  },
  relationCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
    flexDirection: 'row',
  },
  relationContent: {
    flex: 1,
    padding: 12,
  },
  relationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  relationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  relationTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
    flex: 1,
  },
  relationType: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    backgroundColor: Colors.light.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rationale: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginBottom: 4,
    lineHeight: 18,
  },
  relationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  relationDate: {
    fontSize: 12,
    color: Colors.light.textTertiary,
  },
  aiSourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.light.backgroundSecondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  aiSourceText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  deleteButton: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.textSecondary,
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: Colors.light.textTertiary,
    marginTop: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: Colors.light.error,
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.light.primary,
    borderRadius: 6,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.light.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  searchInput: {
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    padding: 12,
    margin: 16,
    marginBottom: 8,
    fontSize: 14,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  availableNotesList: {
    maxHeight: 400,
    paddingHorizontal: 16,
  },
  availableNoteCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  availableNoteCardSelected: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  availableNoteContent: {
    flex: 1,
    gap: 4,
  },
  availableNoteTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
  },
  availableNoteDate: {
    fontSize: 12,
    color: Colors.light.textTertiary,
  },
  emptySearch: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptySearchText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: 0,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  confirmButton: {
    flex: 1,
    padding: 14,
    backgroundColor: Colors.light.primary,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
