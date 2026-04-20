import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokenColors, tokenSpacing } from '../../theme/tokens';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function BottomActionBar({ children, style }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        {
          backgroundColor: tokenColors.surface,
          borderTopWidth: 1,
          borderTopColor: tokenColors.border,
          paddingHorizontal: tokenSpacing.lg,
          paddingTop: tokenSpacing.md,
          paddingBottom: insets.bottom + tokenSpacing.lg,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
