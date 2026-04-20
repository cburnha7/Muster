import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import DateTimePicker from '../../components/ui/CrossPlatformDateTimePicker';
type DateTimePickerEvent = { type: string };
import { Ionicons } from '@expo/vector-icons';
import { fonts, useTheme } from '../../theme';

interface TimePickerInputProps {
  label: string;
  value: string; // "HH:MM" format
  onChange: (time: string) => void;
  error?: string | undefined;
  required?: boolean;
  containerStyle?: any;
}

/**
 * Native time picker input — replaces free-text time fields.
 * Accepts and emits time as "HH:MM" (24-hour) string.
 */
export function TimePickerInput({
  label,
  value,
  onChange,
  error,
  required,
  containerStyle,
}: TimePickerInputProps) {
  const { colors } = useTheme();
  const [showPicker, setShowPicker] = useState(false);

  // Parse "HH:MM" into a Date for the picker
  const parseTime = (timeStr: string): Date => {
    const d = new Date();
    const parts = timeStr.split(':');
    d.setHours(parseInt(parts[0] || '0', 10));
    d.setMinutes(parseInt(parts[1] || '0', 10));
    d.setSeconds(0);
    return d;
  };

  const formatDisplay = (timeStr: string): string => {
    if (!timeStr) return 'Select time';
    const d = parseTime(timeStr);
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (selectedDate) {
      const hh = String(selectedDate.getHours()).padStart(2, '0');
      const mm = String(selectedDate.getMinutes()).padStart(2, '0');
      onChange(`${hh}:${mm}`);
    }
  };

  const handleConfirmIOS = () => setShowPicker(false);

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[styles.label, { color: colors.ink }]}>
        {label}
        {required && <Text style={[styles.required, { color: colors.heart }]}> *</Text>}
      </Text>
      <TouchableOpacity
        style={[styles.trigger, { backgroundColor: colors.surface, borderColor: colors.inkFaint + '40' }, error ? styles.triggerError : null, error ? { borderColor: colors.heart } : {}]}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatDisplay(value)}`}
      >
        <Ionicons name="time-outline" size={18} color={colors.inkFaint} />
        <Text style={[styles.triggerText, { color: colors.ink }, !value && styles.placeholder, !value && { color: colors.inkFaint }]}>
          {formatDisplay(value)}
        </Text>
      </TouchableOpacity>
      {error ? <Text style={[styles.error, { color: colors.heart }]}>{error}</Text> : null}

      {showPicker && (
        <>
          <DateTimePicker
            value={parseTime(value || '12:00')}
            mode="time"
            is24Hour={false}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleChange}
          />
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={styles.doneButton}
              onPress={handleConfirmIOS}
            >
              <Text style={[styles.doneText, { color: colors.cobalt }]}>Done</Text>
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
    marginBottom: 6,
  },
  required: {},
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  triggerError: {},
  triggerText: {
    fontFamily: fonts.body,
    fontSize: 15,
    flex: 1,
  },
  placeholder: {},
  error: {
    fontFamily: fonts.body,
    fontSize: 12,
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
  },
});
