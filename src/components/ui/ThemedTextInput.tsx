import React, { useState } from 'react';
import {
  View,
  TextInput as RNInput,
  Text,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../theme';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export function ThemedTextInput({
  label,
  error,
  containerStyle,
  ...rest
}: Props) {
  const { colors, type, spacing, radius, isDark } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? colors.borderError
    : focused
      ? colors.borderFocus
      : colors.borderStrong;
  const bg = error
    ? colors.bgInputError
    : focused
      ? colors.bgInputFocus
      : colors.bgInput;
  const borderWidth = focused || error ? 2 : 1.5;

  return (
    <View style={containerStyle}>
      {label && (
        <Text
          style={{
            ...type.label,
            color: error ? colors.heart : colors.textSecondary,
            marginBottom: spacing.xs,
          }}
        >
          {label}
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
        placeholderTextColor={colors.textMuted}
        keyboardAppearance={isDark ? 'dark' : 'light'}
        style={[
          {
            height: 50,
            borderRadius: radius.md,
            borderWidth,
            borderColor,
            backgroundColor: bg,
            paddingHorizontal: spacing.md,
            ...type.body,
            color: colors.textPrimary,
          },
          rest.style,
        ]}
      />
      {error && (
        <Text
          style={{ ...type.bodySm, color: colors.heart, marginTop: spacing.xs }}
        >
          {error}
        </Text>
      )}
    </View>
  );
}
