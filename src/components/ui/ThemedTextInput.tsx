import React, { useState } from 'react';
import {
  View,
  TextInput as RNInput,
  Text,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import {
  tokenColors,
  tokenSpacing,
  tokenRadius,
  tokenType,
  tokenFontFamily,
} from '../../theme/tokens';

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
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? tokenColors.error
    : focused
      ? tokenColors.cobalt
      : tokenColors.border;
  const bg = tokenColors.surface;
  const borderWidth = 1.5;

  return (
    <View style={containerStyle}>
      {label && (
        <Text
          style={{
            ...tokenType.fieldLabel,
            color: tokenColors.ink,
            marginBottom: tokenSpacing.sm,
          }}
        >
          {label}
          {required && <Text style={{ color: tokenColors.error }}> *</Text>}
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
        placeholderTextColor={tokenColors.inkSecondary}
        keyboardAppearance="light"
        style={[
          {
            borderRadius: tokenRadius.md,
            borderWidth,
            borderColor,
            backgroundColor: bg,
            paddingVertical: tokenSpacing.md,
            paddingHorizontal: tokenSpacing.lg,
            ...tokenType.input,
            color: tokenColors.ink,
          },
          rest.style,
        ]}
      />
      {error && (
        <Text
          style={{
            ...tokenType.error,
            color: tokenColors.error,
            marginTop: tokenSpacing.xs,
          }}
        >
          ⚠ {error}
        </Text>
      )}
    </View>
  );
}
