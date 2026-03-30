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
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, DateData } from 'react-native-calendars';

import { FormSelect, SelectOption } from '../../components/forms/FormSelect';
import { CreationWizard, WizardStep } from '../../components/wizard/CreationWizard';
import { SportIconGrid } from '../../components/wizard/SportIconGrid';
import { WizardSuccessScreen } from '../../components/wizard/WizardSuccessScreen';
import { eventService } from '../../services/api/EventService';
import { facilityService } from '../../services/api/FacilityService';
import { teamService } from '../../services/api/TeamService';
import { addEvent } from '../../store/slices/eventsSlice';
import { useAuth } from '../../context/AuthContext';
import { colors, fonts } from '../../theme';
import { calendarTheme } from '../../utils/calendarUtils';
import { SportType, SkillLevel, EventType, Facility } from '../../types';
import { getSportEmoji } from '../../constants/sports';

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

const SKILL_OPTIONS: SelectOption[] = [
  { label: 'All Levels', value: SkillLevel.ALL_LEVELS },
  { label: 'Beginner', value: SkillLevel.BEGINNER },
  { label: 'Intermediate', value: SkillLevel.INTERMEDIATE },
  { label: 'Advanced', value: SkillLevel.ADVANCED },
];

interface SlotData {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  price: number;
  court: { id: string; name: string; sportType: string; capacity: number };
  isFromRental: boolean;
  rentalId: string | null;
}

interface InviteItem {
  id: string;
  name: string;
  type: 'roster' | 'player';
  image?: string;
}

