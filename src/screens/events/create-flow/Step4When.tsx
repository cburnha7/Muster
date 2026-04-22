import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { FormSelect, SelectOption } from '../../../components/forms/FormSelect';
import { useCreateEvent } from './CreateEventContext';
import { useSelector } from 'react-redux';
import { selectUser } from '../../../store/slices/authSlice';
import { facilityService } from '../../../services/api/FacilityService';
import { fonts, useTheme } from '../../../theme';
import { SlotData } from './types';

const FREQUENCY_OPTIONS: SelectOption[] = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Bi-Weekly', value: 'biweekly' },
  { label: 'Monthly', value: 'monthly' },
];

export function Step4When() {
  const { colors } = useTheme();
  const { state, dispatch } = useCreateEvent();
  const user = useSelector(selectUser);

  const [dateOptions, setDateOptions] = useState<SelectOption[]>([]);
  const [loadingDates, setLoadingDates] = useState(false);
  const [dateError, setDateError] = useState('');

  const [slotsForDate, setSlotsForDate] = useState<SlotData[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotError, setSlotError] = useState('');

  // Load dates when facility + court are set
  useEffect(() => {
    if (!state.facilityId || !state.courtId || !user?.id) {
      setDateOptions([]);
      return;
    }
    setLoadingDates(true);
    setDateError('');
    facilityService
      .getDatesForCourt(state.facilityId, state.courtId, user.id)
      .then(res => {
        setDateOptions(
          res.data.map(d => ({
            label: `${d.date} (${d.slotCount} slots)`,
            value: d.date,
          }))
        );
      })
      .catch(() => {
        setDateError("Couldn't load dates. Try re-selecting the court.");
        setDateOptions([]);
      })
      .finally(() => setLoadingDates(false));
  }, [state.facilityId, state.courtId, user?.id]);

  // Load slots when date is selected
  useEffect(() => {
    if (
      !state.facilityId ||
      !state.courtId ||
      !state.selectedDate ||
      !user?.id
    ) {
      setSlotsForDate([]);
      return;
    }
    setLoadingSlots(true);
    setSlotError('');
    facilityService
      .getSlotsForDate(
        state.facilityId,
        state.courtId,
        user.id,
        state.selectedDate
      )
      .then(res => {
        setSlotsForDate(
          res.data.map(s => ({
            id: s.id,
            date: state.selectedDate,
            startTime: s.startTime,
            endTime: s.endTime,
            price: s.price,
            court: {
              id: state.courtId,
              name: state.courtName,
              sportType: '',
              capacity: 0,
            },
            isFromRental: s.isFromRental,
            rentalId: s.rentalId,
          }))
        );
      })
      .catch(() => {
        setSlotError("Couldn't load time slots. Try re-selecting the date.");
        setSlotsForDate([]);
      })
      .finally(() => setLoadingSlots(false));
  }, [
    state.facilityId,
    state.courtId,
    state.selectedDate,
    state.courtName,
    user?.id,
  ]);

  const handleDateSelect = (value: string | number | boolean) => {
    dispatch({ type: 'SET_DATE', date: String(value) });
  };

  const handleSlotToggle = (slot: SlotData) => {
    dispatch({ type: 'TOGGLE_SLOT', slot, slotsForDate });
  };

  const isSlotSelected = (slot: SlotData) =>
    state.selectedSlots.some(s => s.id === slot.id);

  const isSlotDisabled = (slot: SlotData) => {
    if (state.selectedSlots.length === 0) return false;
    if (isSlotSelected(slot)) return false;
    const sorted = [...slotsForDate].sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    );
    const idx = sorted.findIndex(s => s.id === slot.id);
    const firstIdx = sorted.findIndex(s => s.id === state.selectedSlots[0]?.id);
    const lastIdx = sorted.findIndex(
      s => s.id === state.selectedSlots[state.selectedSlots.length - 1]?.id
    );
    return idx !== firstIdx - 1 && idx !== lastIdx + 1;
  };

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: colors.white },
        { backgroundColor: colors.bgScreen },
      ]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.heading, { color: colors.ink }]}>
        When's it happening?
      </Text>

      {loadingDates ? (
        <ActivityIndicator
          size="small"
          color={colors.cobalt}
          style={styles.loader}
        />
      ) : dateError ? (
        <Text style={[styles.errorText, { color: colors.heart }]}>
          {dateError}
        </Text>
      ) : (
        <FormSelect
          label="Date"
          placeholder="Select a date"
          value={state.selectedDate || ''}
          options={dateOptions}
          onValueChange={handleDateSelect}
        />
      )}

      {state.selectedDate !== '' && (
        <>
          <Text style={[styles.label, { color: colors.ink }]}>Time Slots</Text>
          {loadingSlots ? (
            <ActivityIndicator
              size="small"
              color={colors.cobalt}
              style={styles.loader}
            />
          ) : slotError ? (
            <Text style={[styles.errorText, { color: colors.heart }]}>
              {slotError}
            </Text>
          ) : slotsForDate.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.inkSoft }]}>
              No time slots available
            </Text>
          ) : (
            <View style={styles.slotsGrid}>
              {slotsForDate
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map(slot => {
                  const selected = isSlotSelected(slot);
                  const disabled = isSlotDisabled(slot);
                  return (
                    <TouchableOpacity
                      key={slot.id}
                      style={[
                        styles.slotChip,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                        selected && styles.slotChipSelected,
                        selected && {
                          backgroundColor: colors.cobalt,
                          borderColor: colors.cobalt,
                        },
                        disabled && styles.slotChipDisabled,
                      ]}
                      onPress={() => handleSlotToggle(slot)}
                      disabled={disabled}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.slotText,
                          { color: colors.ink },
                          selected && styles.slotTextSelected,
                          selected && { color: colors.white },
                          disabled && styles.slotTextDisabled,
                          disabled && { color: colors.inkSoft },
                        ]}
                      >
                        {slot.startTime} – {slot.endTime}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
            </View>
          )}
        </>
      )}

      <View style={styles.recurringRow}>
        <Text style={[styles.label, { color: colors.ink }]}>Recurring</Text>
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
            Series End Date
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
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.inkSoft}
            value={state.recurringEndDate}
            onChangeText={v =>
              dispatch({
                type: 'SET_FIELD',
                field: 'recurringEndDate',
                value: v,
              })
            }
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  heading: {
    fontFamily: fonts.heading,
    fontSize: 24,
    marginBottom: 24,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 16,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  slotChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  slotChipSelected: {},
  slotChipDisabled: {
    opacity: 0.4,
  },
  slotText: {
    fontFamily: fonts.body,
    fontSize: 14,
  },
  slotTextSelected: {},
  slotTextDisabled: {},
  recurringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 8,
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
  loader: {
    marginVertical: 16,
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 16,
  },
});
