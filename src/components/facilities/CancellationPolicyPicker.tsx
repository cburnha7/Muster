import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { fonts, Spacing, BorderRadius, useTheme } from '../../theme';

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
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <Text style={[styles.sectionLabel, { color: colors.ink }]}>CANCELLATION POLICY</Text>

      <View style={styles.optionsRow}>
        {POLICY_OPTIONS.map(option => {
          const isSelected = value === option.value;
          return (
            <TouchableOpacity
              key={String(option.value)}
              style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }, isSelected && styles.chipSelected, isSelected && { backgroundColor: colors.cobalt, borderColor: colors.cobalt }]}
              onPress={() => onChange(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`Cancellation policy: ${option.label}`}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.chipText, { color: colors.ink }, isSelected && styles.chipTextSelected, isSelected && { color: colors.white }]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.helperText, { color: colors.inkFaint }]}>
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
    borderWidth: 1,
  },
  chipSelected: {},
  chipText: {
    fontFamily: fonts.body,
    fontSize: 14,
  },
  chipTextSelected: {
    fontFamily: fonts.ui,
  },
  helperText: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: Spacing.sm,
    lineHeight: 18,
  },
});
