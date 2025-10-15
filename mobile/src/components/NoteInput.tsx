import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, IMPORTANCE_LOW, IMPORTANCE_MEDIUM, IMPORTANCE_HIGH } from '@/constants';

interface NoteInputProps {
  onSave: (body: string, importance: number, sourceUrl?: string) => void;
  onCancel?: () => void;
  initialBody?: string;
  initialImportance?: number;
  initialSourceUrl?: string;
  placeholder?: string;
}

export default function NoteInput({
  onSave,
  onCancel,
  initialBody = '',
  initialImportance = IMPORTANCE_MEDIUM,
  initialSourceUrl = '',
  placeholder = '무엇을 기록할까요?',
}: NoteInputProps) {
  const [body, setBody] = useState(initialBody);
  const [importance, setImportance] = useState(initialImportance);
  const [sourceUrl, setSourceUrl] = useState(initialSourceUrl);
  const [showUrlInput, setShowUrlInput] = useState(!!initialSourceUrl);

  const handleSave = () => {
    if (body.trim()) {
      onSave(body.trim(), importance, sourceUrl.trim() || undefined);
      // Reset form
      setBody('');
      setImportance(IMPORTANCE_MEDIUM);
      setSourceUrl('');
      setShowUrlInput(false);
    }
  };

  const handleCancel = () => {
    setBody(initialBody);
    setImportance(initialImportance);
    setSourceUrl(initialSourceUrl);
    setShowUrlInput(!!initialSourceUrl);
    onCancel?.();
  };

  const getImportanceColor = (level: number) => {
    switch (level) {
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

  const getImportanceLabel = (level: number) => {
    switch (level) {
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      testID="note-input-container"
    >
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder={placeholder}
          placeholderTextColor={Colors.light.textPlaceholder}
          value={body}
          onChangeText={setBody}
          multiline
          maxLength={5000}
          numberOfLines={4}
          textAlignVertical="top"
          testID="note-input-text"
        />

        {showUrlInput && (
          <TextInput
            style={styles.urlInput}
            placeholder="URL (선택사항)"
            placeholderTextColor={Colors.light.textPlaceholder}
            value={sourceUrl}
            onChangeText={setSourceUrl}
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            testID="note-input-url"
          />
        )}

        <View style={styles.controlsContainer}>
          <View style={styles.importanceContainer}>
            <Text style={styles.importanceLabel}>중요도:</Text>
            {[IMPORTANCE_LOW, IMPORTANCE_MEDIUM, IMPORTANCE_HIGH].map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.importanceButton,
                  importance === level && {
                    backgroundColor: getImportanceColor(level),
                    borderColor: getImportanceColor(level),
                  },
                ]}
                onPress={() => setImportance(level)}
                testID={`importance-button-${level}`}
              >
                <Text
                  style={[
                    styles.importanceButtonText,
                    importance === level && styles.importanceButtonTextActive,
                  ]}
                >
                  {getImportanceLabel(level)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setShowUrlInput(!showUrlInput)}
              testID="toggle-url-button"
            >
              <Ionicons
                name={showUrlInput ? 'link' : 'link-outline'}
                size={20}
                color={showUrlInput ? Colors.light.primary : Colors.light.textSecondary}
              />
            </TouchableOpacity>

            {onCancel && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
                testID="cancel-button"
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.saveButton, !body.trim() && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!body.trim()}
              testID="save-button"
            >
              <Text style={styles.saveButtonText}>저장</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.card,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputContainer: {
    gap: 12,
  },
  textInput: {
    fontSize: 16,
    color: Colors.light.text,
    minHeight: 100,
    maxHeight: 200,
    padding: 12,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  urlInput: {
    fontSize: 14,
    color: Colors.light.text,
    padding: 10,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  controlsContainer: {
    gap: 12,
  },
  importanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  importanceLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  importanceButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  importanceButtonText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  importanceButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  iconButton: {
    padding: 8,
    marginRight: 'auto',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  cancelButtonText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: Colors.light.primary,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.light.textPlaceholder,
  },
  saveButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
