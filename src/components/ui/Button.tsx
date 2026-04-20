import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { tokenRadius, tokenSpacing, tokenType } from '../../theme/tokens';
import { useTheme } from '../../theme';

type Variant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'destructive'
  | 'salute'
  | 'neutral';
type Size = 'md' | 'sm';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  style,
}: Props) {
  const { colors, shadow } = useTheme();
  const height = size === 'md' ? 52 : 36;
  const px = size === 'md' ? tokenSpacing.xl : tokenSpacing.lg;

  const variants = {
    primary: {
      bg: colors.cobalt,
      borderWidth: 0,
      borderColor: colors.transparent,
      text: colors.white,
      shadow: shadow.fab,
      disabledBg: colors.border,
      disabledText: colors.inkSecondary,
    },
    secondary: {
      bg: colors.transparent,
      borderWidth: 1.5,
      borderColor: colors.border,
      text: colors.ink,
      shadow: undefined,
      disabledBg: colors.transparent,
      disabledText: colors.inkSecondary,
    },
    ghost: {
      bg: colors.transparent,
      borderWidth: 0,
      borderColor: colors.transparent,
      text: colors.cobalt,
      shadow: undefined,
      disabledBg: colors.transparent,
      disabledText: colors.inkSecondary,
    },
    destructive: {
      bg: colors.error,
      borderWidth: 0,
      borderColor: colors.transparent,
      text: colors.white,
      shadow: undefined,
      disabledBg: colors.border,
      disabledText: colors.inkSecondary,
    },
    salute: {
      bg: colors.goldLight,
      borderWidth: 1.5,
      borderColor: colors.gold,
      text: colors.gold,
      shadow: undefined,
      disabledBg: colors.border,
      disabledText: colors.inkSecondary,
    },
    neutral: {
      bg: colors.background,
      borderWidth: 1.5,
      borderColor: colors.border,
      text: colors.inkSecondary,
      shadow: undefined,
      disabledBg: colors.border,
      disabledText: colors.inkSecondary,
    },
  };
  const v = variants[variant];

  const isDisabled = disabled || loading;
  const bgColor = isDisabled ? v.disabledBg : v.bg;
  const textColor = isDisabled ? v.disabledText : v.text;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled }}
      style={[
        {
          height,
          borderRadius: tokenRadius.lg,
          borderWidth: v.borderWidth,
          borderColor: v.borderColor,
          backgroundColor: bgColor,
          paddingHorizontal: px,
          paddingVertical: tokenSpacing.md,
          alignItems: 'center' as const,
          justifyContent: 'center' as const,
          flexDirection: 'row' as const,
          gap: tokenSpacing.sm,
        },
        !isDisabled && v.shadow ? v.shadow : undefined,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text
          style={{
            ...tokenType.button,
            color: textColor,
          }}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}
