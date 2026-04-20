import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  tokenColors,
  tokenSpacing,
  tokenRadius,
  tokenType,
} from '../../theme/tokens';

interface ErrorDisplayProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryText?: string;
  style?: any;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  retryText = 'Try Again',
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <Ionicons
        name="alert-circle-outline"
        size={48}
        color={tokenColors.error}
      />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={onRetry}
          activeOpacity={0.75}
        >
          <Text style={styles.retryText}>{retryText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokenSpacing.xl,
  },
  title: {
    ...tokenType.subheading,
    color: tokenColors.ink,
    marginTop: tokenSpacing.lg,
    marginBottom: tokenSpacing.sm,
    textAlign: 'center',
  },
  message: {
    ...tokenType.body,
    color: tokenColors.inkSecondary,
    textAlign: 'center',
    marginBottom: tokenSpacing.xl,
  },
  retryButton: {
    backgroundColor: tokenColors.cobalt,
    paddingHorizontal: tokenSpacing.xl,
    paddingVertical: tokenSpacing.md,
    borderRadius: tokenRadius.lg,
  },
  retryText: {
    ...tokenType.button,
    color: tokenColors.white,
  },
});
