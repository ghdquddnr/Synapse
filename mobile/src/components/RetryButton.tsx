/**
 * RetryButton Component
 *
 * Button for retrying failed operations
 * - Loading state support
 * - Disabled state support
 * - Customizable text and styling
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors } from '@/constants/colors';

interface RetryButtonProps {
  onRetry: () => void | Promise<void>;
  text?: string;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function RetryButton({
  onRetry,
  text = '다시 시도',
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'medium',
  style,
  textStyle,
}: RetryButtonProps) {
  const isDisabled = disabled || loading;

  const handlePress = async () => {
    if (isDisabled) return;
    await onRetry();
  };

  const getButtonStyle = (): ViewStyle => {
    const baseStyle = styles.button;
    const sizeStyle = styles[`button_${size}`];
    const variantStyle = styles[`button_${variant}`];
    const disabledStyle = isDisabled ? styles.button_disabled : {};

    return {
      ...baseStyle,
      ...sizeStyle,
      ...variantStyle,
      ...disabledStyle,
    };
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle = styles.text;
    const sizeStyle = styles[`text_${size}`];
    const variantStyle = styles[`text_${variant}`];
    const disabledStyle = isDisabled ? styles.text_disabled : {};

    return {
      ...baseStyle,
      ...sizeStyle,
      ...variantStyle,
      ...disabledStyle,
    };
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isDisabled}
      style={[getButtonStyle(), style]}
      testID="retry-button"
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? '#fff' : Colors.light.primary}
          testID="retry-loading"
        />
      ) : (
        <Text style={[getTextStyle(), textStyle]} testID="retry-text">
          {text}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Base button styles
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  // Size variants
  button_small: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  button_medium: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  button_large: {
    paddingHorizontal: 24,
    paddingVertical: 14,
  },

  // Style variants
  button_primary: {
    backgroundColor: Colors.light.primary,
  },
  button_secondary: {
    backgroundColor: Colors.light.backgroundTertiary,
  },
  button_outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.light.primary,
  },

  button_disabled: {
    opacity: 0.5,
  },

  // Base text styles
  text: {
    fontWeight: '600',
  },

  // Size text variants
  text_small: {
    fontSize: 12,
  },
  text_medium: {
    fontSize: 14,
  },
  text_large: {
    fontSize: 16,
  },

  // Style text variants
  text_primary: {
    color: '#fff',
  },
  text_secondary: {
    color: Colors.light.text,
  },
  text_outline: {
    color: Colors.light.primary,
  },

  text_disabled: {
    // opacity handled by parent
  },
});
