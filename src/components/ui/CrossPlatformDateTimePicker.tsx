import React from 'react';
import { Platform, View, TextInput, StyleSheet } from 'react-native';

/**
 * Props mirror the subset of @react-native-community/datetimepicker that we use.
 */
interface CrossPlatformDateTimePickerProps {
  value: Date;
  mode: 'date' | 'time' | 'datetime';
  is24Hour?: boolean;
  display?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  onChange?: (event: any, date?: Date) => void;
  minuteInterval?: number;
}

/**
 * On iOS/Android → delegates to the native DateTimePicker.
 * On web → renders an HTML <input type="date|time"> via TextInput.
 */
export default function CrossPlatformDateTimePicker(props: CrossPlatformDateTimePickerProps) {
  if (Platform.OS === 'web') {
    return <WebPicker {...props} />;
  }

  // Dynamic require so the native module is never loaded on web
  const NativePicker = require('@react-native-community/datetimepicker').default;
  return <NativePicker {...props} />;
}

function WebPicker({ value, mode, onChange, minimumDate, maximumDate }: CrossPlatformDateTimePickerProps) {
  const inputType = mode === 'datetime' ? 'datetime-local' : mode;

  const formatValue = (): string => {
    if (mode === 'time') {
      const hh = String(value.getHours()).padStart(2, '0');
      const mm = String(value.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    }
    if (mode === 'date') {
      return value.toISOString().split('T')[0] || '';
    }
    // datetime
    return value.toISOString().slice(0, 16);
  };

  const handleChange = (text: string) => {
    if (!text) return;
    let selected: Date;
    if (mode === 'time') {
      selected = new Date(value);
      const [hh, mm] = text.split(':');
      selected.setHours(parseInt(hh || '0', 10));
      selected.setMinutes(parseInt(mm || '0', 10));
    } else {
      selected = new Date(text);
    }
    if (!isNaN(selected.getTime())) {
      onChange?.({ type: 'set' }, selected);
    }
  };

  const formatDate = (d: Date | undefined): string | undefined => {
    if (!d) return undefined;
    if (mode === 'time') return undefined;
    return d.toISOString().split('T')[0];
  };

  return (
    <View style={styles.webContainer}>
      {/* @ts-ignore — web-only input props */}
      <TextInput
        style={styles.webInput}
        value={formatValue()}
        onChangeText={handleChange}
        // Web-only props passed through
        {...(Platform.OS === 'web' ? {
          type: inputType,
          min: formatDate(minimumDate),
          max: formatDate(maximumDate),
        } as any : {})}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    marginVertical: 8,
  },
  webInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
});
