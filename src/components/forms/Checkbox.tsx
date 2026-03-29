import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, Spacing, TextStyles } from '../../theme';

interface CheckboxProps {
  label: string | React.ReactNode;
  checked: boolean;
  onToggle: () => void;
  error?: string;
  accessibilityLabel?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  checked,
  onToggle,
  error,
  accessibilityLabel,
}) => {
  // Ensure minimum touch target size
  const minSize = Platform.OS === 'ios' ? 44 : 48;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.checkboxContainer, { minHeight: minSize }]}
        onPress={onToggle}
        accessibilityLabel={accessibilityLabel || (typeof label === 'string' ? label : 'Checkbox')}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.checkbox,
            checked && styles.checkboxChecked,
            error && styles.checkboxError,
          ]}
        >
          {checked && (
            <Ionicons name="checkmark" size={16} color={colors.textInverse} />
          )}
        </View>
        <View style={styles.labelContainer}>
          {typeof label === 'string' ? (
            <Text style={styles.label}>{label}</Text>
          ) : (
            label
          )}
        </View>
      </TouchableOpacity>
      {error && (
        <Text
          style={styles.errorText}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
        >
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.sm,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  checkboxChecked: {
    backgroundColor: colors.cobalt,
    borderColor: colors.cobalt,
  },
  checkboxError: {
    borderColor: colors.heart,
  },
  labelContainer: {
    flex: 1,
  },
  label: {
    ...TextStyles.body,
    color: colors.textPrimary,
    flexWrap: 'wrap',
  },
  errorText: {
    ...TextStyles.caption,
    color: colors.heart,
    marginTop: Spacing.xs,
    marginLeft: 40, // Align with label (24px checkbox + 16px margin)
  },
});
