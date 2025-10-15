import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Note } from '@/types';
import { Colors, IMPORTANCE_HIGH, IMPORTANCE_MEDIUM, IMPORTANCE_LOW } from '@/constants';

interface NoteCardProps {
  note: Note;
  onPress: (note: Note) => void;
  onDelete?: (note: Note) => void;
  showUnsyncedIndicator?: boolean;
}

export default function NoteCard({
  note,
  onPress,
  onDelete,
  showUnsyncedIndicator = false,
}: NoteCardProps) {
  const getFirstLine = (body: string, maxLength: number = 50): string => {
    const firstLine = body.split('\n')[0];
    if (firstLine.length > maxLength) {
      return firstLine.substring(0, maxLength) + '...';
    }
    return firstLine;
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

  const getImportanceIcon = (importance: number): keyof typeof Ionicons.glyphMap => {
    switch (importance) {
      case IMPORTANCE_HIGH:
        return 'alert-circle';
      case IMPORTANCE_MEDIUM:
        return 'remove-circle-outline';
      case IMPORTANCE_LOW:
        return 'checkmark-circle-outline';
      default:
        return 'remove-circle-outline';
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

      if (diffInHours < 24) {
        return format(date, 'HH:mm', { locale: ko });
      } else if (diffInHours < 24 * 7) {
        return format(date, 'E요일 HH:mm', { locale: ko });
      } else {
        return format(date, 'MM/dd', { locale: ko });
      }
    } catch {
      return '';
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(note)}
      activeOpacity={0.7}
      testID="note-card"
    >
      {showUnsyncedIndicator && (
        <View style={styles.unsyncedIndicator} testID="unsynced-indicator" />
      )}

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1} testID="note-card-title">
            {getFirstLine(note.body)}
          </Text>
          <Ionicons
            name={getImportanceIcon(note.importance)}
            size={16}
            color={getImportanceColor(note.importance)}
            testID="importance-icon"
          />
        </View>

        {note.body.includes('\n') && (
          <Text style={styles.preview} numberOfLines={2} testID="note-card-preview">
            {note.body.split('\n').slice(1).join('\n')}
          </Text>
        )}

        <View style={styles.footer}>
          <View style={styles.metadata}>
            <Text style={styles.metadataText} testID="note-card-date">
              {formatDate(note.created_at)}
            </Text>
            {note.source_url && (
              <>
                <Text style={styles.metadataSeparator}>•</Text>
                <Ionicons name="link-outline" size={12} color={Colors.light.textTertiary} />
              </>
            )}
          </View>

          {onDelete && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => onDelete(note)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              testID="delete-button"
            >
              <Ionicons name="trash-outline" size={16} color={Colors.light.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.card,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    position: 'relative',
  },
  unsyncedIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.error,
    zIndex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginRight: 8,
  },
  preview: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metadataText: {
    fontSize: 12,
    color: Colors.light.textTertiary,
  },
  metadataSeparator: {
    fontSize: 12,
    color: Colors.light.textTertiary,
    marginHorizontal: 2,
  },
  deleteButton: {
    padding: 4,
  },
});
