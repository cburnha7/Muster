import React, {
  useState,
  forwardRef,
  useRef,
  useImperativeHandle,
} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, useTheme } from '../../theme';

interface FormInputProps extends TextInputProps {
  label?: string;
  error?: string;
  required?: boolean;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  containerStyle?: any;
  inputStyle?: any;
  labelStyle?: any;
  errorStyle?: any;
}

export const FormInput = forwardRef<any, FormInputProps>(
  (
    {
      label,
      error,
      required = false,
      leftIcon,
      rightIcon,
      onRightIconPress,
      containerStyle,
      inputStyle,
      labelStyle,
      errorStyle,
      secureTextEntry,
      ...textInputProps
    },
    ref
  ) => {
    const inputRef = useRef<any>(null);
    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
    }));
    const [isSecure, setIsSecure] = useState(secureTextEntry);
    const { colors } = useTheme();
    const [isFocused, setIsFocused] = useState(false);

    const handleToggleSecure = () => {
      setIsSecure(!isSecure);
    };

    const showPasswordToggle = secureTextEntry && !rightIcon;

    return (
      <View style={[styles.container, containerStyle]}>
        {label && (
          <Text
            style={[
              styles.label,
              { color: colors.textPrimary },
              labelStyle,
            ]}
          >
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        )}

        <View
          style={[
            styles.inputContainer,
            { backgroundColor: colors.bgInput },
            isFocused && [
              styles.inputContainerFocused,
              { backgroundColor: colors.bgCard },
            ],
            error && styles.inputContainerError,
          ]}
        >
          {leftIcon && (
            <Ionicons
              name={leftIcon as any}
              size={20}
              color={
                error
                  ? colors.error
                  : isFocused
                    ? colors.primary
                    : colors.outline
              }
              style={styles.leftIcon}
            />
          )}

          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              { color: colors.textPrimary },
              leftIcon && styles.inputWithLeftIcon,
              (rightIcon || showPasswordToggle) && styles.inputWithRightIcon,
              Platform.OS === 'web' && { outlineStyle: 'none' as any },
              inputStyle,
            ]}
            secureTextEntry={isSecure}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsFocused(false);
              textInputProps.onBlur?.(undefined as any);
            }}
            placeholderTextColor={colors.textMuted}
            keyboardAppearance={
              colors.bgScreen === '#0A0F1E' ? 'dark' : 'light'
            }
            {...textInputProps}
          />

          {showPasswordToggle && (
            <TouchableOpacity
              onPress={handleToggleSecure}
              style={styles.rightIcon}
            >
              <Ionicons
                name={isSecure ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.outline}
              />
            </TouchableOpacity>
          )}

          {rightIcon && !showPasswordToggle && (
            <TouchableOpacity
              onPress={onRightIconPress}
              style={styles.rightIcon}
            >
              <Ionicons
                name={rightIcon as any}
                size={20}
                color={
                  error
                    ? colors.error
                    : isFocused
                      ? colors.primary
                      : colors.outline
                }
              />
            </TouchableOpacity>
          )}
        </View>

        {error && <Text style={[styles.error, errorStyle]}>{error}</Text>}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: fonts.headingSemi,
    color: colors.onSurface,
    marginBottom: 8,
    letterSpacing: -0.1,
  },
  required: {
    color: colors.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    paddingHorizontal: 16,
    minHeight: 52,
  },
  inputContainerFocused: {
    borderColor: 'rgba(0, 82, 255, 0.2)',
    backgroundColor: colors.surfaceContainerLowest,
  },
  inputContainerError: {
    borderColor: 'rgba(186, 26, 26, 0.2)',
    backgroundColor: colors.errorContainer,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.onSurface,
    paddingVertical: 14,
  },
  inputWithLeftIcon: {
    marginLeft: 10,
  },
  inputWithRightIcon: {
    marginRight: 8,
  },
  leftIcon: {
    marginRight: 0,
  },
  rightIcon: {
    padding: 4,
    marginLeft: 0,
  },
  error: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.error,
    marginTop: 6,
  },
});
