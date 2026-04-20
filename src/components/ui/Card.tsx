import React from 'react';
import { View, ViewStyle } from 'react-native';
import { tokenRadius, tokenSpacing } from '../../theme/tokens';
import { useTheme } from '../../theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
}

export function Card({ children, style, padded = true }: Props) {
  const { colors, shadow } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: tokenRadius.lg,
          overflow: 'hidden' as const,
          ...(padded ? { padding: tokenSpacing.lg } : {}),
          ...shadow.card,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
