import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit?: () => void;
  onClear?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  loading?: boolean;
  disabled?: boolean;
}

export default function SearchBar({
  value,
  onChangeText,
  onSubmit,
  onClear,
  placeholder = '노트 검색...',
  autoFocus = false,
  loading = false,
  disabled = false,
}: SearchBarProps) {
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      // Small delay to ensure mount completion
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [autoFocus]);

  const handleClear = () => {
    onChangeText('');
    onClear?.();
    inputRef.current?.focus();
  };

  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit?.();
      inputRef.current?.blur();
    }
  };

  return (
    <View
      style={[styles.container, isFocused && styles.containerFocused]}
      testID="search-bar-container"
    >
      {/* Search Icon */}
      <Ionicons
        name="search"
        size={20}
        color={isFocused ? Colors.light.primary : Colors.light.textTertiary}
        style={styles.searchIcon}
      />

      {/* Input Field */}
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={handleSubmit}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={Colors.light.textPlaceholder}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="never"
        editable={!disabled}
        testID="search-input"
      />

      {/* Loading Indicator or Clear Button */}
      {loading ? (
        <ActivityIndicator
          size="small"
          color={Colors.light.primary}
          style={styles.clearButton}
          testID="search-loading"
        />
      ) : value.length > 0 ? (
        <TouchableOpacity
          style={styles.clearButton}
          onPress={handleClear}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          testID="clear-button"
        >
          <Ionicons name="close-circle" size={20} color={Colors.light.textTertiary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  containerFocused: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.background,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.text,
    padding: 0,
    margin: 0,
  },
  clearButton: {
    marginLeft: 8,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
