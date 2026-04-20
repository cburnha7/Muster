import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, Spacing, TextStyles } from '../../theme';
import { tokenColors } from '../../theme/tokens';

type SSOProvider = 'apple' | 'google';

interface SSOButtonProps {
  provider: SSOProvider;
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export const SSOButton: React.FC<SSOButtonProps> = ({
  provider,
  onPress,
  isLoading = false,
  disabled = false,
}) => {
  const isDisabled = disabled || isLoading;

  const getProviderConfig = () => {
    switch (provider) {
      case 'apple':
        return {
          backgroundColor: tokenColors.black,
          textColor: tokenColors.white,
          icon: 'logo-apple' as keyof typeof Ionicons.glyphMap,
          label: 'Sign in with Apple',
          accessibilityLabel: 'Sign in with Apple',
        };
      case 'google':
        return {
          backgroundColor: tokenColors.white,
          textColor: tokenColors.black,
          icon: 'logo-google' as keyof typeof Ionicons.glyphMap,
          label: 'Sign in with Google',
          accessibilityLabel: 'Sign in with Google',
        };
    }
  };

  const config = getProviderConfig();
  const minHeight = Platform.OS === 'ios' ? 44 : 48;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: config.backgroundColor,
          minHeight,
          borderWidth: provider === 'google' ? 1 : 0,
          borderColor: provider === 'google' ? colors.border : 'transparent',
        },
        isDisabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityLabel={config.accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
    >
      {isLoading ? (
        <ActivityIndicator color={config.textColor} size="small" />
      ) : (
        <View style={styles.content}>
          <Ionicons
            name={config.icon}
            size={20}
            color={config.textColor}
            style={styles.icon}
          />
          <Text style={[styles.text, { color: config.textColor }]}>
            {config.label}
          </Text>
        </View>
      )}
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
    ...Platform.select({
      ios: {
        shadowColor: tokenColors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
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
    marginRight: Spacing.md,
  },
  text: {
    ...TextStyles.body,
    fontSize: 17,
    fontWeight: '600',
  },
});
