import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { FormSelect, SelectOption } from '../../components/forms/FormSelect';
import { UpsellModal } from '../../components/paywall/UpsellModal';
import { CreationWizard, WizardStep } from '../../components/wizard/CreationWizard';
import { SportIconGrid } from '../../components/wizard/SportIconGrid';
import { WizardSuccessScreen } from '../../components/wizard/WizardSuccessScreen';
import { teamService } from '../../services/api/TeamService';
import { addTeam, joinTeam, selectUserTeams } from '../../store/slices/teamsSlice';
import { useFeatureGate } from '../../hooks/useFeatureGate';
import { useAuth } from '../../context/AuthContext';
import { SportType, SkillLevel } from '../../types';
import { SubscriptionPlan } from '../../types/subscription';
import { getSportEmoji } from '../../constants/sports';
import { colors, fonts } from '../../theme';
import { API_BASE_URL } from '../../services/api/config';

const GENDER_OPTIONS: SelectOption[] = [
  { label: 'Open to All', value: '' },
  { label: 'Male Only', value: 'male' },
  { label: 'Female Only', value: 'female' },
];

const DEFAULT_MAX_PLAYERS: Record<string, number> = {
  basketball: 10,
  soccer: 22,
  tennis: 4,
  pickleball: 4,
  volleyball: 12,
  softball: 18,
  baseball: 18,
  flag_football: 14,
  kickball: 16,
};

interface InviteItem {
  id: string;
  name: string;
  type: 'roster' | 'player';
  image?: string;
}

