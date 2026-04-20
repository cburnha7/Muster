import React, {
  useState,
  useRef,
  useMemo,
  useCallback,
  useEffect,
} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CrossPlatformDateTimePicker from '../../../components/ui/CrossPlatformDateTimePicker';
import { ScheduleCalendar } from '../../../components/ui/ScheduleCalendar';
import { useCreateLeague } from './CreateLeagueContext';
import { DayOfWeek, getSeasonFromDate } from './types';
import { getSportLabel } from '../../../constants/sports';
import {
  calculateRoundDates,
  calculateAllRoundDates,
  formatDateAbbrev,
  formatDateFull,
} from '../../../utils/scheduleUtils';
import { fonts, useTheme } from '../../../theme';

// ── Matchup generation ───────────────────────────────────────────────────────

interface Matchup {
  home: string;
  away: string;
}

function buildMatchups(
  gameCount: number,
  teamCount: number,
  rotation: number
): Matchup[] {
  const matchups: Matchup[] = [];
  for (let g = 0; g < gameCount; g++) {
    const t1 = ((g * 2 + rotation) % Math.max(teamCount, 2)) + 1;
    const t2 = ((g * 2 + 1 + rotation) % Math.max(teamCount, 2)) + 1;
    matchups.push({ home: `Team ${t1}`, away: `Team ${t2}` });
  }
  return matchups;
}

interface RoundData {
  label: string;
  roundIndex: number;
  matchups: Matchup[];
  isPlayoff: boolean;
}

function generateRounds(
  numberOfGames: number,
  gamesPerPeriod: number,
  numberOfTeams: number,
  frequency: string | null,
  leagueFormat: string | null
): RoundData[] {
  if (numberOfGames <= 0 || numberOfTeams < 2 || !frequency) return [];

  const gpp = frequency === 'block' ? numberOfGames : gamesPerPeriod || 1;
  const totalRounds =
    frequency === 'block' ? 1 : Math.ceil(numberOfGames / gpp);
  const rounds: RoundData[] = [];
  let remaining = numberOfGames;

  for (let i = 0; i < totalRounds; i++) {
    const count = Math.min(gpp, remaining);
    rounds.push({
      label: `Round ${i + 1}`,
      roundIndex: i,
      matchups: buildMatchups(count, numberOfTeams, i),
      isPlayoff: false,
    });
    remaining -= count;
  }

  // Playoff rounds
  if (leagueFormat === 'season_with_playoffs' && numberOfTeams > 1) {
    const playoffRounds = Math.ceil(Math.log2(numberOfTeams));
    for (let i = 0; i < playoffRounds; i++) {
      const teamsInRound = Math.ceil(numberOfTeams / Math.pow(2, i));
      const games = Math.floor(teamsInRound / 2);
      const matchups: Matchup[] = [];
      for (let g = 0; g < games; g++) {
        matchups.push({ home: `Seed ${g * 2 + 1}`, away: `Seed ${g * 2 + 2}` });
      }
      rounds.push({
        label: `Playoff ${i + 1}`,
        roundIndex: totalRounds + i,
        matchups,
        isPlayoff: true,
      });
    }
  }

  return rounds;
}

// ── Main Component ───────────────────────────────────────────────────────────

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_PADDING = 20;
const CARD_WIDTH = SCREEN_WIDTH - CARD_PADDING * 2;

