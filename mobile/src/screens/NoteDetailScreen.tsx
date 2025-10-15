import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/RootNavigator';
import { useNote, useUpdateNote, useDeleteNote } from '@/hooks/useNotes';
import LoadingSpinner from '@/components/LoadingSpinner';
import RelationList from '@/components/RelationList';
import RecommendationCard from '@/components/RecommendationCard';
import { useCreateRelation } from '@/hooks/useRelations';
import { Colors, IMPORTANCE_HIGH, IMPORTANCE_MEDIUM, IMPORTANCE_LOW } from '@/constants';
import type { Note } from '@/types';

type Props = NativeStackScreenProps<RootStackParamList, 'NoteDetail'>;

export default function NoteDetailScreen({ route, navigation }: Props) {
  const { noteId } = route.params;
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedBody, setEditedBody] = useState('');
  const [editedImportance, setEditedImportance] = useState<1 | 2 | 3>(2);
  const [editedSourceUrl, setEditedSourceUrl] = useState('');

  // React Query hooks
  const { data: note, isLoading, error } = useNote(noteId);
  const updateNoteMutation = useUpdateNote();
  const deleteNoteMutation = useDeleteNote();
  const createRelationMutation = useCreateRelation();

  // Initialize edit state when note loads
  React.useEffect(() => {
    if (note && !isEditMode) {
      setEditedBody(note.body);
      setEditedImportance(note.importance);
      setEditedSourceUrl(note.source_url || '');
    }
  }, [note, isEditMode]);

  const handleEdit = () => {
    if (note) {
      setEditedBody(note.body);
      setEditedImportance(note.importance);
      setEditedSourceUrl(note.source_url || '');
      setIsEditMode(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
  };

  const handleSaveEdit = async () => {
    if (!note) return;

    try {
      await updateNoteMutation.mutateAsync({
        id: note.id,
        updates: {
          body: editedBody,
          importance: editedImportance,
          source_url: editedSourceUrl || undefined,
        },
      });
      setIsEditMode(false);
      Alert.alert('저장 완료', '노트가 수정되었습니다.');
    } catch (error) {
      Alert.alert(
        '저장 실패',
        `노트 수정 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      );
    }
  };

  const handleDelete = () => {
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
            await deleteNoteMutation.mutateAsync(noteId);
            navigation.goBack();
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

  const getImportanceColor = (importance: number): string => {
    switch (importance) {
      case IMPORTANCE_HIGH:
        return Colors.light.importanceHigh;
      case IMPORTANCE_MEDIUM:
        return Colors.light.importanceMedium;
      case IMPORTANCE_LOW:
        return Colors.light.importanceLow;
      default:
        return Colors.light.importanceMedium;
    }
  };

  const getImportanceLabel = (importance: number): string => {
    switch (importance) {
      case IMPORTANCE_HIGH:
        return '높음';
      case IMPORTANCE_MEDIUM:
        return '보통';
      case IMPORTANCE_LOW:
        return '낮음';
      default:
        return '보통';
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return format(date, 'yyyy년 MM월 dd일 HH:mm', { locale: ko });
    } catch {
      return '';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
            testID="back-button"
          >
            <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>노트 상세</Text>
          <View style={styles.headerButton} />
        </View>
        <LoadingSpinner />
      </View>
    );
  }

  if (error || !note) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
            testID="back-button"
          >
            <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>노트 상세</Text>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.errorContainer} testID="error-state">
          <Ionicons name="alert-circle-outline" size={64} color={Colors.light.error} />
          <Text style={styles.errorText}>노트를 불러올 수 없습니다</Text>
          <Text style={styles.errorSubtext}>
            {error instanceof Error ? error.message : '알 수 없는 오류'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
          testID="back-button"
        >
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>노트 상세</Text>
        <View style={styles.headerActions}>
          {isEditMode ? (
            <>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleCancelEdit}
                testID="cancel-edit-button"
              >
                <Ionicons name="close" size={24} color={Colors.light.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleSaveEdit}
                disabled={updateNoteMutation.isPending}
                testID="save-edit-button"
              >
                {updateNoteMutation.isPending ? (
                  <ActivityIndicator size="small" color={Colors.light.primary} />
                ) : (
                  <Ionicons name="checkmark" size={24} color={Colors.light.primary} />
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleEdit}
                testID="edit-button"
              >
                <Ionicons name="create-outline" size={24} color={Colors.light.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleDelete}
                testID="delete-button"
              >
                <Ionicons name="trash-outline" size={24} color={Colors.light.error} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Body */}
        <View style={styles.section}>
          {isEditMode ? (
            <TextInput
              style={styles.bodyInput}
              value={editedBody}
              onChangeText={setEditedBody}
              placeholder="노트 내용을 입력하세요"
              placeholderTextColor={Colors.light.textPlaceholder}
              multiline
              textAlignVertical="top"
              maxLength={5000}
              testID="body-input"
            />
          ) : (
            <Text style={styles.bodyText} testID="body-text">
              {note.body}
            </Text>
          )}
        </View>

        {/* Metadata */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>메타데이터</Text>
          <View style={styles.metadataGrid}>
            <View style={styles.metadataRow}>
              <Text style={styles.metadataLabel}>중요도</Text>
              {isEditMode ? (
                <View style={styles.importanceButtons}>
                  {[IMPORTANCE_LOW, IMPORTANCE_MEDIUM, IMPORTANCE_HIGH].map((imp) => (
                    <TouchableOpacity
                      key={imp}
                      style={[
                        styles.importanceButton,
                        editedImportance === imp && styles.importanceButtonActive,
                        { borderColor: getImportanceColor(imp) },
                      ]}
                      onPress={() => setEditedImportance(imp as 1 | 2 | 3)}
                      testID={`importance-${imp}-button`}
                    >
                      <Text
                        style={[
                          styles.importanceButtonText,
                          editedImportance === imp && {
                            color: getImportanceColor(imp),
                            fontWeight: '600',
                          },
                        ]}
                      >
                        {getImportanceLabel(imp)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.metadataValue}>
                  <View
                    style={[
                      styles.importanceBadge,
                      { backgroundColor: getImportanceColor(note.importance) },
                    ]}
                  />
                  <Text style={styles.metadataText} testID="importance-text">
                    {getImportanceLabel(note.importance)}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.metadataRow}>
              <Text style={styles.metadataLabel}>생성일</Text>
              <Text style={styles.metadataText} testID="created-at-text">
                {formatDate(note.created_at)}
              </Text>
            </View>

            <View style={styles.metadataRow}>
              <Text style={styles.metadataLabel}>수정일</Text>
              <Text style={styles.metadataText} testID="updated-at-text">
                {formatDate(note.updated_at)}
              </Text>
            </View>

            {(isEditMode || note.source_url) && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>출처 URL</Text>
                {isEditMode ? (
                  <TextInput
                    style={styles.urlInput}
                    value={editedSourceUrl}
                    onChangeText={setEditedSourceUrl}
                    placeholder="https://..."
                    placeholderTextColor={Colors.light.textPlaceholder}
                    autoCapitalize="none"
                    autoCorrect={false}
                    testID="source-url-input"
                  />
                ) : (
                  <Text style={styles.metadataTextLink} testID="source-url-text">
                    {note.source_url}
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Keywords Section - Placeholder */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>키워드</Text>
          <View style={styles.placeholderBox}>
            <Ionicons name="pricetags-outline" size={32} color={Colors.light.textTertiary} />
            <Text style={styles.placeholderText}>키워드는 향후 버전에서 지원됩니다</Text>
          </View>
        </View>

        {/* Relations Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>연결된 노트</Text>
          <RelationList
            noteId={noteId}
            onNotePress={(relatedNoteId) => {
              navigation.push('NoteDetail', { noteId: relatedNoteId });
            }}
          />
        </View>

        {/* AI Recommendations Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI 추천</Text>
          <View style={styles.placeholderBox}>
            <Ionicons name="sparkles-outline" size={32} color={Colors.light.textTertiary} />
            <Text style={styles.placeholderText}>
              AI 추천 기능은 서버 연동 후 사용할 수 있습니다
            </Text>
            <Text style={styles.placeholderSubtext}>
              (아래는 UI 데모입니다)
            </Text>
          </View>

          {/* Demo Recommendation Card - Remove this when implementing real API */}
          {note && (
            <View style={styles.demoSection}>
              <RecommendationCard
                recommendation={{
                  note: {
                    ...note,
                    id: 'demo-recommendation-1',
                    body: '관련된 노트 예시\n이것은 AI 추천 기능의 데모입니다. 실제로는 서버의 임베딩 기반 유사도 계산을 통해 추천됩니다.',
                    created_at: new Date(Date.now() - 86400000).toISOString(),
                  },
                  score: 0.85,
                  reason: '공통 키워드: React, TypeScript, 모바일 개발',
                  keywords: ['React Native', 'TypeScript', 'Expo'],
                }}
                onPress={(demoNoteId) => {
                  Alert.alert('데모', 'AI 추천 기능은 서버 연동 후 사용 가능합니다.');
                }}
                onAddRelation={async (demoNoteId) => {
                  Alert.alert('데모', 'AI 추천 기능은 서버 연동 후 사용 가능합니다.');
                }}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.light.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
  },
  bodyText: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.light.text,
  },
  bodyInput: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.light.text,
    backgroundColor: Colors.light.card,
    borderRadius: 8,
    padding: 12,
    minHeight: 200,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  metadataGrid: {
    gap: 12,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  metadataLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.textSecondary,
    flex: 1,
  },
  metadataValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 2,
  },
  metadataText: {
    fontSize: 14,
    color: Colors.light.text,
    flex: 2,
    textAlign: 'right',
  },
  metadataTextLink: {
    fontSize: 14,
    color: Colors.light.primary,
    flex: 2,
    textAlign: 'right',
  },
  importanceBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  importanceButtons: {
    flexDirection: 'row',
    gap: 8,
    flex: 2,
    justifyContent: 'flex-end',
  },
  importanceButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
  },
  importanceButtonActive: {
    backgroundColor: Colors.light.backgroundSecondary,
  },
  importanceButtonText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  urlInput: {
    fontSize: 14,
    color: Colors.light.text,
    backgroundColor: Colors.light.card,
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
    flex: 2,
  },
  placeholderBox: {
    backgroundColor: Colors.light.card,
    borderRadius: 8,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontSize: 14,
    color: Colors.light.textTertiary,
    marginTop: 12,
    textAlign: 'center',
  },
  placeholderSubtext: {
    fontSize: 12,
    color: Colors.light.textTertiary,
    marginTop: 4,
    textAlign: 'center',
  },
  demoSection: {
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
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
  },
});
