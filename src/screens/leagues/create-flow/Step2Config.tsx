import React from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { FormSelect, SelectOption } from '../../../components/forms/FormSelect';
import { PhotoUpload } from '../../../components/ui/PhotoUpload';
import { useCreateLeague } from './CreateLeagueContext';
import { ALL_DAYS } from './types';
import { fonts, useTheme } from '../../../theme';

const FORMAT_OPTIONS: SelectOption[] = [
  { label: 'Season', value: 'season' },
  { label: 'Season with Playoffs', value: 'season_with_playoffs' },
  { label: 'Tournament', value: 'tournament' },
];

const FREQUENCY_OPTIONS: SelectOption[] = [
  { label: 'Block Schedule', value: 'block' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Bi-Weekly', value: 'biweekly' },
  { label: 'Monthly', value: 'monthly' },
];

function gamesPerPeriodLabel(freq: string | null): string {
  switch (freq) {
    case 'weekly':
      return 'Games Per Week';
    case 'biweekly':
      return 'Games Per Two Weeks';
    case 'monthly':
      return 'Games Per Month';
    default:
      return '';
  }
}

export function Step2Config() {
  const { colors } = useTheme();
  const { state, dispatch } = useCreateLeague();
  const set = (field: string) => (value: string) =>
    dispatch({ type: 'SET_FIELD', field, value });

  const showGamesPerPeriod = state.frequency && state.frequency !== 'block';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bgScreen }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.heading, { color: colors.ink }]}>
        How's it set up?
      </Text>

      {/* Cover photo — becomes the header background on the league detail screen */}
      <PhotoUpload
        value={state.coverImageUrl}
        onChange={url =>
          dispatch({ type: 'SET_FIELD', field: 'coverImageUrl', value: url })
        }
        context="leagues"
        shape="cover"
        label="Cover photo"
      />

      {/* Host Name */}
      <Text style={[styles.label, { color: colors.ink }]}>Host Name</Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            color: colors.ink,
          },
        ]}
        placeholder="League or host name"
        placeholderTextColor={colors.inkMuted}
        value={state.hostName}
        onChangeText={set('hostName')}
        autoFocus
      />

      {/* League Format */}
      <FormSelect
        label="League Format"
        placeholder="Select format"
        value={state.leagueFormat ?? ''}
        options={FORMAT_OPTIONS}
        onValueChange={v =>
          dispatch({ type: 'SET_LEAGUE_FORMAT', format: v as any })
        }
      />

      {/* Game Days */}
      <Text style={[styles.label, { color: colors.ink }]}>Game Days</Text>
      <View style={styles.daysRow}>
        {ALL_DAYS.map(day => {
          const active = state.gameDays.includes(day);
          return (
            <TouchableOpacity
              key={day}
              style={[
                styles.dayChip,
                { backgroundColor: colors.surface, borderColor: colors.border },
                active && {
                  backgroundColor: colors.pine,
                  borderColor: colors.pine,
                },
              ]}
              onPress={() => dispatch({ type: 'TOGGLE_DAY', day })}
            >
              <Text
                style={[
                  styles.dayChipText,
                  { color: colors.ink },
                  active && { color: colors.white, fontFamily: fonts.label },
                ]}
              >
                {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Frequency */}
      <FormSelect
        label="Frequency"
        placeholder="Select frequency"
        value={state.frequency ?? ''}
        options={FREQUENCY_OPTIONS}
        onValueChange={v =>
          dispatch({ type: 'SET_FREQUENCY', frequency: v as any })
        }
      />

      {/* Number of Games */}
      <Text style={[styles.label, { color: colors.ink }]}>Number of Games</Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            color: colors.ink,
          },
        ]}
        placeholder="Total games in the league"
        placeholderTextColor={colors.inkMuted}
        keyboardType="numeric"
        value={state.numberOfGames}
        onChangeText={set('numberOfGames')}
      />

      {/* Games Per Period (hidden for block) */}
      {showGamesPerPeriod && (
        <>
          <Text style={[styles.label, { color: colors.ink }]}>
            {gamesPerPeriodLabel(state.frequency)}
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
            placeholder="e.g. 4"
            placeholderTextColor={colors.inkMuted}
            keyboardType="numeric"
            value={state.gamesPerPeriod}
            onChangeText={set('gamesPerPeriod')}
          />
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
    fontFamily: fonts.body,
    fontSize: 16,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 16,
    marginBottom: 8,
  },
  daysRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  dayChipText: { fontFamily: fonts.body, fontSize: 13 },
});
