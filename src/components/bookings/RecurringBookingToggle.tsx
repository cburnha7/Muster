/**
 * RecurringBookingToggle — Repeat Booking toggle with frequency + end date pickers.
 * Shown below the time slot selector in the court booking flow.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Platform,
} from 'react-native';
import DateTimePicker from '../../components/ui/CrossPlatformDateTimePicker';
import { Ionicons } from '@expo/vector-icons';
import { fonts, typeScale, useTheme } from '../../theme';

export type RecurringFrequency = 'weekly' | 'monthly';

export interface RecurringConfig {
  enabled: boolean;
  frequency: RecurringFrequency;
  endDate: Date | null;
}

interface Props {
  value: RecurringConfig;
  onChange: (config: RecurringConfig) => void;
  minEndDate: Date;
}

export function RecurringBookingToggle({ value, onChange, minEndDate }: Props) {
  const { colors } = useTheme();
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleToggle = (enabled: boolean) => {
    onChange({ ...value, enabled });
  };

  const handleFrequency = (freq: RecurringFrequency) => {
    onChange({ ...value, frequency: freq });
  };

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS !== 'web') setShowDatePicker(false);
    if (selectedDate) onChange({ ...value, endDate: selectedDate });
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const maxEndDate = new Date(minEndDate);
  maxEndDate.setFullYear(maxEndDate.getFullYear() + 1);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: `${colors.inkFaint}20` }]}>
      <View style={styles.toggleRow}>
        <View style={styles.toggleLabel}>
          <Ionicons name="repeat" size={20} color={colors.cobalt} />
          <Text style={[styles.toggleText, { color: colors.ink }]}>Repeat Booking</Text>
        </View>
        <Switch
          value={value.enabled}
          onValueChange={handleToggle}
          trackColor={{
            false: `${colors.inkFaint}40`,
            true: `${colors.cobalt}60`,
          }}
          thumbColor={value.enabled ? colors.cobalt : colors.surface}
        />
      </View>

      {value.enabled && (
        <View style={[styles.options, { borderTopColor: `${colors.inkFaint}15` }]}>
          {/* Frequency selector */}
          <Text style={[styles.fieldLabel, { color: colors.inkFaint }]}>Frequency</Text>
          <View style={styles.frequencyRow}>
            <TouchableOpacity
              style={[
                styles.freqButton, { borderColor: `${colors.inkFaint}30` },
                value.frequency === 'weekly' && styles.freqButtonActive, value.frequency === 'weekly' && { backgroundColor: `${colors.cobalt}15`, borderColor: colors.cobalt }]}
              onPress={() => handleFrequency('weekly')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.freqText, { color: colors.inkFaint },
                  value.frequency === 'weekly' && styles.freqTextActive, value.frequency === 'weekly' && { color: colors.cobalt }]}
              >
                Weekly
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.freqButton, { borderColor: `${colors.inkFaint}30` },
                value.frequency === 'monthly' && styles.freqButtonActive, value.frequency === 'monthly' && { backgroundColor: `${colors.cobalt}15`, borderColor: colors.cobalt }]}
              onPress={() => handleFrequency('monthly')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.freqText, { color: colors.inkFaint },
                  value.frequency === 'monthly' && styles.freqTextActive, value.frequency === 'monthly' && { color: colors.cobalt }]}
              >
                Monthly
              </Text>
            </TouchableOpacity>
          </View>

          {/* End date picker */}
          <Text style={[styles.fieldLabel, { color: colors.inkFaint }]}>Repeat Until</Text>
          <TouchableOpacity
            style={[styles.dateButton, { borderColor: `${colors.inkFaint}30`, backgroundColor: colors.surface }]}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="calendar-outline"
              size={18}
              color={colors.inkFaint}
            />
            <Text style={[styles.dateText, { color: colors.ink }]}>
              {value.endDate ? formatDate(value.endDate) : 'Select end date'}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={value.endDate || minEndDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={minEndDate}
              maximumDate={maxEndDate}
              onChange={handleDateChange}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleText: {
    fontFamily: fonts.ui,
    ...typeScale.body,
  },
  options: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  fieldLabel: {
    fontFamily: fonts.label,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  freqButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  freqButtonActive: {},
  freqText: {
    fontFamily: fonts.ui,
    fontSize: 14,
  },
  freqTextActive: {},
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  dateText: {
    fontFamily: fonts.body,
    ...typeScale.body,
  },
});
