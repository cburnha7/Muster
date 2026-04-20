import React from 'react';
import { View, ViewStyle } from 'react-native';
import {
  tokenColors,
  tokenRadius,
  tokenSpacing,
  tokenShadow,
} from '../../theme/tokens';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
}

export function Card({ children, style, padded = true }: Props) {
  return (
    <View
      style={[
        {
          backgroundColor: tokenColors.surface,
          borderRadius: tokenRadius.lg,
          overflow: 'hidden' as const,
          ...(padded ? { padding: tokenSpacing.lg } : {}),
          ...tokenShadow.card,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
