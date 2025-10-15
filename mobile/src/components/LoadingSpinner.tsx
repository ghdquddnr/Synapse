import React from 'react';
import { ActivityIndicator, View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@/constants/colors';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  message?: string;
  fullScreen?: boolean;
  style?: ViewStyle;
}

export default function LoadingSpinner({
  size = 'large',
  color,
  message,
  fullScreen = false,
  style,
}: LoadingSpinnerProps) {
  const spinnerColor = color || Colors.light.primary;

  const containerStyle = fullScreen ? styles.fullScreenContainer : styles.container;

  return (
    <View style={[containerStyle, style]} testID="loading-spinner">
      <ActivityIndicator size={size} color={spinnerColor} testID="activity-indicator" />
      {message && (
        <Text style={styles.message} testID="loading-message">
          {message}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreenContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.background,
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
});
