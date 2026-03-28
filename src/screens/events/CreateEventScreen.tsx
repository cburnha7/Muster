import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';

import { FormButton } from '../../components/forms/FormButton';
import { FormSelect, SelectOption } from '../../components/forms/FormSelect';

import { eventService } from '../../services/api/EventService';
import { facilityService } from '../../services/api/FacilityService';
import { teamService } from '../../services/api/TeamService';
import { addEvent } from '../../store/slices/eventsSlice';
import { useAuth } from '../../context/AuthContext';
import { colors, fonts } from '../../theme';
import {
  SportType,
  SkillLevel,
  EventType,
  Facility,
} from '../../types';

// ── Options ──────────────────────────────────────────────
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

const EVENT_TYPE_OPTIONS: SelectOption[] = [
  { label: 'Game', value: EventType.GAME },
  { label: 'Practice', value: EventType.PRACTICE },
  { label: 'Pickup', value: EventType.PICKUP },
];

const GENDER_OPTIONS: SelectOption[] = [
  { label: 'Open to All', value: '' },
  { label: 'Male Only', value: 'male' },
  { label: 'Female Only', value: 'female' },
];

interface RosterResult {
  id: string;
  name: string;
  memberCount?: number;
}

// ── Component ────────────────────────────────────────────
export function CreateEventScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { user } = useAuth();

  // ── Progressive step tracking ──
  const [sport, setSport] = useState<SportType | ''>('');
  const [eventType, setEventType] = useState<EventType | ''>('');
  const [facilityId, setFacilityId] = useState('');
  const [courtId] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState('60');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'public' | ''>('');
  const [price, setPrice] = useState('0');
  const [minPlayerRating, setMinPlayerRating] = useState('');
  const [genderRestriction, setGenderRestriction] = useState('');
  const [title] = useState('');
  const [description] = useState('');

  // Game roster selection
  const [gameRosterModalVisible, setGameRosterModalVisible] = useState(false);
  const [teamA, setTeamA] = useState<RosterResult | null>(null);
  const [teamB, setTeamB] = useState<RosterResult | null>(null);
  const [rosterSearchQuery, setRosterSearchQuery] = useState('');
  const [rosterSearchResults, setRosterSearchResults] = useState<RosterResult[]>([]);
  const [selectingSlot, setSelectingSlot] = useState<'A' | 'B'>('A');

  // Private invite list
  const [inviteSearchQuery, setInviteSearchQuery] = useState('');
  const [inviteSearchResults, setInviteSearchResults] = useState<Array<{ id: string; name: string; type: 'roster' | 'player'; image?: string }>>([]);
  const [invitedItems, setInvitedItems] = useState<Array<{ id: string; name: string; type: 'roster' | 'player'; image?: string }>>([]);

  // Facilities
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // ── Derived step visibility ──
  const showEventType = !!sport;
  const showGrounds = !!eventType && (eventType !== EventType.GAME || (!!teamA && !!teamB));
  const groundConfirmed = !!facilityId && !!startDate && !!startTime;
  const showMaxParticipants = groundConfirmed;
  const showVisibility = !!maxParticipants && parseInt(maxParticipants) > 0;
  const showPrice = visibility !== '';
  const showSubmit = showPrice;

  // Load facilities
  useEffect(() => {
    if (!user) return;
    facilityService.getAuthorizedFacilities(user.id)
      .then((res) => setFacilities(res.data))
      .catch(() => {});
  }, [user]);

  // When Game is selected, open roster modal
  useEffect(() => {
    if (eventType === EventType.GAME && !teamA && !teamB) {
      setGameRosterModalVisible(true);
    }
  }, [eventType]);

  // ── Roster search ──
  const searchRosters = useCallback(async (query: string) => {
    if (!query.trim()) { setRosterSearchResults([]); return; }
    try {
      const res = await teamService.getTeams(undefined, { page: 1, limit: 20 });
      const filtered = (res.data || []).filter((t: any) => t.name.toLowerCase().includes(query.toLowerCase()));
      setRosterSearchResults(filtered.map((t: any) => ({ id: t.id, name: t.name, memberCount: t.members?.length })));
    } catch { setRosterSearchResults([]); }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchRosters(rosterSearchQuery), 300);
    return () => clearTimeout(timer);
  }, [rosterSearchQuery]);

  // ── Invite search (rosters + players) ──
  const searchInvites = useCallback(async (query: string) => {
    if (!query.trim()) { setInviteSearchResults([]); return; }
    try {
      const rostersRes = await teamService.getTeams(undefined, { page: 1, limit: 10 });
      let playersRes: any[] = [];
      try {
        const resp = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/users/search?q=${encodeURIComponent(query)}&limit=10`);
        const json = await resp.json();
        playersRes = Array.isArray(json) ? json : json.data || [];
      } catch {}
      const rosterItems = (rostersRes.data || [])
        .filter((t: any) => t.name.toLowerCase().includes(query.toLowerCase()))
        .map((t: any) => ({ id: t.id, name: t.name, type: 'roster' as const }));
      const playerItems = playersRes
        .map((u: any) => ({ id: u.id, name: `${u.firstName} ${u.lastName}`, type: 'player' as const, image: u.profileImage }));
      setInviteSearchResults([...rosterItems, ...playerItems]);
    } catch { setInviteSearchResults([]); }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchInvites(inviteSearchQuery), 300);
    return () => clearTimeout(timer);
  }, [inviteSearchQuery]);

  const addInviteItem = (item: typeof invitedItems[0]) => {
    if (!invitedItems.some(i => i.id === item.id)) {
      setInvitedItems(prev => [...prev, item]);
    }
    setInviteSearchQuery('');
    setInviteSearchResults([]);
  };

  const removeInviteItem = (id: string) => {
    setInvitedItems(prev => prev.filter(i => i.id !== id));
  };

  // ── Submit ──
  const handleSubmit = async () => {
    if (!user) return;
    if (!sport || !eventType || !facilityId || !startDate || !startTime) {
      Alert.alert('Missing Fields', 'Please complete all required steps.');
      return;
    }

    try {
      setIsLoading(true);

      // Build start/end datetimes
      const parts = startTime.split(':').map(Number);
      const h = parts[0] ?? 0;
      const m = parts[1] ?? 0;
      const start = new Date(startDate);
      start.setUTCHours(h, m, 0, 0);
      const durationMin = parseInt(duration) || 60;
      const end = new Date(start.getTime() + durationMin * 60000);

      const eventData: any = {
        title: title.trim() || `${sport.charAt(0).toUpperCase() + sport.slice(1)} ${eventType}`,
        description: description.trim() || '',
        sportType: sport,
        eventType,
        facilityId,
        startTime: start,
        endTime: end,
        maxParticipants: parseInt(maxParticipants) || 10,
        price: parseFloat(price) || 0,
        skillLevel: SkillLevel.ALL_LEVELS,
        minPlayerRating: minPlayerRating ? parseInt(minPlayerRating) : undefined,
        genderRestriction: genderRestriction || undefined,
        equipment: [],
        isPrivate: visibility === 'private',
        organizerId: user.id,
        eligibility: {
          isInviteOnly: visibility === 'private',
        },
      };

      // Game rosters
      if (eventType === EventType.GAME && teamA && teamB) {
        eventData.homeRosterId = teamA.id;
        eventData.awayRosterId = teamB.id;
        eventData.eligibility.restrictedToTeams = [teamA.id, teamB.id];
      }

      // Private invites
      if (visibility === 'private' && invitedItems.length > 0) {
        const rosterIds = invitedItems.filter(i => i.type === 'roster').map(i => i.id);
        const playerIds = invitedItems.filter(i => i.type === 'player').map(i => i.id);
        if (rosterIds.length > 0) eventData.eligibility.restrictedToTeams = rosterIds;
        if (playerIds.length > 0) eventData.invitedUserIds = playerIds;
      }

      if (courtId) eventData.courtId = courtId;

      const newEvent = await eventService.createEvent(eventData);
      dispatch(addEvent(newEvent));
      (navigation as any).navigate('EventDetails', { eventId: newEvent.id });
      setTimeout(() => Alert.alert('Success', 'Event created!'), 300);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to create event');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Facility options ──
  const facilityOptions: SelectOption[] = facilities.map(f => ({ label: f.name, value: f.id }));

  // ── Render ──
  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Step 1: Sport */}
        <Text style={styles.stepLabel}>Sport</Text>
        <View style={styles.chipRow}>
          {SPORT_OPTIONS.map((opt) => {
            const selected = sport === opt.value;
            return (
              <TouchableOpacity key={String(opt.value)} style={[styles.chip, selected && styles.chipSelected]} onPress={() => setSport(opt.value as SportType)}>
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Step 2: Event Type */}
        {showEventType && (
          <>
            <Text style={styles.stepLabel}>Event Type</Text>
            <View style={styles.chipRow}>
              {EVENT_TYPE_OPTIONS.map((opt) => {
                const selected = eventType === opt.value;
                return (
                  <TouchableOpacity key={String(opt.value)} style={[styles.chip, selected && styles.chipSelected]} onPress={() => setEventType(opt.value as EventType)}>
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* Step 3: Grounds + Date/Time */}
        {showGrounds && (
          <>
            <Text style={styles.stepLabel}>Grounds</Text>
            <FormSelect
              label=""
              options={facilityOptions}
              value={facilityId}
              onSelect={(opt) => { setFacilityId(opt.value.toString()); }}
              placeholder="Select a ground..."
            />
            {facilityId && (
              <>
                <Text style={styles.stepLabel}>Date & Time</Text>
                <View style={styles.row}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Start (HH:MM)"
                    placeholderTextColor={colors.inkFaint}
                    value={startTime}
                    onChangeText={setStartTime}
                    keyboardType="numbers-and-punctuation"
                  />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Duration (min)"
                    placeholderTextColor={colors.inkFaint}
                    value={duration}
                    onChangeText={setDuration}
                    keyboardType="number-pad"
                  />
                </View>
                <TouchableOpacity style={styles.dateBtn} onPress={() => {
                  // Simple date input — in production this would be a date picker
                  const today = new Date();
                  setStartDate(today);
                }}>
                  <Ionicons name="calendar-outline" size={18} color={colors.pine} />
                  <Text style={styles.dateBtnText}>{startDate ? startDate.toLocaleDateString() : 'Select date'}</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}

        {/* Step 4: Max Participants */}
        {showMaxParticipants && (
          <>
            <Text style={styles.stepLabel}>Max Players</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 10"
              placeholderTextColor={colors.inkFaint}
              value={maxParticipants}
              onChangeText={setMaxParticipants}
              keyboardType="number-pad"
            />
          </>
        )}

        {/* Step 5: Private / Public */}
        {showVisibility && (
          <>
            <Text style={styles.stepLabel}>Visibility</Text>
            <View style={styles.row}>
              <TouchableOpacity style={[styles.toggleBtn, visibility === 'private' && styles.toggleBtnActive]} onPress={() => setVisibility('private')}>
                <Ionicons name="lock-closed-outline" size={16} color={visibility === 'private' ? '#FFF' : colors.ink} />
                <Text style={[styles.toggleBtnText, visibility === 'private' && styles.toggleBtnTextActive]}>Private</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.toggleBtn, visibility === 'public' && styles.toggleBtnActive]} onPress={() => setVisibility('public')}>
                <Ionicons name="globe-outline" size={16} color={visibility === 'public' ? '#FFF' : colors.ink} />
                <Text style={[styles.toggleBtnText, visibility === 'public' && styles.toggleBtnTextActive]}>Public</Text>
              </TouchableOpacity>
            </View>

            {/* Private: invite search */}
            {visibility === 'private' && (
              <View style={styles.inviteSection}>
                <TextInput
                  style={styles.input}
                  placeholder="Search rosters or players..."
                  placeholderTextColor={colors.inkFaint}
                  value={inviteSearchQuery}
                  onChangeText={setInviteSearchQuery}
                />
                {inviteSearchResults.length > 0 && (
                  <View style={styles.searchDropdown}>
                    {inviteSearchResults.slice(0, 8).map((item) => (
                      <TouchableOpacity key={item.id} style={styles.searchRow} onPress={() => addInviteItem(item)}>
                        {item.type === 'roster' ? (
                          <Ionicons name="people" size={18} color={colors.pine} />
                        ) : item.image ? (
                          <Image source={{ uri: item.image }} style={styles.searchAvatar} />
                        ) : (
                          <Ionicons name="person" size={18} color={colors.inkFaint} />
                        )}
                        <Text style={styles.searchRowText}>{item.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {invitedItems.length > 0 && (
                  <View style={styles.inviteList}>
                    {invitedItems.map((item) => (
                      <View key={item.id} style={styles.inviteChip}>
                        {item.type === 'roster' ? <Ionicons name="people" size={14} color={colors.pine} /> : <Ionicons name="person" size={14} color={colors.ink} />}
                        <Text style={styles.inviteChipText}>{item.name}</Text>
                        <TouchableOpacity onPress={() => removeInviteItem(item.id)}><Ionicons name="close-circle" size={16} color={colors.inkFaint} /></TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Public: rating + gender */}
            {visibility === 'public' && (
              <View style={styles.publicFilters}>
                <Text style={styles.miniLabel}>Min Player Rating (0-100)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Leave blank for open"
                  placeholderTextColor={colors.inkFaint}
                  value={minPlayerRating}
                  onChangeText={setMinPlayerRating}
                  keyboardType="number-pad"
                />
                <Text style={styles.miniLabel}>Gender</Text>
                <View style={styles.chipRow}>
                  {GENDER_OPTIONS.map((opt) => {
                    const selected = genderRestriction === opt.value;
                    return (
                      <TouchableOpacity key={String(opt.value)} style={[styles.chip, selected && styles.chipSelected]} onPress={() => setGenderRestriction(opt.value.toString())}>
                        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{opt.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </>
        )}

        {/* Step 6: Price */}
        {showPrice && (
          <>
            <Text style={styles.stepLabel}>Price</Text>
            <TextInput
              style={styles.input}
              placeholder="0 for free"
              placeholderTextColor={colors.inkFaint}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
            />
          </>
        )}

        {/* Submit */}
        {showSubmit && (
          <View style={styles.submitContainer}>
            <FormButton title={isLoading ? 'Creating...' : 'Create Event'} onPress={handleSubmit} loading={isLoading} disabled={isLoading} />
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Game Roster Selection Modal */}
      <Modal visible={gameRosterModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setGameRosterModalVisible(false); if (!teamA || !teamB) setEventType(''); }}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setGameRosterModalVisible(false); if (!teamA || !teamB) setEventType(''); }}>
              <Text style={styles.modalCancel}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Rosters</Text>
            <TouchableOpacity onPress={() => { if (teamA && teamB) setGameRosterModalVisible(false); }} disabled={!teamA || !teamB}>
              <Text style={[styles.modalDone, (!teamA || !teamB) && { opacity: 0.4 }]}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            {/* Slot A */}
            <TouchableOpacity style={[styles.rosterSlot, teamA && styles.rosterSlotFilled]} onPress={() => { setSelectingSlot('A'); setRosterSearchQuery(''); }}>
              <Text style={styles.rosterSlotLabel}>Roster A</Text>
              <Text style={styles.rosterSlotValue}>{teamA?.name || 'Tap to select'}</Text>
            </TouchableOpacity>

            <Text style={styles.vsText}>vs</Text>

            {/* Slot B */}
            <TouchableOpacity style={[styles.rosterSlot, teamB && styles.rosterSlotFilled]} onPress={() => { setSelectingSlot('B'); setRosterSearchQuery(''); }}>
              <Text style={styles.rosterSlotLabel}>Roster B</Text>
              <Text style={styles.rosterSlotValue}>{teamB?.name || 'Tap to select'}</Text>
            </TouchableOpacity>

            {/* Search */}
            <TextInput
              style={[styles.input, { marginTop: 20 }]}
              placeholder={`Search for Roster ${selectingSlot}...`}
              placeholderTextColor={colors.inkFaint}
              value={rosterSearchQuery}
              onChangeText={setRosterSearchQuery}
              autoFocus
            />
            {rosterSearchResults.map((r) => (
              <TouchableOpacity key={r.id} style={styles.searchRow} onPress={() => {
                if (selectingSlot === 'A') { setTeamA(r); setSelectingSlot('B'); }
                else { setTeamB(r); }
                setRosterSearchQuery('');
                setRosterSearchResults([]);
              }}>
                <Ionicons name="people" size={18} color={colors.pine} />
                <Text style={styles.searchRowText}>{r.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.cream,
  },
  chipSelected: { backgroundColor: colors.pine, borderColor: colors.pine },
  chipText: { fontFamily: fonts.body, fontSize: 14, color: colors.ink },
  chipTextSelected: { color: '#FFFFFF', fontFamily: fonts.label },
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
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.cream,
  },
  dateBtnText: { fontFamily: fonts.body, fontSize: 15, color: colors.ink },
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
  toggleBtnText: { fontFamily: fonts.ui, fontSize: 14, color: colors.ink },
  toggleBtnTextActive: { color: '#FFFFFF' },
  miniLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkFaint,
    marginTop: 12,
    marginBottom: 6,
  },
  inviteSection: { marginTop: 12 },
  publicFilters: { marginTop: 4 },
  searchDropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.cream,
    maxHeight: 240,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.cream,
  },
  searchRowText: { fontFamily: fonts.body, fontSize: 15, color: colors.ink, flex: 1 },
  searchAvatar: { width: 24, height: 24, borderRadius: 12 },
  inviteList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
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
  submitContainer: { marginTop: 24 },
  // Modal
  modalContainer: { flex: 1, backgroundColor: colors.chalk },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cream,
  },
  modalCancel: { fontFamily: fonts.body, fontSize: 16, color: colors.inkFaint },
  modalTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.ink },
  modalDone: { fontFamily: fonts.ui, fontSize: 16, color: colors.pine },
  modalBody: { padding: 16 },
  rosterSlot: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.cream,
    borderStyle: 'dashed',
  },
  rosterSlotFilled: { borderColor: colors.pine, borderStyle: 'solid' },
  rosterSlotLabel: { fontFamily: fonts.label, fontSize: 11, color: colors.inkFaint, textTransform: 'uppercase' },
  rosterSlotValue: { fontFamily: fonts.label, fontSize: 16, color: colors.ink, marginTop: 4 },
  vsText: { fontFamily: fonts.heading, fontSize: 18, color: colors.inkFaint, textAlign: 'center', marginVertical: 8 },
});
