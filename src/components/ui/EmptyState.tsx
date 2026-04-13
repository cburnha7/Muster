import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

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
  const { colors, type, spacing, radius, shadow } = useTheme();

  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxxl,
        paddingHorizontal: spacing.xl,
      }}
    >
      <Ionicons name={icon} size={48} color={colors.textMuted} />
      <Text
        style={{
          ...type.headingSm,
          color: colors.textPrimary,
          marginTop: spacing.base,
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={{
            ...type.body,
            color: colors.textSecondary,
            marginTop: spacing.sm,
            textAlign: 'center',
            lineHeight: 22,
          }}
        >
          {subtitle}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <TouchableOpacity
          style={{
            marginTop: spacing.lg,
            backgroundColor: colors.cobalt,
            paddingHorizontal: spacing.xl,
            paddingVertical: spacing.md,
            borderRadius: radius.full,
            ...shadow.cta,
          }}
          onPress={onAction}
          activeOpacity={0.75}
        >
          <Text style={{ ...type.ui, color: colors.textInverse }}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};
