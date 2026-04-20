import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { FormInput } from '../forms/FormInput';
import { FormSelect, SelectOption } from '../forms/FormSelect';
import { FormButton } from '../forms/FormButton';
import { TimePickerInput } from '../forms/TimePickerInput';
import { CreateMatchData, Team, Event } from '../../types';
import { tokenColors } from '../../theme/tokens';

interface MatchFormProps {
  leagueId: string;
  seasonId?: string;
  teams: Team[];
  events?: Event[];
  onSubmit: (data: CreateMatchData) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}

export const MatchForm: React.FC<MatchFormProps> = ({
  leagueId,
  seasonId,
  teams,
  events = [],
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [homeTeamId, setHomeTeamId] = useState('');
  const [awayTeamId, setAwayTeamId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [eventId, setEventId] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const teamOptions: SelectOption[] = teams.map(team => ({
    label: team.name,
    value: team.id,
  }));

  const eventOptions: SelectOption[] = [
    { label: 'No event link', value: '' },
    ...events.map(event => ({
      label: event.title,
      value: event.id,
    })),
  ];

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!homeTeamId) {
      newErrors.homeTeamId = 'Home roster is required';
    }

    if (!awayTeamId) {
      newErrors.awayTeamId = 'Away roster is required';
    }

    if (homeTeamId && awayTeamId && homeTeamId === awayTeamId) {
      newErrors.awayTeamId = 'Home and away rosters must be different';
    }

    if (!scheduledDate) {
      newErrors.scheduledDate = 'Match date is required';
    }

    if (!scheduledTime) {
      newErrors.scheduledTime = 'Match time is required';
    }

    if (scheduledDate && scheduledTime) {
      const matchDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
      if (matchDateTime <= new Date()) {
        newErrors.scheduledDate = 'Match must be scheduled in the future';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      Alert.alert(
        'Validation Error',
        'Please fix the errors before submitting'
      );
      return;
    }

    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`);

    const formData: CreateMatchData = {
      leagueId,
      seasonId,
      homeTeamId,
      awayTeamId,
      scheduledAt,
      eventId: eventId || undefined,
      notes: notes.trim() || undefined,
    };

    try {
      await onSubmit(formData);
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to create match'
      );
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Match Details</Text>

        <FormSelect
          label="Home Roster *"
          placeholder="Select home roster"
          value={homeTeamId}
          options={teamOptions}
          onSelect={option => setHomeTeamId(option.value as string)}
          error={errors.homeTeamId}
        />

        <FormSelect
          label="Away Roster *"
          placeholder="Select away roster"
          value={awayTeamId}
          options={teamOptions}
          onSelect={option => setAwayTeamId(option.value as string)}
          error={errors.awayTeamId}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Schedule</Text>

        <FormInput
          label="Match Date *"
          placeholder="YYYY-MM-DD"
          value={scheduledDate}
          onChangeText={setScheduledDate}
          error={errors.scheduledDate}
        />

        <TimePickerInput
          label="Match Time *"
          value={scheduledTime}
          onChange={setScheduledTime}
          error={errors.scheduledTime}
          required
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Optional Information</Text>

        <FormSelect
          label="Link to Event"
          placeholder="Select an event (optional)"
          value={eventId}
          options={eventOptions}
          onSelect={option => setEventId(option.value as string)}
        />

        <FormInput
          label="Notes"
          placeholder="Add any additional notes"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.actions}>
        {onCancel && (
          <FormButton
            title="Cancel"
            variant="outline"
            onPress={onCancel}
            disabled={loading}
            style={styles.actionButton}
          />
        )}
        <FormButton
          title="Create Match"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          style={styles.actionButton}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokenColors.background,
  },
  section: {
    backgroundColor: tokenColors.surface,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: tokenColors.ink,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
});
