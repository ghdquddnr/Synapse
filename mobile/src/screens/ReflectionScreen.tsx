/**
 * ReflectionScreen
 *
 * Displays daily reflection input and weekly insights:
 * - Today's one-liner input
 * - This week's top keywords (top 3)
 * - Weekly report card (summary, clusters, keywords)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  useReflection,
  useWeeklyKeywords,
  useSaveReflection,
  getTodayDate,
  getCurrentWeekKey,
} from '@/hooks/useReflections';
import { Colors } from '@/constants/colors';

export default function ReflectionScreen() {
  const todayDate = getTodayDate();
  const weekKey = getCurrentWeekKey();

  // Fetch today's reflection
  const { data: todayReflection, isLoading: isLoadingReflection } = useReflection(todayDate);

  // Fetch weekly keywords
  const { data: weeklyKeywords, isLoading: isLoadingKeywords } = useWeeklyKeywords(weekKey);

  // Save mutation
  const saveReflection = useSaveReflection();

  // Local state
  const [reflectionText, setReflectionText] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Initialize reflection text from fetched data
  useEffect(() => {
    if (todayReflection?.content) {
      setReflectionText(todayReflection.content);
      setHasUnsavedChanges(false);
    }
  }, [todayReflection]);

  // Handle text change
  const handleTextChange = (text: string) => {
    setReflectionText(text);
    setHasUnsavedChanges(text !== (todayReflection?.content || ''));
  };

  // Handle save
  const handleSave = async () => {
    if (!reflectionText.trim()) {
      Alert.alert('입력 오류', '회고 내용을 입력해주세요.');
      return;
    }

    try {
      await saveReflection.mutateAsync({
        date: todayDate,
        content: reflectionText.trim(),
      });
      setHasUnsavedChanges(false);
      Alert.alert('저장 완료', '오늘의 한 줄이 저장되었습니다.');
    } catch (error) {
      Alert.alert('저장 실패', error instanceof Error ? error.message : '알 수 없는 오류');
    }
  };

  // Get top 3 keywords
  const topKeywords = weeklyKeywords?.slice(0, 3) || [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>회고</Text>
        <Text style={styles.headerSubtitle}>오늘 하루를 돌아봐요</Text>
      </View>

      {/* Today's Reflection Input */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>오늘의 한 줄</Text>
        <Text style={styles.sectionSubtitle}>{todayDate}</Text>

        {isLoadingReflection ? (
          <ActivityIndicator size="small" color={Colors.light.primary} />
        ) : (
          <>
            <TextInput
              style={styles.reflectionInput}
              value={reflectionText}
              onChangeText={handleTextChange}
              placeholder="오늘 하루를 한 줄로 정리해보세요..."
              placeholderTextColor={Colors.light.textSecondary}
              multiline
              maxLength={500}
              testID="reflection-input"
            />

            <View style={styles.inputFooter}>
              <Text style={styles.charCount}>{reflectionText.length}/500</Text>
              {hasUnsavedChanges && (
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSave}
                  disabled={saveReflection.isPending}
                  testID="save-reflection-button"
                >
                  {saveReflection.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>저장</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </View>

      {/* Weekly Keywords */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>이번 주 핵심 키워드</Text>
        <Text style={styles.sectionSubtitle}>Week {weekKey.split('-')[1]}</Text>

        {isLoadingKeywords ? (
          <ActivityIndicator size="small" color={Colors.light.primary} />
        ) : topKeywords.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>아직 이번 주에 작성한 노트가 없어요</Text>
          </View>
        ) : (
          <View style={styles.keywordList}>
            {topKeywords.map((keyword, index) => (
              <View key={keyword.name} style={styles.keywordCard} testID={`keyword-${index}`}>
                <View style={styles.keywordRank}>
                  <Text style={styles.keywordRankText}>{index + 1}</Text>
                </View>
                <View style={styles.keywordContent}>
                  <Text style={styles.keywordName}>{keyword.name}</Text>
                  <Text style={styles.keywordCount}>{keyword.count}회 언급</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Weekly Report Placeholder */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>주간 리포트</Text>
        <Text style={styles.sectionSubtitle}>AI가 분석한 이번 주 인사이트</Text>

        <View style={styles.reportPlaceholder}>
          <Text style={styles.reportPlaceholderTitle}>🤖 AI 분석 준비 중</Text>
          <Text style={styles.reportPlaceholderText}>
            주간 리포트는 서버와 동기화 후 제공됩니다.{'\n'}
            Phase 5에서 AI 분석 기능이 추가될 예정입니다.
          </Text>
        </View>
      </View>
    </ScrollView>
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
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 16,
  },
  reflectionInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.light.text,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  charCount: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  saveButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  keywordList: {
    gap: 12,
  },
  keywordCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  keywordRank: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  keywordRankText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  keywordContent: {
    flex: 1,
  },
  keywordName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 2,
  },
  keywordCount: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  reportPlaceholder: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderStyle: 'dashed',
  },
  reportPlaceholderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  reportPlaceholderText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
