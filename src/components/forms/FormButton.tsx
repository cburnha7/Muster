import React, { useRef, useCallback } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, fonts, useTheme } from '../../theme';

interface FormButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'muted' | 'danger';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: string;
  rightIcon?: string;
  style?: any;
  textStyle?: any;
}

function triggerHaptic() {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export const FormButton: React.FC<FormButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
}) => {
  const isDisabled = disabled || loading;
  const { colors: themeColors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    triggerHaptic();
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  }, [scaleAnim]);

  const getIconColor = () => {
    if (isDisabled) return colors.outline;
    switch (variant) {
      case 'primary':
      case 'danger':
        return '#FFFFFF';
      case 'secondary':
        return colors.onSurface;
      case 'outline':
        return colors.primary;
      case 'muted':
        return colors.onSurface;
      default:
        return '#FFFFFF';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 16;
      case 'medium':
        return 18;
      case 'large':
        return 20;
      default:
        return 18;
    }
  };

  const sizeStyle =
    size === 'small'
      ? styles.small
      : size === 'large'
        ? styles.large
        : styles.medium;
  const textSizeStyle =
    size === 'small'
      ? styles.smallText
      : size === 'large'
        ? styles.largeText
        : styles.mediumText;

  const content = (
    <View style={styles.content}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={getIconColor()}
          style={styles.leftIcon}
        />
      ) : (
        leftIcon && (
          <Ionicons
            name={leftIcon as any}
            size={getIconSize()}
            color={getIconColor()}
            style={styles.leftIcon}
          />
        )
      )}
      <Text
        style={[
          styles.text,
          textSizeStyle,
          variant === 'primary' && styles.primaryText,
          variant === 'secondary' && styles.secondaryText,
          variant === 'outline' && styles.outlineText,
          variant === 'muted' && styles.mutedText,
          variant === 'danger' && styles.dangerText,
          isDisabled && styles.disabledText,
          textStyle,
        ]}
      >
        {title}
      </Text>
      {rightIcon && !loading && (
        <Ionicons
          name={rightIcon as any}
          size={getIconSize()}
          color={getIconColor()}
          style={styles.rightIcon}
        />
      )}
    </View>
  );

  // Primary variant gets the glow gradient
  if (variant === 'primary' && !isDisabled) {
    return (
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        style={style}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <LinearGradient
            colors={[colors.primary, colors.primaryContainer]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.button, sizeStyle, styles.primary]}
          >
            {content}
          </LinearGradient>
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
    >
      <Animated.View
        style={[
          styles.button,
          sizeStyle,
          variant === 'primary' && styles.primaryFlat,
          variant === 'secondary' && styles.secondary,
          variant === 'outline' && styles.outline,
          variant === 'muted' && styles.muted,
          variant === 'danger' && styles.danger,
          isDisabled && styles.disabled,
          style,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {content}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: fonts.ui,
    textAlign: 'center',
    letterSpacing: -0.1,
  },

  // Size variants
  small: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    minHeight: 40,
  },
  medium: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    minHeight: 52,
  },
  large: {
    paddingHorizontal: 32,
    paddingVertical: 18,
    minHeight: 58,
  },

  // Text sizes
  smallText: { fontSize: 14 },
  mediumText: { fontSize: 16 },
  largeText: { fontSize: 18 },

  // Color variants
  primary: {},
  primaryFlat: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  primaryText: {
    color: '#FFFFFF',
  },

  secondary: {
    backgroundColor: colors.surfaceContainerLow,
  },
  secondaryText: {
    color: colors.onSurface,
  },

  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.outlineVariant,
  },
  outlineText: {
    color: colors.primary,
  },

  muted: {
    backgroundColor: 'transparent',
  },
  mutedText: {
    color: colors.onSurfaceVariant,
  },

  danger: {
    backgroundColor: colors.error,
  },
  dangerText: {
    color: '#FFFFFF',
  },

  // Disabled
  disabled: {
    backgroundColor: colors.surfaceDim,
    borderColor: colors.surfaceDim,
  },
  disabledText: {
    color: colors.outline,
  },

  // Icons
  leftIcon: { marginRight: 8 },
  rightIcon: { marginLeft: 8 },
});
