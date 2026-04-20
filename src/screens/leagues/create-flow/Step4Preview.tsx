import React, { useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CrossPlatformDateTimePicker from '../../../components/ui/CrossPlatformDateTimePicker';
import { useCreateLeague } from './CreateLeagueContext';
import { DayOfWeek, getSeasonFromDate } from './types';
import { getSportLabel } from '../../../constants/sports';
import { colors, fonts, useTheme } from '../../../theme';

const DAY_TO_INDEX: Record<DayOfWeek, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

interface RoundData {
  label: string;
  date: string;
  timeWindow: string;
  gameCount: number;
  courtsRequired: number;
  matchups: string[];
}

function generateSchedule(
  startDate: Date | null,
  endDate: Date | null,
  frequency: string | null,
  gameDays: DayOfWeek[],
  numberOfGames: number,
  gamesPerPeriod: number,
  numberOfTeams: number,
  gameDuration: number,
  timeStart: string,
  timeEnd: string,
  leagueFormat: string | null
): RoundData[] {
  if (!startDate || !frequency || numberOfGames <= 0 || numberOfTeams < 2)
    return [];

  const timeWindow =
    timeStart && timeEnd ? `${fmt12(timeStart)} – ${fmt12(timeEnd)}` : 'TBD';

  // Calculate games that fit per court per day
  const windowMinutes =
    timeStart && timeEnd ? timeDiffMinutes(timeStart, timeEnd) : 0;
  const gamesPerCourtPerDay =
    windowMinutes > 0 && gameDuration > 0
      ? Math.floor(windowMinutes / gameDuration)
      : 1;

  // Calculate rounds
  const gpp = frequency === 'block' ? numberOfGames : gamesPerPeriod || 1;
  const totalRounds =
    frequency === 'block' ? 1 : Math.ceil(numberOfGames / gpp);

  const rounds: RoundData[] = [];
  let gamesRemaining = numberOfGames;
  let teamRotation = 0;

  if (frequency === 'block' && endDate) {
    // Block: distribute all games across the date range
    const gamesThisRound = numberOfGames;
    const courtsRequired =
      gamesPerCourtPerDay > 0
        ? Math.ceil(gamesThisRound / gamesPerCourtPerDay)
        : 1;
    const matchups = buildMatchups(gamesThisRound, numberOfTeams, 0);
    rounds.push({
      label: 'Block',
      date: `${fmtDate(startDate)} – ${fmtDate(endDate)}`,
      timeWindow,
      gameCount: gamesThisRound,
      courtsRequired,
      matchups,
    });
  } else {
    // Recurring: weekly / biweekly / monthly
    const multiplier =
      frequency === 'weekly' ? 1 : frequency === 'biweekly' ? 2 : 4;
    const dayIndices = gameDays.map(d => DAY_TO_INDEX[d]).sort((a, b) => a - b);
    let roundIndex = 0;
    const currentWeekStart = new Date(startDate);

    for (let week = 0; roundIndex < totalRounds && week < 200; week++) {
      for (const dayIdx of dayIndices) {
        if (roundIndex >= totalRounds || gamesRemaining <= 0) break;
        const d = new Date(currentWeekStart);
        const diff = (dayIdx - d.getDay() + 7) % 7;
        d.setDate(d.getDate() + diff);
        if (d < startDate) continue;

        const gamesThisRound = Math.min(gpp, gamesRemaining);
        const courtsRequired =
          gamesPerCourtPerDay > 0
            ? Math.ceil(gamesThisRound / gamesPerCourtPerDay)
            : 1;
        const matchups = buildMatchups(
          gamesThisRound,
          numberOfTeams,
          teamRotation
        );
        teamRotation = (teamRotation + 1) % numberOfTeams;

        rounds.push({
          label: `Round ${roundIndex + 1}`,
          date: fmtDate(d),
          timeWindow,
          gameCount: gamesThisRound,
          courtsRequired,
          matchups,
        });
        gamesRemaining -= gamesThisRound;
        roundIndex++;
      }
      currentWeekStart.setDate(currentWeekStart.getDate() + 7 * multiplier);
    }
  }

  // Playoff rounds
  if (leagueFormat === 'season_with_playoffs' && numberOfTeams > 1) {
    const playoffRounds = Math.ceil(Math.log2(numberOfTeams));
    for (let i = 0; i < playoffRounds; i++) {
      const teamsInRound = Math.ceil(numberOfTeams / Math.pow(2, i));
      const games = Math.floor(teamsInRound / 2);
      const matchups: string[] = [];
      for (let g = 0; g < games; g++) {
        matchups.push(`Seed ${g * 2 + 1} vs Seed ${g * 2 + 2}`);
      }
      rounds.push({
        label: `Playoff ${i + 1}`,
        date: 'TBD',
        timeWindow,
        gameCount: games,
        courtsRequired: 1,
        matchups,
      });
    }
  }

  return rounds;
}

function buildMatchups(
  gamesCount: number,
  teamCount: number,
  rotation: number
): string[] {
  const matchups: string[] = [];
  for (let g = 0; g < gamesCount; g++) {
    const t1 = ((g * 2 + rotation) % teamCount) + 1;
    const t2 = ((g * 2 + 1 + rotation) % teamCount) + 1;
    matchups.push(`Team ${t1} vs Team ${t2}`);
  }
  return matchups;
}

function timeDiffMinutes(start: string, end: string): number {
  const parts1 = start.split(':').map(Number);
  const parts2 = end.split(':').map(Number);
  const sh = parts1[0] || 0,
    sm = parts1[1] || 0;
  const eh = parts2[0] || 0,
    em = parts2[1] || 0;
  return eh * 60 + em - (sh * 60 + sm);
}

function fmt12(time: string): string {
  const parts = time.split(':').map(Number);
  const h = parts[0] || 0,
    m = parts[1] || 0;
  const h12 = h % 12 || 12;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function Step4Preview() {
  const { colors } = useTheme();
  const { state, dispatch } = useCreateLeague();

  const sportLabel = state.sport ? getSportLabel(state.sport) : '';
  const seasonLabel = state.startDate ? getSeasonFromDate(state.startDate) : '';
  const ageGroup = state.maxBirthYear
    ? ` U${new Date().getFullYear() - parseInt(state.maxBirthYear)}`
    : '';
  const leagueName =
    state.hostName.trim() && sportLabel
      ? `${state.hostName.trim()} ${sportLabel} ${seasonLabel}${ageGroup}`.trim()
      : 'League Preview';

  const isBlock = state.frequency === 'block';
  const isRecurring = !isBlock && state.frequency !== null;

  // Auto-calculate end date for recurring
  const autoEndDate = useMemo(() => {
    if (!isRecurring || !state.startDate || !state.frequency) return null;
    const totalGames = parseInt(state.numberOfGames) || 0;
    const gpp = parseInt(state.gamesPerPeriod) || 1;
    if (totalGames <= 0 || gpp <= 0) return null;
    const periods = Math.ceil(totalGames / gpp);
    const multiplier =
      state.frequency === 'weekly' ? 1 : state.frequency === 'biweekly' ? 2 : 4;
    const end = new Date(state.startDate);
    end.setDate(end.getDate() + periods * multiplier * 7);
    return end;
  }, [
    isRecurring,
    state.startDate,
    state.frequency,
    state.numberOfGames,
    state.gamesPerPeriod,
  ]);

  const effectiveEndDate = isBlock ? state.endDate : autoEndDate;

  const handleStartDate = (_: any, date?: Date) => {
    if (date) dispatch({ type: 'SET_FIELD', field: 'startDate', value: date });
  };
  const handleEndDate = (_: any, date?: Date) => {
    if (date) dispatch({ type: 'SET_FIELD', field: 'endDate', value: date });
  };

  const canRender = state.startDate !== null && effectiveEndDate !== null;

  const rounds = useMemo(() => {
    if (!canRender) return [];
    return generateSchedule(
      state.startDate,
      effectiveEndDate,
      state.frequency,
      state.gameDays,
      parseInt(state.numberOfGames) || 0,
      parseInt(state.gamesPerPeriod) || 0,
      parseInt(state.numberOfTeams) || 2,
      state.gameDuration,
      state.timeStart,
      state.timeEnd,
      state.leagueFormat
    );
  }, [
    canRender,
    state.startDate,
    effectiveEndDate,
    state.frequency,
    state.gameDays,
    state.numberOfGames,
    state.gamesPerPeriod,
    state.numberOfTeams,
    state.gameDuration,
    state.timeStart,
    state.timeEnd,
    state.leagueFormat,
  ]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bgScreen }]}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.heading}>Schedule Preview</Text>
      <Text style={styles.subtitle}>{leagueName}</Text>

      {/* Date selectors */}
      <Text style={styles.label}>Start Date</Text>
      <CrossPlatformDateTimePicker
        value={state.startDate || new Date()}
        mode="date"
        onChange={handleStartDate}
        minimumDate={new Date()}
      />

      {isBlock ? (
        <>
          <Text style={styles.label}>End Date</Text>
          <CrossPlatformDateTimePicker
            value={state.endDate || new Date()}
            mode="date"
            onChange={handleEndDate}
            minimumDate={state.startDate || new Date()}
          />
        </>
      ) : autoEndDate ? (
        <View style={styles.readOnlyRow}>
          <Text style={styles.readOnlyLabel}>End Date</Text>
          <Text style={styles.readOnlyValue}>{fmtDate(autoEndDate)}</Text>
        </View>
      ) : null}

      {/* Schedule */}
      {!canRender ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            Set a start date{isBlock ? ' and end date' : ''} to see the schedule
            preview.
          </Text>
        </View>
      ) : rounds.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            No rounds generated. Check your configuration.
          </Text>
        </View>
      ) : (
        rounds.map((round, i) => {
          const isPlayoff = round.label.startsWith('Playoff');
          return (
            <View
              key={i}
              style={[styles.roundCard, isPlayoff && styles.playoffCard]}
            >
              <View style={styles.roundHeader}>
                <Text
                  style={[styles.roundLabel, isPlayoff && styles.playoffLabel]}
                >
                  {round.label}
                </Text>
                <Text style={styles.roundDate}>{round.date}</Text>
              </View>
              <Text style={styles.roundTime}>{round.timeWindow}</Text>
              <Text style={styles.roundGames}>
                {round.gameCount} {round.gameCount === 1 ? 'game' : 'games'}
              </Text>
              {round.courtsRequired > 1 && (
                <View style={styles.courtNotice}>
                  <Ionicons
                    name="information-circle-outline"
                    size={14}
                    color={colors.sportHockey}
                  />
                  <Text style={styles.courtNoticeText}>
                    This round requires {round.courtsRequired} courts
                  </Text>
                </View>
              )}
              {round.matchups.map((m, j) => (
                <Text key={j} style={styles.matchup}>
                  {m}
                </Text>
              ))}
            </View>
          );
        })
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
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.inkSoft,
    marginBottom: 20,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
    marginBottom: 8,
    marginTop: 16,
  },
  readOnlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  readOnlyLabel: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkSoft,
  },
  readOnlyValue: { fontFamily: fonts.label, fontSize: 14, color: colors.ink },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 24,
    marginTop: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.inkSoft,
    textAlign: 'center',
  },
  roundCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  playoffCard: { borderColor: colors.pine, borderWidth: 2 },
  roundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  roundLabel: { fontFamily: fonts.label, fontSize: 15, color: colors.ink },
  playoffLabel: { color: colors.pine },
  roundDate: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft },
  roundTime: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkSoft,
    marginBottom: 4,
  },
  roundGames: {
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.inkSoft,
    marginBottom: 8,
  },
  courtNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.cobaltLight,
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  courtNoticeText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.sportHockey,
  },
  matchup: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
    paddingVertical: 4,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
    marginBottom: 4,
  },
});
