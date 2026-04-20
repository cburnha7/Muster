import React, { useState } from 'react';
import {
  View,
  TextInput as RNInput,
  Text,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { tokenSpacing, tokenRadius, tokenType } from '../../theme/tokens';
import { useTheme } from '../../theme';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  required?: boolean;
  containerStyle?: ViewStyle;
}

export function ThemedTextInput({
  label,
  error,
  required,
  containerStyle,
  ...rest
}: Props) {
  const { colors, isDark } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? colors.error
    : focused
      ? colors.cobalt
      : colors.border;
  const bg = colors.surface;
  const borderWidth = 1.5;

  return (
    <View style={containerStyle}>
      {label && (
        <Text
          style={{
            ...tokenType.fieldLabel,
            color: colors.ink,
            marginBottom: tokenSpacing.sm,
          }}
        >
          {label}
          {required && <Text style={{ color: colors.error }}> *</Text>}
        </Text>
      )}
      <RNInput
        {...rest}
        onFocus={e => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={e => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        placeholderTextColor={colors.inkSecondary}
        keyboardAppearance={isDark ? 'dark' : 'light'}
        style={[
          {
            borderRadius: tokenRadius.md,
            borderWidth,
            borderColor,
            backgroundColor: bg,
            paddingVertical: tokenSpacing.md,
            paddingHorizontal: tokenSpacing.lg,
            ...tokenType.input,
            color: colors.ink,
          },
          rest.style,
        ]}
      />
      {error && (
        <Text
          style={{
            ...tokenType.error,
            color: colors.error,
            marginTop: tokenSpacing.xs,
          }}
        >
          ⚠ {error}
        </Text>
      )}
    </View>
  );
}
