import React, { useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useCreateLeague } from './CreateLeagueContext';
import { DayOfWeek, getSeasonFromDate } from './types';
import { getSportLabel } from '../../../constants/sports';
import { colors, fonts } from '../../../theme';

interface RoundData {
  label: string;
  date: string;
  timeWindow: string;
  gameCount: number;
  matchups: string[];
}

const DAY_TO_INDEX: Record<DayOfWeek, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

function generateSchedule(
  startDate: Date | null,
  endDate: Date | null,
  frequency: string | null,
  gameDays: DayOfWeek[],
  gamesPerRound: number,
  numberOfRounds: number,
  timeStart: string,
  timeEnd: string,
  leagueFormat: string | null,
  playoffTeamCount: number,
): RoundData[] {
  if (!startDate || !frequency) return [];

  const rounds: RoundData[] = [];
  const timeWindow = timeStart && timeEnd ? `${timeStart} – ${timeEnd}` : 'TBD';
  const totalRounds = numberOfRounds || 1;
  const gpr = gamesPerRound || 1;

  if (frequency === 'block' && endDate) {
    // Distribute rounds evenly between start and end
    const totalMs = endDate.getTime() - startDate.getTime();
    for (let i = 0; i < totalRounds; i++) {
      const roundDate = new Date(startDate.getTime() + (totalMs * i) / Math.max(totalRounds - 1, 1));
      const matchups = buildMatchups(gpr, i);
      rounds.push({
        label: `Round ${i + 1}`,
        date: roundDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        timeWindow,
        gameCount: gpr,
        matchups,
      });
    }
  } else {
    // Weekly / biweekly / monthly
    const multiplier = frequency === 'weekly' ? 1 : frequency === 'biweekly' ? 2 : 4;
    const dayIndices = gameDays.map((d) => DAY_TO_INDEX[d]).sort((a, b) => a - b);
    let roundIndex = 0;
    let currentDate = new Date(startDate);

    // Find first matching game day on or after start
    for (let week = 0; roundIndex < totalRounds && week < 200; week++) {
      for (const dayIdx of dayIndices) {
        if (roundIndex >= totalRounds) break;
        const d = new Date(currentDate);
        const diff = (dayIdx - d.getDay() + 7) % 7;
        d.setDate(d.getDate() + diff);
        if (d < startDate) continue;

        const matchups = buildMatchups(gpr, roundIndex);
        rounds.push({
          label: `Round ${roundIndex + 1}`,
          date: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          timeWindow,
          gameCount: gpr,
          matchups,
        });
        roundIndex++;
      }
      currentDate.setDate(currentDate.getDate() + 7 * multiplier);
    }
  }

  // Add playoff rounds if applicable
  if (leagueFormat === 'season_with_playoffs' && playoffTeamCount > 1) {
    const playoffRounds = Math.ceil(Math.log2(playoffTeamCount));
    for (let i = 0; i < playoffRounds; i++) {
      const teamsInRound = Math.ceil(playoffTeamCount / Math.pow(2, i));
      const games = Math.floor(teamsInRound / 2);
      const matchups: string[] = [];
      for (let g = 0; g < games; g++) {
        matchups.push(`Seed ${g * 2 + 1} vs Seed ${g * 2 + 2}`);
      }
      rounds.push({
        label: `Playoff Round ${i + 1}`,
        date: 'TBD',
        timeWindow,
        gameCount: games,
        matchups,
      });
    }
  }

  return rounds;
}

function buildMatchups(gamesPerRound: number, _roundIndex: number): string[] {
  const matchups: string[] = [];
  for (let g = 0; g < gamesPerRound; g++) {
    matchups.push(`Roster ${g * 2 + 1} vs Roster ${g * 2 + 2}`);
  }
  return matchups;
}

export function Step3Preview() {
  const { state } = useCreateLeague();

  const sportLabel = state.sport ? getSportLabel(state.sport) : '';
  const seasonLabel = state.startDate ? getSeasonFromDate(state.startDate) : '';
  const leagueName = state.hostName.trim() && sportLabel
    ? `${state.hostName.trim()} - ${sportLabel} - ${seasonLabel}`.trim()
    : 'League Preview';

  const rounds = useMemo(
    () =>
      generateSchedule(
        state.startDate,
        state.endDate,
        state.frequency,
        state.gameDays,
        parseInt(state.gamesPerRound) || 0,
        parseInt(state.numberOfRounds) || 0,
        state.timeStart,
        state.timeEnd,
        state.leagueFormat,
        parseInt(state.playoffTeamCount) || 0,
      ),
    [
      state.startDate, state.endDate, state.frequency, state.gameDays,
      state.gamesPerRound, state.numberOfRounds, state.timeStart, state.timeEnd,
      state.leagueFormat, state.playoffTeamCount,
    ],
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Schedule Preview</Text>
      <Text style={styles.subtitle}>{leagueName}</Text>

      {rounds.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            Complete the schedule configuration to see a preview.
          </Text>
        </View>
      ) : (
        rounds.map((round, i) => {
          const isPlayoff = round.label.startsWith('Playoff');
          return (
            <View key={i} style={[styles.roundCard, isPlayoff && styles.playoffCard]}>
              <View style={styles.roundHeader}>
                <Text style={[styles.roundLabel, isPlayoff && styles.playoffLabel]}>
                  {round.label}
                </Text>
                <Text style={styles.roundDate}>{round.date}</Text>
              </View>
              <Text style={styles.roundTime}>{round.timeWindow}</Text>
              <Text style={styles.roundGames}>
                {round.gameCount} {round.gameCount === 1 ? 'game' : 'games'}
              </Text>
              {round.matchups.map((m, j) => (
                <Text key={j} style={styles.matchup}>{m}</Text>
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
  heading: { fontFamily: fonts.heading, fontSize: 24, color: colors.ink, marginBottom: 4 },
  subtitle: { fontFamily: fonts.body, fontSize: 15, color: colors.inkSoft, marginBottom: 20 },
  emptyCard: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 24,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  emptyText: { fontFamily: fonts.body, fontSize: 15, color: colors.inkSoft, textAlign: 'center' },
  roundCard: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  playoffCard: { borderColor: colors.cobalt, borderWidth: 2 },
  roundHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6,
  },
  roundLabel: { fontFamily: fonts.label, fontSize: 15, color: colors.ink },
  playoffLabel: { color: colors.cobalt },
  roundDate: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft },
  roundTime: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft, marginBottom: 4 },
  roundGames: { fontFamily: fonts.label, fontSize: 12, color: colors.inkSoft, marginBottom: 8 },
  matchup: {
    fontFamily: fonts.body, fontSize: 14, color: colors.ink,
    paddingVertical: 4, paddingLeft: 8,
    borderLeftWidth: 2, borderLeftColor: colors.border, marginBottom: 4,
  },
});
