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

  // Resolve dynamic colors per variant
  const bgColor = (() => {
    if (isDisabled) return colors.border;
    switch (variant) {
      case 'primary':
        return colors.cobalt;
      case 'confirmed':
        return colors.pine;
      case 'danger':
        return colors.heart;
      case 'secondary':
        return colors.transparent;
      default:
        return colors.cobalt;
    }
  })();

  const labelColor = (() => {
    if (isDisabled) return colors.inkMuted;
    switch (variant) {
      case 'primary':
      case 'confirmed':
      case 'danger':
        return colors.white;
      case 'secondary':
        return colors.cobalt;
      default:
        return colors.white;
    }
  })();

  const borderColor = variant === 'secondary' ? colors.cobalt : 'transparent';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: bgColor,
            borderColor,
            borderWidth: variant === 'secondary' ? 1.5 : 0,
          },
        ]}
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
                color={labelColor}
                style={styles.icon}
              />
            )}
            <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
          </View>
        )}
      </TouchableOpacity>

      {secondaryLabel && onSecondaryPress ? (
        <TouchableOpacity
          onPress={onSecondaryPress}
          activeOpacity={0.7}
          style={styles.secondaryBtn}
        >
          <Text style={[styles.secondaryText, { color: colors.inkSecondary }]}>
            {secondaryLabel}
          </Text>
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
  label: {
    fontFamily: fonts.ui,
    fontSize: 16,
  },
  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  secondaryText: {
    fontFamily: fonts.ui,
    fontSize: 14,
  },
});
