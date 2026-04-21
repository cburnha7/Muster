import React, { useState, useMemo } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Platform,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import CrossPlatformDateTimePicker from '../../../components/ui/CrossPlatformDateTimePicker';
import { FormSelect, SelectOption } from '../../../components/forms/FormSelect';
import { useCreateEvent } from './CreateEventContext';
import { ALL_DAYS } from './types';
import { computeSeriesDates, dateMatchesDays } from './seriesUtils';
import { colors, fonts, useTheme } from '../../../theme';

const FREQUENCY_OPTIONS: SelectOption[] = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Bi-Weekly', value: 'biweekly' },
  { label: 'Monthly', value: 'monthly' },
];

function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatTime(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const h12 = h % 12 || 12;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function Step3When() {
  const { colors } = useTheme();
  const { state, dispatch } = useCreateEvent();

  const startDate = state.startDate ?? new Date();
  const startTime = state.startTime ?? new Date();
  const endTime = state.endTime ?? new Date();
  const selectedDateStr = formatDateStr(startDate);

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

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
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bgScreen }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.heading, { color: colors.ink }]}>
        When's it happening?
      </Text>

      <Text style={[styles.label, { color: colors.ink }]}>Date</Text>
      <Calendar
        current={selectedDateStr}
        onDayPress={handleDayPress}
        markedDates={markedDates}
        minDate={formatDateStr(new Date())}
        theme={{
          calendarBackground: colors.surface,
          todayTextColor: colors.cobalt,
          selectedDayBackgroundColor: colors.cobalt,
          selectedDayTextColor: colors.white,
          dayTextColor: colors.ink,
          textDisabledColor: colors.inkMuted,
          arrowColor: colors.cobalt,
          monthTextColor: colors.ink,
          textMonthFontFamily: fonts.heading,
          textDayFontFamily: fonts.body,
          textDayHeaderFontFamily: fonts.label,
        }}
        style={[styles.calendar, { backgroundColor: colors.surface }]}
      />

      {/* Start Time / End Time — each label centered above its button */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'flex-start',
          width: '100%',
          marginTop: 24,
        }}
      >
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 14,
              color: colors.inkSecondary,
              marginBottom: 8,
            }}
          >
            Start Time
          </Text>
          <TouchableOpacity
            onPress={() => setShowStartPicker(true)}
            style={{
              backgroundColor: colors.bgSubtle,
              borderRadius: 999,
              paddingVertical: 10,
              paddingHorizontal: 20,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 15,
                color: colors.ink,
              }}
            >
              {formatTime(startTime)}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 14,
              color: colors.inkSecondary,
              marginBottom: 8,
            }}
          >
            End Time
          </Text>
          <TouchableOpacity
            onPress={() => setShowEndPicker(true)}
            style={{
              backgroundColor: colors.bgSubtle,
              borderRadius: 999,
              paddingVertical: 10,
              paddingHorizontal: 20,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 15,
                color: colors.ink,
              }}
            >
              {formatTime(endTime)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Native time pickers — render one at a time below the row */}
      {showStartPicker && (
        <CrossPlatformDateTimePicker
          value={startTime}
          mode="time"
          minuteInterval={15}
          onChange={(_, date) => {
            if (date) {
              dispatch({ type: 'SET_FIELD', field: 'startTime', value: date });
              // Auto-set end time to start + 1 hour
              const autoEnd = new Date(date.getTime());
              autoEnd.setHours(autoEnd.getHours() + 1);
              dispatch({ type: 'SET_FIELD', field: 'endTime', value: autoEnd });
            }
            if (Platform.OS !== 'ios') setShowStartPicker(false);
          }}
        />
      )}
      {showEndPicker && (
        <CrossPlatformDateTimePicker
          value={endTime}
          mode="time"
          minuteInterval={15}
          onChange={(_, date) => {
            if (date) {
              dispatch({ type: 'SET_FIELD', field: 'endTime', value: date });
            }
            if (Platform.OS !== 'ios') setShowEndPicker(false);
          }}
        />
      )}

      <View style={styles.recurringRow}>
        <Text
          style={[
            styles.label,
            { color: colors.ink, marginTop: 0, marginBottom: 0 },
          ]}
        >
          Recurring
        </Text>
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
          <Text style={[styles.label, { color: colors.ink }]}>
            Days of Week
          </Text>
          <View style={styles.daysRow}>
            {ALL_DAYS.map(day => {
              const active = state.recurringDays.includes(day);
              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayChip,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                    active && {
                      backgroundColor: colors.cobalt,
                      borderColor: colors.cobalt,
                    },
                  ]}
                  onPress={() =>
                    dispatch({ type: 'TOGGLE_RECURRING_DAY', day })
                  }
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayChipText,
                      { color: colors.ink },
                      active && { color: colors.white },
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {dayMismatch && (
            <Text style={[styles.warningText, { color: colors.heart }]}>
              Your start date doesn't fall on a selected day.
            </Text>
          )}
          <Text style={[styles.label, { color: colors.ink }]}>
            Number of Events
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.ink,
              },
            ]}
            placeholder="e.g. 8"
            placeholderTextColor={colors.inkMuted}
            keyboardType="numeric"
            value={state.numberOfEvents}
            onChangeText={v =>
              dispatch({ type: 'SET_FIELD', field: 'numberOfEvents', value: v })
            }
          />
          {seriesEndDate !== '' && (
            <View
              style={[styles.endDateRow, { backgroundColor: colors.surface }]}
            >
              <Text style={[styles.label, { color: colors.ink }]}>
                Series End Date
              </Text>
              <Text style={[styles.endDateValue, { color: colors.cobalt }]}>
                {seriesEndDate}
              </Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  heading: {
    fontFamily: fonts.heading,
    fontSize: 24,
    marginBottom: 24,
  },
  label: {
    fontFamily: fonts.heading,
    fontSize: 16,
    marginBottom: 8,
    marginTop: 16,
  },
  calendar: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
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
    borderWidth: 1,
  },
  dayChipText: { fontFamily: fonts.ui, fontSize: 13 },
  warningText: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginBottom: 12,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 16,
    marginBottom: 16,
  },
  endDateRow: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  endDateValue: {
    fontFamily: fonts.label,
    fontSize: 16,
    marginTop: 4,
  },
});
