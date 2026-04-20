import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput as RNTextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInputProps as RNTextInputProps,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, TextStyles, useTheme } from '../../theme';
import { shake } from '../../utils/animations';

interface TextInputProps extends Omit<RNTextInputProps, 'onChangeText'> {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  secureTextEntry?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  onBlur?: () => void;
  editable?: boolean;
  accessibilityLabel?: string;
}

export const TextInput: React.FC<TextInputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry = false,
  icon,
  onBlur,
  editable = true,
  accessibilityLabel,
  ...rest
}) => {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const errorOpacity = useRef(new Animated.Value(0)).current;

  // Shake animation when error appears
  useEffect(() => {
    if (error) {
      shake(shakeAnim);
      Animated.timing(errorOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(errorOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [error, shakeAnim, errorOpacity]);

  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const borderColor = error
    ? colors.heart
    : isFocused
    ? colors.cobalt
    : colors.border;

  return (
    <Animated.View 
      style={[
        styles.container,
        { transform: [{ translateX: shakeAnim }] }
      ]}
    >
      <Text style={styles.label} accessibilityLabel={accessibilityLabel || label}>
        {label}
      </Text>
      <View style={[styles.inputContainer, { borderColor }]}>
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={error ? colors.heart : colors.inkFaint}
            style={styles.icon}
          />
        )}
        <RNTextInput
          style={[styles.input, icon && styles.inputWithIcon]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          onFocus={handleFocus}
          onBlur={handleBlur}
          editable={editable}
          accessible={true}
          accessibilityLabel={accessibilityLabel || label}
          accessibilityHint={error ? `Error: ${error}` : undefined}
          {...rest}
        />
        {secureTextEntry && (
          <TouchableOpacity
            onPress={togglePasswordVisibility}
            style={styles.eyeIcon}
            accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
            accessibilityRole="button"
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.inkFaint}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <Animated.Text
          style={[styles.errorText, { opacity: errorOpacity }]}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
        >
          {error}
        </Animated.Text>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    ...TextStyles.body,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderRadius: 8,
    height: 48,
    paddingHorizontal: Spacing.md,
  },
  icon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    ...TextStyles.body,
    color: colors.textPrimary,
    height: '100%',
  },
  inputWithIcon: {
    paddingLeft: 0,
  },
  eyeIcon: {
    padding: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  errorText: {
    ...TextStyles.caption,
    color: colors.heart,
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
  },
});
