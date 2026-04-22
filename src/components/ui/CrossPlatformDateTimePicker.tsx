import React, { useState } from 'react';
import {
  Platform,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, useTheme } from '../../theme';

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

export default function CrossPlatformDateTimePicker(
  props: CrossPlatformDateTimePickerProps
) {
  if (Platform.OS === 'web') {
    return <WebPicker {...props} />;
  }
  const NativePicker =
    require('@react-native-community/datetimepicker').default;
  return <NativePicker {...props} />;
}

// ── Time options generator ──

interface TimeOption {
  label: string; // "8:00 AM"
  hours: number;
  minutes: number;
}

function generateTimeOptions(interval: number = 15): TimeOption[] {
  const options: TimeOption[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += interval) {
      const h12 = h % 12 || 12;
      const ampm = h >= 12 ? 'PM' : 'AM';
      const label = `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
      options.push({ label, hours: h, minutes: m });
    }
  }
  return options;
}

function formatTimeLabel(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const h12 = h % 12 || 12;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

// ── Web Picker ──

function WebPicker({
  value,
  mode,
  onChange,
  minimumDate,
  maximumDate,
  minuteInterval,
}: CrossPlatformDateTimePickerProps) {
  const { colors } = useTheme();
  const [showTimePicker, setShowTimePicker] = useState(false);

  if (mode === 'time') {
    const timeOptions = generateTimeOptions(minuteInterval || 15);

    const handleTimeSelect = (opt: TimeOption) => {
      const selected = new Date(value);
      selected.setHours(opt.hours);
      selected.setMinutes(opt.minutes);
      selected.setSeconds(0, 0);
      onChange?.({ type: 'set' }, selected);
      setShowTimePicker(false);
    };

    return (
      <View style={styles.webContainer}>
        <TouchableOpacity
          style={[
            styles.timeButton,
            { borderColor: colors.border, backgroundColor: colors.bgCard },
          ]}
          onPress={() => setShowTimePicker(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.timeButtonText, { color: colors.ink }]}>
            {formatTimeLabel(value)}
          </Text>
          <Ionicons name="time-outline" size={18} color={colors.inkSoft} />
        </TouchableOpacity>

        <Modal
          visible={showTimePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowTimePicker(false)}
        >
          <SafeAreaView
            style={[styles.modalContainer, { backgroundColor: colors.bgCard }]}
          >
            <View
              style={[styles.modalHeader, { borderBottomColor: colors.border }]}
            >
              <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                <Text style={[styles.modalCancel, { color: colors.cobalt }]}>
                  Done
                </Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.ink }]}>
                Select Time
              </Text>
              <View style={{ width: 50 }} />
            </View>
            <FlatList
              data={timeOptions}
              keyExtractor={item => `${item.hours}:${item.minutes}`}
              renderItem={({ item }) => {
                const isSelected =
                  item.hours === value.getHours() &&
                  item.minutes === value.getMinutes();
                return (
                  <TouchableOpacity
                    style={[
                      styles.timeOption,
                      { borderBottomColor: colors.surface },
                      isSelected && [
                        styles.timeOptionSelected,
                        { backgroundColor: colors.surface },
                      ],
                    ]}
                    onPress={() => handleTimeSelect(item)}
                  >
                    <Text
                      style={[
                        styles.timeOptionText,
                        { color: colors.ink },
                        isSelected && [
                          styles.timeOptionTextSelected,
                          { color: colors.cobalt },
                        ],
                      ]}
                    >
                      {item.label}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={colors.cobalt}
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
              initialScrollIndex={Math.max(
                0,
                timeOptions.findIndex(
                  o =>
                    o.hours === value.getHours() &&
                    o.minutes === value.getMinutes()
                ) - 3
              )}
              getItemLayout={(_, index) => ({
                length: 48,
                offset: 48 * index,
                index,
              })}
            />
          </SafeAreaView>
        </Modal>
      </View>
    );
  }

  // Date and datetime modes — use native HTML input
  const inputType = mode === 'datetime' ? 'datetime-local' : 'date';

  const formatValue = (): string => {
    if (mode === 'date') return value.toISOString().split('T')[0] || '';
    return value.toISOString().slice(0, 16);
  };

  const handleChange = (text: string) => {
    if (!text) return;
    const selected = new Date(text);
    if (!isNaN(selected.getTime())) {
      onChange?.({ type: 'set' }, selected);
    }
  };

  const formatDate = (d: Date | undefined): string | undefined => {
    if (!d) return undefined;
    return d.toISOString().split('T')[0];
  };

  return (
    <View style={styles.webContainer}>
      {/* @ts-ignore — web-only input props */}
      <TextInput
        style={[
          styles.webInput,
          {
            borderColor: colors.border,
            color: colors.ink,
            backgroundColor: colors.bgCard,
          },
        ]}
        value={formatValue()}
        onChangeText={handleChange}
        {...(Platform.OS === 'web'
          ? ({
              type: inputType,
              min: formatDate(minimumDate),
              max: formatDate(maximumDate),
            } as any)
          : {})}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  webContainer: { marginVertical: 8 },
  webInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: fonts.body,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  timeButtonText: {
    fontSize: 16,
    fontFamily: fonts.body,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalCancel: {
    fontFamily: fonts.ui,
    fontSize: 16,
  },
  modalTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
  },
  timeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 48,
    borderBottomWidth: 1,
  },
  timeOptionSelected: {},
  timeOptionText: {
    fontFamily: fonts.body,
    fontSize: 16,
  },
  timeOptionTextSelected: {
    fontFamily: fonts.ui,
  },
});
