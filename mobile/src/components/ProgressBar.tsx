/**
 * ProgressBar Component
 *
 * Linear progress indicator for sync and upload operations
 * - Animated progress updates
 * - Customizable colors
 * - Optional label showing percentage or count
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ViewStyle } from 'react-native';
import { Colors } from '@/constants/colors';

interface ProgressBarProps {
  progress: number; // 0-100
  total?: number; // For showing "X / Y" format
  current?: number;
  color?: string;
  backgroundColor?: string;
  height?: number;
  showLabel?: boolean;
  labelFormat?: 'percentage' | 'count' | 'custom';
  customLabel?: string;
  animated?: boolean;
  style?: ViewStyle;
}

export default function ProgressBar({
  progress,
  total,
  current,
  color,
  backgroundColor,
  height = 8,
  showLabel = false,
  labelFormat = 'percentage',
  customLabel,
  animated = true,
  style,
}: ProgressBarProps) {
  const animatedWidth = useRef(new Animated.Value(0)).current;
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  useEffect(() => {
    if (animated) {
      Animated.timing(animatedWidth, {
        toValue: clampedProgress,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      animatedWidth.setValue(clampedProgress);
    }
  }, [clampedProgress, animated, animatedWidth]);

  const progressBarColor = color || Colors.light.primary;
  const trackColor = backgroundColor || Colors.light.backgroundTertiary;

  const getLabel = () => {
    if (customLabel) return customLabel;

    switch (labelFormat) {
      case 'percentage':
        return `${Math.round(clampedProgress)}%`;
      case 'count':
        if (total !== undefined && current !== undefined) {
          return `${current} / ${total}`;
        }
        return `${Math.round(clampedProgress)}%`;
      default:
        return `${Math.round(clampedProgress)}%`;
    }
  };

  const widthInterpolated = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.container, style]}>
      {showLabel && (
        <Text style={styles.label} testID="progress-label">
          {getLabel()}
        </Text>
      )}
      <View
        style={[
          styles.track,
          {
            height,
            backgroundColor: trackColor,
          },
        ]}
        testID="progress-track"
      >
        <Animated.View
          style={[
            styles.bar,
            {
              width: widthInterpolated,
              backgroundColor: progressBarColor,
              height,
            },
          ]}
          testID="progress-bar"
        />
      </View>
    </View>
  );
}

/**
 * Circular progress indicator
 * For indeterminate or circular progress display
 */
export function CircularProgress({
  size = 40,
  strokeWidth = 4,
  progress = 0,
  color,
  backgroundColor,
  showLabel = false,
}: {
  size?: number;
  strokeWidth?: number;
  progress?: number; // 0-100
  color?: string;
  backgroundColor?: string;
  showLabel?: boolean;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

  const progressColor = color || Colors.light.primary;
  const trackColor = backgroundColor || Colors.light.backgroundTertiary;

  return (
    <View
      style={[
        styles.circularContainer,
        {
          width: size,
          height: size,
        },
      ]}
      testID="circular-progress"
    >
      {/* Background circle */}
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: trackColor,
          },
        ]}
      />

      {/* Progress arc - Simplified version for React Native */}
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: progressColor,
            borderTopColor: 'transparent',
            borderRightColor: clampedProgress > 25 ? progressColor : 'transparent',
            borderBottomColor: clampedProgress > 50 ? progressColor : 'transparent',
            borderLeftColor: clampedProgress > 75 ? progressColor : 'transparent',
            transform: [{ rotate: '-90deg' }],
          },
          styles.circleProgress,
        ]}
      />

      {showLabel && (
        <View style={styles.circularLabel}>
          <Text style={styles.circularLabelText} testID="circular-progress-label">
            {Math.round(clampedProgress)}%
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 4,
    textAlign: 'right',
  },
  track: {
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  bar: {
    borderRadius: 4,
  },
  circularContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circle: {
    position: 'absolute',
  },
  circleProgress: {
    // Additional styling for progress arc
  },
  circularLabel: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circularLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.text,
  },
});
