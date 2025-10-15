/**
 * SettingsScreen
 *
 * App settings and configuration:
 * - Sync section: Last sync time, manual sync trigger, auto-sync toggle
 * - Display section: Dark mode, font size (placeholder for future)
 * - Info section: Version, local stats, storage usage
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  useNotesCount,
  useReflectionsCount,
  useRelationsCount,
  useSyncStatus,
  useTriggerSync,
} from '@/hooks/useSettings';
import { Colors } from '@/constants/colors';

export default function SettingsScreen() {
  // Sync status
  const syncStatus = useSyncStatus();
  const { triggerSync, isSyncing } = useTriggerSync();

  // Stats
  const { data: notesCount = 0 } = useNotesCount();
  const { data: reflectionsCount = 0 } = useReflectionsCount();
  const { data: relationsCount = 0 } = useRelationsCount();

  // Local state for toggles (placeholder for future implementation)
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);

  // Handle manual sync
  const handleManualSync = async () => {
    try {
      await triggerSync();
      Alert.alert('동기화 완료', '데이터가 서버와 동기화되었습니다.');
    } catch (error) {
      Alert.alert('동기화 실패', error instanceof Error ? error.message : '알 수 없는 오류');
    }
  };

  // Format last sync time
  const formatLastSync = (timestamp: string | null) => {
    if (!timestamp) return '아직 동기화하지 않음';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}시간 전`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}일 전`;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>설정</Text>
      </View>

      {/* Sync Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>동기화</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingLabel}>
            <Text style={styles.settingText}>마지막 동기화</Text>
            <Text style={styles.settingSubtext} testID="last-sync-time">
              {formatLastSync(syncStatus.lastSyncedAt)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.syncButton}
          onPress={handleManualSync}
          disabled={isSyncing}
          testID="manual-sync-button"
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.syncButtonText}>지금 동기화</Text>
          )}
        </TouchableOpacity>

        <View style={styles.settingRow}>
          <View style={styles.settingLabel}>
            <Text style={styles.settingText}>자동 동기화</Text>
            <Text style={styles.settingSubtext}>네트워크 연결 시 자동으로 동기화</Text>
          </View>
          <Switch
            value={autoSyncEnabled}
            onValueChange={setAutoSyncEnabled}
            trackColor={{ false: Colors.light.border, true: Colors.light.primary }}
            testID="auto-sync-toggle"
          />
        </View>

        {syncStatus.syncError && (
          <View style={styles.errorBox} testID="sync-error">
            <Text style={styles.errorText}>⚠️ {syncStatus.syncError}</Text>
          </View>
        )}
      </View>

      {/* Display Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>표시</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingLabel}>
            <Text style={styles.settingText}>다크 모드</Text>
            <Text style={styles.settingSubtext}>어두운 테마 사용 (준비 중)</Text>
          </View>
          <Switch
            value={darkModeEnabled}
            onValueChange={setDarkModeEnabled}
            trackColor={{ false: Colors.light.border, true: Colors.light.primary }}
            disabled
            testID="dark-mode-toggle"
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingLabel}>
            <Text style={styles.settingText}>글꼴 크기</Text>
            <Text style={styles.settingSubtext}>보통 (준비 중)</Text>
          </View>
        </View>
      </View>

      {/* Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>정보</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>버전</Text>
          <Text style={styles.infoValue} testID="app-version">
            1.0.0
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>로컬 노트 개수</Text>
          <Text style={styles.infoValue} testID="notes-count">
            {notesCount}개
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>회고 개수</Text>
          <Text style={styles.infoValue} testID="reflections-count">
            {reflectionsCount}개
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>연결 개수</Text>
          <Text style={styles.infoValue} testID="relations-count">
            {relationsCount}개
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>저장소 사용량</Text>
          <Text style={styles.infoValue} testID="storage-usage">
            계산 중...
          </Text>
        </View>
      </View>

      {/* Backup Section (M2 Placeholder) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>백업 (M2 예정)</Text>
        <View style={styles.placeholderBox}>
          <Text style={styles.placeholderText}>
            JSON 내보내기/가져오기 기능은{'\n'}
            다음 버전에서 제공될 예정입니다.
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Synapse - 오프라인 우선 노트 앱</Text>
        <Text style={styles.footerSubtext}>
          Made with ❤️ for thoughtful note-taking
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
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
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingLabel: {
    flex: 1,
    marginRight: 12,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.text,
    marginBottom: 2,
  },
  settingSubtext: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  syncButton: {
    backgroundColor: Colors.light.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
    minHeight: 52,
    justifyContent: 'center',
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.warning,
  },
  errorText: {
    fontSize: 14,
    color: '#E65100',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 16,
    color: Colors.light.text,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.textSecondary,
  },
  placeholderBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    marginTop: 24,
    marginBottom: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: Colors.light.textTertiary,
  },
});
