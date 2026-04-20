import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokenSpacing } from '../../theme/tokens';
import { useTheme } from '../../theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function BottomActionBar({ children, style }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
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
