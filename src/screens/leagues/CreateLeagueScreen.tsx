import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { FormSelect, SelectOption } from '../../components/forms/FormSelect';
import { DatePickerInput } from '../../components/forms/DatePickerInput';
import { UpsellModal } from '../../components/paywall/UpsellModal';
import { CreationWizard, WizardStep } from '../../components/wizard/CreationWizard';
import { SportIconGrid } from '../../components/wizard/SportIconGrid';
import { FormatCard } from '../../components/wizard/FormatCard';
import { WizardSuccessScreen } from '../../components/wizard/WizardSuccessScreen';
import { getSportEmoji } from '../../constants/sports';
import { leagueService } from '../../services/api/LeagueService';
import { teamService } from '../../services/api/TeamService';
import { addLeague } from '../../store/slices/leaguesSlice';
import { selectUser } from '../../store/slices/authSlice';
import { useFeatureGate } from '../../hooks/useFeatureGate';
import { SportType, SkillLevel } from '../../types';
import { colors, fonts } from '../../theme';

const SPORT_OPTIONS: SelectOption[] = [
  { label: 'Basketball', value: SportType.BASKETBALL },
  { label: 'Pickleball', value: SportType.PICKLEBALL },
  { label: 'Tennis', value: SportType.TENNIS },
  { label: 'Soccer', value: SportType.SOCCER },
  { label: 'Softball', value: SportType.SOFTBALL },
  { label: 'Baseball', value: SportType.BASEBALL },
  { label: 'Volleyball', value: SportType.VOLLEYBALL },
  { label: 'Flag Football', value: SportType.FLAG_FOOTBALL },
  { label: 'Kickball', value: SportType.KICKBALL },
  { label: 'Other', value: SportType.OTHER },
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

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface RosterResult { id: string; name: string; }

export const CreateLeagueScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const { allowed: leagueAllowed, requiredPlan } = useFeatureGate('create_league');
  const [showUpsell, setShowUpsell] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdLeagueId, setCreatedLeagueId] = useState<string | null>(null);

  // ── Step state ──
  const [leagueFormat, setLeagueFormat] = useState('');
  const [host, setHost] = useState('');
  const [sport, setSport] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [gamesPerSeason, setGamesPerSeason] = useState('');
  const [gameDays, setGameDays] = useState<number[]>([]);
  const [timeStart, setTimeStart] = useState('');
  const [timeEnd, setTimeEnd] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'public' | ''>('');
  const [gender, setGender] = useState('');
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');
  const [skillLevel, setSkillLevel] = useState('');

  // Roster invites
  const [rosterQuery, setRosterQuery] = useState('');
  const [rosterResults, setRosterResults] = useState<RosterResult[]>([]);
  const [invitedRosters, setInvitedRosters] = useState<RosterResult[]>([]);

  // Auto-generate league name
  const leagueName = (() => {
    if (!host.trim() || !sport) return '';
    const sportLabel = SPORT_OPTIONS.find(o => o.value === sport)?.label || sport;
    const season = startDate ? (() => {
      const d = new Date(startDate);
      const month = d.getMonth();
      const year = d.getFullYear();
      if (month >= 2 && month <= 4) return `Spring ${year}`;
      if (month >= 5 && month <= 7) return `Summer ${year}`;
      if (month >= 8 && month <= 10) return `Fall ${year}`;
      return `Winter ${year}`;
    })() : '';
    return `${host.trim()} ${sportLabel} ${season}`.trim();
  })();

  // ── Roster search ──
  useEffect(() => {
    if (!rosterQuery.trim()) { setRosterResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const filters: any = {};
        if (sport) filters.sportType = sport;
        const res = await teamService.getTeams(filters, { page: 1, limit: 15 });
        setRosterResults(
          (res.data || [])
            .filter((t: any) => t.name.toLowerCase().includes(rosterQuery.toLowerCase()))
            .map((t: any) => ({ id: t.id, name: t.name }))
        );
      } catch (e) { console.warn('Search failed:', e); setRosterResults([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [rosterQuery, sport]);

  const addRoster = (r: RosterResult) => {
    if (!invitedRosters.some(i => i.id === r.id)) setInvitedRosters(prev => [...prev, r]);
    setRosterQuery('');
    setRosterResults([]);
  };

  const removeRoster = (id: string) => setInvitedRosters(prev => prev.filter(r => r.id !== id));

  const toggleDay = (dayIndex: number) => {
    setGameDays(prev => prev.includes(dayIndex) ? prev.filter(d => d !== dayIndex) : [...prev, dayIndex]);
  };

  // ── Submit ──
  const handleSubmit = async () => {
    if (!user?.id) { Alert.alert('Error', 'Please log in'); return; }
    if (!leagueAllowed) { setShowUpsell(true); return; }

    setIsLoading(true);
    try {
      const data: any = {
        name: leagueName,
        sportType: sport,
        skillLevel: skillLevel || SkillLevel.ALL_LEVELS,
        leagueType: 'team',
        leagueFormat: leagueFormat,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        seasonGameCount: gamesPerSeason ? parseInt(gamesPerSeason) : undefined,
        preferredGameDays: gameDays,
        preferredTimeWindowStart: timeStart || undefined,
        preferredTimeWindowEnd: timeEnd || undefined,
        gameFrequency: 'weekly',
        trackStandings: leagueFormat !== 'tournament',
      };

      const newLeague = await leagueService.createLeague(data, user.id);
      dispatch(addLeague(newLeague as any));

      // Invite rosters
      for (const roster of invitedRosters) {
        try {
          await leagueService.inviteRoster(newLeague.id, roster.id, user.id);
        } catch (err) { console.warn('Failed to invite roster:', roster.id, (err as Error).message); }
      }

      setCreatedLeagueId(newLeague.id);
      setShowSuccess(true);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to create league');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Helpers for review step ──
  const formatLabel = leagueFormat === 'season' ? 'Season'
    : leagueFormat === 'season_with_playoffs' ? 'Season with Playoffs'
    : leagueFormat === 'tournament' ? 'Tournament' : '';

  const gameDayLabels = gameDays.sort((a, b) => a - b).map(i => DAYS[i]).join(', ');
  const skillLabel = SKILL_OPTIONS.find(o => o.value === skillLevel)?.label || 'All Levels';
  const visibilityLabel = visibility === 'public' ? 'Public' : 'Private';

  // ── Wizard steps ──
  const steps: WizardStep[] = [
    // Step 1: What kind of league?
    {
      key: 'kind',
      headline: 'What kind of league?',
      content: (
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.fieldLabel}>Sport</Text>
          <SportIconGrid selected={sport} onSelect={setSport} />

          <Text style={[styles.fieldLabel, { marginTop: 24 }]}>Format</Text>
          <FormatCard
            emoji="📅"
            title="Season"
            description="Regular season, no playoffs"
            selected={leagueFormat === 'season'}
            onPress={() => setLeagueFormat('season')}
          />
          <FormatCard
            emoji="🏆"
            title="Season with Playoffs"
            description="Regular season followed by elimination rounds"
            selected={leagueFormat === 'season_with_playoffs'}
            onPress={() => setLeagueFormat('season_with_playoffs')}
          />
          <FormatCard
            emoji="⚡"
            title="Tournament"
            description="Single or double elimination bracket"
            selected={leagueFormat === 'tournament'}
            onPress={() => setLeagueFormat('tournament')}
          />
          <View style={{ height: 32 }} />
        </ScrollView>
      ),
      validate: () => !!sport && !!leagueFormat,
    },

    // Step 2: Name your league
    {
      key: 'name',
      headline: 'Name your league',
      subtitle: 'Enter your organization name and we\'ll generate the league title.',
      content: (
        <View>
          <Text style={styles.fieldLabel}>Host / Organization</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Burnham Bros"
            placeholderTextColor={colors.onSurfaceVariant}
            value={host}
            onChangeText={setHost}
          />
          {leagueName ? (
            <View style={styles.previewCard}>
              <Text style={styles.previewLabel}>League Name</Text>
              <Text style={styles.previewValue}>{leagueName}</Text>
            </View>
          ) : null}
        </View>
      ),
      validate: () => host.trim().length >= 2,
    },

    // Step 3: Schedule
    {
      key: 'schedule',
      headline: 'Schedule',
      subtitle: 'Set the season dates and game preferences.',
      content: (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <DatePickerInput
                label="Start Date"
                value={startDate}
                onChange={setStartDate}
                required
              />
            </View>
            <View style={{ flex: 1 }}>
              <DatePickerInput
                label="End Date"
                value={endDate}
                onChange={setEndDate}
                required
              />
            </View>
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Games Per Season</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 10"
            placeholderTextColor={colors.onSurfaceVariant}
            value={gamesPerSeason}
            onChangeText={setGamesPerSeason}
            keyboardType="number-pad"
          />

          <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Game Days</Text>
          <View style={styles.daysRow}>
            {DAYS.map((day, idx) => {
              const active = gameDays.includes(idx);
              return (
                <TouchableOpacity
                  key={day}
                  style={[styles.dayChip, active && styles.dayChipActive]}
                  onPress={() => toggleDay(idx)}
                >
                  <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>{day}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Time Window</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Start (e.g. 18:00)"
              placeholderTextColor={colors.onSurfaceVariant}
              value={timeStart}
              onChangeText={setTimeStart}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="End (e.g. 21:00)"
              placeholderTextColor={colors.onSurfaceVariant}
              value={timeEnd}
              onChangeText={setTimeEnd}
            />
          </View>
          <View style={{ height: 32 }} />
        </ScrollView>
      ),
      validate: () =>
        !!startDate && !!endDate &&
        !!gamesPerSeason && parseInt(gamesPerSeason) > 0 &&
        gameDays.length > 0 &&
        !!timeStart && !!timeEnd,
    },

    // Step 4: Who can join?
    {
      key: 'eligibility',
      headline: 'Who can join?',
      subtitle: 'Set visibility and eligibility requirements.',
      content: (
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.fieldLabel}>Visibility</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.toggleBtn, visibility === 'private' && styles.toggleBtnActive]}
              onPress={() => setVisibility('private')}
            >
              <Ionicons name="lock-closed-outline" size={16} color={visibility === 'private' ? '#FFFFFF' : colors.onSurface} />
              <Text style={[styles.toggleText, visibility === 'private' && styles.toggleTextActive]}>Private</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, visibility === 'public' && styles.toggleBtnActive]}
              onPress={() => setVisibility('public')}
            >
              <Ionicons name="globe-outline" size={16} color={visibility === 'public' ? '#FFFFFF' : colors.onSurface} />
              <Text style={[styles.toggleText, visibility === 'public' && styles.toggleTextActive]}>Public</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Gender Restriction</Text>
          <FormSelect label="" options={GENDER_OPTIONS} value={gender} onSelect={(o) => setGender(String(o.value))} placeholder="Open to All" />

          <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Age Limits</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Min age"
              placeholderTextColor={colors.onSurfaceVariant}
              value={minAge}
              onChangeText={setMinAge}
              keyboardType="number-pad"
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Max age"
              placeholderTextColor={colors.onSurfaceVariant}
              value={maxAge}
              onChangeText={setMaxAge}
              keyboardType="number-pad"
            />
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Skill Level</Text>
          <FormSelect label="" options={SKILL_OPTIONS} value={skillLevel} onSelect={(o) => setSkillLevel(String(o.value))} placeholder="All Levels" />
          <View style={{ height: 32 }} />
        </ScrollView>
      ),
      validate: () => visibility !== '' && !!skillLevel,
    },

    // Step 5: Invite teams (optional)
    {
      key: 'invite',
      headline: 'Invite teams',
      subtitle: 'Search for rosters to invite. You can skip this step.',
      content: (
        <View>
          <TextInput
            style={styles.input}
            placeholder="Search rosters..."
            placeholderTextColor={colors.onSurfaceVariant}
            value={rosterQuery}
            onChangeText={setRosterQuery}
          />
          {rosterResults.length > 0 && (
            <View style={styles.dropdown}>
              {rosterResults.slice(0, 8).map((r) => (
                <TouchableOpacity key={r.id} style={styles.dropdownRow} onPress={() => addRoster(r)}>
                  <Ionicons name="people" size={18} color={colors.primary} />
                  <Text style={styles.dropdownText}>{r.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {invitedRosters.length > 0 && (
            <View style={styles.chipRow}>
              {invitedRosters.map((r) => (
                <View key={r.id} style={styles.inviteChip}>
                  <Ionicons name="people" size={14} color={colors.primary} />
                  <Text style={styles.inviteChipText}>{r.name}</Text>
                  <TouchableOpacity onPress={() => removeRoster(r.id)}>
                    <Ionicons name="close-circle" size={16} color={colors.onSurfaceVariant} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      ),
      validate: () => true,
    },

    // Step 6: Review and launch
    {
      key: 'review',
      headline: 'Review and launch',
      subtitle: 'Double-check the details before creating your league.',
      content: (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryEmoji}>{getSportEmoji(sport)}</Text>
              <Text style={styles.summaryTitle}>{leagueName || 'Your League'}</Text>
            </View>

            <View style={styles.summaryDivider} />

            <SummaryRow label="Format" value={formatLabel} />
            <SummaryRow label="Dates" value={startDate && endDate ? `${startDate} - ${endDate}` : '--'} />
            <SummaryRow label="Game Days" value={gameDayLabels || '--'} />
            <SummaryRow label="Time" value={timeStart && timeEnd ? `${timeStart} - ${timeEnd}` : '--'} />
            <SummaryRow label="Visibility" value={visibilityLabel} />
            <SummaryRow label="Skill Level" value={skillLabel} />
            {invitedRosters.length > 0 && (
              <SummaryRow label="Teams Invited" value={String(invitedRosters.length)} />
            )}
          </View>
          <View style={{ height: 32 }} />
        </ScrollView>
      ),
      validate: () => true,
    },
  ];

  // ── Render ──
  return (
    <>
      <CreationWizard
        steps={steps}
        onComplete={handleSubmit}
        onBack={() => (navigation as any).goBack()}
        isSubmitting={isLoading}
        submitLabel="Launch League"
        showSuccess={showSuccess}
        successScreen={
          <WizardSuccessScreen
            emoji={getSportEmoji(sport)}
            title={`${leagueName} is live!`}
            summaryRows={[
              { label: 'Format', value: formatLabel },
              { label: 'Dates', value: startDate && endDate ? `${startDate} - ${endDate}` : '--' },
              { label: 'Game Days', value: gameDayLabels || '--' },
              { label: 'Visibility', value: visibilityLabel },
              { label: 'Skill Level', value: skillLabel },
            ]}
            actions={[
              {
                label: 'Go to league',
                icon: 'arrow-forward',
                variant: 'primary',
                onPress: () => (navigation as any).navigate('LeagueDetails', { leagueId: createdLeagueId }),
              },
              {
                label: 'Back to leagues',
                icon: 'list',
                variant: 'secondary',
                onPress: () => (navigation as any).goBack(),
              },
            ]}
          />
        }
      />
      <UpsellModal visible={showUpsell} onClose={() => setShowUpsell(false)} requiredPlan={requiredPlan} onUpgrade={() => setShowUpsell(false)} />
    </>
  );
};

// ── Summary row helper ──
function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

// ── Styles ──
const styles = StyleSheet.create({
  fieldLabel: {
    fontFamily: fonts.label,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  row: { flexDirection: 'row', gap: 10 },
  previewCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  previewLabel: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  previewValue: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.primary,
  },

  // ── Day chips ──
  daysRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  dayChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayChipText: { fontFamily: fonts.body, fontSize: 13, color: colors.onSurface },
  dayChipTextActive: { color: '#FFFFFF', fontFamily: fonts.label },

  // ── Visibility toggle ──
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    gap: 6,
  },
  toggleBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggleText: { fontFamily: fonts.ui, fontSize: 15, color: colors.onSurface },
  toggleTextActive: { color: '#FFFFFF' },

  // ── Roster search ──
  dropdown: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    maxHeight: 240,
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  dropdownText: { fontFamily: fonts.body, fontSize: 15, color: colors.onSurface, flex: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  inviteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  inviteChipText: { fontFamily: fonts.body, fontSize: 13, color: colors.onSurface },

  // ── Review summary ──
  summaryCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  summaryHeader: {
    alignItems: 'center',
    marginBottom: 4,
  },
  summaryEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  summaryTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.onSurface,
    textAlign: 'center',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.outlineVariant,
    marginVertical: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  summaryValue: {
    fontFamily: fonts.label,
    fontSize: 14,
    color: colors.onSurface,
  },
});
