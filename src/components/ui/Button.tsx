import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../theme';

type Variant = 'primary' | 'secondary' | 'destructive' | 'salute' | 'neutral';
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
  const { colors, shadow, radius, type } = useTheme();

  const height = size === 'md' ? 52 : 36;
  const px = size === 'md' ? 24 : 14;
  const txtStyle = size === 'md' ? type.ui : type.uiSm;

  const variants = {
    primary: {
      bg: colors.cobalt,
      border: 'transparent',
      text: colors.textInverse,
      shadow: shadow.cta,
    },
    secondary: {
      bg: 'transparent',
      border: colors.cobalt,
      text: colors.cobalt,
      shadow: undefined,
    },
    destructive: {
      bg: colors.heartTint,
      border: colors.heart,
      text: colors.heart,
      shadow: undefined,
    },
    salute: {
      bg: colors.goldTint,
      border: colors.gold,
      text: colors.gold,
      shadow: undefined,
    },
    neutral: {
      bg: colors.bgSubtle,
      border: colors.border,
      text: colors.textSecondary,
      shadow: undefined,
    },
  };
  const v = variants[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        {
          height,
          borderRadius: radius.lg,
          borderWidth: 2,
          borderColor: v.border,
          backgroundColor: v.bg,
          paddingHorizontal: px,
          alignItems: 'center' as const,
          justifyContent: 'center' as const,
          flexDirection: 'row' as const,
          gap: 8,
          opacity: disabled ? 0.5 : 1,
        },
        v.shadow,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} size="small" />
      ) : (
        <Text style={{ ...txtStyle, color: v.text }}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}
