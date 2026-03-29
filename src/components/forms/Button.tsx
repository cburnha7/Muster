import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, Spacing, TextStyles } from '../../theme';

type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'destructive';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  isLoading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  accessibilityLabel?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  isLoading = false,
  disabled = false,
  icon,
  accessibilityLabel,
}) => {
  const isDisabled = disabled || isLoading;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const getBackgroundColor = () => {
    if (isDisabled) {
      return colors.border;
    }
    switch (variant) {
      case 'primary':
        return colors.cobalt;
      case 'secondary':
        return colors.surface;
      case 'accent':
        return colors.gold;
      case 'destructive':
        return colors.heart;
      default:
        return colors.cobalt;
    }
  };

  const getTextColor = () => {
    if (isDisabled) {
      return colors.textTertiary;
    }
    return variant === 'secondary' ? colors.cobalt : colors.textInverse;
  };

  const backgroundColor = getBackgroundColor();
  const textColor = getTextColor();

  // Ensure minimum touch target size
  const minHeight = Platform.OS === 'ios' ? 44 : 48;

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
      activeOpacity={0.8}
    >
      <Animated.View
        style={[
          styles.button,
          { backgroundColor, minHeight, transform: [{ scale: scaleAnim }] },
          isDisabled && styles.disabled,
        ]}
      >
        {isLoading ? (
          <ActivityIndicator color={textColor} size="small" />
        ) : (
          <View style={styles.content}>
            {icon && (
              <Ionicons
                name={icon}
                size={20}
                color={textColor}
                style={styles.icon}
              />
            )}
            <Text style={[styles.text, { color: textColor }]}>{title}</Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginVertical: Spacing.xs,
  },
  disabled: {
    opacity: 0.6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: Spacing.sm,
  },
  text: {
    ...TextStyles.body,
    fontSize: 17,
    fontWeight: '600',
  },
});
