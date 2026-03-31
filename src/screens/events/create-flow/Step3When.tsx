import React, { useMemo } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  StyleSheet,
} from 'react-native';
import CrossPlatformDateTimePicker from '../../../components/ui/CrossPlatformDateTimePicker';
import { FormSelect, SelectOption } from '../../../components/forms/FormSelect';
import { useCreateEvent } from './CreateEventContext';
import { ALL_DAYS, DayOfWeek, DAY_INDEX_MAP } from './types';
import { computeSeriesDates, dateMatchesDays } from './seriesUtils';
import { colors, fonts } from '../../../theme';

const FREQUENCY_OPTIONS: SelectOption[] = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Bi-Weekly', value: 'biweekly' },
  { label: 'Monthly', value: 'monthly' },
];

const defaultStart = (): Date => {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
};
const defaultEnd = (): Date => {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 2);
  return d;
};

export function Step3When() {
  const { state, dispatch } = useCreateEvent();

  const startDate = state.startDate ?? new Date();
  const startTime = state.startTime ?? defaultStart();
  const endTime = state.endTime ?? defaultEnd();

  // Day mismatch warning
  const dayMismatch = useMemo(() => {
    if (!state.recurring || !state.startDate || state.recurringDays.length === 0) return false;
    return !dateMatchesDays(state.startDate, state.recurringDays);
  }, [state.recurring, state.startDate, state.recurringDays]);

  // Auto-calculate series end date
  const seriesEndDate = useMemo(() => {
    if (
      !state.recurring ||
      !state.startDate ||
      !state.recurringFrequency ||
      state.recurringDays.length === 0 ||
      !state.numberOfEvents
    ) return '';
    const count = parseInt(state.numberOfEvents);
    if (isNaN(count) || count <= 0) return '';
    const dates = computeSeriesDates(state.startDate, state.recurringFrequency, state.recurringDays, count);
    return dates.length > 0 ? dates[dates.length - 1]! : '';
  }, [state.recurring, state.startDate, state.recurringFrequency, state.recurringDays, state.numberOfEvents]);

  // Sync recurringEndDate into state when it changes
  React.useEffect(() => {
    if (seriesEndDate !== state.recurringEndDate) {
      dispatch({ type: 'SET_FIELD', field: 'recurringEndDate', value: seriesEndDate });
    }
  }, [seriesEndDate, state.recurringEndDate, dispatch]);

  // Also generate occurrence locations when series params change
  React.useEffect(() => {
    if (!state.recurring || !state.startDate || !state.recurringFrequency || state.recurringDays.length === 0) {
      if (state.occurrenceLocations.length > 0) {
        dispatch({ type: 'SET_OCCURRENCE_LOCATIONS', locations: [] });
      }
      return;
    }
    const count = parseInt(state.numberOfEvents);
    if (isNaN(count) || count <= 0) return;
    const dates = computeSeriesDates(state.startDate, state.recurringFrequency, state.recurringDays, count);
    const existing = state.occurrenceLocations;
    const locations = dates.map((date) => {
      const prev = existing.find((o) => o.date === date);
      return prev ?? { date, booked: false };
    });
    dispatch({ type: 'SET_OCCURRENCE_LOCATIONS', locations });
  }, [state.recurring, state.startDate, state.recurringFrequency, state.recurringDays, state.numberOfEvents, dispatch]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>When's it happening?</Text>

      <Text style={styles.label}>Date</Text>
      <CrossPlatformDateTimePicker
        value={startDate}
        mode="date"
        minimumDate={new Date()}
        onChange={(_, d) => { if (d) dispatch({ type: 'SET_FIELD', field: 'startDate', value: d }); }}
      />

      <View style={styles.timeRow}>
        <View style={styles.timeCol}>
          <Text style={styles.label}>Start Time</Text>
          <CrossPlatformDateTimePicker
            value={startTime}
            mode="time"
            minuteInterval={15}
            onChange={(_, d) => { if (d) dispatch({ type: 'SET_FIELD', field: 'startTime', value: d }); }}
          />
        </View>
        <View style={styles.timeCol}>
          <Text style={styles.label}>End Time</Text>
          <CrossPlatformDateTimePicker
            value={endTime}
            mode="time"
            minuteInterval={15}
            onChange={(_, d) => { if (d) dispatch({ type: 'SET_FIELD', field: 'endTime', value: d }); }}
          />
        </View>
      </View>

      <View style={styles.recurringRow}>
        <Text style={styles.label}>Recurring</Text>
        <Switch
          value={state.recurring}
          onValueChange={(v) => dispatch({ type: 'SET_FIELD', field: 'recurring', value: v })}
          trackColor={{ false: colors.border, true: colors.cobalt }}
          thumbColor={colors.white}
        />
      </View>

      {state.recurring && (
        <>
          <FormSelect
            label="Frequency"
            placeholder="Select frequency"
            value={state.recurringFrequency ?? ''}
            options={FREQUENCY_OPTIONS}
            onValueChange={(v) => dispatch({ type: 'SET_FIELD', field: 'recurringFrequency', value: v })}
          />

          <Text style={styles.label}>Days of Week</Text>
          <View style={styles.daysRow}>
            {ALL_DAYS.map((day) => {
              const active = state.recurringDays.includes(day);
              return (
                <TouchableOpacity
                  key={day}
                  style={[styles.dayChip, active && styles.dayChipActive]}
                  onPress={() => dispatch({ type: 'TOGGLE_RECURRING_DAY', day })}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>{day}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {dayMismatch && (
            <Text style={styles.warningText}>
              Your start date doesn't fall on a selected day. Adjust the date or day selection.
            </Text>
          )}

          <Text style={styles.label}>Number of Events</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 8"
            placeholderTextColor={colors.inkSoft}
            keyboardType="numeric"
            value={state.numberOfEvents}
            onChangeText={(v) => dispatch({ type: 'SET_FIELD', field: 'numberOfEvents', value: v })}
          />

          {seriesEndDate !== '' && (
            <View style={styles.endDateRow}>
              <Text style={styles.label}>Series End Date</Text>
              <Text style={styles.endDateValue}>{seriesEndDate}</Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  heading: { fontFamily: fonts.heading, fontSize: 24, color: colors.ink, marginBottom: 24 },
  label: { fontFamily: fonts.body, fontSize: 16, color: colors.ink, marginBottom: 8, marginTop: 16 },
  timeRow: { flexDirection: 'row', gap: 12 },
  timeCol: { flex: 1 },
  recurringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 8,
  },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayChipActive: { backgroundColor: colors.cobalt, borderColor: colors.cobalt },
  dayChipText: { fontFamily: fonts.ui, fontSize: 13, color: colors.ink },
  dayChipTextActive: { color: colors.white },
  warningText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.heart,
    marginBottom: 12,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
    marginBottom: 16,
  },
  endDateRow: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  endDateValue: {
    fontFamily: fonts.label,
    fontSize: 16,
    color: colors.cobalt,
    marginTop: 4,
  },
});
