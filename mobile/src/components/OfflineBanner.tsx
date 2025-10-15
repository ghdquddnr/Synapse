import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

interface OfflineBannerProps {
  visible?: boolean;
}

export default function OfflineBanner({ visible = true }: OfflineBannerProps) {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container} testID="offline-banner">
      <Ionicons name="cloud-offline-outline" size={16} color={Colors.light.text} />
      <Text style={styles.text}>오프라인 모드</Text>
      <Text style={styles.subtext}>모든 변경사항은 로컬에 저장됩니다</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.syncOffline,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  text: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  subtext: {
    marginLeft: 8,
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
});
