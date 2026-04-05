import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { FormSelect, SelectOption } from '../../../components/forms/FormSelect';
import { useCreateEvent } from './CreateEventContext';
import { useAuth } from '../../../context/AuthContext';
import { facilityService } from '../../../services/api/FacilityService';
import { SlotData } from './types';
import { colors, fonts } from '../../../theme';

export function Step4Where() {
  const { state, dispatch } = useCreateEvent();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const routeParams = (route.params || {}) as any;

  const isMuster = state.locationMode === 'muster';
  const isOpen = state.locationMode === 'open';
  const isRecurring = state.recurring && state.occurrenceLocations.length > 1;

  const [facilities, setFacilities] = useState<
    { id: string; name: string; isOwned: boolean }[]
  >([]);
  const [loadingFacilities, setLoadingFacilities] = useState(false);
  const [courts, setCourts] = useState<SelectOption[]>([]);
  const [loadingCourts, setLoadingCourts] = useState(false);
  const [noSportMatch, setNoSportMatch] = useState(false);

  // Reservation / slot state
  const [matchingSlots, setMatchingSlots] = useState<SlotData[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [isOwnerView, setIsOwnerView] = useState(false);

  const loadFacilities = useCallback(async () => {
    if (!user?.id) return;
    setLoadingFacilities(true);
    try {
      const res = await facilityService.getAuthorizedFacilities(user.id);
      setFacilities(
        res.data.map((f: any) => ({
          id: f.id,
          name: f.name,
          isOwned: f.isOwned,
        }))
      );
    } catch {
      setFacilities([]);
    } finally {
      setLoadingFacilities(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isMuster) loadFacilities();
  }, [isMuster, loadFacilities]);

  // Load courts when facility selected — check sport match
  useEffect(() => {
    if (!state.facilityId || !user?.id || !isMuster) {
      setCourts([]);
      setNoSportMatch(false);
      return;
    }
    setLoadingCourts(true);
    setNoSportMatch(false);
    // Load ALL courts (no sport filter) to check sport availability
    facilityService
      .getCourtsForEvent(state.facilityId, user.id)
      .then((allRes: any) => {
        const all = allRes.data || [];
        const sportFiltered = state.sport
          ? all.filter((c: any) => c.sportType === state.sport)
          : all;
        if (sportFiltered.length === 0 && all.length > 0 && state.sport) {
          setNoSportMatch(true);
          setCourts([]);
        } else {
          setCourts(
            sportFiltered.map((c: any) => ({ label: c.name, value: c.id }))
          );
        }
      })
      .catch(() => setCourts([]))
      .finally(() => setLoadingCourts(false));
  }, [state.facilityId, user?.id, state.sport, isMuster]);

  // Load matching slots/reservations when court is selected
  useEffect(() => {
    if (!state.facilityId || !state.courtId || !user?.id || !isMuster) {
      setMatchingSlots([]);
      return;
    }
    // Build the event date string from state.startDate
    const eventDate = state.startDate;
    if (!eventDate) {
      setMatchingSlots([]);
      return;
    }
    const dateStr = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`;

    setLoadingSlots(true);
    facilityService
      .getSlotsForDate(state.facilityId, state.courtId, user.id, dateStr)
      .then(res => {
        setIsOwnerView(res.isOwner);
        // Filter slots that fall within the event time window
        const startTime = state.startTime;
        const endTime = state.endTime;
        let slots = res.data || [];
        if (startTime && endTime) {
          const eventStart = `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`;
          const eventEnd = `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`;
          slots = slots.filter(
            s => s.startTime >= eventStart && s.endTime <= eventEnd
          );
        }
        const courtInfo = courts.find(c => c.value === state.courtId);
        setMatchingSlots(
          slots.map(s => ({
            id: s.id,
            date: dateStr,
            startTime: s.startTime,
            endTime: s.endTime,
            price: s.price,
            court: {
              id: state.courtId,
              name: courtInfo?.label || state.courtName,
              sportType: state.sport || '',
              capacity: 0,
            },
            isFromRental: s.isFromRental,
            rentalId: s.rentalId,
          }))
        );
      })
      .catch(() => setMatchingSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [
    state.facilityId,
    state.courtId,
    user?.id,
    state.startDate,
    state.startTime,
    state.endTime,
    isMuster,
    state.sport,
    state.courtName,
    courts,
  ]);

  // Auto-set facility/court when returning from reservation booking
  useEffect(() => {
    if (routeParams.fromReservation && routeParams.facilityId) {
      // Set location mode to muster
      if (state.locationMode !== 'muster') {
        dispatch({ type: 'SET_LOCATION_MODE', mode: 'muster' });
      }
      // Set facility
      const fac = facilities.find(f => f.id === routeParams.facilityId);
      if (fac) {
        dispatch({
          type: 'SET_FACILITY',
          facilityId: fac.id,
          facilityName: fac.name,
          isOwner: fac.isOwned,
        });
      } else if (routeParams.facilityId && routeParams.facilityName) {
        dispatch({
          type: 'SET_FACILITY',
          facilityId: routeParams.facilityId,
          facilityName: routeParams.facilityName,
          isOwner: false,
        });
      }
      // Set court after a tick so the court list loads first
      if (routeParams.courtId && routeParams.courtName) {
        setTimeout(() => {
          dispatch({
            type: 'SET_COURT',
            courtId: routeParams.courtId,
            courtName: routeParams.courtName,
          });
        }, 300);
      }
    }
  }, [routeParams.fromReservation, routeParams.facilityId, facilities]);

  const facilityOptions: SelectOption[] = facilities.map(f => ({
    label: f.name,
    value: f.id,
  }));

  const handleFacilitySelect = (value: string | number | boolean) => {
    const fac = facilities.find(f => f.id === value);
    if (!fac) return;
    dispatch({
      type: 'SET_FACILITY',
      facilityId: fac.id,
      facilityName: fac.name,
      isOwner: fac.isOwned,
    });
    setCourts([]);
    setMatchingSlots([]);
    setNoSportMatch(false);
  };

  const handleCourtSelect = (value: string | number | boolean) => {
    const court = courts.find(c => c.value === value);
    if (!court) return;
    dispatch({
      type: 'SET_COURT',
      courtId: String(court.value),
      courtName: court.label,
    });
    setMatchingSlots([]);
  };

  const handleSlotSelect = (slot: SlotData) => {
    dispatch({ type: 'TOGGLE_SLOT', slot, slotsForDate: matchingSlots });
  };

  const handleNeedCourt = (dateStr?: string) => {
    const fmtDate = state.startDate
      ? `${state.startDate.getFullYear()}-${String(state.startDate.getMonth() + 1).padStart(2, '0')}-${String(state.startDate.getDate()).padStart(2, '0')}`
      : undefined;
    navigation.navigate('Facilities', {
      screen: 'FacilitiesList',
      params: {
        openSearch: true,
        filterDate: dateStr || fmtDate,
        filterStartTime: state.startTime ? fmtTime(state.startTime) : undefined,
        filterEndTime: state.endTime ? fmtTime(state.endTime) : undefined,
        returnTo: 'CreateEvent',
      },
    });
  };

  const fmtTime = (d: Date): string =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  const fmt12 = (time: string): string => {
    const [h, m] = time.split(':').map(Number);
    const h12 = (h || 0) % 12 || 12;
    const ampm = (h || 0) >= 12 ? 'PM' : 'AM';
    return `${h12}:${String(m || 0).padStart(2, '0')} ${ampm}`;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Where's the game?</Text>

      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeBtn, isMuster && styles.modeBtnActive]}
          onPress={() =>
            dispatch({ type: 'SET_LOCATION_MODE', mode: 'muster' })
          }
          activeOpacity={0.8}
        >
          <Ionicons
            name="business-outline"
            size={18}
            color={isMuster ? colors.white : colors.ink}
          />
          <Text
            style={[styles.modeBtnText, isMuster && styles.modeBtnTextActive]}
          >
            Muster Location
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, isOpen && styles.modeBtnActive]}
          onPress={() => dispatch({ type: 'SET_LOCATION_MODE', mode: 'open' })}
          activeOpacity={0.8}
        >
          <Ionicons
            name="location-outline"
            size={18}
            color={isOpen ? colors.white : colors.ink}
          />
          <Text
            style={[styles.modeBtnText, isOpen && styles.modeBtnTextActive]}
          >
            Open Ground
          </Text>
        </TouchableOpacity>
      </View>

      {isMuster && (
        <>
          {loadingFacilities ? (
            <ActivityIndicator
              size="small"
              color={colors.pine}
              style={styles.loader}
            />
          ) : (
            <FormSelect
              label="Ground"
              placeholder="Select a ground"
              value={state.facilityId || ''}
              options={facilityOptions}
              onValueChange={handleFacilitySelect}
            />
          )}

          {/* Sport mismatch warning */}
          {noSportMatch && (
            <View style={styles.warningCard}>
              <Ionicons name="warning-outline" size={18} color={colors.heart} />
              <Text style={styles.warningText}>
                No courts at this location are available for{' '}
                {state.sport || 'the selected sport'}.
              </Text>
            </View>
          )}

          {/* Court selector — only if sport matches */}
          {state.facilityId !== '' &&
            !noSportMatch &&
            (loadingCourts ? (
              <ActivityIndicator
                size="small"
                color={colors.pine}
                style={styles.loader}
              />
            ) : (
              <FormSelect
                label="Court"
                placeholder="Select a court"
                value={state.courtId || ''}
                options={courts}
                onValueChange={handleCourtSelect}
                disabled={courts.length === 0}
              />
            ))}

          {/* Matching reservations / available slots */}
          {state.courtId !== '' && !noSportMatch && (
            <>
              {loadingSlots ? (
                <ActivityIndicator
                  size="small"
                  color={colors.pine}
                  style={styles.loader}
                />
              ) : matchingSlots.length > 0 ? (
                <>
                  <Text style={styles.sectionLabel}>
                    {isOwnerView ? 'Available Time Slots' : 'Your Reservations'}
                  </Text>
                  {matchingSlots.map(slot => {
                    const selected = state.selectedSlots.some(
                      s => s.id === slot.id
                    );
                    return (
                      <TouchableOpacity
                        key={slot.id}
                        style={[
                          styles.slotCard,
                          selected && styles.slotCardSelected,
                        ]}
                        onPress={() => handleSlotSelect(slot)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.slotInfo}>
                          <Text
                            style={[
                              styles.slotDate,
                              selected && styles.slotTextSelected,
                            ]}
                          >
                            {slot.date}
                          </Text>
                          <Text
                            style={[
                              styles.slotTime,
                              selected && styles.slotTextSelected,
                            ]}
                          >
                            {fmt12(slot.startTime)} – {fmt12(slot.endTime)}
                          </Text>
                        </View>
                        {selected && (
                          <Ionicons
                            name="checkmark-circle"
                            size={22}
                            color={colors.pine}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </>
              ) : (
                <View style={styles.noSlotsCard}>
                  <Ionicons
                    name="calendar-outline"
                    size={24}
                    color={colors.inkSoft}
                  />
                  <Text style={styles.noSlotsText}>
                    {isOwnerView
                      ? 'No available time slots for this court within the event time window.'
                      : 'No reservations found for this court within the event time window.'}
                  </Text>
                  <TouchableOpacity
                    style={styles.needCourtBtn}
                    onPress={() => handleNeedCourt()}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="search-outline"
                      size={16}
                      color={colors.pine}
                    />
                    <Text style={styles.needCourtBtnText}>Need a court?</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          {/* Need a court button for when court is not yet selected */}
          {state.courtId === '' &&
            state.facilityId !== '' &&
            !noSportMatch &&
            !isRecurring && (
              <TouchableOpacity
                style={styles.needCourtBtn}
                onPress={() => handleNeedCourt()}
                activeOpacity={0.8}
              >
                <Ionicons name="search-outline" size={16} color={colors.pine} />
                <Text style={styles.needCourtBtnText}>Need a court?</Text>
              </TouchableOpacity>
            )}
        </>
      )}

      {isOpen && (
        <>
          <Text style={styles.fieldLabel}>Location Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Central Park, Main Street Gym"
            placeholderTextColor={colors.inkSoft}
            value={state.locationName}
            onChangeText={v =>
              dispatch({ type: 'SET_FIELD', field: 'locationName', value: v })
            }
          />
          <Text style={styles.fieldLabel}>Street Address</Text>
          <TextInput
            style={styles.input}
            placeholder="123 Main St"
            placeholderTextColor={colors.inkSoft}
            value={state.locationAddress}
            onChangeText={v =>
              dispatch({
                type: 'SET_FIELD',
                field: 'locationAddress',
                value: v,
              })
            }
          />
          <View style={styles.addressRow}>
            <View style={{ flex: 2 }}>
              <Text style={styles.fieldLabel}>City</Text>
              <TextInput
                style={styles.input}
                placeholder="City"
                placeholderTextColor={colors.inkSoft}
                value={(state as any).locationCity || ''}
                onChangeText={v =>
                  dispatch({
                    type: 'SET_FIELD',
                    field: 'locationCity',
                    value: v,
                  })
                }
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>State</Text>
              <TextInput
                style={styles.input}
                placeholder="ST"
                placeholderTextColor={colors.inkSoft}
                value={(state as any).locationState || ''}
                onChangeText={v =>
                  dispatch({
                    type: 'SET_FIELD',
                    field: 'locationState',
                    value: v,
                  })
                }
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Zip</Text>
              <TextInput
                style={styles.input}
                placeholder="00000"
                placeholderTextColor={colors.inkSoft}
                keyboardType="numeric"
                value={(state as any).locationZip || ''}
                onChangeText={v =>
                  dispatch({
                    type: 'SET_FIELD',
                    field: 'locationZip',
                    value: v,
                  })
                }
              />
            </View>
          </View>
        </>
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
    marginBottom: 24,
  },
  modeRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeBtnActive: { backgroundColor: colors.pine, borderColor: colors.pine },
  modeBtnText: { fontFamily: fonts.ui, fontSize: 14, color: colors.ink },
  modeBtnTextActive: { color: colors.white },
  loader: { marginVertical: 16 },
  sectionLabel: {
    fontFamily: fonts.label,
    fontSize: 14,
    color: colors.inkSoft,
    marginTop: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.heartTint,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.heart,
  },
  warningText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.heart,
    flex: 1,
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  slotCardSelected: {
    borderColor: colors.pine,
    backgroundColor: colors.pineTint,
  },
  slotInfo: { gap: 2 },
  slotDate: { fontFamily: fonts.label, fontSize: 13, color: colors.inkSoft },
  slotTime: {
    fontFamily: fonts.headingSemi || fonts.heading,
    fontSize: 16,
    color: colors.ink,
  },
  slotTextSelected: { color: colors.pine },
  noSlotsCard: {
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 24,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noSlotsText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkSoft,
    textAlign: 'center',
  },
  needCourtBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.pine,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 16,
  },
  needCourtBtnText: { fontFamily: fonts.ui, fontSize: 15, color: colors.pine },
  fieldLabel: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
    marginBottom: 8,
  },
  addressRow: { flexDirection: 'row', gap: 8 },
});
