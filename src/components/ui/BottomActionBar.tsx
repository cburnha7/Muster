import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function BottomActionBar({ children, style }: Props) {
  const { colors, spacing } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.bgCard,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingHorizontal: spacing.base,
          paddingTop: spacing.md,
          paddingBottom: spacing.lg,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
