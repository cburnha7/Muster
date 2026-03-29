import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme';

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
      case 'small': return 16;
      case 'medium': return 18;
      case 'large': return 20;
      default: return 18;
    }
  };

  const sizeStyle = size === 'small' ? styles.small : size === 'large' ? styles.large : styles.medium;
  const textSizeStyle = size === 'small' ? styles.smallText : size === 'large' ? styles.largeText : styles.mediumText;

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
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.85}
        style={style}
      >
        <LinearGradient
          colors={['#0052FF', '#003EC7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.button, sizeStyle, styles.primary]}
        >
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
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
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
    >
      {content}
    </TouchableOpacity>
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
  primary: {
    // gradient handles background
  },
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
