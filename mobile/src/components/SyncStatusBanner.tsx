import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

interface SyncStatusBannerProps {
  status: SyncStatus;
  message?: string;
  visible?: boolean;
}

export default function SyncStatusBanner({
  status,
  message,
  visible = true,
}: SyncStatusBannerProps) {
  if (!visible || status === 'idle') {
    return null;
  }

  const config = getStatusConfig(status);

  return (
    <View style={[styles.container, { backgroundColor: config.backgroundColor }]} testID="sync-status-banner">
      {status === 'syncing' ? (
        <ActivityIndicator size="small" color={config.iconColor} testID="sync-spinner" />
      ) : (
        <Ionicons name={config.icon} size={16} color={config.iconColor} testID="sync-icon" />
      )}
      <Text style={[styles.text, { color: config.textColor }]} testID="sync-message">
        {message || config.defaultMessage}
      </Text>
    </View>
  );
}

interface StatusConfig {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  textColor: string;
  backgroundColor: string;
  defaultMessage: string;
}

function getStatusConfig(status: SyncStatus): StatusConfig {
  switch (status) {
    case 'syncing':
      return {
        icon: 'sync',
        iconColor: Colors.light.text,
        textColor: Colors.light.text,
        backgroundColor: Colors.light.syncPending,
        defaultMessage: '동기화 중...',
      };
    case 'success':
      return {
        icon: 'checkmark-circle',
        iconColor: '#FFFFFF',
        textColor: '#FFFFFF',
        backgroundColor: Colors.light.syncSuccess,
        defaultMessage: '동기화 완료',
      };
    case 'error':
      return {
        icon: 'alert-circle',
        iconColor: '#FFFFFF',
        textColor: '#FFFFFF',
        backgroundColor: Colors.light.syncError,
        defaultMessage: '동기화 실패',
      };
    default:
      return {
        icon: 'information-circle',
        iconColor: Colors.light.text,
        textColor: Colors.light.text,
        backgroundColor: Colors.light.info,
        defaultMessage: '',
      };
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  text: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
});