export function Step4Preview() {
  const { colors, spacing, radius } = useTheme();
  const { state, dispatch } = useCreateLeague();

  // ── Derived display values ──
  const sportLabel = state.sport ? getSportLabel(state.sport) : '';
  const ageGroup = state.maxBirthYear
    ? `U${new Date().getFullYear() - parseInt(state.maxBirthYear)}`
    : '';
  const subtitle = [state.hostName.trim(), sportLabel, ageGroup]
    .filter(Boolean)
    .join(' · ');

  // ── Start date (defaults to today) ──
  const startDate = state.startDate ?? new Date();
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleDateChange = (_: any, date?: Date) => {
    if (Platform.OS !== 'ios') setShowDatePicker(false);
    if (date) dispatch({ type: 'SET_FIELD', field: 'startDate', value: date });
  };

  // ── Round generation ──
  const rounds = useMemo(
    () =>
      generateRounds(
        parseInt(state.numberOfGames) || 0,
        parseInt(state.gamesPerPeriod) || 0,
        parseInt(state.numberOfTeams) || 2,
        state.frequency,
        state.leagueFormat
      ),
    [
      state.numberOfGames,
      state.gamesPerPeriod,
      state.numberOfTeams,
      state.frequency,
      state.leagueFormat,
    ]
  );

  const totalRounds = rounds.length;

  // ── Round dates (recalculated when startDate or config changes) ──
  const allRoundDates = useMemo(() => {
    if (!state.frequency || state.frequency === 'block') return [];
    return calculateAllRoundDates(
      startDate,
      state.gameDays,
      state.frequency,
      totalRounds
    );
  }, [startDate, state.gameDays, state.frequency, totalRounds]);

  // ── Swipe state ──
  const [activeRound, setActiveRound] = useState(0);
  const [viewedRounds, setViewedRounds] = useState<Set<number>>(new Set([0]));
  const flatListRef = useRef<FlatList>(null);

  // Mark round as viewed when swiped to
  useEffect(() => {
    setViewedRounds(prev => {
      if (prev.has(activeRound)) return prev;
      const next = new Set(prev);
      next.add(activeRound);
      return next;
    });
  }, [activeRound]);

  const allViewed = viewedRounds.size >= totalRounds;

  // Update canContinue in parent — store allViewed in state
  useEffect(() => {
    // Ensure startDate is set (defaults to today)
    if (!state.startDate) {
      dispatch({ type: 'SET_FIELD', field: 'startDate', value: new Date() });
    }
  }, []);

  const handleScrollEnd = useCallback(
    (e: any) => {
      const offset = e.nativeEvent.contentOffset.x;
      const index = Math.round(offset / CARD_WIDTH);
      setActiveRound(Math.max(0, Math.min(index, totalRounds - 1)));
    },
    [totalRounds]
  );

  const goToRound = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, totalRounds - 1));
      flatListRef.current?.scrollToOffset({
        offset: clamped * CARD_WIDTH,
        animated: true,
      });
      setActiveRound(clamped);
    },
    [totalRounds]
  );

  // ── Calendar state ──
  const activeDates = allRoundDates[activeRound] ?? [];
  const [calMonth, setCalMonth] = useState(startDate.getMonth());
  const [calYear, setCalYear] = useState(startDate.getFullYear());

  // Auto-navigate calendar when active round changes
  useEffect(() => {
    if (activeDates.length > 0) {
      const first = activeDates[0]!;
      setCalMonth(first.getMonth());
      setCalYear(first.getFullYear());
    }
  }, [activeRound, activeDates.length > 0 ? activeDates[0]?.getTime() : 0]);

  // ── Date pill text for round header ──
  const datePills = useMemo(() => {
    if (state.frequency === 'block') return ['Block Schedule'];
    const dates = allRoundDates[activeRound];
    if (!dates || dates.length === 0) return ['Dates TBD'];
    return dates.map(d => formatDateAbbrev(d));
  }, [activeRound, allRoundDates, state.frequency]);

  // ── Render round card ──
  const renderRoundCard = useCallback(
    ({ item, index }: { item: RoundData; index: number }) => (
      <View
        style={[
          styles.card,
          {
            width: CARD_WIDTH,
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        {/* Card header */}
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.ink }]}>
            {item.label} of {totalRounds}
          </Text>
          <View style={styles.navArrows}>
            <TouchableOpacity
              onPress={() => goToRound(index - 1)}
              disabled={index === 0}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={index === 0 ? colors.border : colors.ink}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => goToRound(index + 1)}
              disabled={index === totalRounds - 1}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={index === totalRounds - 1 ? colors.border : colors.ink}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Suggested day pills */}
        <View style={styles.pillRow}>
          {(allRoundDates[index] ?? []).map((d, i) => (
            <View
              key={i}
              style={[styles.pill, { backgroundColor: colors.border }]}
            >
              <Text style={[styles.pillText, { color: colors.ink }]}>
                {formatDateAbbrev(d)}
              </Text>
            </View>
          ))}
          {(!allRoundDates[index] || allRoundDates[index]!.length === 0) && (
            <View style={[styles.pill, { backgroundColor: colors.border }]}>
              <Text style={[styles.pillText, { color: colors.inkMuted }]}>
                {state.frequency === 'block' ? 'Block' : 'Dates TBD'}
              </Text>
            </View>
          )}
        </View>

        {/* Matchups */}
        {item.matchups.map((m, mi) => (
          <View
            key={mi}
            style={[
              styles.matchupRow,
              mi < item.matchups.length - 1 && {
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              },
            ]}
          >
            {/* Home */}
            <View style={styles.teamSide}>
              <View
                style={[styles.avatar, { backgroundColor: colors.cobaltTint }]}
              >
                <Text style={[styles.avatarText, { color: colors.cobalt }]}>
                  {m.home.charAt(0)}
                </Text>
              </View>
              <Text
                style={[
                  styles.teamName,
                  {
                    color:
                      m.home.startsWith('Team') || m.home.startsWith('Seed')
                        ? colors.inkSecondary
                        : colors.ink,
                  },
                  (m.home.startsWith('Team') || m.home.startsWith('Seed')) && {
                    fontStyle: 'italic',
                  },
                ]}
                numberOfLines={1}
              >
                {m.home}
              </Text>
            </View>

            <Text style={[styles.vsText, { color: colors.inkSecondary }]}>
              vs
            </Text>

            {/* Away */}
            <View style={[styles.teamSide, { justifyContent: 'flex-end' }]}>
              <Text
                style={[
                  styles.teamName,
                  {
                    color:
                      m.away.startsWith('Team') || m.away.startsWith('Seed')
                        ? colors.inkSecondary
                        : colors.ink,
                    textAlign: 'right',
                  },
                  (m.away.startsWith('Team') || m.away.startsWith('Seed')) && {
                    fontStyle: 'italic',
                  },
                ]}
                numberOfLines={1}
              >
                {m.away}
              </Text>
              <View
                style={[styles.avatar, { backgroundColor: colors.pineTint }]}
              >
                <Text style={[styles.avatarText, { color: colors.pine }]}>
                  {m.away.charAt(0)}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    ),
    [colors, totalRounds, allRoundDates, state.frequency, goToRound]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bgScreen }]}>
      {/* Title */}
      <View style={styles.titleSection}>
        <Text style={[styles.heading, { color: colors.ink }]}>
          Schedule Preview
        </Text>
        <Text style={[styles.subtitle, { color: colors.inkSecondary }]}>
          {subtitle}
        </Text>
      </View>

      {/* Part 1: Start Date Picker */}
      <View style={styles.dateSection}>
        <Text style={[styles.fieldLabel, { color: colors.ink }]}>
          Start Date
        </Text>
        <TouchableOpacity
          style={[
            styles.dateField,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.7}
        >
          <Ionicons
            name="calendar-outline"
            size={18}
            color={colors.inkSecondary}
          />
          <Text style={[styles.dateText, { color: colors.ink }]}>
            {formatDateFull(startDate)}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <CrossPlatformDateTimePicker
            value={startDate}
            mode="date"
            minimumDate={new Date()}
            onChange={handleDateChange}
          />
        )}
      </View>

      {/* Part 2: Round Cards */}
      {totalRounds > 0 ? (
        <>
          <FlatList
            ref={flatListRef}
            data={rounds}
            renderItem={renderRoundCard}
            keyExtractor={item => item.label}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToAlignment="center"
            decelerationRate="fast"
            snapToInterval={CARD_WIDTH}
            contentContainerStyle={{ paddingHorizontal: CARD_PADDING }}
            onMomentumScrollEnd={handleScrollEnd}
            getItemLayout={(_, index) => ({
              length: CARD_WIDTH,
              offset: CARD_WIDTH * index,
              index,
            })}
          />

          {/* Round indicator dots */}
          <View style={styles.dotsRow}>
            {rounds.map((_, i) => {
              const isActive = i === activeRound;
              const isViewed = viewedRounds.has(i);
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => goToRound(i)}
                  style={[
                    styles.dot,
                    isActive
                      ? [styles.dotActive, { backgroundColor: colors.cobalt }]
                      : isViewed
                        ? [
                            styles.dotViewed,
                            { backgroundColor: colors.cobalt, opacity: 0.6 },
                          ]
                        : { backgroundColor: colors.border },
                  ]}
                />
              );
            })}
          </View>
        </>
      ) : (
        <View
          style={[
            styles.emptyCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.emptyText, { color: colors.inkSecondary }]}>
            No rounds to preview. Check your league configuration.
          </Text>
        </View>
      )}

      {/* Part 3: Calendar */}
      {state.frequency && state.frequency !== 'block' && totalRounds > 0 && (
        <ScheduleCalendar
          year={calYear}
          month={calMonth}
          highlightedDates={activeDates}
          onPrevMonth={() => {
            if (calMonth === 0) {
              setCalMonth(11);
              setCalYear(y => y - 1);
            } else setCalMonth(m => m - 1);
          }}
          onNextMonth={() => {
            if (calMonth === 11) {
              setCalMonth(0);
              setCalYear(y => y + 1);
            } else setCalMonth(m => m + 1);
          }}
        />
      )}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, paddingBottom: 24 },
  titleSection: { paddingHorizontal: 20, paddingTop: 24, marginBottom: 16 },
  heading: { fontFamily: fonts.heading, fontSize: 28, letterSpacing: -0.3 },
  subtitle: { fontFamily: fonts.body, fontSize: 14, marginTop: 4 },
  dateSection: { paddingHorizontal: 20, marginBottom: 20 },
  fieldLabel: { fontFamily: fonts.body, fontSize: 15, marginBottom: 6 },
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dateText: { fontFamily: fonts.body, fontSize: 15 },

  // Round cards
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginRight: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: { fontFamily: fonts.headingSemi, fontSize: 16 },
  navArrows: { flexDirection: 'row', gap: 8 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  pillText: { fontFamily: fonts.body, fontSize: 12 },

  // Matchup rows
  matchupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  teamSide: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.headingSemi, fontSize: 13 },
  teamName: { fontFamily: fonts.body, fontSize: 14, flexShrink: 1 },
  vsText: { fontFamily: fonts.body, fontSize: 13, marginHorizontal: 8 },

  // Dots
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    marginBottom: 8,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { width: 20, height: 8, borderRadius: 4 },
  dotViewed: {},

  // Empty state
  emptyCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: { fontFamily: fonts.body, fontSize: 15, textAlign: 'center' },
});
