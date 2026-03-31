import React, { useMemo } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { FormSelect, SelectOption } from '../../../components/forms/FormSelect';
import CrossPlatformDateTimePicker from '../../../components/ui/CrossPlatformDateTimePicker';
import { useCreateLeague } from './CreateLeagueContext';
import { ALL_DAYS, DayOfWeek, getSeasonFromDate } from './types';
import { getSportLabel } from '../../../constants/sports';
import { colors, fonts } from '../../../theme';

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

const PLAYOFF_FORMAT_OPTIONS: SelectOption[] = [
  { label: 'Single Elimination', value: 'single_elimination' },
  { label: 'Double Elimination', value: 'double_elimination' },
  { label: 'Round Robin', value: 'round_robin' },
];

function computeSeriesEndDate(
  startDate: Date,
  gamesPerRound: number,
  numberOfRounds: number,
  gameDays: DayOfWeek[],
  frequency: 'weekly' | 'biweekly' | 'monthly',
): string {
  if (!startDate || gamesPerRound <= 0 || numberOfRounds <= 0 || gameDays.length === 0) return '';
  const totalGames = gamesPerRound * numberOfRounds;
  const weeksNeeded = Math.ceil(totalGames / gameDays.length);
  const multiplier = frequency === 'weekly' ? 1 : frequency === 'biweekly' ? 2 : 4;
  const totalWeeks = weeksNeeded * multiplier;
  const end = new Date(startDate);
  end.setDate(end.getDate() + totalWeeks * 7);
  return end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function Step2Config() {
  const { state, dispatch } = useCreateLeague();
  const set = (field: string) => (value: string) =>
    dispatch({ type: 'SET_FIELD', field, value });

  const sportLabel = state.sport ? getSportLabel(state.sport) : '';
  const seasonLabel = state.startDate ? getSeasonFromDate(state.startDate) : '';
  const leagueName = state.hostName.trim() && sportLabel
    ? `${state.hostName.trim()} - ${sportLabel} - ${seasonLabel}`.trim()
    : '';

  const isBlock = state.frequency === 'block';
  const isRecurring = state.frequency === 'weekly' || state.frequency === 'biweekly' || state.frequency === 'monthly';
  const isTournament = state.leagueFormat === 'tournament';
  const hasPlayoffs = state.leagueFormat === 'season_with_playoffs';

  // Auto-calculate series end date for recurring frequencies
  const seriesEnd = useMemo(() => {
    if (!isRecurring || !state.startDate || !state.frequency) return '';
    const gpr = parseInt(state.gamesPerRound) || 0;
    const nor = parseInt(state.numberOfRounds) || 0;
    if (gpr <= 0 || nor <= 0 || state.gameDays.length === 0) return '';
    return computeSeriesEndDate(
      state.startDate, gpr, nor, state.gameDays,
      state.frequency as 'weekly' | 'biweekly' | 'monthly',
    );
  }, [isRecurring, state.startDate, state.gamesPerRound, state.numberOfRounds, state.gameDays, state.frequency]);

  // Show fields progressively
  const showFormat = state.hostName.trim().length >= 2;
  const showFrequency = showFormat && state.leagueFormat !== null;
  const showScheduleFields = showFrequency && state.frequency !== null;

  const handleStartDate = (_: any, date?: Date) => {
    if (date) dispatch({ type: 'SET_FIELD', field: 'startDate', value: date });
  };
  const handleEndDate = (_: any, date?: Date) => {
    if (date) dispatch({ type: 'SET_FIELD', field: 'endDate', value: date });
  };
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.heading}>How's it set up?</Text>

      {/* League name preview */}
      {leagueName ? (
        <View style={styles.previewCard}>
          <Text style={styles.previewLabel}>League Name</Text>
          <Text style={styles.previewValue}>{leagueName}</Text>
        </View>
      ) : null}

      {/* Host Name — always visible */}
      <Text style={styles.label}>Host / Organization</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Burnham Bros"
        placeholderTextColor={colors.inkSoft}
        value={state.hostName}
        onChangeText={set('hostName')}
        autoFocus
      />

      {/* League Format */}
      {showFormat && (
        <FormSelect
          label="League Format"
          placeholder="Select format"
          value={state.leagueFormat ?? ''}
          options={FORMAT_OPTIONS}
          onValueChange={(v) =>
            dispatch({ type: 'SET_LEAGUE_FORMAT', format: v as any })
          }
        />
      )}

      {/* Frequency */}
      {showFrequency && (
        <FormSelect
          label="Frequency"
          placeholder="Select frequency"
          value={state.frequency ?? ''}
          options={FREQUENCY_OPTIONS}
          onValueChange={(v) =>
            dispatch({ type: 'SET_FREQUENCY', frequency: v as any })
          }
        />
      )}

      {/* Schedule fields based on frequency */}
      {showScheduleFields && (
        <>
          {/* Start Date — always */}
          <Text style={styles.label}>Start Date</Text>
          <CrossPlatformDateTimePicker
            value={state.startDate || new Date()}
            mode="date"
            onChange={handleStartDate}
            minimumDate={new Date()}
          />

          {/* Block: End Date */}
          {isBlock && (
            <>
              <Text style={styles.label}>End Date</Text>
              <CrossPlatformDateTimePicker
                value={state.endDate || new Date()}
                mode="date"
                onChange={handleEndDate}
                minimumDate={state.startDate || new Date()}
              />
            </>
          )}

          {/* Games Per Round + Number of Rounds (not for tournament) */}
          {!isTournament && (
            <>
              <Text style={styles.label}>Games Per Round</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 4"
                placeholderTextColor={colors.inkSoft}
                keyboardType="numeric"
                value={state.gamesPerRound}
                onChangeText={set('gamesPerRound')}
              />
              <Text style={styles.label}>Number of Rounds</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 8"
                placeholderTextColor={colors.inkSoft}
                keyboardType="numeric"
                value={state.numberOfRounds}
                onChangeText={set('numberOfRounds')}
              />
            </>
          )}

          {/* Recurring: Day(s) of Week + Series End Date */}
          {isRecurring && (
            <>
              <Text style={styles.label}>Day(s) of Week</Text>
              <View style={styles.daysRow}>
                {ALL_DAYS.map((day) => {
                  const active = state.gameDays.includes(day);
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[styles.dayChip, active && styles.dayChipActive]}
                      onPress={() => dispatch({ type: 'TOGGLE_DAY', day })}
                    >
                      <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {seriesEnd ? (
                <View style={styles.seriesEndRow}>
                  <Text style={styles.seriesEndLabel}>Series End Date</Text>
                  <Text style={styles.seriesEndValue}>{seriesEnd}</Text>
                </View>
              ) : null}
            </>
          )}

          {/* Playoffs config */}
          {hasPlayoffs && (
            <>
              <Text style={styles.label}>Playoff Rosters</Text>
              <TextInput
                style={styles.input}
                placeholder="Number of rosters that make playoffs"
                placeholderTextColor={colors.inkSoft}
                keyboardType="numeric"
                value={state.playoffTeamCount}
                onChangeText={set('playoffTeamCount')}
              />
              <FormSelect
                label="Playoff Format"
                placeholder="Select playoff format"
                value={state.playoffFormat ?? ''}
                options={PLAYOFF_FORMAT_OPTIONS}
                onValueChange={(v) =>
                  dispatch({ type: 'SET_FIELD', field: 'playoffFormat', value: v })
                }
              />
            </>
          )}

          {/* Time Window — always last */}
          <Text style={styles.label}>Time Window</Text>
          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={styles.sublabel}>Start</Text>
              <CrossPlatformDateTimePicker
                value={parseTimeToDate(state.timeStart)}
                mode="time"
                minuteInterval={15}
                onChange={handleTimeStart}
              />
            </View>
            <View style={styles.half}>
              <Text style={styles.sublabel}>End</Text>
              <CrossPlatformDateTimePicker
                value={parseTimeToDate(state.timeEnd)}
                mode="time"
                minuteInterval={15}
                onChange={handleTimeEnd}
              />
            </View>
          </View>
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
  sublabel: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft, marginBottom: 4 },
  input: {
    backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 16, paddingVertical: 12, fontFamily: fonts.body, fontSize: 16,
    color: colors.ink, marginBottom: 8,
  },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  previewCard: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: colors.border,
  },
  previewLabel: {
    fontFamily: fonts.label, fontSize: 11, color: colors.inkSoft,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
  },
  previewValue: { fontFamily: fonts.heading, fontSize: 18, color: colors.cobalt },
  daysRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  dayChip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  dayChipActive: { backgroundColor: colors.cobalt, borderColor: colors.cobalt },
  dayChipText: { fontFamily: fonts.body, fontSize: 13, color: colors.ink },
  dayChipTextActive: { color: colors.white, fontFamily: fonts.label },
  seriesEndRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginTop: 8, marginBottom: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  seriesEndLabel: { fontFamily: fonts.body, fontSize: 14, color: colors.inkSoft },
  seriesEndValue: { fontFamily: fonts.label, fontSize: 14, color: colors.ink },
});
