import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokenSpacing, tokenRadius, tokenType } from '../../theme/tokens';
import { useTheme } from '../../theme';

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
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
      <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.inkSecondary }]}>
        {message}
      </Text>
      {onRetry && (
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.cobalt }]}
          onPress={onRetry}
          activeOpacity={0.75}
        >
          <Text style={[styles.retryText, { color: colors.white }]}>
            {retryText}
          </Text>
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
    marginTop: tokenSpacing.lg,
    marginBottom: tokenSpacing.sm,
    textAlign: 'center',
  },
  message: {
    ...tokenType.body,
    textAlign: 'center',
    marginBottom: tokenSpacing.xl,
  },
  retryButton: {
    paddingHorizontal: tokenSpacing.xl,
    paddingVertical: tokenSpacing.md,
    borderRadius: tokenRadius.lg,
  },
  retryText: {
    ...tokenType.button,
  },
});
