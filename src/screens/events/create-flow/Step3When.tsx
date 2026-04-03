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
import { Calendar, DateData } from 'react-native-calendars';
import CrossPlatformDateTimePicker from '../../../components/ui/CrossPlatformDateTimePicker';
import { FormSelect, SelectOption } from '../../../components/forms/FormSelect';
import { useCreateEvent } from './CreateEventContext';
import { ALL_DAYS } from './types';
import { computeSeriesDates, dateMatchesDays } from './seriesUtils';
import { colors, fonts } from '../../../theme';

const FREQUENCY_OPTIONS: SelectOption[] = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Bi-Weekly', value: 'biweekly' },
  { label: 'Monthly', value: 'monthly' },
];

function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function Step3When() {
  const { state, dispatch } = useCreateEvent();

  const startDate = state.startDate ?? new Date();
  const startTime = state.startTime ?? new Date();
  const endTime = state.endTime ?? new Date();
  const selectedDateStr = formatDateStr(startDate);

  const dayMismatch = useMemo(() => {
    if (
      !state.recurring ||
      !state.startDate ||
      state.recurringDays.length === 0
    )
      return false;
    return !dateMatchesDays(state.startDate, state.recurringDays);
  }, [state.recurring, state.startDate, state.recurringDays]);

  const seriesEndDate = useMemo(() => {
    if (
      !state.recurring ||
      !state.startDate ||
      !state.recurringFrequency ||
      state.recurringDays.length === 0 ||
      !state.numberOfEvents
    )
      return '';
    const count = parseInt(state.numberOfEvents);
    if (isNaN(count) || count <= 0) return '';
    const dates = computeSeriesDates(
      state.startDate,
      state.recurringFrequency,
      state.recurringDays,
      count
    );
    return dates.length > 0 ? dates[dates.length - 1]! : '';
  }, [
    state.recurring,
    state.startDate,
    state.recurringFrequency,
    state.recurringDays,
    state.numberOfEvents,
  ]);

  React.useEffect(() => {
    if (seriesEndDate !== state.recurringEndDate) {
      dispatch({
        type: 'SET_FIELD',
        field: 'recurringEndDate',
        value: seriesEndDate,
      });
    }
  }, [seriesEndDate, state.recurringEndDate, dispatch]);

  React.useEffect(() => {
    if (
      !state.recurring ||
      !state.startDate ||
      !state.recurringFrequency ||
      state.recurringDays.length === 0
    ) {
      if (state.occurrenceLocations.length > 0)
        dispatch({ type: 'SET_OCCURRENCE_LOCATIONS', locations: [] });
      return;
    }
    const count = parseInt(state.numberOfEvents);
    if (isNaN(count) || count <= 0) return;
    const dates = computeSeriesDates(
      state.startDate,
      state.recurringFrequency,
      state.recurringDays,
      count
    );
    const existing = state.occurrenceLocations;
    const locations = dates.map(
      date => existing.find(o => o.date === date) ?? { date, booked: false }
    );
    dispatch({ type: 'SET_OCCURRENCE_LOCATIONS', locations });
  }, [
    state.recurring,
    state.startDate,
    state.recurringFrequency,
    state.recurringDays,
    state.numberOfEvents,
    dispatch,
  ]);

  const handleDayPress = (day: DateData) => {
    dispatch({
      type: 'SET_FIELD',
      field: 'startDate',
      value: new Date(day.dateString + 'T12:00:00'),
    });
  };

  const markedDates: Record<string, any> = {
    [selectedDateStr]: { selected: true, selectedColor: colors.cobalt },
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>When's it happening?</Text>

      <Text style={styles.label}>Date</Text>
      <Calendar
        current={selectedDateStr}
        onDayPress={handleDayPress}
        markedDates={markedDates}
        minDate={formatDateStr(new Date())}
        theme={{
          todayTextColor: colors.cobalt,
          selectedDayBackgroundColor: colors.cobalt,
          selectedDayTextColor: colors.white,
          arrowColor: colors.cobalt,
          monthTextColor: colors.ink,
          textMonthFontFamily: fonts.heading,
          textDayFontFamily: fonts.body,
          textDayHeaderFontFamily: fonts.label,
        }}
        style={styles.calendar}
      />

      <View style={styles.timeRow}>
        <View style={styles.timeCol}>
          <Text style={styles.timeLabelCentered}>Start Time</Text>
          <CrossPlatformDateTimePicker
            value={startTime}
            mode="time"
            minuteInterval={15}
            onChange={(_, d) => {
              if (d)
                dispatch({ type: 'SET_FIELD', field: 'startTime', value: d });
            }}
          />
        </View>
        <View style={styles.timeCol}>
          <Text style={styles.timeLabelCentered}>End Time</Text>
          <CrossPlatformDateTimePicker
            value={endTime}
            mode="time"
            minuteInterval={15}
            onChange={(_, d) => {
              if (d)
                dispatch({ type: 'SET_FIELD', field: 'endTime', value: d });
            }}
          />
        </View>
      </View>

      <View style={styles.recurringRow}>
        <Text style={styles.label}>Recurring</Text>
        <Switch
          value={state.recurring}
          onValueChange={v =>
            dispatch({ type: 'SET_FIELD', field: 'recurring', value: v })
          }
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
            onValueChange={v =>
              dispatch({
                type: 'SET_FIELD',
                field: 'recurringFrequency',
                value: v,
              })
            }
          />
          <Text style={styles.label}>Days of Week</Text>
          <View style={styles.daysRow}>
            {ALL_DAYS.map(day => {
              const active = state.recurringDays.includes(day);
              return (
                <TouchableOpacity
                  key={day}
                  style={[styles.dayChip, active && styles.dayChipActive]}
                  onPress={() =>
                    dispatch({ type: 'TOGGLE_RECURRING_DAY', day })
                  }
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayChipText,
                      active && styles.dayChipTextActive,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {dayMismatch && (
            <Text style={styles.warningText}>
              Your start date doesn't fall on a selected day.
            </Text>
          )}
          <Text style={styles.label}>Number of Events</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 8"
            placeholderTextColor={colors.inkSoft}
            keyboardType="numeric"
            value={state.numberOfEvents}
            onChangeText={v =>
              dispatch({ type: 'SET_FIELD', field: 'numberOfEvents', value: v })
            }
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
  heading: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: colors.ink,
    marginBottom: 24,
  },
  label: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.ink,
    marginBottom: 8,
    marginTop: 16,
  },
  calendar: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  timeRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  timeCol: { flex: 1 },
  timeLabelCentered: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.ink,
    marginBottom: 4,
    textAlign: 'center',
  },
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
