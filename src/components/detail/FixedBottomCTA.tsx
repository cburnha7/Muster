import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fonts, useTheme } from '../../theme';

type Variant = 'primary' | 'confirmed' | 'secondary' | 'danger' | 'disabled';

interface FixedBottomCTAProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Smaller ghost link below the main button */
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
}

export function FixedBottomCTA({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  icon,
  secondaryLabel,
  onSecondaryPress,
}: FixedBottomCTAProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isDisabled = variant === 'disabled' || loading;

  const buttonStyle = [
    styles.button,
    variant === 'primary' && styles.primary,
    variant === 'confirmed' && styles.confirmed,
    variant === 'secondary' && styles.secondary,
    variant === 'danger' && styles.danger,
    isDisabled && styles.disabled,
  ];

  const textStyle = [
    styles.label,
    (variant === 'primary' ||
      variant === 'confirmed' ||
      variant === 'danger') &&
      styles.labelLight,
    variant === 'secondary' && styles.labelPrimary,
    isDisabled && styles.labelDimmed,
  ];

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background, borderTopColor: colors.border }, { paddingBottom: Math.max(insets.bottom, 12) }]}
    >
      <TouchableOpacity
        style={buttonStyle}
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator
            color={variant === 'secondary' ? colors.cobalt : colors.white}
            size="small"
          />
        ) : (
          <View style={styles.inner}>
            {icon && (
              <Ionicons
                name={icon}
                size={18}
                color={
                  variant === 'secondary' ? colors.cobalt : colors.white
                }
                style={styles.icon}
              />
            )}
            <Text style={textStyle}>{label}</Text>
          </View>
        )}
      </TouchableOpacity>

      {secondaryLabel && onSecondaryPress ? (
        <TouchableOpacity
          onPress={onSecondaryPress}
          activeOpacity={0.7}
          style={styles.secondary2}
        >
          <Text style={[styles.secondaryText, { color: colors.inkSecondary }]}>{secondaryLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  button: {
    borderRadius: 9999,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 6,
  },
  primary: {},
  confirmed: {},
  secondary: {
    borderWidth: 1.5,
  },
  danger: {},
  disabled: {},
  label: {
    fontFamily: fonts.ui,
    fontSize: 16,
  },
  labelLight: {},
  labelPrimary: {},
  labelDimmed: {},
  secondary2: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  secondaryText: {
    fontFamily: fonts.ui,
    fontSize: 14,
  },
});
