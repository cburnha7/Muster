import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, Spacing, useTheme } from '../../theme';

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
  const { colors } = useTheme();
  const minSize = Platform.OS === 'ios' ? 44 : 48;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.checkboxContainer, { minHeight: minSize }]}
        onPress={onToggle}
        accessibilityLabel={
          accessibilityLabel || (typeof label === 'string' ? label : 'Checkbox')
        }
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
            <Ionicons name="checkmark" size={14} color={colors.white} />
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
    marginVertical: Spacing.xs,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxError: {
    borderColor: colors.error,
  },
  labelContainer: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.onSurfaceVariant,
    flexWrap: 'wrap',
  },
  errorText: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.error,
    marginTop: Spacing.xs,
    marginLeft: 30,
  },
});
