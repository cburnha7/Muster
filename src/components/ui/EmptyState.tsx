import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
}) => {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={48} color={colors.cobaltTint} />
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onAction}
          activeOpacity={0.8}
        >
          <Text style={styles.actionLabel}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.onSurface,
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.onSurfaceVariant,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  actionButton: {
    marginTop: 20,
    backgroundColor: colors.cobalt,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 9999,
  },
  actionLabel: {
    fontFamily: fonts.ui,
    fontSize: 15,
    color: colors.onPrimary,
  },
});
