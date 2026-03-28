import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { FormSelect, SelectOption } from '../../components/forms/FormSelect';
import { FormButton } from '../../components/forms/FormButton';
import { UpsellModal } from '../../components/paywall/UpsellModal';
import { leagueService } from '../../services/api/LeagueService';
import { teamService } from '../../services/api/TeamService';
import { addLeague } from '../../store/slices/leaguesSlice';
import { selectUser } from '../../store/slices/authSlice';
import { useFeatureGate } from '../../hooks/useFeatureGate';
import { SportType, SkillLevel } from '../../types';
import { colors, fonts } from '../../theme';

const FORMAT_OPTIONS: SelectOption[] = [
  { label: 'Season', value: 'season' },
  { label: 'Season with Playoffs', value: 'season_with_playoffs' },
  { label: 'Tournament', value: 'tournament' },
];

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

  // ── Step visibility ──
  const showHost = !!leagueFormat;
  const showSport = showHost && host.trim().length >= 2;
  const showStartDate = showSport && !!sport;
  const showEndDate = showStartDate && !!startDate;
  const showGamesPerSeason = showEndDate && !!endDate;
  const showGameDays = showGamesPerSeason && !!gamesPerSeason && parseInt(gamesPerSeason) > 0;
  const showTimeRange = showGameDays && gameDays.length > 0;
  const showVisibility = showTimeRange && !!timeStart && !!timeEnd;
  const showGender = visibility !== '';
  const showAge = showGender;
  const showSkill = showAge;
  const showRosterSearch = !!skillLevel;
  const showSubmit = showRosterSearch;

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
      } catch { setRosterResults([]); }
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
        } catch {}
      }

      Alert.alert('Success', 'League created!', [
        { text: 'OK', onPress: () => (navigation as any).navigate('LeagueDetails', { leagueId: newLeague.id }) },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to create league');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render ──
  return (
    <>
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Step 1: League Format */}
        <Text style={styles.stepLabel}>League Format</Text>
        <FormSelect label="" options={FORMAT_OPTIONS} value={leagueFormat} onSelect={(o) => setLeagueFormat(String(o.value))} placeholder="Select format..." />

        {/* Step 2: Host */}
        {showHost && (
          <>
            <Text style={styles.stepLabel}>Host</Text>
            <TextInput style={styles.input} placeholder="e.g. Burnham Bros" placeholderTextColor={colors.inkFaint} value={host} onChangeText={setHost} />
            {leagueName ? <Text style={styles.autoName}>{leagueName}</Text> : null}
          </>
        )}

        {/* Step 3: Sport */}
        {showSport && (
          <>
            <Text style={styles.stepLabel}>Sport</Text>
            <FormSelect label="" options={SPORT_OPTIONS} value={sport} onSelect={(o) => setSport(String(o.value))} placeholder="Select a sport..." />
          </>
        )}

        {/* Step 4: Start Date */}
        {showStartDate && (
          <>
            <Text style={styles.stepLabel}>Season Start Date</Text>
            <TextInput style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor={colors.inkFaint} value={startDate} onChangeText={setStartDate} />
          </>
        )}

        {/* Step 5: End Date */}
        {showEndDate && (
          <>
            <Text style={styles.stepLabel}>Season End Date</Text>
            <TextInput style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor={colors.inkFaint} value={endDate} onChangeText={setEndDate} />
          </>
        )}

        {/* Step 6: Games Per Season */}
        {showGamesPerSeason && (
          <>
            <Text style={styles.stepLabel}>Games Per Season</Text>
            <TextInput style={styles.input} placeholder="e.g. 10" placeholderTextColor={colors.inkFaint} value={gamesPerSeason} onChangeText={setGamesPerSeason} keyboardType="number-pad" />
          </>
        )}

        {/* Step 7: Game Days */}
        {showGameDays && (
          <>
            <Text style={styles.stepLabel}>Game Days</Text>
            <View style={styles.daysRow}>
              {DAYS.map((day, idx) => {
                const active = gameDays.includes(idx);
                return (
                  <TouchableOpacity key={day} style={[styles.dayChip, active && styles.dayChipActive]} onPress={() => toggleDay(idx)}>
                    <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>{day}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* Step 8: Time Range */}
        {showTimeRange && (
          <>
            <Text style={styles.stepLabel}>Time Range</Text>
            <View style={styles.row}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Start (e.g. 18:00)" placeholderTextColor={colors.inkFaint} value={timeStart} onChangeText={setTimeStart} />
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="End (e.g. 21:00)" placeholderTextColor={colors.inkFaint} value={timeEnd} onChangeText={setTimeEnd} />
            </View>
          </>
        )}

        {/* Step 9: Visibility */}
        {showVisibility && (
          <>
            <Text style={styles.stepLabel}>Visibility</Text>
            <View style={styles.row}>
              <TouchableOpacity style={[styles.toggleBtn, visibility === 'private' && styles.toggleBtnActive]} onPress={() => setVisibility('private')}>
                <Ionicons name="lock-closed-outline" size={16} color={visibility === 'private' ? '#FFF' : colors.ink} />
                <Text style={[styles.toggleText, visibility === 'private' && styles.toggleTextActive]}>Private</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.toggleBtn, visibility === 'public' && styles.toggleBtnActive]} onPress={() => setVisibility('public')}>
                <Ionicons name="globe-outline" size={16} color={visibility === 'public' ? '#FFF' : colors.ink} />
                <Text style={[styles.toggleText, visibility === 'public' && styles.toggleTextActive]}>Public</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Step 10: Gender */}
        {showGender && (
          <>
            <Text style={styles.stepLabel}>Gender</Text>
            <FormSelect label="" options={GENDER_OPTIONS} value={gender} onSelect={(o) => setGender(String(o.value))} placeholder="Open to All" />
          </>
        )}

        {/* Step 11: Age Limit */}
        {showAge && (
          <>
            <Text style={styles.stepLabel}>Age Limit</Text>
            <View style={styles.row}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Min age" placeholderTextColor={colors.inkFaint} value={minAge} onChangeText={setMinAge} keyboardType="number-pad" />
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Max age" placeholderTextColor={colors.inkFaint} value={maxAge} onChangeText={setMaxAge} keyboardType="number-pad" />
            </View>
          </>
        )}

        {/* Step 12: Skill Level */}
        {showSkill && (
          <>
            <Text style={styles.stepLabel}>Skill Level</Text>
            <FormSelect label="" options={SKILL_OPTIONS} value={skillLevel} onSelect={(o) => setSkillLevel(String(o.value))} placeholder="All Levels" />
          </>
        )}

        {/* Step 13: Roster Search */}
        {showRosterSearch && (
          <>
            <Text style={styles.stepLabel}>Invite Rosters</Text>
            <TextInput style={styles.input} placeholder="Search rosters..." placeholderTextColor={colors.inkFaint} value={rosterQuery} onChangeText={setRosterQuery} />
            {rosterResults.length > 0 && (
              <View style={styles.dropdown}>
                {rosterResults.slice(0, 8).map((r) => (
                  <TouchableOpacity key={r.id} style={styles.dropdownRow} onPress={() => addRoster(r)}>
                    <Ionicons name="people" size={18} color={colors.pine} />
                    <Text style={styles.dropdownText}>{r.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {invitedRosters.length > 0 && (
              <View style={styles.chipRow}>
                {invitedRosters.map((r) => (
                  <View key={r.id} style={styles.inviteChip}>
                    <Ionicons name="people" size={14} color={colors.pine} />
                    <Text style={styles.inviteChipText}>{r.name}</Text>
                    <TouchableOpacity onPress={() => removeRoster(r.id)}><Ionicons name="close-circle" size={16} color={colors.inkFaint} /></TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* Submit */}
        {showSubmit && (
          <View style={{ marginTop: 24 }}>
            <FormButton title={isLoading ? 'Creating...' : 'Create League'} onPress={handleSubmit} loading={isLoading} disabled={isLoading} />
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </KeyboardAvoidingView>
    <UpsellModal visible={showUpsell} onClose={() => setShowUpsell(false)} requiredPlan={requiredPlan} />
    </>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  content: { padding: 16, paddingTop: 8 },
  stepLabel: {
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 8,
  },
  autoName: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.pine,
    marginTop: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: { flexDirection: 'row', gap: 10 },
  daysRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  dayChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  dayChipActive: { backgroundColor: colors.pine, borderColor: colors.pine },
  dayChipText: { fontFamily: fonts.body, fontSize: 13, color: colors.ink },
  dayChipTextActive: { color: '#FFFFFF', fontFamily: fonts.label },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 6,
  },
  toggleBtnActive: { backgroundColor: colors.pine, borderColor: colors.pine },
  toggleText: { fontFamily: fonts.ui, fontSize: 14, color: colors.ink },
  toggleTextActive: { color: '#FFFFFF' },
  dropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 240,
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownText: { fontFamily: fonts.body, fontSize: 15, color: colors.ink, flex: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  inviteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inviteChipText: { fontFamily: fonts.body, fontSize: 13, color: colors.ink },
});
