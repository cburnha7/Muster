import React from 'react';
import { ScrollView, View, Text, TextInput, StyleSheet } from 'react-native';
import { FormSelect, SelectOption } from '../../../components/forms/FormSelect';
import { useCreateEvent } from './CreateEventContext';
import { colors, fonts } from '../../../theme';
import { EventType, SkillLevel } from '../../../types';

const EVENT_TYPE_OPTIONS: SelectOption[] = [
  { label: 'Game', value: EventType.GAME },
  { label: 'Practice', value: EventType.PRACTICE },
  { label: 'Pickup', value: EventType.PICKUP },
];

const GENDER_OPTIONS: SelectOption[] = [
  { label: 'Open to All', value: '' },
  { label: 'Male Only', value: 'male' },
  { label: 'Female Only', value: 'female' },
];

const SKILL_OPTIONS: SelectOption[] = [
  { label: 'All Levels', value: SkillLevel.ALL_LEVELS },
  { label: 'Beginner', value: SkillLevel.BEGINNER },
  { label: 'Intermediate', value: SkillLevel.INTERMEDIATE },
  { label: 'Advanced', value: SkillLevel.ADVANCED },
];

export function Step2Details() {
  const { state, dispatch } = useCreateEvent();

  const maxParticipantsLabel =
    state.eventType === EventType.GAME ? 'Max Rosters' : 'Max Players';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>How's it set up?</Text>

      <FormSelect
        label="Event Type"
        placeholder="Select event type"
        value={state.eventType ?? undefined}
        options={EVENT_TYPE_OPTIONS}
        onValueChange={(v) =>
          dispatch({ type: 'SET_EVENT_TYPE', eventType: v as EventType })
        }
      />

      <Text style={styles.label}>Age Limit</Text>
      <View style={styles.row}>
        <View style={styles.halfField}>
          <TextInput
            style={styles.input}
            placeholder="Min Age"
            placeholderTextColor={colors.inkSoft}
            keyboardType="numeric"
            value={state.minAge}
            onChangeText={(v) =>
              dispatch({ type: 'SET_FIELD', field: 'minAge', value: v })
            }
          />
        </View>
        <View style={styles.halfField}>
          <TextInput
            style={styles.input}
            placeholder="Max Age"
            placeholderTextColor={colors.inkSoft}
            keyboardType="numeric"
            value={state.maxAge}
            onChangeText={(v) =>
              dispatch({ type: 'SET_FIELD', field: 'maxAge', value: v })
            }
          />
        </View>
      </View>

      <FormSelect
        label="Gender"
        placeholder="Select gender"
        value={state.genderRestriction}
        options={GENDER_OPTIONS}
        onValueChange={(v) =>
          dispatch({ type: 'SET_FIELD', field: 'genderRestriction', value: v })
        }
      />

      <FormSelect
        label="Skill Level"
        placeholder="Select skill level"
        value={state.skillLevel}
        options={SKILL_OPTIONS}
        onValueChange={(v) =>
          dispatch({ type: 'SET_FIELD', field: 'skillLevel', value: v })
        }
      />

      <Text style={styles.label}>{maxParticipantsLabel}</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter number"
        placeholderTextColor={colors.inkSoft}
        keyboardType="numeric"
        value={state.maxParticipants}
        onChangeText={(v) =>
          dispatch({ type: 'SET_FIELD', field: 'maxParticipants', value: v })
        }
      />

      <Text style={styles.label}>Price</Text>
      <View style={styles.priceRow}>
        <Text style={styles.dollarSign}>$</Text>
        <TextInput
          style={[styles.input, styles.priceInput]}
          placeholder="0.00"
          placeholderTextColor={colors.inkSoft}
          keyboardType="numeric"
          value={state.price}
          onChangeText={(v) =>
            dispatch({ type: 'SET_FIELD', field: 'price', value: v })
          }
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  heading: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: colors.ink,
    marginBottom: 24,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfField: {
    flex: 1,
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
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dollarSign: {
    fontFamily: fonts.body,
    fontSize: 18,
    color: colors.ink,
    marginRight: 8,
    marginBottom: 16,
  },
  priceInput: {
    flex: 1,
  },
});
