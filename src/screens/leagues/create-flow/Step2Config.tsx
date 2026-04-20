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
import CrossPlatformDateTimePicker from '../../../components/ui/CrossPlatformDateTimePicker';
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

const DURATION_OPTIONS: SelectOption[] = [
  { label: '30 min', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '1.5 hours', value: 90 },
  { label: '2 hours', value: 120 },
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

  const handleTimeStart = (_: any, date?: Date) => {
    if (date) {
      const hh = String(date.getHours()).padStart(2, '0');
      const mm = String(date.getMinutes()).padStart(2, '0');
      dispatch({ type: 'SET_FIELD', field: 'timeStart', value: `${hh}:${mm}` });
    }
  };
  const handleTimeEnd = (_: any, date?: Date) => {
    if (date) {
      const hh = String(date.getHours()).padStart(2, '0');
      const mm = String(date.getMinutes()).padStart(2, '0');
      dispatch({ type: 'SET_FIELD', field: 'timeEnd', value: `${hh}:${mm}` });
    }
  };

  const formatTime = (date: Date): string => {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const parseTimeToDate = (timeStr: string): Date => {
    const d = new Date();
    if (timeStr) {
      const [hh, mm] = timeStr.split(':').map(Number);
      d.setHours(hh ?? 18, mm ?? 0, 0, 0);
    } else {
      d.setHours(18, 0, 0, 0);
    }
    return d;
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.white }, { backgroundColor: colors.bgScreen }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.heading, { color: colors.ink }]}>How's it set up?</Text>

      {/* Host Name */}
      <Text style={[styles.label, { color: colors.ink }]}>Host Name</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.ink }]}
        placeholder="League or host name"
        placeholderTextColor={colors.inkSoft}
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
              style={[styles.dayChip, { backgroundColor: colors.surface, borderColor: colors.border }, active && styles.dayChipActive, active && { backgroundColor: colors.pine, borderColor: colors.pine }]}
              onPress={() => dispatch({ type: 'TOGGLE_DAY', day })}
            >
              <Text
                style={[styles.dayChipText, { color: colors.ink }, active && styles.dayChipTextActive, active && { color: colors.white }]}
              >
                {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Time Window */}
      <Text style={[styles.label, { color: colors.ink }]}>Time Window</Text>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          width: '100%',
        }}
      >
        <View style={{ alignItems: 'center' }}>
          <Text
            style={{
              fontFamily: fonts.label,
              fontSize: 12,
              color: colors.inkSoft,
              marginBottom: 8,
            }}
          >
            Start
          </Text>
          <CrossPlatformDateTimePicker
            value={parseTimeToDate(state.timeStart)}
            mode="time"
            onChange={(_: any, d?: Date) =>
              d && set('timeStart')(formatTime(d))
            }
            minuteInterval={15}
          />
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text
            style={{
              fontFamily: fonts.label,
              fontSize: 12,
              color: colors.inkSoft,
              marginBottom: 8,
            }}
          >
            End
          </Text>
          <CrossPlatformDateTimePicker
            value={parseTimeToDate(state.timeEnd)}
            mode="time"
            onChange={(_: any, d?: Date) => d && set('timeEnd')(formatTime(d))}
            minuteInterval={15}
          />
        </View>
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

      {/* Game Duration */}
      <FormSelect
        label="Game Duration"
        placeholder="Select duration"
        value={state.gameDuration}
        options={DURATION_OPTIONS}
        onValueChange={v =>
          dispatch({ type: 'SET_FIELD', field: 'gameDuration', value: v })
        }
      />

      {/* Number of Games */}
      <Text style={[styles.label, { color: colors.ink }]}>Number of Games</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.ink }]}
        placeholder="Total games in the league"
        placeholderTextColor={colors.inkSoft}
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
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.ink }]}
            placeholder="e.g. 4"
            placeholderTextColor={colors.inkSoft}
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
  sublabelCenter: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginBottom: 4,
    textAlign: 'center',
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
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  daysRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  dayChipActive: {},
  dayChipText: { fontFamily: fonts.body, fontSize: 13 },
  dayChipTextActive: { fontFamily: fonts.label },
});
