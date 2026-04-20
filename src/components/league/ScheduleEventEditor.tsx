import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SafeAreaView,
  ScrollView,
  Platform,
  FlatList,
} from 'react-native';
import DateTimePicker from '../../components/ui/CrossPlatformDateTimePicker';
type DateTimePickerEvent = { type: string };
import { Ionicons } from '@expo/vector-icons';
import { ScheduleEvent } from '../../store/slices/scheduleSlice';
import { RosterInfo } from '../../types/scheduling';
import { fonts, Spacing, BorderRadius, useTheme } from '../../theme';

export interface ScheduleEventEditorProps {
  event?: ScheduleEvent; // undefined for new game
  rosters: RosterInfo[];
  onSave: (event: ScheduleEvent) => void;
  onCancel: () => void;
}

/** Generate a simple client-side ID. */
const generateId = (): string =>
  `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

/** Parse "YYYY-MM-DD" into a Date (UTC). */
const parseDateString = (str: string): Date => {
  const parts = str.split('-').map(Number);
  return new Date(
    Date.UTC(parts[0] ?? 2000, (parts[1] ?? 1) - 1, parts[2] ?? 1)
  );
};

/** Parse "HH:MM" into a Date for the time picker (UTC). */
const parseTimeString = (str: string): Date => {
  const date = new Date();
  const parts = str.split(':').map(Number);
  date.setUTCHours(parts[0] ?? 0, parts[1] ?? 0, 0, 0);
  return date;
};

/** Format a Date to "YYYY-MM-DD" using UTC. */
const formatDateValue = (d: Date): string => {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Format a Date to "HH:MM" (24-hour) using UTC. */
const formatTimeValue = (d: Date): string => {
  const h = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  return `${h}:${min}`;
};

/** Display-friendly date string. */
const formatDateDisplay = (str: string): string => {
  if (!str) return 'Select date';
  const d = parseDateString(str);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

/** Display-friendly time string. */
const formatTimeDisplay = (str: string): string => {
  if (!str) return 'Select time';
  const d = parseTimeString(str);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  });
};

export const ScheduleEventEditor: React.FC<ScheduleEventEditorProps> = ({
  event,
  rosters,
  onSave,
  onCancel,
}) => {
  const { colors } = useTheme();
  const isEdit = !!event;

  // Form state
  const [homeRosterId, setHomeRosterId] = useState('');
  const [awayRosterId, setAwayRosterId] = useState('');
  const [date, setDate] = useState(''); // "YYYY-MM-DD"
  const [time, setTime] = useState(''); // "HH:MM"

  // Picker visibility
  const [showHomePicker, setShowHomePicker] = useState(false);
  const [showAwayPicker, setShowAwayPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Pre-populate in edit mode
  useEffect(() => {
    if (event) {
      setHomeRosterId(event.homeRosterId);
      setAwayRosterId(event.awayRosterId);
      const d = new Date(event.scheduledAt);
      setDate(formatDateValue(d));
      setTime(formatTimeValue(d));
    }
  }, [event]);

  // Derived
  const homeRoster = rosters.find(r => r.id === homeRosterId);
  const awayRoster = rosters.find(r => r.id === awayRosterId);
  const allFilled =
    homeRosterId !== '' &&
    awayRosterId !== '' &&
    date !== '' &&
    time !== '' &&
    homeRosterId !== awayRosterId;

  const handleSave = () => {
    if (!allFilled) return;
    const timeParts = time.split(':').map(Number);
    const scheduledDate = parseDateString(date);
    scheduledDate.setUTCHours(timeParts[0] ?? 0, timeParts[1] ?? 0, 0, 0);

    const saved: ScheduleEvent = {
      id: event?.id ?? generateId(),
      homeRosterId,
      homeRosterName: homeRoster?.name ?? '',
      awayRosterId,
      awayRosterName: awayRoster?.name ?? '',
      scheduledAt: scheduledDate.toISOString(),
      round: event?.round ?? 1,
      ...(event?.flag ? { flag: event.flag } : {}),
    };
    onSave(saved);
  };

  // --- Date picker handlers ---
  const handleDateChange = (_evt: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selected) setDate(formatDateValue(selected));
  };
  const handleDateConfirmIOS = () => setShowDatePicker(false);

  // --- Time picker handlers ---
  const handleTimeChange = (_evt: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (selected) setTime(formatTimeValue(selected));
  };
  const handleTimeConfirmIOS = () => setShowTimePicker(false);

  // --- Roster picker sub-modal ---
  const renderRosterPicker = (
    visible: boolean,
    title: string,
    selectedId: string,
    onSelect: (roster: RosterInfo) => void,
    onClose: () => void,
    excludeId?: string
  ) => (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.pickerModal, { backgroundColor: colors.white }]}>
        <View style={[styles.pickerHeader, { borderBottomColor: colors.inkFaint + '20' }]}>
          <TouchableOpacity onPress={onClose} accessibilityRole="button">
            <Text style={[styles.pickerCancelText, { color: colors.cobalt }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.pickerTitle, { color: colors.ink }]}>{title}</Text>
          <View style={styles.pickerHeaderSpacer} />
        </View>
        <FlatList
          data={rosters}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const isExcluded = item.id === excludeId;
            const isSelected = item.id === selectedId;
            return (
              <TouchableOpacity
                style={[
                  styles.pickerOption, { borderBottomColor: colors.inkFaint + '10' },
                  isSelected && styles.pickerOptionSelected, isSelected && { backgroundColor: colors.cobalt + '10' },
                  isExcluded && styles.pickerOptionDisabled]}
                onPress={() => {
                  if (!isExcluded) {
                    onSelect(item);
                    onClose();
                  }
                }}
                disabled={isExcluded}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.pickerOptionText, { color: colors.ink },
                    isSelected && styles.pickerOptionTextSelected, isSelected && { color: colors.cobalt },
                    isExcluded && styles.pickerOptionTextDisabled, isExcluded && { color: colors.inkFaint }]}
                >
                  {item.name}
                </Text>
                {isSelected && (
                  <Ionicons name="checkmark" size={20} color={colors.cobalt} />
                )}
              </TouchableOpacity>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.white }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.inkFaint + '20', backgroundColor: colors.white }]}>
          <TouchableOpacity onPress={onCancel} accessibilityRole="button">
            <Text style={[styles.cancelText, { color: colors.cobalt }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.ink }]}>{isEdit ? 'Edit Game' : 'Add Game'}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Home Roster */}
          <Text style={[styles.fieldLabel, { color: colors.ink }]}>Home Roster</Text>
          <TouchableOpacity
            style={[styles.fieldTrigger, { backgroundColor: colors.white, borderColor: colors.inkFaint + '40' }]}
            onPress={() => setShowHomePicker(true)}
            accessibilityRole="button"
            accessibilityLabel={`Home Roster: ${homeRoster?.name ?? 'Select'}`}
          >
            <Ionicons name="shield-outline" size={18} color={colors.inkFaint} />
            <Text style={[styles.fieldText, { color: colors.ink }, !homeRoster && styles.placeholder, !homeRoster && { color: colors.inkFaint }]}>
              {homeRoster?.name ?? 'Select home roster'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.inkFaint} />
          </TouchableOpacity>

          {/* Away Roster */}
          <Text style={[styles.fieldLabel, { color: colors.ink }]}>Away Roster</Text>
          <TouchableOpacity
            style={[
              styles.fieldTrigger, { backgroundColor: colors.white, borderColor: colors.inkFaint + '40' },
              homeRosterId !== '' &&
                awayRosterId !== '' &&
                homeRosterId === awayRosterId &&
                styles.fieldTriggerError]}
            onPress={() => setShowAwayPicker(true)}
            accessibilityRole="button"
            accessibilityLabel={`Away Roster: ${awayRoster?.name ?? 'Select'}`}
          >
            <Ionicons name="shield-outline" size={18} color={colors.inkFaint} />
            <Text style={[styles.fieldText, { color: colors.ink }, !awayRoster && styles.placeholder, !awayRoster && { color: colors.inkFaint }]}>
              {awayRoster?.name ?? 'Select away roster'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.inkFaint} />
          </TouchableOpacity>
          {homeRosterId !== '' &&
            awayRosterId !== '' &&
            homeRosterId === awayRosterId && (
              <Text style={[styles.errorText, { color: colors.heart }]}>
                Home and away rosters must be different
              </Text>
            )}

          {/* Date */}
          <Text style={[styles.fieldLabel, { color: colors.ink }]}>Date</Text>
          <TouchableOpacity
            style={[styles.fieldTrigger, { backgroundColor: colors.white, borderColor: colors.inkFaint + '40' }]}
            onPress={() => setShowDatePicker(true)}
            accessibilityRole="button"
            accessibilityLabel={`Date: ${formatDateDisplay(date)}`}
          >
            <Ionicons
              name="calendar-outline"
              size={18}
              color={colors.inkFaint}
            />
            <Text style={[styles.fieldText, { color: colors.ink }, !date && styles.placeholder, !date && { color: colors.inkFaint }]}>
              {formatDateDisplay(date)}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <View>
              <DateTimePicker
                value={date ? parseDateString(date) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={handleDateConfirmIOS}
                >
                  <Text style={[styles.doneText, { color: colors.cobalt }]}>Done</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Time */}
          <Text style={[styles.fieldLabel, { color: colors.ink }]}>Time</Text>
          <TouchableOpacity
            style={[styles.fieldTrigger, { backgroundColor: colors.white, borderColor: colors.inkFaint + '40' }]}
            onPress={() => setShowTimePicker(true)}
            accessibilityRole="button"
            accessibilityLabel={`Time: ${formatTimeDisplay(time)}`}
          >
            <Ionicons name="time-outline" size={18} color={colors.inkFaint} />
            <Text style={[styles.fieldText, { color: colors.ink }, !time && styles.placeholder, !time && { color: colors.inkFaint }]}>
              {formatTimeDisplay(time)}
            </Text>
          </TouchableOpacity>
          {showTimePicker && (
            <View>
              <DateTimePicker
                value={time ? parseTimeString(time) : new Date()}
                mode="time"
                is24Hour={false}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleTimeChange}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={handleTimeConfirmIOS}
                >
                  <Text style={[styles.doneText, { color: colors.cobalt }]}>Done</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>

        {/* Save button */}
        <View style={[styles.footer, { backgroundColor: colors.white, borderTopColor: colors.inkFaint + '20' }]}>
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.cobalt }, !allFilled && styles.saveButtonDisabled, !allFilled && { backgroundColor: colors.inkFaint + '40' }]}
            onPress={handleSave}
            disabled={!allFilled}
            accessibilityRole="button"
            accessibilityState={{ disabled: !allFilled }}
            accessibilityLabel="Save"
          >
            <Text
              style={[
                styles.saveButtonText, { color: colors.white },
                !allFilled && styles.saveButtonTextDisabled, !allFilled && { color: colors.white + '80' }]}
            >
              Save
            </Text>
          </TouchableOpacity>
        </View>

        {/* Roster picker modals */}
        {renderRosterPicker(
          showHomePicker,
          'Home Roster',
          homeRosterId,
          r => setHomeRosterId(r.id),
          () => setShowHomePicker(false),
          awayRosterId || undefined
        )}
        {renderRosterPicker(
          showAwayPicker,
          'Away Roster',
          awayRosterId,
          r => setAwayRosterId(r.id),
          () => setShowAwayPicker(false),
          homeRosterId || undefined
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  cancelText: {
    fontFamily: fonts.ui,
    fontSize: 15,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 18,
  },
  headerSpacer: {
    width: 60,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.massive,
  },
  fieldLabel: {
    fontFamily: fonts.label,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
  },
  fieldTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  fieldTriggerError: {},
  fieldText: {
    fontFamily: fonts.body,
    fontSize: 15,
    flex: 1,
  },
  placeholder: {},
  errorText: {
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  doneButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
  },
  doneText: {
    fontFamily: fonts.ui,
    fontSize: 15,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  saveButton: {
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md + 2,
    alignItems: 'center',
  },
  saveButtonDisabled: {},
  saveButtonText: {
    fontFamily: fonts.ui,
    fontSize: 16,
  },
  saveButtonTextDisabled: {},
  // Roster picker modal styles
  pickerModal: {
    flex: 1,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  pickerCancelText: {
    fontFamily: fonts.ui,
    fontSize: 15,
  },
  pickerTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
  },
  pickerHeaderSpacer: {
    width: 60,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  pickerOptionSelected: {},
  pickerOptionDisabled: {
    opacity: 0.4,
  },
  pickerOptionText: {
    fontFamily: fonts.body,
    fontSize: 16,
    flex: 1,
  },
  pickerOptionTextSelected: {
    fontFamily: fonts.semibold,
  },
  pickerOptionTextDisabled: {},
});