export function CreateEventScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);

  // ── Screen 1: Sport ──
  const [sport, setSport] = useState<SportType | ''>('');

  // ── Screen 2: Grounds ──
  const [facilityId, setFacilityId] = useState('');
  const [courtId, setCourtId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlots, setSelectedSlots] = useState<SlotData[]>([]);
  const [facilities, setFacilities] = useState<(Facility & { isOwned: boolean })[]>([]);
  const [allSlots, setAllSlots] = useState<SlotData[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // ── Screen 3: Event Type & Details ──
  const [eventType, setEventType] = useState<EventType | ''>('');
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');
  const [genderRestriction, setGenderRestriction] = useState('');
  const [skillLevel, setSkillLevel] = useState('');

  // ── Screen 4: Visibility, Max, Price ──
  const [visibility, setVisibility] = useState<'private' | 'public' | ''>('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [price, setPrice] = useState('0');

  // ── Screen 5: Invitations ──
  const [inviteQuery, setInviteQuery] = useState('');
  const [inviteResults, setInviteResults] = useState<InviteItem[]>([]);
  const [invitedItems, setInvitedItems] = useState<InviteItem[]>([]);
  const [minPlayerRating, setMinPlayerRating] = useState('');

  // ── Load authorized facilities ──
  useEffect(() => {
    if (!user) return;
    facilityService.getAuthorizedFacilities(user.id)
      .then((res) => setFacilities(res.data as any))
      .catch(() => {});
  }, [user]);

  // ── Load slots when facility changes ──
  useEffect(() => {
    if (!facilityId || !user) { setAllSlots([]); return; }
    setLoadingSlots(true);
    setCourtId(''); setSelectedDate(''); setSelectedSlots([]);
    facilityService.getAvailableSlots(facilityId, user.id)
      .then((res) => setAllSlots(res.data))
      .catch(() => setAllSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [facilityId, user]);

  // ── Derived data ──
  const courts = useMemo(() => {
    const map = new Map<string, { id: string; name: string; sportType: string }>();
    allSlots.forEach((s) => { if (!map.has(s.court.id)) map.set(s.court.id, s.court); });
    return Array.from(map.values());
  }, [allSlots]);

  const courtOptions: SelectOption[] = courts.map((c) => ({ label: c.name, value: c.id }));
  const facilityOptions: SelectOption[] = facilities.map((f) => ({ label: f.name, value: f.id }));

  const datesForCourt = useMemo(() => {
    if (!courtId) return new Set<string>();
    return new Set(allSlots.filter((s) => s.court.id === courtId).map((s) => s.date.split('T')[0]));
  }, [allSlots, courtId]);

  const calendarMarked = useMemo(() => {
    const marks: Record<string, any> = {};
    datesForCourt.forEach((d) => {
      marks[d!] = d === selectedDate
        ? { selected: true, selectedColor: colors.cobalt }
        : { marked: true, dotColor: colors.cobalt };
    });
    if (selectedDate && !datesForCourt.has(selectedDate)) {
      marks[selectedDate] = { selected: true, selectedColor: colors.cobalt };
    }
    return marks;
  }, [datesForCourt, selectedDate]);

  const slotsForDate = useMemo(() => {
    if (!courtId || !selectedDate) return [];
    return allSlots.filter((s) => s.court.id === courtId && s.date.split('T')[0] === selectedDate);
  }, [allSlots, courtId, selectedDate]);

  const formatTime = (t: string) => {
    const [hh, mm] = t.split(':').map(Number);
    const h12 = (hh ?? 0) % 12 || 12;
    const ampm = (hh ?? 0) >= 12 ? 'PM' : 'AM';
    return `${h12}:${String(mm ?? 0).padStart(2, '0')} ${ampm}`;
  };

  // ── Invite search ──
  useEffect(() => {
    if (!inviteQuery.trim()) { setInviteResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const isGame = eventType === EventType.GAME;
        if (isGame) {
          const res = await teamService.getTeams(undefined, { page: 1, limit: 15 });
          setInviteResults(
            (res.data || [])
              .filter((t: any) => t.name.toLowerCase().includes(inviteQuery.toLowerCase()))
              .map((t: any) => ({ id: t.id, name: t.name, type: 'roster' as const }))
          );
        } else {
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
        }
      } catch { setInviteResults([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [inviteQuery, eventType]);

  const addInvite = (item: InviteItem) => {
    if (!invitedItems.some((i) => i.id === item.id)) setInvitedItems((prev) => [...prev, item]);
    setInviteQuery(''); setInviteResults([]);
  };
  const removeInvite = (id: string) => setInvitedItems((prev) => prev.filter((i) => i.id !== id));

  // ── Submit ──
  const handleSubmit = useCallback(async () => {
    if (!user || !sport || !facilityId || selectedSlots.length === 0) return;
    try {
      setIsLoading(true);
      const firstSlot = selectedSlots[0]!;
      const lastSlot = selectedSlots[selectedSlots.length - 1]!;
      const slotDate = new Date(firstSlot.date);
      const [h, mStr] = firstSlot.startTime.split(':');
      const start = new Date(Date.UTC(slotDate.getUTCFullYear(), slotDate.getUTCMonth(), slotDate.getUTCDate(), parseInt(h || '0'), parseInt(mStr || '0')));
      const [eh, em] = lastSlot.endTime.split(':');
      const end = new Date(Date.UTC(slotDate.getUTCFullYear(), slotDate.getUTCMonth(), slotDate.getUTCDate(), parseInt(eh || '0'), parseInt(em || '0')));

      const sportLabel = sport.charAt(0).toUpperCase() + sport.slice(1).replace(/_/g, ' ');
      const eventData: any = {
        title: `${sportLabel} ${eventType || 'Event'}`,
        description: '',
        sportType: sport,
        eventType: eventType || EventType.PICKUP,
        facilityId,
        startTime: start,
        endTime: end,
        maxParticipants: parseInt(maxParticipants) || 10,
        price: parseFloat(price) || 0,
        skillLevel: skillLevel || SkillLevel.ALL_LEVELS,
        minPlayerRating: minPlayerRating ? parseInt(minPlayerRating) : undefined,
        genderRestriction: genderRestriction || undefined,
        equipment: [],
        isPrivate: visibility === 'private',
        organizerId: user.id,
        timeSlotId: firstSlot.id,
        rentalId: firstSlot.rentalId || undefined,
        timeSlotIds: selectedSlots.map((s) => s.id),
        rentalIds: selectedSlots.map((s) => s.rentalId).filter(Boolean),
        eligibility: {
          isInviteOnly: visibility === 'private',
          minAge: minAge ? parseInt(minAge) : undefined,
          maxAge: maxAge ? parseInt(maxAge) : undefined,
        },
      };

      const rosterIds = invitedItems.filter((i) => i.type === 'roster').map((i) => i.id);
      const playerIds = invitedItems.filter((i) => i.type === 'player').map((i) => i.id);
      if (rosterIds.length > 0) eventData.eligibility.restrictedToTeams = rosterIds;
      if (playerIds.length > 0) eventData.invitedUserIds = playerIds;

      const newEvent = await eventService.createEvent(eventData);
      dispatch(addEvent(newEvent));
      setCreatedEventId(newEvent.id);
      setShowSuccess(true);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to create event');
    } finally {
      setIsLoading(false);
    }
  }, [user, sport, facilityId, selectedSlots, eventType, maxParticipants, price, skillLevel, minPlayerRating, genderRestriction, minAge, maxAge, visibility, invitedItems, dispatch]);

  const handleSportSelect = useCallback((key: string) => {
    setSport(key as SportType);
    setFacilityId(''); setCourtId(''); setSelectedDate(''); setSelectedSlots([]);
    setEventType(''); setVisibility('');
  }, []);

  // ── Time slot toggle handler ──
  const toggleSlot = useCallback((slot: SlotData, idx: number) => {
    setSelectedSlots((prev) => {
      const isSelected = prev.some((s) => s.id === slot.id);
      if (isSelected) {
        const selectedIndices = prev.map((s) => slotsForDate.findIndex((sf) => sf.id === s.id));
        const minIdx = Math.min(...selectedIndices);
        const maxIdx = Math.max(...selectedIndices);
        if (idx === minIdx || idx === maxIdx) return prev.filter((s) => s.id !== slot.id);
        return prev;
      }
      const next = [...prev, slot].sort((a, b) => a.startTime.localeCompare(b.startTime));
      return next;
    });
  }, [slotsForDate]);

  const canSelectSlot = useCallback((idx: number) => {
    if (selectedSlots.length === 0) return true;
    if (selectedSlots.some((s) => s.id === slotsForDate[idx]?.id)) return true;
    const selectedIndices = selectedSlots.map((s) => slotsForDate.findIndex((sf) => sf.id === s.id));
    const minIdx = Math.min(...selectedIndices);
    const maxIdx = Math.max(...selectedIndices);
    return idx === minIdx - 1 || idx === maxIdx + 1;
  }, [selectedSlots, slotsForDate]);

  // ── Wizard steps ──
  const steps: WizardStep[] = useMemo(() => [
    // Screen 1: Sport
    {
      key: 'sport',
      headline: 'What are you playing?',
      validate: () => !!sport,
      content: (
        <ScrollView showsVerticalScrollIndicator={false}>
          <SportIconGrid selected={sport} onSelect={handleSportSelect} />
        </ScrollView>
      ),
    },
    // Screen 2: Grounds
    {
      key: 'grounds',
      headline: "Where's the game?",
      validate: () => selectedSlots.length > 0,
      content: (
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.fieldLabel}>Ground</Text>
          <FormSelect label="" options={facilityOptions} value={facilityId} onSelect={(o) => setFacilityId(String(o.value))} placeholder="Select a ground..." />

          {facilityId && loadingSlots && <ActivityIndicator color={colors.cobalt} style={{ marginVertical: 12 }} />}

          {facilityId && !loadingSlots && courts.length === 0 && (
            <Text style={styles.hint}>No courts with available slots at this ground.</Text>
          )}

          {facilityId && !loadingSlots && courts.length > 0 && (
            <>
              <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Court</Text>
              <FormSelect label="" options={courtOptions} value={courtId} onSelect={(o) => { setCourtId(String(o.value)); setSelectedDate(''); setSelectedSlots([]); }} placeholder="Select a court..." />
            </>
          )}

          {courtId && (
            <>
              <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Date</Text>
              <Calendar
                markedDates={calendarMarked}
                onDayPress={(day: DateData) => {
                  if (datesForCourt.has(day.dateString)) {
                    setSelectedDate(day.dateString);
                    setSelectedSlots([]);
                  }
                }}
                theme={calendarTheme}
                style={styles.calendar}
              />
            </>
          )}

          {selectedDate && slotsForDate.length > 0 && (
            <>
              <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Time</Text>
              <View style={styles.timeDropdown}>
                {slotsForDate.map((slot, idx) => {
                  const isSelected = selectedSlots.some((s) => s.id === slot.id);
                  const canSelect = canSelectSlot(idx);
                  return (
                    <TouchableOpacity
                      key={slot.id}
                      style={[styles.timeRow, isSelected && styles.timeRowSelected, !canSelect && styles.timeRowDisabled]}
                      disabled={!canSelect}
                      onPress={() => toggleSlot(slot, idx)}
                    >
                      <Ionicons name={isSelected ? 'checkbox' : 'square-outline'} size={20} color={isSelected ? colors.cobalt : canSelect ? colors.inkFaint : colors.surface} />
                      <Text style={[styles.timeRowText, isSelected && styles.timeRowTextSelected]}>
                        {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {selectedSlots.length > 0 && (
                <Text style={styles.timeHint}>
                  {formatTime(selectedSlots[0]!.startTime)} – {formatTime(selectedSlots[selectedSlots.length - 1]!.endTime)}
                </Text>
              )}
            </>
          )}
        </ScrollView>
      ),
    },
    // Screen 3: Event Type & Details
    {
      key: 'details',
      headline: 'Event details',
      validate: () => !!eventType,
      content: (
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.fieldLabel}>Event Type</Text>
          <FormSelect label="" options={EVENT_TYPE_OPTIONS} value={eventType} onSelect={(o) => { setEventType(o.value as EventType); setVisibility(''); setInvitedItems([]); }} placeholder="Select event type..." />

          <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Age Limit</Text>
          <View style={styles.row}>
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Min age" placeholderTextColor={colors.inkFaint} value={minAge} onChangeText={setMinAge} keyboardType="number-pad" />
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Max age" placeholderTextColor={colors.inkFaint} value={maxAge} onChangeText={setMaxAge} keyboardType="number-pad" />
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Gender</Text>
          <FormSelect label="" options={GENDER_OPTIONS} value={genderRestriction} onSelect={(o) => setGenderRestriction(String(o.value))} placeholder="Open to All" />

          <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Skill Level</Text>
          <FormSelect label="" options={SKILL_OPTIONS} value={skillLevel} onSelect={(o) => setSkillLevel(String(o.value))} placeholder="All Levels" />
        </ScrollView>
      ),
    },
    // Screen 4: Visibility, Max, Price
    {
      key: 'setup',
      headline: 'Who can join?',
      validate: () => visibility !== '' && !!maxParticipants && parseInt(maxParticipants) > 0,
      content: (
        <ScrollView showsVerticalScrollIndicator={false}>
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

          {visibility !== '' && (
            <>
              <Text style={[styles.fieldLabel, { marginTop: 20 }]}>
                {eventType === EventType.GAME ? 'Max Rosters' : 'Max Players'}
              </Text>
              <TextInput style={styles.input} placeholder="e.g. 10" placeholderTextColor={colors.inkFaint} value={maxParticipants} onChangeText={setMaxParticipants} keyboardType="number-pad" />
            </>
          )}

          {visibility !== '' && !!maxParticipants && parseInt(maxParticipants) > 0 && (
            <>
              <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Price</Text>
              <View style={styles.priceRow}>
                <Text style={styles.pricePrefix}>$</Text>
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="0" placeholderTextColor={colors.inkFaint} value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
              </View>
            </>
          )}
        </ScrollView>
      ),
    },
    // Screen 5: Invitations
    {
      key: 'invite',
      headline: visibility === 'public' ? 'Set player requirements' : 'Invite your crew',
      subtitle: visibility === 'public' ? 'Filter who can join this event' : eventType === EventType.GAME ? 'Search and select rosters' : 'Search rosters or players to invite',
      validate: () => true,
      content: (
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {visibility === 'public' ? (
            <>
              <Text style={styles.fieldLabel}>Min Player Rating (0–100)</Text>
              <TextInput style={styles.input} placeholder="Leave blank for open" placeholderTextColor={colors.inkFaint} value={minPlayerRating} onChangeText={setMinPlayerRating} keyboardType="number-pad" />
              <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Gender</Text>
              <FormSelect label="" options={GENDER_OPTIONS} value={genderRestriction} onSelect={(o) => setGenderRestriction(String(o.value))} placeholder="Open to All" />
            </>
          ) : (
            <>
              <Text style={styles.fieldLabel}>Search</Text>
              <TextInput
                style={styles.input}
                placeholder={eventType === EventType.GAME ? 'Search rosters...' : 'Search rosters or players...'}
                placeholderTextColor={colors.inkFaint}
                value={inviteQuery}
                onChangeText={setInviteQuery}
              />
              {inviteResults.length > 0 && (
                <View style={styles.dropdown}>
                  {inviteResults.slice(0, 8).map((item) => (
                    <TouchableOpacity key={item.id} style={styles.dropdownRow} onPress={() => addInvite(item)}>
                      {item.type === 'roster' ? (
                        <Ionicons name="people" size={18} color={colors.cobalt} />
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
                      {item.type === 'roster' ? <Ionicons name="people" size={14} color={colors.cobalt} /> : <Ionicons name="person" size={14} color={colors.ink} />}
                      <Text style={styles.inviteChipText}>{item.name}</Text>
                      <TouchableOpacity onPress={() => removeInvite(item.id)}><Ionicons name="close-circle" size={16} color={colors.inkFaint} /></TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      ),
    },
  ], [sport, facilityId, courtId, selectedDate, selectedSlots, facilities, courts, courtOptions, facilityOptions, allSlots, loadingSlots, datesForCourt, calendarMarked, slotsForDate, eventType, minAge, maxAge, genderRestriction, skillLevel, visibility, maxParticipants, price, inviteQuery, inviteResults, invitedItems, minPlayerRating, handleSportSelect, canSelectSlot, toggleSlot]);

  const sportEmoji = getSportEmoji(sport);
  const sportLabel = sport ? sport.charAt(0).toUpperCase() + sport.slice(1).replace(/_/g, ' ') : '';

  return (
    <CreationWizard
      steps={steps}
      onComplete={handleSubmit}
      onBack={() => navigation.goBack()}
      isSubmitting={isLoading}
      submitLabel="Create Event"
      showSuccess={showSuccess}
      successScreen={
        <WizardSuccessScreen
          emoji={sportEmoji}
          title="Game on!"
          subtitle={`Your ${sportLabel} ${eventType || 'event'} is live`}
          summaryRows={[
            { label: 'Sport', value: sportLabel },
            { label: 'Type', value: eventType ? eventType.charAt(0).toUpperCase() + eventType.slice(1) : '' },
            { label: 'Visibility', value: visibility === 'public' ? 'Public' : 'Private' },
            { label: 'Max', value: maxParticipants || '10' },
            ...(invitedItems.length > 0 ? [{ label: 'Invites sent', value: String(invitedItems.length) }] : []),
          ]}
          actions={[
            {
              label: 'View event',
              icon: 'arrow-forward',
              onPress: () => {
                if (createdEventId) {
                  (navigation as any).replace('EventDetails', { eventId: createdEventId });
                } else {
                  navigation.goBack();
                }
              },
              variant: 'primary',
            },
            {
              label: 'Back to home',
              icon: 'home-outline',
              onPress: () => (navigation as any).replace('HomeScreen'),
              variant: 'secondary',
            },
          ]}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  fieldLabel: {
    fontFamily: fonts.label,
    fontSize: 13,
    color: colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
    marginVertical: 12,
    textAlign: 'center',
  },
  row: { flexDirection: 'row', gap: 10 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pricePrefix: { fontFamily: fonts.ui, fontSize: 18, color: colors.ink },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.border,
    gap: 6,
  },
  toggleBtnActive: { backgroundColor: colors.cobalt, borderColor: colors.cobalt },
  toggleText: { fontFamily: fonts.ui, fontSize: 15, color: colors.ink },
  toggleTextActive: { color: '#FFFFFF' },
  calendar: { borderRadius: 12, overflow: 'hidden', marginBottom: 8 },
  timeDropdown: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  timeRowSelected: { backgroundColor: colors.cobalt + '0D' },
  timeRowDisabled: { opacity: 0.35 },
  timeRowText: { fontFamily: fonts.body, fontSize: 15, color: colors.ink },
  timeRowTextSelected: { fontFamily: fonts.label, color: colors.cobalt },
  timeHint: { fontFamily: fonts.label, fontSize: 13, color: colors.cobalt, marginTop: 6, textAlign: 'center' },
  dropdown: {
    backgroundColor: colors.white,
    borderRadius: 12,
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
  avatar: { width: 24, height: 24, borderRadius: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  inviteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inviteChipText: { fontFamily: fonts.body, fontSize: 13, color: colors.ink },
});
