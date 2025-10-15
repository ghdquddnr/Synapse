import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Colors } from '@/constants';
import type { Note } from '@/types';

export interface RecommendationData {
  note: Note;
  score: number;
  reason?: string;
  keywords?: string[];
}

interface RecommendationCardProps {
  recommendation: RecommendationData;
  onPress: (noteId: string) => void;
  onAddRelation?: (noteId: string) => void;
}

export default function RecommendationCard({
  recommendation,
  onPress,
  onAddRelation,
}: RecommendationCardProps) {
  const { note, score, reason, keywords } = recommendation;

  const getFirstLine = (body: string, maxLength: number = 50): string => {
    const firstLine = body.split('\n')[0];
    if (firstLine.length > maxLength) {
      return firstLine.substring(0, maxLength) + '...';
    }
    return firstLine;
  };

  const getPreview = (body: string, maxLength: number = 80): string => {
    const lines = body.split('\n');
    const preview = lines.slice(1).join(' ');
    if (preview.length > maxLength) {
      return preview.substring(0, maxLength) + '...';
    }
    return preview;
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return format(date, 'MM/dd HH:mm', { locale: ko });
    } catch {
      return '';
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 0.8) return Colors.light.importanceHigh;
    if (score >= 0.5) return Colors.light.importanceMedium;
    return Colors.light.importanceLow;
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 0.8) return '매우 관련됨';
    if (score >= 0.5) return '관련됨';
    return '약간 관련됨';
  };

  const getScorePercentage = (score: number): string => {
    return `${Math.round(score * 100)}%`;
  };

  const preview = getPreview(note.body);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.content}
        onPress={() => onPress(note.id)}
        activeOpacity={0.7}
        testID="recommendation-card"
      >
        {/* Header with score */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Ionicons name="sparkles" size={16} color={Colors.light.primary} />
            <Text style={styles.title} numberOfLines={1} testID="recommendation-title">
              {getFirstLine(note.body)}
            </Text>
          </View>
          <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(score) }]}>
            <Text style={styles.scoreText} testID="recommendation-score">
              {getScorePercentage(score)}
            </Text>
          </View>
        </View>

        {/* Preview */}
        {preview && (
          <Text style={styles.preview} numberOfLines={2} testID="recommendation-preview">
            {preview}
          </Text>
        )}

        {/* Reason */}
        {reason && (
          <View style={styles.reasonContainer}>
            <Ionicons name="bulb-outline" size={14} color={Colors.light.textSecondary} />
            <Text style={styles.reason} numberOfLines={2} testID="recommendation-reason">
              {reason}
            </Text>
          </View>
        )}

        {/* Keywords */}
        {keywords && keywords.length > 0 && (
          <View style={styles.keywordsContainer}>
            <Ionicons name="pricetag-outline" size={14} color={Colors.light.textSecondary} />
            <View style={styles.keywords}>
              {keywords.slice(0, 3).map((keyword, index) => (
                <View key={index} style={styles.keywordBadge}>
                  <Text style={styles.keywordText}>{keyword}</Text>
                </View>
              ))}
              {keywords.length > 3 && (
                <Text style={styles.moreKeywords}>+{keywords.length - 3}</Text>
              )}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.scoreLabel}>
            <View style={[styles.scoreDot, { backgroundColor: getScoreColor(score) }]} />
            <Text style={styles.scoreLabelText}>{getScoreLabel(score)}</Text>
          </View>
          <Text style={styles.date} testID="recommendation-date">
            {formatDate(note.created_at)}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Add Relation Button */}
      {onAddRelation && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => onAddRelation(note.id)}
          testID="add-relation-button"
        >
          <Ionicons name="add-circle-outline" size={20} color={Colors.light.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.card,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.primary + '20', // 20% opacity
    flexDirection: 'row',
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  content: {
    flex: 1,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
  },
  scoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  preview: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  reasonContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: Colors.light.backgroundSecondary,
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  reason: {
    flex: 1,
    fontSize: 13,
    color: Colors.light.textSecondary,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  keywordsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  keywords: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  keywordBadge: {
    backgroundColor: Colors.light.primary + '15', // 15% opacity
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  keywordText: {
    fontSize: 12,
    color: Colors.light.primary,
    fontWeight: '500',
  },
  moreKeywords: {
    fontSize: 12,
    color: Colors.light.textTertiary,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scoreDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  scoreLabelText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.light.textSecondary,
  },
  date: {
    fontSize: 12,
    color: Colors.light.textTertiary,
  },
  addButton: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
