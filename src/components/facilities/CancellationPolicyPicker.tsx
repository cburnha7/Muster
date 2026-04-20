import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, fonts, Spacing, BorderRadius } from '../../theme';
import { tokenColors } from '../../theme/tokens';

export interface CancellationPolicyPickerProps {
  value: number | null;
  onChange: (value: number | null) => void;
}

interface PolicyOption {
  label: string;
  value: number | null;
}

const POLICY_OPTIONS: PolicyOption[] = [
  { label: 'None', value: null },
  { label: 'Same day', value: 0 },
  { label: '12 hours', value: 12 },
  { label: '24 hours', value: 24 },
  { label: '48 hours', value: 48 },
  { label: '72 hours', value: 72 },
];

export function CancellationPolicyPicker({
  value,
  onChange,
}: CancellationPolicyPickerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>CANCELLATION POLICY</Text>

      <View style={styles.optionsRow}>
        {POLICY_OPTIONS.map(option => {
          const isSelected = value === option.value;
          return (
            <TouchableOpacity
              key={String(option.value)}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => onChange(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`Cancellation policy: ${option.label}`}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.chipText, isSelected && styles.chipTextSelected]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.helperText}>
        How far before the booking start time should cancellations require your
        approval?
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    fontFamily: fonts.label,
    fontSize: 11,
    letterSpacing: 1.6,
    color: colors.ink,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: tokenColors.border,
  },
  chipSelected: {
    backgroundColor: colors.cobalt,
    borderColor: colors.cobalt,
  },
  chipText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
  },
  chipTextSelected: {
    fontFamily: fonts.ui,
    color: tokenColors.white,
  },
  helperText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkFaint,
    marginTop: Spacing.sm,
    lineHeight: 18,
  },
});
