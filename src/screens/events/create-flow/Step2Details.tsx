import React from 'react';
import { ScrollView, View, Text, TextInput, StyleSheet } from 'react-native';
import { FormSelect, SelectOption } from '../../../components/forms/FormSelect';
import { useCreateEvent } from './CreateEventContext';
import { fonts, useTheme } from '../../../theme';
import { formatSportType } from '../../../utils/formatters';
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

/** Builds the auto-generated event name from host + sport + event type. */
export function buildEventName(
  host: string,
  sport: string | null,
  eventType: string | null
): string {
  const parts: string[] = [];
  if (host.trim()) parts.push(host.trim());
  if (sport) {
    parts.push(formatSportType(sport));
  }
  if (eventType) {
    parts.push(
      eventType.charAt(0).toUpperCase() + eventType.slice(1).toLowerCase()
    );
  }
  return parts.join(' ');
}

export function Step2Details(): React.JSX.Element {
  const { colors } = useTheme();
  const { state, dispatch } = useCreateEvent();

  const maxParticipantsLabel =
    state.eventType === EventType.GAME ? 'Max Rosters' : 'Max Players';

  const eventName = buildEventName(state.host, state.sport, state.eventType);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bgScreen }]}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.heading}>How's it set up?</Text>

      {/* Host */}
      <Text style={styles.label}>Host</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Burnham Bros"
        placeholderTextColor={colors.inkFaint}
        value={state.host}
        onChangeText={v =>
          dispatch({ type: 'SET_FIELD', field: 'host', value: v })
        }
        autoCapitalize="words"
        returnKeyType="done"
      />

      {/* Event name preview */}
      <View style={styles.namePreview}>
        <Text style={styles.namePreviewLabel}>Event name</Text>
        <Text style={styles.namePreviewValue} numberOfLines={2}>
          {eventName || '—'}
        </Text>
      </View>

      <FormSelect
        label="Event Type"
        placeholder="Select event type"
        value={state.eventType ?? ''}
        options={EVENT_TYPE_OPTIONS}
        onValueChange={v =>
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
            onChangeText={v =>
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
            onChangeText={v =>
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
        onValueChange={v =>
          dispatch({ type: 'SET_FIELD', field: 'genderRestriction', value: v })
        }
      />

      <FormSelect
        label="Skill Level"
        placeholder="Select skill level"
        value={state.skillLevel}
        options={SKILL_OPTIONS}
        onValueChange={v =>
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
        onChangeText={v =>
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
          onChangeText={v =>
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
  // Auto-generated name preview
  namePreview: {
    backgroundColor: colors.cobaltTint,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cobalt + '30',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },
  namePreviewLabel: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.cobalt,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  namePreviewValue: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.ink,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfField: {
    flex: 1,
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
