import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { FormSelect, SelectOption } from '../../components/forms/FormSelect';
import { FormButton } from '../../components/forms/FormButton';
import { UpsellModal } from '../../components/paywall/UpsellModal';
import { teamService } from '../../services/api/TeamService';
import { addTeam, joinTeam, selectUserTeams } from '../../store/slices/teamsSlice';
import { useFeatureGate } from '../../hooks/useFeatureGate';
import { SportType, SkillLevel, User } from '../../types';
import { SubscriptionPlan } from '../../types/subscription';
import { colors, fonts, Spacing } from '../../theme';

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

interface InviteItem {
  id: string;
  name: string;
  type: 'roster' | 'player';
  image?: string;
}

export function CreateTeamScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const userTeams = useSelector(selectUserTeams);
  const { allowed: rosterAllowed, requiredPlan } = useFeatureGate('create_roster');

  const [showUpsell, setShowUpsell] = useState(false);
  const [upsellPlan, setUpsellPlan] = useState<SubscriptionPlan>('roster');
  const [isLoading, setIsLoading] = useState(false);

  // ── Step state ──
  const [name, setName] = useState('');
  const [sport, setSport] = useState<SportType | ''>('');
  const [visibility, setVisibility] = useState<'private' | 'public' | ''>('');
  const [maxPlayers, setMaxPlayers] = useState('');
  const [gender, setGender] = useState('');
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');
  const [price, setPrice] = useState('0');

  // ── Invitations ──
  const [inviteQuery, setInviteQuery] = useState('');
  const [inviteResults, setInviteResults] = useState<InviteItem[]>([]);
  const [invitedItems, setInvitedItems] = useState<InviteItem[]>([]);

  // ── Step visibility ──
  const showSport = name.trim().length >= 2;
  const showVisibility = !!sport;
  const showMaxPlayers = visibility !== '';
  const showGender = !!maxPlayers && parseInt(maxPlayers) > 0;
  const showInvites = gender !== undefined && showGender;
  const showPrice = showInvites;
  const showSubmit = showPrice;

  // ── Invite search ──
  useEffect(() => {
    if (!inviteQuery.trim()) { setInviteResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const rostersRes = await teamService.getTeams(undefined, { page: 1, limit: 10 });
        let players: any[] = [];
        try {
          const resp = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/users/search?q=${encodeURIComponent(inviteQuery)}&limit=10`);
          const json = await resp.json();
          players = Array.isArray(json) ? json : json.data || [];
        } catch {}
        const rosterItems: InviteItem[] = (rostersRes.data || [])
          .filter((t: any) => t.name.toLowerCase().includes(inviteQuery.toLowerCase()))
          .map((t: any) => ({ id: t.id, name: t.name, type: 'roster' as const }));
        const playerItems: InviteItem[] = players
          .map((u: any) => ({ id: u.id, name: `${u.firstName} ${u.lastName}`, type: 'player' as const, image: u.profileImage }));
        setInviteResults([...rosterItems, ...playerItems]);
      } catch { setInviteResults([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [inviteQuery]);

  const addInvite = (item: InviteItem) => {
    if (!invitedItems.some((i) => i.id === item.id)) setInvitedItems((prev) => [...prev, item]);
    setInviteQuery('');
    setInviteResults([]);
  };

  const removeInvite = (id: string) => setInvitedItems((prev) => prev.filter((i) => i.id !== id));

  // ── Submit ──
  const handleSubmit = async () => {
    if (!name.trim() || !sport) return;

    if (userTeams.length >= 1 && !rosterAllowed) {
      setUpsellPlan(requiredPlan);
      setShowUpsell(true);
      return;
    }

    setIsLoading(true);
    try {
      const playerIds = invitedItems.filter((i) => i.type === 'player').map((i) => i.id);
      const newTeam = await teamService.createTeam({
        name: name.trim(),
        description: '',
        sportType: sport as SportType,
        sportTypes: [sport as SportType],
        skillLevel: SkillLevel.ALL_LEVELS,
        maxMembers: parseInt(maxPlayers) || 10,
        isPublic: visibility === 'public',
        genderRestriction: gender || undefined,
        initialMemberIds: playerIds,
      } as any);

      dispatch(addTeam(newTeam));
      dispatch(joinTeam(newTeam));
      (navigation as any).replace('TeamsList');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create roster.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Step 1: Name */}
        <Text style={styles.stepLabel}>Roster Name</Text>
        <TextInput style={styles.input} placeholder="e.g. Sunday Ballers" placeholderTextColor={colors.inkFaint} value={name} onChangeText={setName} />

        {/* Step 2: Sport */}
        {showSport && (
          <>
            <Text style={styles.stepLabel}>Sport</Text>
            <FormSelect label="" options={SPORT_OPTIONS} value={sport} onSelect={(o) => setSport(o.value as SportType)} placeholder="Select a sport..." />
          </>
        )}

        {/* Step 3: Visibility */}
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

        {/* Step 4: Max Players */}
        {showMaxPlayers && (
          <>
            <Text style={styles.stepLabel}>Max Players</Text>
            <TextInput style={styles.input} placeholder="e.g. 15" placeholderTextColor={colors.inkFaint} value={maxPlayers} onChangeText={setMaxPlayers} keyboardType="number-pad" />
          </>
        )}

        {/* Step 5: Gender */}
        {showGender && (
          <>
            <Text style={styles.stepLabel}>Gender</Text>
            <FormSelect label="" options={GENDER_OPTIONS} value={gender} onSelect={(o) => setGender(String(o.value))} placeholder="Open to All" />
            <Text style={styles.stepLabel}>Age Limit</Text>
            <View style={styles.row}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Min age" placeholderTextColor={colors.inkFaint} value={minAge} onChangeText={setMinAge} keyboardType="number-pad" />
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Max age" placeholderTextColor={colors.inkFaint} value={maxAge} onChangeText={setMaxAge} keyboardType="number-pad" />
            </View>
          </>
        )}

        {/* Step 6: Invite Players */}
        {showInvites && (
          <>
            <Text style={styles.stepLabel}>Invite Players</Text>
            <TextInput
              style={styles.input}
              placeholder="Search rosters or players..."
              placeholderTextColor={colors.inkFaint}
              value={inviteQuery}
              onChangeText={setInviteQuery}
            />
            {inviteResults.length > 0 && (
              <View style={styles.dropdown}>
                {inviteResults.slice(0, 8).map((item) => (
                  <TouchableOpacity key={item.id} style={styles.dropdownRow} onPress={() => addInvite(item)}>
                    {item.type === 'roster' ? (
                      <Ionicons name="people" size={18} color={colors.pine} />
                    ) : item.image ? (
                      <Image source={{ uri: item.image }} style={styles.avatar} />
                    ) : (
                      <Ionicons name="person" size={18} color={colors.inkFaint} />
                    )}
                    <Text style={styles.dropdownText}>{item.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {invitedItems.length > 0 && (
              <View style={styles.chipRow}>
                {invitedItems.map((item) => (
                  <View key={item.id} style={styles.inviteChip}>
                    {item.type === 'roster' ? <Ionicons name="people" size={14} color={colors.pine} /> : <Ionicons name="person" size={14} color={colors.ink} />}
                    <Text style={styles.inviteChipText}>{item.name}</Text>
                    <TouchableOpacity onPress={() => removeInvite(item.id)}><Ionicons name="close-circle" size={16} color={colors.inkFaint} /></TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* Step 7: Price */}
        {showPrice && (
          <>
            <Text style={styles.stepLabel}>Join Fee</Text>
            <TextInput style={styles.input} placeholder="0 for free" placeholderTextColor={colors.inkFaint} value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
          </>
        )}

        {/* Submit */}
        {showSubmit && (
          <View style={{ marginTop: 24 }}>
            <FormButton title={isLoading ? 'Creating...' : 'Create Roster'} onPress={handleSubmit} loading={isLoading} disabled={isLoading} />
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </KeyboardAvoidingView>
    <UpsellModal visible={showUpsell} onClose={() => setShowUpsell(false)} requiredPlan={upsellPlan} feature="create_roster" />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
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
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.cream,
  },
  row: { flexDirection: 'row', gap: 10 },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.cream,
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
    borderColor: colors.cream,
    maxHeight: 240,
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.cream,
  },
  dropdownText: { fontFamily: fonts.body, fontSize: 15, color: colors.ink, flex: 1 },
  avatar: { width: 24, height: 24, borderRadius: 12 },
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
    borderColor: colors.cream,
  },
  inviteChipText: { fontFamily: fonts.body, fontSize: 13, color: colors.ink },
});
