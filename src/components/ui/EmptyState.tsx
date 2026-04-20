import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  tokenSpacing,
  tokenRadius,
  tokenType,
  tokenFontFamily,
} from '../../theme/tokens';
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
  const { colors, shadow } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: tokenSpacing.xxxl,
        paddingHorizontal: tokenSpacing.xl,
      }}
    >
      <Ionicons name={icon} size={48} color={colors.inkSecondary} />
      <Text
        style={{
          fontFamily: tokenFontFamily.display,
          fontSize: 18,
          lineHeight: 24,
          color: colors.ink,
          marginTop: tokenSpacing.lg,
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={{
            ...tokenType.body,
            color: colors.inkSecondary,
            marginTop: tokenSpacing.sm,
            textAlign: 'center',
          }}
        >
          {subtitle}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <TouchableOpacity
          style={{
            marginTop: tokenSpacing.xl,
            backgroundColor: colors.cobalt,
            paddingHorizontal: tokenSpacing.xl,
            paddingVertical: tokenSpacing.md,
            borderRadius: tokenRadius.lg,
            ...shadow.fab,
          }}
          onPress={onAction}
          activeOpacity={0.75}
        >
          <Text style={{ ...tokenType.button, color: colors.white }}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};
