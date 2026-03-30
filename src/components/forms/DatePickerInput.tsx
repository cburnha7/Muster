import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '../ui/CrossPlatformDateTimePicker';
type DateTimePickerEvent = { type: string };
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme';

interface DatePickerInputProps {
  label: string;
  /** Date as "YYYY-MM-DD" string, or empty string */
  value: string;
  onChange: (date: string) => void;
  error?: string | undefined;
  required?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
  containerStyle?: any;
}

/**
 * Native date picker input — replaces free-text date fields.
 * Accepts and emits date as "YYYY-MM-DD" string.
 * Shows a tappable field that opens the platform date picker.
 */
export function DatePickerInput({
  label,
  value,
  onChange,
  error,
  required,
  minimumDate,
  maximumDate,
  containerStyle,
}: DatePickerInputProps) {
  const [showPicker, setShowPicker] = useState(false);

  const parseDate = (dateStr: string): Date => {
    if (!dateStr) return new Date();
    const d = new Date(dateStr + 'T00:00:00');
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const formatDisplay = (dateStr: string): string => {
    if (!dateStr) return 'Select date';
    const d = parseDate(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (selectedDate) {
      const yyyy = selectedDate.getFullYear();
      const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const dd = String(selectedDate.getDate()).padStart(2, '0');
      onChange(`${yyyy}-${mm}-${dd}`);
    }
  };

  const handleConfirmIOS = () => setShowPicker(false);

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <TouchableOpacity
        style={[styles.trigger, error ? styles.triggerError : null]}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatDisplay(value)}`}
      >
        <Ionicons name="calendar-outline" size={18} color={colors.onSurfaceVariant} />
        <Text style={[styles.triggerText, !value && styles.placeholder]}>
          {formatDisplay(value)}
        </Text>
      </TouchableOpacity>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {showPicker && (
        <>
          <DateTimePicker
            value={parseDate(value)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleChange}
            {...(minimumDate ? { minimumDate } : {})}
            {...(maximumDate ? { maximumDate } : {})}
          />
          {Platform.OS === 'ios' && (
            <TouchableOpacity style={styles.doneButton} onPress={handleConfirmIOS}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  label: {
    fontFamily: fonts.label,
    fontSize: 14,
    color: colors.onSurface,
    marginBottom: 6,
  },
  required: {
    color: colors.error,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  triggerError: {
    borderWidth: 1,
    borderColor: colors.error,
  },
  triggerText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.onSurface,
    flex: 1,
  },
  placeholder: {
    color: colors.onSurfaceVariant,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
  },
  doneButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 4,
  },
  doneText: {
    fontFamily: fonts.ui,
    fontSize: 15,
    color: colors.primary,
  },
});