export function CreateTeamScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { user: authUser } = useAuth();
  const userTeams = useSelector(selectUserTeams);
  const { allowed: rosterAllowed, requiredPlan } = useFeatureGate('create_roster');

  const [showUpsell, setShowUpsell] = useState(false);
  const [upsellPlan, setUpsellPlan] = useState<SubscriptionPlan>('roster');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdTeamId, setCreatedTeamId] = useState<string | null>(null);

  // ── Form state (all fields preserved) ──
  const [name, setName] = useState('');
  const [sport, setSport] = useState<string>('');
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

  // Smart default: pre-select user's primary sport
  useEffect(() => {
    if (!sport && authUser?.sportPreferences?.length) {
      setSport(authUser.sportPreferences[0] ?? '');
    }
  }, [authUser?.sportPreferences]);

  // Smart default: set max players when sport changes
  useEffect(() => {
    if (sport && !maxPlayers) {
      const defaultMax = DEFAULT_MAX_PLAYERS[sport] || 10;
      setMaxPlayers(String(defaultMax));
    }
  }, [sport]);

  // ── Invite search — players only ──
  useEffect(() => {
    if (!inviteQuery.trim()) { setInviteResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        let players: any[] = [];
        try {
          const resp = await fetch(`${API_BASE_URL}/users/search?query=${encodeURIComponent(inviteQuery)}&limit=10`);
          const json = await resp.json();
          players = Array.isArray(json) ? json : json.data || [];
        } catch (err) { console.warn('Player search failed:', (err as Error).message); }
        const playerItems: InviteItem[] = players
          .map((u: any) => ({ id: u.id, name: `${u.firstName} ${u.lastName}`, type: 'player' as const, image: u.profileImage }));
        setInviteResults(playerItems);
      } catch (err) { console.warn('Invite search failed:', (err as Error).message); setInviteResults([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [inviteQuery]);

  const addInvite = (item: InviteItem) => {
    if (!invitedItems.some((i) => i.id === item.id)) setInvitedItems((prev) => [...prev, item]);
    setInviteQuery('');
    setInviteResults([]);
  };

  const removeInvite = (id: string) => setInvitedItems((prev) => prev.filter((i) => i.id !== id));

  // ── Submit (identical payload) ──
  const handleSubmit = useCallback(async () => {
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
      setCreatedTeamId(newTeam.id);
      setShowSuccess(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create team.');
    } finally {
      setIsLoading(false);
    }
  }, [name, sport, visibility, maxPlayers, gender, invitedItems, userTeams, rosterAllowed, requiredPlan, dispatch]);

  const handleSportSelect = useCallback((key: string) => {
    setSport(key);
    // Reset max players to the new sport's default
    const defaultMax = DEFAULT_MAX_PLAYERS[key] || 10;
    setMaxPlayers(String(defaultMax));
  }, []);

  // ── Wizard steps ──
  const steps: WizardStep[] = useMemo(
    () => [
      {
        key: 'name',
        headline: 'Name your team',
        subtitle: 'Pick a name and sport — you can change these later',
        validate: () => name.trim().length >= 2 && !!sport,
        content: (
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.fieldLabel}>Team name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Sunday Ballers"
              placeholderTextColor={colors.outline}
              value={name}
              onChangeText={setName}
              autoFocus
            />
            <Text style={[styles.fieldLabel, { marginTop: 24 }]}>Sport</Text>
            <SportIconGrid selected={sport} onSelect={handleSportSelect} />
          </ScrollView>
        ),
      },
      {
        key: 'setup',
        headline: 'Set it up',
        subtitle: 'Configure visibility, roster size, and eligibility',
        validate: () => visibility !== '' && !!maxPlayers && parseInt(maxPlayers) > 0,
        content: (
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.fieldLabel}>Visibility</Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.toggleBtn, visibility === 'private' && styles.toggleBtnActive]}
                onPress={() => setVisibility('private')}
              >
                <Ionicons name="lock-closed-outline" size={16} color={visibility === 'private' ? '#FFF' : colors.onSurface} />
                <Text style={[styles.toggleText, visibility === 'private' && styles.toggleTextActive]}>Private</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, visibility === 'public' && styles.toggleBtnActive]}
                onPress={() => setVisibility('public')}
              >
                <Ionicons name="globe-outline" size={16} color={visibility === 'public' ? '#FFF' : colors.onSurface} />
                <Text style={[styles.toggleText, visibility === 'public' && styles.toggleTextActive]}>Public</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Max players</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 15"
              placeholderTextColor={colors.outline}
              value={maxPlayers}
              onChangeText={setMaxPlayers}
              keyboardType="number-pad"
            />

            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Gender</Text>
            <FormSelect label="" options={GENDER_OPTIONS} value={gender} onSelect={(o) => setGender(String(o.value))} placeholder="Open to All" />

            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Age limit</Text>
            <View style={styles.row}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Min age" placeholderTextColor={colors.outline} value={minAge} onChangeText={setMinAge} keyboardType="number-pad" />
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Max age" placeholderTextColor={colors.outline} value={maxAge} onChangeText={setMaxAge} keyboardType="number-pad" />
            </View>
          </ScrollView>
        ),
      },
      {
        key: 'price',
        headline: 'Set a join fee',
        subtitle: 'How much does it cost to join this roster?',
        validate: () => true,
        content: (
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.fieldLabel}>Join fee</Text>
            <View style={styles.priceRow}>
              <Text style={styles.pricePrefix}>$</Text>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="0 for free" placeholderTextColor={colors.outline} value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
            </View>
          </ScrollView>
        ),
      },
      {
        key: 'invite',
        headline: 'Invite players',
        subtitle: 'Search for players to invite (optional)',
        validate: () => true,
        content: (
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>Search players</Text>
            <TextInput
              style={styles.input}
              placeholder="Search by name..."
              placeholderTextColor={colors.outline}
              value={inviteQuery}
              onChangeText={setInviteQuery}
            />
            {inviteResults.length > 0 && (
              <View style={styles.dropdown}>
                {inviteResults.slice(0, 8).map((item) => (
                  <TouchableOpacity key={item.id} style={styles.dropdownRow} onPress={() => addInvite(item)}>
                    {item.image ? (
                      <Image source={{ uri: item.image }} style={styles.avatar} />
                    ) : (
                      <Ionicons name="person" size={18} color={colors.outline} />
                    )}
                    <Text style={styles.dropdownText}>{item.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {invitedItems.length > 0 && (
              <View style={styles.invitedList}>
                {invitedItems.map((item) => (
                  <View key={item.id} style={styles.invitedRow}>
                    {item.image ? (
                      <Image source={{ uri: item.image }} style={styles.invitedAvatar} />
                    ) : (
                      <View style={styles.invitedAvatarFallback}>
                        <Ionicons name="person" size={16} color="#FFFFFF" />
                      </View>
                    )}
                    <Text style={styles.invitedName}>{item.name}</Text>
                    <TouchableOpacity onPress={() => removeInvite(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="close-circle" size={20} color={colors.outline} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        ),
      },
    ],
    [name, sport, visibility, maxPlayers, gender, minAge, maxAge, inviteQuery, inviteResults, invitedItems, price, handleSportSelect]
  );

  const sportEmoji = getSportEmoji(sport);

  return (
    <>
      <CreationWizard
        steps={steps}
        onComplete={handleSubmit}
        onBack={() => navigation.goBack()}
        isSubmitting={isLoading}
        submitLabel="Create Team"
        showSuccess={showSuccess}
        successScreen={
          <WizardSuccessScreen
            emoji={sportEmoji}
            title={`${name.trim()} is live!`}
            subtitle="Your team has been created"
            summaryRows={[
              { label: 'Sport', value: sport ? sport.charAt(0).toUpperCase() + sport.slice(1).replace('_', ' ') : '' },
              { label: 'Visibility', value: visibility === 'public' ? 'Public' : 'Private' },
              { label: 'Max players', value: maxPlayers || '10' },
              ...(invitedItems.length > 0 ? [{ label: 'Invites sent', value: String(invitedItems.length) }] : []),
            ]}
            actions={[
              {
                label: 'Go to team',
                icon: 'arrow-forward',
                onPress: () => {
                  if (createdTeamId) {
                    (navigation as any).replace('TeamDetails', { teamId: createdTeamId });
                  } else {
                    (navigation as any).replace('TeamsList');
                  }
                },
                variant: 'primary',
              },
              {
                label: 'Back to teams',
                icon: 'list-outline',
                onPress: () => (navigation as any).replace('TeamsList'),
                variant: 'secondary',
              },
            ]}
          />
        }
      />
      <UpsellModal visible={showUpsell} onClose={() => setShowUpsell(false)} requiredPlan={upsellPlan} onUpgrade={() => setShowUpsell(false)} />
    </>
  );
}

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

  // ── Invite dropdown ──
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerLow,
  },
  dropdownText: { fontFamily: fonts.body, fontSize: 15, color: colors.onSurface, flex: 1 },
  avatar: { width: 24, height: 24, borderRadius: 12 },

  // ── Price row ──
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pricePrefix: { fontFamily: fonts.ui, fontSize: 18, color: colors.onSurface },

  // ── Invited players list ──
  invitedList: { marginTop: 16, gap: 8 },
  invitedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  invitedAvatar: { width: 32, height: 32, borderRadius: 16 },
  invitedAvatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invitedName: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.onSurface },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
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

  // ── Review card ──
  reviewCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 20,
    shadowColor: colors.onSurface,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  reviewEmoji: {
    fontSize: 40,
  },
  reviewName: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.onSurface,
  },
  reviewMeta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  reviewDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  reviewDetailLabel: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  reviewDetailValue: {
    fontFamily: fonts.label,
    fontSize: 14,
    color: colors.onSurface,
  },
});
