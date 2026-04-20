import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import {
  tokenColors,
  tokenRadius,
  tokenSpacing,
  tokenType,
  tokenShadow,
} from '../../theme/tokens';

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
  const height = size === 'md' ? 52 : 36;
  const px = size === 'md' ? tokenSpacing.xl : tokenSpacing.lg;

  const variants = {
    primary: {
      bg: tokenColors.cobalt,
      borderWidth: 0,
      borderColor: tokenColors.transparent,
      text: tokenColors.white,
      shadow: tokenShadow.fab,
      disabledBg: tokenColors.border,
      disabledText: tokenColors.inkSecondary,
    },
    secondary: {
      bg: tokenColors.transparent,
      borderWidth: 1.5,
      borderColor: tokenColors.border,
      text: tokenColors.ink,
      shadow: undefined,
      disabledBg: tokenColors.transparent,
      disabledText: tokenColors.inkSecondary,
    },
    ghost: {
      bg: tokenColors.transparent,
      borderWidth: 0,
      borderColor: tokenColors.transparent,
      text: tokenColors.cobalt,
      shadow: undefined,
      disabledBg: tokenColors.transparent,
      disabledText: tokenColors.inkSecondary,
    },
    destructive: {
      bg: tokenColors.error,
      borderWidth: 0,
      borderColor: tokenColors.transparent,
      text: tokenColors.white,
      shadow: undefined,
      disabledBg: tokenColors.border,
      disabledText: tokenColors.inkSecondary,
    },
    salute: {
      bg: tokenColors.goldLight,
      borderWidth: 1.5,
      borderColor: tokenColors.gold,
      text: tokenColors.gold,
      shadow: undefined,
      disabledBg: tokenColors.border,
      disabledText: tokenColors.inkSecondary,
    },
    neutral: {
      bg: tokenColors.background,
      borderWidth: 1.5,
      borderColor: tokenColors.border,
      text: tokenColors.inkSecondary,
      shadow: undefined,
      disabledBg: tokenColors.border,
      disabledText: tokenColors.inkSecondary,
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
