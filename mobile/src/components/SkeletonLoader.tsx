import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { Colors } from '@/constants/colors';

interface SkeletonLoaderProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export default function SkeletonLoader({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}: SkeletonLoaderProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [opacity]);

  return (
    <Animated.View
      testID="skeleton-loader"
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

// Preset skeleton layouts for common use cases
export function SkeletonNoteCard() {
  return (
    <View style={styles.noteCardContainer} testID="skeleton-note-card">
      <SkeletonLoader height={16} width="60%" style={styles.noteTitle} />
      <SkeletonLoader height={14} width="100%" style={styles.noteLine} />
      <SkeletonLoader height={14} width="90%" style={styles.noteLine} />
      <SkeletonLoader height={14} width="70%" style={styles.noteLine} />
      <View style={styles.noteFooter}>
        <SkeletonLoader height={12} width={80} />
        <SkeletonLoader height={12} width={100} />
      </View>
    </View>
  );
}

export function SkeletonSearchResult() {
  return (
    <View style={styles.searchResultContainer} testID="skeleton-search-result">
      <SkeletonLoader height={14} width="100%" style={styles.searchLine} />
      <SkeletonLoader height={14} width="85%" style={styles.searchLine} />
      <SkeletonLoader height={12} width={60} style={styles.searchMeta} />
    </View>
  );
}

export function SkeletonReflection() {
  return (
    <View style={styles.reflectionContainer} testID="skeleton-reflection">
      <SkeletonLoader height={18} width="50%" style={styles.reflectionTitle} />
      <SkeletonLoader height={14} width="100%" style={styles.reflectionLine} />
      <SkeletonLoader height={14} width="95%" style={styles.reflectionLine} />
      <SkeletonLoader height={14} width="88%" style={styles.reflectionLine} />
      <View style={styles.reflectionKeywords}>
        <SkeletonLoader height={24} width={60} borderRadius={12} style={styles.keyword} />
        <SkeletonLoader height={24} width={80} borderRadius={12} style={styles.keyword} />
        <SkeletonLoader height={24} width={70} borderRadius={12} style={styles.keyword} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: Colors.light.backgroundTertiary,
  },
  noteCardContainer: {
    padding: 16,
    backgroundColor: Colors.light.card,
    borderRadius: 8,
    marginBottom: 12,
  },
  noteTitle: {
    marginBottom: 8,
  },
  noteLine: {
    marginBottom: 6,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  searchResultContainer: {
    padding: 12,
    backgroundColor: Colors.light.card,
    borderRadius: 6,
    marginBottom: 8,
  },
  searchLine: {
    marginBottom: 6,
  },
  searchMeta: {
    marginTop: 4,
  },
  reflectionContainer: {
    padding: 16,
    backgroundColor: Colors.light.card,
    borderRadius: 8,
    marginBottom: 12,
  },
  reflectionTitle: {
    marginBottom: 12,
  },
  reflectionLine: {
    marginBottom: 6,
  },
  reflectionKeywords: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  keyword: {
    marginRight: 8,
    marginBottom: 8,
  },
});
