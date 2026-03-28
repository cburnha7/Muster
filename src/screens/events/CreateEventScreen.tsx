import React, { useState, useEffect, useMemo } from 'react';
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
  Image,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, DateData } from 'react-native-calendars';

import { FormSelect, SelectOption } from '../../components/forms/FormSelect';
import { FormButton } from '../../components/forms/FormButton';
import { eventService } from '../../services/api/EventService';
import { facilityService } from '../../services/api/FacilityService';
import { teamService } from '../../services/api/TeamService';
import { addEvent } from '../../store/slices/eventsSlice';
import { useAuth } from '../../context/AuthContext';
import { colors, fonts, Spacing } from '../../theme';
import { calendarTheme } from '../../utils/calendarUtils';
import { SportType, SkillLevel, EventType, Facility } from '../../types';

// ── Sport options ──
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

  // ── Step state ──
  const [sport, setSport] = useState<SportType | ''>('');
  const [facilityId, setFacilityId] = useState('');
  const [courtId, setCourtId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlots, setSelectedSlots] = useState<SlotData[]>([]);
  const [eventType, setEventType] = useState<EventType | ''>('');
  const [visibility, setVisibility] = useState<'private' | 'public' | ''>('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [price, setPrice] = useState('0');
  const [minPlayerRating, setMinPlayerRating] = useState('');
  const [genderRestriction, setGenderRestriction] = useState('');
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');

  // ── Data ──
  const [facilities, setFacilities] = useState<(Facility & { isOwned: boolean })[]>([]);
  const [allSlots, setAllSlots] = useState<SlotData[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ── Invitations ──
  const [inviteQuery, setInviteQuery] = useState('');
  const [inviteResults, setInviteResults] = useState<InviteItem[]>([]);
  const [invitedItems, setInvitedItems] = useState<InviteItem[]>([]);

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
    setCourtId('');
    setSelectedDate('');
    setSelectedSlots([]);
    facilityService.getAvailableSlots(facilityId, user.id)
      .then((res) => {
        setAllSlots(res.data);
      })
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

  const datesForCourt = useMemo(() => {
    if (!courtId) return new Set<string>();
    return new Set(allSlots.filter((s) => s.court.id === courtId).map((s) => s.date.split('T')[0]));
  }, [allSlots, courtId]);

  const calendarMarked = useMemo(() => {
    const marks: Record<string, any> = {};
    datesForCourt.forEach((d) => {
      if (d === selectedDate) {
        marks[d!] = { selected: true, selectedColor: colors.pine };
      } else {
        marks[d!] = { marked: true, dotColor: colors.pine };
      }
    });
    if (selectedDate && !datesForCourt.has(selectedDate)) {
      marks[selectedDate] = { selected: true, selectedColor: colors.pine };
    }
    return marks;
  }, [datesForCourt, selectedDate]);

  const slotsForDate = useMemo(() => {
    if (!courtId || !selectedDate) return [];
    return allSlots.filter((s) => s.court.id === courtId && s.date.split('T')[0] === selectedDate);
  }, [allSlots, courtId, selectedDate]);

  // ── Step visibility ──
  const showGrounds = !!sport;
  const showCourt = showGrounds && !!facilityId;
  const showCalendar = showCourt && !!courtId;
  const showTimeSlots = showCalendar && !!selectedDate && slotsForDate.length > 0;
  const showEventType = selectedSlots.length > 0;
  const showVisibility = !!eventType;
  const showMaxParticipants = visibility !== '';
  const showInvitations = !!maxParticipants && parseInt(maxParticipants) > 0 && visibility === 'private';
  const showPublicFilters = !!maxParticipants && parseInt(maxParticipants) > 0 && visibility === 'public';
  const showPrice = showInvitations || showPublicFilters;
  const showSubmit = showPrice;

  // ── Invite search ──
  useEffect(() => {
    if (!inviteQuery.trim()) { setInviteResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const isGame = eventType === EventType.GAME;
        if (isGame) {
          // Game: search rosters only
          const res = await teamService.getTeams(undefined, { page: 1, limit: 15 });
          setInviteResults(
            (res.data || [])
              .filter((t: any) => t.name.toLowerCase().includes(inviteQuery.toLowerCase()))
              .map((t: any) => ({ id: t.id, name: t.name, type: 'roster' as const }))
          );
        } else {
          // Practice/Pickup: search rosters + players
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
    setInviteQuery('');
    setInviteResults([]);
  };

  const removeInvite = (id: string) => setInvitedItems((prev) => prev.filter((i) => i.id !== id));

  // ── Submit ──
  const handleSubmit = async () => {
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

      const eventData: any = {
        title: `${SPORT_OPTIONS.find((o) => o.value === sport)?.label || sport} ${eventType || 'Event'}`,
        description: '',
        sportType: sport,
        eventType: eventType || EventType.PICKUP,
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

      // Invitations
      const rosterIds = invitedItems.filter((i) => i.type === 'roster').map((i) => i.id);
      const playerIds = invitedItems.filter((i) => i.type === 'player').map((i) => i.id);
      if (rosterIds.length > 0) eventData.eligibility.restrictedToTeams = rosterIds;
      if (playerIds.length > 0) eventData.invitedUserIds = playerIds;

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
  const facilityOptions: SelectOption[] = facilities.map((f) => ({ label: f.name, value: f.id }));

  const formatTime = (t: string) => {
    const [hh, mm] = t.split(':').map(Number);
    const h12 = (hh ?? 0) % 12 || 12;
    const ampm = (hh ?? 0) >= 12 ? 'PM' : 'AM';
    return `${h12}:${String(mm ?? 0).padStart(2, '0')} ${ampm}`;
  };

  // ── Render ──
  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Step 1: Sport */}
        <Text style={styles.stepLabel}>Sport</Text>
        <FormSelect label="" options={SPORT_OPTIONS} value={sport} onSelect={(o) => { setSport(o.value as SportType); setFacilityId(''); setCourtId(''); setSelectedDate(''); setSelectedSlots([]); setEventType(''); setVisibility(''); }} placeholder="Select a sport..." />

        {/* Step 2: Ground */}
        {showGrounds && (
          <>
            <Text style={styles.stepLabel}>Ground</Text>
            <FormSelect label="" options={facilityOptions} value={facilityId} onSelect={(o) => setFacilityId(String(o.value))} placeholder="Select a ground..." />
          </>
        )}

        {/* Step 2b: Court */}
        {showCourt && (
          <>
            {loadingSlots ? (
              <ActivityIndicator color={colors.pine} style={{ marginVertical: 12 }} />
            ) : courts.length === 0 ? (
              <Text style={styles.hint}>No courts with available slots at this ground.</Text>
            ) : (
              <>
                <Text style={styles.stepLabel}>Court</Text>
                <FormSelect label="" options={courtOptions} value={courtId} onSelect={(o) => { setCourtId(String(o.value)); setSelectedDate(''); setSelectedSlots([]); }} placeholder="Select a court..." />
              </>
            )}
          </>
        )}

        {/* Step 2c: Date */}
        {showCalendar && (
          <>
            <Text style={styles.stepLabel}>Date</Text>
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

        {/* Step 2d: Time */}
        {showTimeSlots && (
          <>
            <Text style={styles.stepLabel}>Time</Text>
            <View style={styles.timeDropdown}>
              {slotsForDate.map((slot, idx) => {
                const isSelected = selectedSlots.some((s) => s.id === slot.id);
                // Allow selection only if contiguous with existing selection
                const canSelect = (() => {
                  if (selectedSlots.length === 0) return true;
                  if (isSelected) return true; // can deselect
                  const selectedIndices = selectedSlots.map((s) => slotsForDate.findIndex((sf) => sf.id === s.id));
                  const minIdx = Math.min(...selectedIndices);
                  const maxIdx = Math.max(...selectedIndices);
                  return idx === minIdx - 1 || idx === maxIdx + 1;
                })();

                return (
                  <TouchableOpacity
                    key={slot.id}
                    style={[styles.timeRow, isSelected && styles.timeRowSelected, !canSelect && styles.timeRowDisabled]}
                    disabled={!canSelect}
                    onPress={() => {
                      if (isSelected) {
                        // Only allow deselecting from the ends
                        const selectedIndices = selectedSlots.map((s) => slotsForDate.findIndex((sf) => sf.id === s.id));
                        const minIdx = Math.min(...selectedIndices);
                        const maxIdx = Math.max(...selectedIndices);
                        const thisIdx = slotsForDate.findIndex((sf) => sf.id === slot.id);
                        if (thisIdx === minIdx || thisIdx === maxIdx) {
                          setSelectedSlots((prev) => prev.filter((s) => s.id !== slot.id));
                        }
                      } else {
                        setSelectedSlots((prev) => {
                          const next = [...prev, slot];
                          // Sort by start time to keep order
                          next.sort((a, b) => a.startTime.localeCompare(b.startTime));
                          return next;
                        });
                      }
                    }}
                  >
                    <Ionicons
                      name={isSelected ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={isSelected ? colors.pine : canSelect ? colors.inkFaint : colors.white}
                    />
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

        {/* Step 3: Event Type */}
        {showEventType && (
          <>
            <Text style={styles.stepLabel}>Event Type</Text>
            <FormSelect label="" options={EVENT_TYPE_OPTIONS} value={eventType} onSelect={(o) => { setEventType(o.value as EventType); setVisibility(''); setInvitedItems([]); }} placeholder="Select event type..." />
          </>
        )}

        {/* Step 4: Visibility */}
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

        {/* Step 5: Max Participants */}
        {showMaxParticipants && (
          <>
            <Text style={styles.stepLabel}>
              {eventType === EventType.GAME ? 'Max Rosters' : 'Max Players'}
            </Text>
            <TextInput style={styles.input} placeholder="e.g. 10" placeholderTextColor={colors.inkFaint} value={maxParticipants} onChangeText={setMaxParticipants} keyboardType="number-pad" />
          </>
        )}

        {/* Step 6a: Invitations (private) */}
        {showInvitations && (
          <>
            <Text style={styles.stepLabel}>
              {eventType === EventType.GAME ? 'Invite Rosters' : 'Invite Rosters & Players'}
            </Text>
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

        {/* Step 6b: Public filters */}
        {showPublicFilters && (
          <>
            <Text style={styles.stepLabel}>Min Player Rating (0–100)</Text>
            <TextInput style={styles.input} placeholder="Leave blank for open" placeholderTextColor={colors.inkFaint} value={minPlayerRating} onChangeText={setMinPlayerRating} keyboardType="number-pad" />
            <Text style={styles.stepLabel}>Gender</Text>
            <FormSelect label="" options={GENDER_OPTIONS} value={genderRestriction} onSelect={(o) => setGenderRestriction(String(o.value))} placeholder="Open to All" />
            <Text style={styles.stepLabel}>Age Limit</Text>
            <View style={styles.row}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Min age" placeholderTextColor={colors.inkFaint} value={minAge} onChangeText={setMinAge} keyboardType="number-pad" />
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Max age" placeholderTextColor={colors.inkFaint} value={maxAge} onChangeText={setMaxAge} keyboardType="number-pad" />
            </View>
          </>
        )}

        {/* Step 7: Price */}
        {showPrice && (
          <>
            <Text style={styles.stepLabel}>Price</Text>
            <TextInput style={styles.input} placeholder="0 for free" placeholderTextColor={colors.inkFaint} value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
          </>
        )}

        {/* Submit */}
        {showSubmit && (
          <View style={{ marginTop: 24 }}>
            <FormButton title={isLoading ? 'Creating...' : 'Create Event'} onPress={handleSubmit} loading={isLoading} disabled={isLoading} />
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

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
  hint: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
    marginVertical: 12,
    textAlign: 'center',
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
    borderColor: colors.white,
  },
  calendar: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  timeDropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.white,
    overflow: 'hidden',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.white,
  },
  timeRowSelected: {
    backgroundColor: colors.pine + '0D',
  },
  timeRowDisabled: {
    opacity: 0.35,
  },
  timeRowText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
  },
  timeRowTextSelected: {
    fontFamily: fonts.label,
    color: colors.pine,
  },
  timeHint: {
    fontFamily: fonts.label,
    fontSize: 13,
    color: colors.pine,
    marginTop: 6,
    textAlign: 'center',
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
    borderColor: colors.white,
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
    borderColor: colors.white,
    maxHeight: 240,
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.white,
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
    borderColor: colors.white,
  },
  inviteChipText: { fontFamily: fonts.body, fontSize: 13, color: colors.ink },
});
