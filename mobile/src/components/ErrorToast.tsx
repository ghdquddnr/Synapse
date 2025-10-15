/**
 * ErrorToast Component
 *
 * Toast notification for displaying error messages
 * - Auto-dismiss after timeout
 * - Manual dismiss button
 * - Different severity levels (error, warning, info)
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ViewStyle,
} from 'react-native';
import { Colors } from '@/constants/colors';

export type ToastSeverity = 'error' | 'warning' | 'info' | 'success';

interface ErrorToastProps {
  message: string;
  severity?: ToastSeverity;
  visible: boolean;
  onDismiss: () => void;
  duration?: number;
  style?: ViewStyle;
}

export default function ErrorToast({
  message,
  severity = 'error',
  visible,
  onDismiss,
  duration = 4000,
  style,
}: ErrorToastProps) {
  const opacity = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-dismiss timer
      if (duration > 0) {
        const timer = setTimeout(() => {
          handleDismiss();
        }, duration);

        return () => clearTimeout(timer);
      }
    } else {
      // Hide animation
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -100,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, duration, opacity, translateY]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  if (!visible && opacity._value === 0) {
    return null;
  }

  const getBackgroundColor = () => {
    switch (severity) {
      case 'error':
        return '#FFEBEE';
      case 'warning':
        return '#FFF3E0';
      case 'info':
        return '#E3F2FD';
      case 'success':
        return '#E8F5E9';
      default:
        return '#FFEBEE';
    }
  };

  const getBorderColor = () => {
    switch (severity) {
      case 'error':
        return Colors.light.error;
      case 'warning':
        return Colors.light.warning;
      case 'info':
        return Colors.light.info;
      case 'success':
        return Colors.light.success;
      default:
        return Colors.light.error;
    }
  };

  const getIcon = () => {
    switch (severity) {
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      case 'success':
        return '✅';
      default:
        return '❌';
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          opacity,
          transform: [{ translateY }],
        },
        style,
      ]}
      testID="error-toast"
    >
      <View style={styles.content}>
        <Text style={styles.icon}>{getIcon()}</Text>
        <Text style={styles.message} testID="toast-message">
          {message}
        </Text>
        <TouchableOpacity
          onPress={handleDismiss}
          style={styles.dismissButton}
          testID="dismiss-button"
        >
          <Text style={styles.dismissText}>✕</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
    marginRight: 12,
  },
  message: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
  },
  dismissButton: {
    marginLeft: 12,
    padding: 4,
  },
  dismissText: {
    fontSize: 18,
    color: Colors.light.textSecondary,
    fontWeight: 'bold',
  },
});
