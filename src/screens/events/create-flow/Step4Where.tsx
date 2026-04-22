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
import { useSelector } from 'react-redux';
import { selectUser } from '../../../store/slices/authSlice';
import TokenStorage from '../../../services/auth/TokenStorage';
import { facilityService } from '../../../services/api/FacilityService';
import { API_BASE_URL } from '../../../services/api/config';
import { fonts, useTheme } from '../../../theme';
import { AddressAutocomplete } from '../../../components/forms/AddressAutocomplete';

interface SavedLocation {
  id: string;
  name: string;
  address: string | null;
}

export function Step4Where() {
  const { colors } = useTheme();
  const { state, dispatch } = useCreateEvent();
  const user = useSelector(selectUser);
  const navigation = useNavigation<any>();
  const route = useRoute();
  const routeParams = (route.params || {}) as any;

  const isMuster = state.locationMode === 'muster';
  const isOpen = state.locationMode === 'open';

  const [facilities, setFacilities] = useState<
    {
      id: string;
      name: string;
      city?: string;
      state?: string;
      isOwned: boolean;
      hasRentals: boolean;
    }[]
  >([]);
  const [loadingFacilities, setLoadingFacilities] = useState(false);
  const [courts, setCourts] = useState<SelectOption[]>([]);
  const [loadingCourts, setLoadingCourts] = useState(false);
  const [noSportMatch, setNoSportMatch] = useState(false);

  // Saved open ground locations
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);

  const loadSavedLocations = useCallback(async () => {
    if (!user?.id) return;
    try {
      const token = await TokenStorage.getAccessToken();
      const headers: Record<string, string> = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const res = await fetch(`${API_BASE_URL}/users/open-ground-locations`, {
        headers,
      });
      if (res.ok) setSavedLocations(await res.json());
    } catch {
      // non-fatal
    }
  }, [user?.id]);

  useEffect(() => {
    if (isOpen) loadSavedLocations();
  }, [isOpen, loadSavedLocations]);

  // Availability check state
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [availabilityIsOwner, setAvailabilityIsOwner] = useState(false);

  const loadFacilities = useCallback(async () => {
    if (!user?.id) return;
    setLoadingFacilities(true);
    try {
      // Load all facilities matching the event's sport type
      if (state.sport) {
        const res = await facilityService.getFacilitiesForEvent(
          state.sport,
          user.id
        );
        setFacilities(
          res.data.map((f: any) => ({
            id: f.id,
            name: f.name,
            city: f.city,
            state: f.state,
            isOwned: f.isOwned,
            hasRentals: f.hasRentals,
          }))
        );
      } else {
        // Fallback: load authorized facilities only
        const res = await facilityService.getAuthorizedFacilities(user.id);
        setFacilities(
          res.data.map((f: any) => ({
            id: f.id,
            name: f.name,
            city: (f as any).city,
            state: (f as any).state,
            isOwned: f.isOwned,
            hasRentals: f.hasRentals ?? false,
          }))
        );
      }
    } catch {
      setFacilities([]);
    } finally {
      setLoadingFacilities(false);
    }
  }, [user?.id, state.sport]);

  useEffect(() => {
    if (isMuster) loadFacilities();
  }, [isMuster, loadFacilities]);

  // Load courts when facility selected
  useEffect(() => {
    if (!state.facilityId || !user?.id || !isMuster) {
      setCourts([]);
      setNoSportMatch(false);
      return;
    }
    setLoadingCourts(true);
    setNoSportMatch(false);
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

  // Check availability when court is selected
  useEffect(() => {
    if (!state.facilityId || !state.courtId || !user?.id || !isMuster) {
      setIsAvailable(null);
      return;
    }
    const eventDate = state.startDate;
    if (!eventDate || !state.startTime || !state.endTime) {
      setIsAvailable(null);
      return;
    }
    const dateStr = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`;
    const eventStart = fmtTime(state.startTime);
    const eventEnd = fmtTime(state.endTime);

    setCheckingAvailability(true);
    facilityService
      .getCourtSchedule(state.facilityId, state.courtId, user.id, dateStr)
      .then(res => {
        setAvailabilityIsOwner(res.isOwner);
        const schedule = res.schedule || [];

        // Check if all slots in the event window are available or own_reservation
        const slotsInWindow = schedule.filter(
          s => s.startTime >= eventStart && s.startTime < eventEnd
        );
        const allAvailable =
          slotsInWindow.length > 0 &&
          slotsInWindow.every(
            s => s.status === 'available' || s.status === 'own_reservation'
          );

        setIsAvailable(allAvailable ? true : false);
      })
      .catch(() => setIsAvailable(false))
      .finally(() => setCheckingAvailability(false));
  }, [
    state.facilityId,
    state.courtId,
    user?.id,
    state.startDate,
    state.startTime,
    state.endTime,
    isMuster,
  ]);

  // Auto-set facility/court when returning from reservation booking
  useEffect(() => {
    if (routeParams.fromReservation && routeParams.facilityId) {
      if (state.locationMode !== 'muster') {
        dispatch({ type: 'SET_LOCATION_MODE', mode: 'muster' });
      }
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

  const facilityOptions: SelectOption[] = facilities.map(f => {
    const location = [f.city, f.state].filter(Boolean).join(', ');
    const badge = f.isOwned
      ? ' (Your Ground)'
      : f.hasRentals
        ? ' (Reserved)'
        : '';
    return {
      label: `${f.name}${location ? ` · ${location}` : ''}${badge}`,
      value: f.id,
    };
  });

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
    setIsAvailable(null);
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
    setIsAvailable(null);
  };

  const handleBookCourtTime = () => {
    if (state.facilityId) {
      // Navigate directly to court availability for the selected facility
      const dateStr = state.startDate
        ? `${state.startDate.getFullYear()}-${String(state.startDate.getMonth() + 1).padStart(2, '0')}-${String(state.startDate.getDate()).padStart(2, '0')}`
        : undefined;
      navigation.navigate('Facilities', {
        screen: 'CourtAvailability',
        params: {
          facilityId: state.facilityId,
          facilityName: state.facilityName,
          courtId: state.courtId,
          eventDate: dateStr,
          eventStartTime: state.startTime
            ? fmtTime(state.startTime)
            : undefined,
          returnTo: 'CreateEvent',
        },
      });
    } else {
      // Navigate to Grounds list with sport filter pre-populated
      navigation.navigate('Facilities', {
        screen: 'FacilitiesList',
        params: {
          eventDate: state.startDate
            ? `${state.startDate.getFullYear()}-${String(state.startDate.getMonth() + 1).padStart(2, '0')}-${String(state.startDate.getDate()).padStart(2, '0')}`
            : undefined,
          eventStartTime: state.startTime
            ? fmtTime(state.startTime)
            : undefined,
          returnTo: 'CreateEvent',
        },
      });
    }
  };

  const eventDateLabel = state.startDate
    ? state.startDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : '';
  const eventTimeLabel =
    state.startTime && state.endTime
      ? `${fmt12(fmtTime(state.startTime))} – ${fmt12(fmtTime(state.endTime))}`
      : '';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bgScreen }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.heading, { color: colors.ink }]}>
        Where's the game?
      </Text>

      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[
            styles.modeBtn,
            { backgroundColor: colors.surface, borderColor: colors.border },
            isMuster && styles.modeBtnActive,
            isMuster && {
              backgroundColor: colors.cobalt,
              borderColor: colors.cobalt,
            },
          ]}
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
            style={[
              styles.modeBtnText,
              { color: colors.ink },
              isMuster && styles.modeBtnTextActive,
              isMuster && { color: colors.white },
            ]}
          >
            Muster Location
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.modeBtn,
            { backgroundColor: colors.surface, borderColor: colors.border },
            isOpen && styles.modeBtnActive,
            isOpen && {
              backgroundColor: colors.cobalt,
              borderColor: colors.cobalt,
            },
          ]}
          onPress={() => dispatch({ type: 'SET_LOCATION_MODE', mode: 'open' })}
          activeOpacity={0.8}
        >
          <Ionicons
            name="location-outline"
            size={18}
            color={isOpen ? colors.white : colors.ink}
          />
          <Text
            style={[
              styles.modeBtnText,
              { color: colors.ink },
              isOpen && styles.modeBtnTextActive,
              isOpen && { color: colors.white },
            ]}
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

          {noSportMatch && (
            <View
              style={[
                styles.warningCard,
                {
                  backgroundColor: colors.heartTint,
                  borderColor: colors.heart,
                },
              ]}
            >
              <Ionicons name="warning-outline" size={18} color={colors.heart} />
              <Text style={[styles.warningText, { color: colors.heart }]}>
                No courts at this location are available for{' '}
                {state.sport || 'the selected sport'}.
              </Text>
            </View>
          )}

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

          {/* Availability check result */}
          {state.courtId !== '' && !noSportMatch && (
            <>
              {checkingAvailability ? (
                <ActivityIndicator
                  size="small"
                  color={colors.pine}
                  style={styles.loader}
                />
              ) : isAvailable === true ? (
                <View
                  style={[
                    styles.availableCard,
                    {
                      backgroundColor: colors.pineTint,
                      borderColor: colors.pine,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.availableIcon,
                      { backgroundColor: colors.white },
                    ]}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={colors.pine}
                    />
                  </View>
                  <View style={styles.availableInfo}>
                    <Text
                      style={[styles.availableLabel, { color: colors.pine }]}
                    >
                      Available
                    </Text>
                    <Text style={[styles.availableDate, { color: colors.ink }]}>
                      {eventDateLabel}
                    </Text>
                    <Text
                      style={[styles.availableTime, { color: colors.inkSoft }]}
                    >
                      {eventTimeLabel}
                    </Text>
                    {availabilityIsOwner && (
                      <Text style={[styles.ownerNote, { color: colors.pine }]}>
                        You own this ground
                      </Text>
                    )}
                  </View>
                </View>
              ) : isAvailable === false ? (
                <View
                  style={[
                    styles.unavailableCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={24}
                    color={colors.heart}
                  />
                  <Text
                    style={[styles.unavailableText, { color: colors.inkSoft }]}
                  >
                    {availabilityIsOwner
                      ? 'This time slot is reserved by another user.'
                      : 'You don\u2019t have a reservation for this time.'}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.bookCourtBtn,
                      { backgroundColor: colors.pine },
                    ]}
                    onPress={handleBookCourtTime}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color={colors.white}
                    />
                    <Text
                      style={[styles.bookCourtBtnText, { color: colors.white }]}
                    >
                      Book Court Time
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </>
          )}
        </>
      )}

      {isOpen && (
        <>
          <Text style={[styles.fieldLabel, { color: colors.ink }]}>
            Location Name
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.ink,
              },
            ]}
            placeholder="e.g. Central Park, Main Street Gym"
            placeholderTextColor={colors.inkSoft}
            value={state.locationName}
            onChangeText={v =>
              dispatch({ type: 'SET_FIELD', field: 'locationName', value: v })
            }
          />
          <AddressAutocomplete
            value={state.locationAddress}
            onChangeText={v =>
              dispatch({
                type: 'SET_FIELD',
                field: 'locationAddress',
                value: v,
              })
            }
            onAddressSelected={addr => {
              dispatch({
                type: 'SET_FIELD',
                field: 'locationAddress',
                value: addr.street || addr.formatted,
              });
              dispatch({
                type: 'SET_FIELD',
                field: 'locationCity',
                value: addr.city,
              });
              dispatch({
                type: 'SET_FIELD',
                field: 'locationState',
                value: addr.state,
              });
              dispatch({
                type: 'SET_FIELD',
                field: 'locationZip',
                value: addr.zipCode,
              });
              if (addr.latitude != null)
                dispatch({
                  type: 'SET_FIELD',
                  field: 'locationLat',
                  value: addr.latitude,
                });
              if (addr.longitude != null)
                dispatch({
                  type: 'SET_FIELD',
                  field: 'locationLng',
                  value: addr.longitude,
                });
            }}
            label="Street Address"
            placeholder="Search address..."
          />
          <View style={styles.addressRow}>
            <View style={{ flex: 2 }}>
              <Text style={[styles.fieldLabel, { color: colors.ink }]}>
                City
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.ink,
                  },
                ]}
                placeholder="City"
                placeholderTextColor={colors.inkMuted}
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
              <Text style={[styles.fieldLabel, { color: colors.ink }]}>
                State
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.ink,
                  },
                ]}
                placeholder="ST"
                placeholderTextColor={colors.inkMuted}
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
              <Text style={[styles.fieldLabel, { color: colors.ink }]}>
                Zip
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.ink,
                  },
                ]}
                placeholder="00000"
                placeholderTextColor={colors.inkMuted}
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

          {/* Previously used locations */}
          {savedLocations.length > 0 && (
            <View
              style={[styles.savedSection, { borderTopColor: colors.border }]}
            >
              <Text style={[styles.savedTitle, { color: colors.inkFaint }]}>
                Previously used
              </Text>
              {savedLocations.map(loc => (
                <TouchableOpacity
                  key={loc.id}
                  style={[
                    styles.savedRow,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => {
                    dispatch({
                      type: 'SET_FIELD',
                      field: 'locationName',
                      value: loc.name,
                    });
                    dispatch({
                      type: 'SET_FIELD',
                      field: 'locationAddress',
                      value: loc.address ?? '',
                    });
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="location-outline"
                    size={16}
                    color={colors.cobalt}
                  />
                  <View style={styles.savedInfo}>
                    <Text
                      style={[styles.savedName, { color: colors.ink }]}
                      numberOfLines={1}
                    >
                      {loc.name}
                    </Text>
                    {loc.address ? (
                      <Text
                        style={[styles.savedAddress, { color: colors.inkSoft }]}
                        numberOfLines={1}
                      >
                        {loc.address}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={14}
                    color={colors.inkFaint}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

function fmtTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmt12(time: string): string {
  const parts = time.split(':').map(Number);
  const h = parts[0] || 0;
  const m = parts[1] || 0;
  const h12 = h % 12 || 12;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  heading: {
    fontFamily: fonts.heading,
    fontSize: 24,
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
    borderWidth: 1,
  },
  modeBtnActive: {},
  modeBtnText: { fontFamily: fonts.ui, fontSize: 14 },
  modeBtnTextActive: {},
  loader: { marginVertical: 16 },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
  },
  warningText: {
    fontFamily: fonts.body,
    fontSize: 14,
    flex: 1,
  },
  availableCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 14,
    padding: 16,
    marginTop: 12,
    borderWidth: 1.5,
  },
  availableIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  availableInfo: { flex: 1, gap: 2 },
  availableLabel: {
    fontFamily: fonts.label,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  availableDate: {
    fontFamily: fonts.headingSemi || fonts.heading,
    fontSize: 16,
  },
  availableTime: {
    fontFamily: fonts.body,
    fontSize: 14,
  },
  ownerNote: {
    fontFamily: fonts.label,
    fontSize: 11,
    marginTop: 2,
  },
  unavailableCard: {
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    padding: 24,
    marginTop: 12,
    borderWidth: 1,
  },
  unavailableText: {
    fontFamily: fonts.body,
    fontSize: 14,
    textAlign: 'center',
  },
  bookCourtBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  bookCourtBtnText: { fontFamily: fonts.ui, fontSize: 15 },
  fieldLabel: {
    fontFamily: fonts.body,
    fontSize: 16,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 16,
    marginBottom: 8,
  },
  addressRow: { flexDirection: 'row', gap: 8 },
  savedSection: {
    marginTop: 20,
    borderTopWidth: 1,
    paddingTop: 16,
  },
  savedTitle: {
    fontFamily: fonts.label,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  savedInfo: { flex: 1 },
  savedName: {
    fontFamily: fonts.body,
    fontSize: 15,
  },
  savedAddress: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: 2,
  },
});
