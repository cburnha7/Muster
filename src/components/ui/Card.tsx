import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
}

export function Card({ children, style, padded = true }: Props) {
  const { colors, shadow, radius, spacing } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.bgCard,
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden' as const,
          ...(padded ? { padding: spacing.base } : {}),
          ...shadow.card,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
