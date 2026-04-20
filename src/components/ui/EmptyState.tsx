import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  tokenColors,
  tokenSpacing,
  tokenRadius,
  tokenType,
  tokenShadow,
  tokenFontFamily,
} from '../../theme/tokens';

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
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: tokenSpacing.xxxl,
        paddingHorizontal: tokenSpacing.xl,
      }}
    >
      <Ionicons name={icon} size={48} color={tokenColors.inkSecondary} />
      <Text
        style={{
          fontFamily: tokenFontFamily.display,
          fontSize: 18,
          lineHeight: 24,
          color: tokenColors.ink,
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
            color: tokenColors.inkSecondary,
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
            backgroundColor: tokenColors.cobalt,
            paddingHorizontal: tokenSpacing.xl,
            paddingVertical: tokenSpacing.md,
            borderRadius: tokenRadius.lg,
            ...tokenShadow.fab,
          }}
          onPress={onAction}
          activeOpacity={0.75}
        >
          <Text style={{ ...tokenType.button, color: tokenColors.white }}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};
