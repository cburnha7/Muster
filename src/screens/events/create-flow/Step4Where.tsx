import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { FormSelect, SelectOption } from '../../../components/forms/FormSelect';
import { useCreateEvent } from './CreateEventContext';
import { useAuth } from '../../../context/AuthContext';
import { facilityService } from '../../../services/api/FacilityService';
import { colors, fonts } from '../../../theme';

const SCREEN_WIDTH = Dimensions.get('window').width;

export function Step4Where() {
  const { state, dispatch } = useCreateEvent();
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const isMuster = state.locationMode === 'muster';
  const isOpen = state.locationMode === 'open';
  const isRecurring = state.recurring && state.occurrenceLocations.length > 1;

  const [facilities, setFacilities] = useState<
    { id: string; name: string; isOwned: boolean }[]
  >([]);
  const [loadingFacilities, setLoadingFacilities] = useState(false);
  const [courts, setCourts] = useState<SelectOption[]>([]);
  const [loadingCourts, setLoadingCourts] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

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

  useEffect(() => {
    if (!state.facilityId || !user?.id || !isMuster) {
      setCourts([]);
      return;
    }
    setLoadingCourts(true);
    facilityService
      .getCourtsForEvent(state.facilityId, user.id, state.sport ?? undefined)
      .then((res: any) => {
        setCourts(
          res.data.map((c: any) => ({
            label: c.name,
            value: c.id,
          }))
        );
      })
      .catch(() => setCourts([]))
      .finally(() => setLoadingCourts(false));
  }, [state.facilityId, user?.id, state.sport, isMuster]);

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
  };

  const handleCourtSelect = (value: string | number | boolean) => {
    const court = courts.find(c => c.value === value);
    if (!court) return;
    dispatch({
      type: 'SET_COURT',
      courtId: String(court.value),
      courtName: court.label,
    });
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
      },
    });
  };

  const fmtTime = (d: Date): string =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const fmtDisplayTime = (d: Date | null): string => {
    if (!d) return '';
    const h12 = d.getHours() % 12 || 12;
    return `${h12}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() >= 12 ? 'PM' : 'AM'}`;
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
              color={colors.cobalt}
              style={styles.loader}
            />
          ) : (
            <FormSelect
              label="Ground"
              placeholder="Select a ground"
              value={state.facilityId || undefined}
              options={facilityOptions}
              onValueChange={handleFacilitySelect}
            />
          )}

          {state.facilityId !== '' &&
            (loadingCourts ? (
              <ActivityIndicator
                size="small"
                color={colors.cobalt}
                style={styles.loader}
              />
            ) : (
              <FormSelect
                label="Court"
                placeholder="Select a court"
                value={state.courtId || undefined}
                options={courts}
                onValueChange={handleCourtSelect}
                disabled={courts.length === 0}
              />
            ))}

          {isRecurring ? (
            <>
              <Text style={styles.sectionLabel}>Event Occurrences</Text>
              <ScrollView
                ref={scrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={e =>
                  setCardIndex(
                    Math.round(
                      e.nativeEvent.contentOffset.x / (SCREEN_WIDTH - 40)
                    )
                  )
                }
                style={styles.cardScroller}
              >
                {state.occurrenceLocations.map((occ, i) => (
                  <View
                    key={occ.date}
                    style={[styles.occCard, { width: SCREEN_WIDTH - 40 }]}
                  >
                    <Text style={styles.occNumber}>
                      Event {i + 1} of {state.occurrenceLocations.length}
                    </Text>
                    <Text style={styles.occDate}>{occ.date}</Text>
                    <Text style={styles.occTime}>
                      {fmtDisplayTime(state.startTime)} –{' '}
                      {fmtDisplayTime(state.endTime)}
                    </Text>
                    {occ.booked && occ.facilityName ? (
                      <View style={styles.occBooked}>
                        <Ionicons
                          name="checkmark-circle"
                          size={16}
                          color={colors.pine}
                        />
                        <Text style={styles.occBookedText}>
                          {occ.facilityName}
                          {occ.courtName ? ` — ${occ.courtName}` : ''}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.occUnbooked}>
                        No location selected
                      </Text>
                    )}
                    <TouchableOpacity
                      style={styles.needCourtBtn}
                      onPress={() => handleNeedCourt(occ.date)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="search-outline"
                        size={16}
                        color={colors.cobalt}
                      />
                      <Text style={styles.needCourtBtnText}>Need a court?</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
              <View style={styles.dotsRow}>
                {state.occurrenceLocations.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.dot, i === cardIndex && styles.dotActive]}
                  />
                ))}
              </View>
            </>
          ) : (
            <TouchableOpacity
              style={styles.needCourtBtn}
              onPress={() => handleNeedCourt()}
              activeOpacity={0.8}
            >
              <Ionicons name="search-outline" size={16} color={colors.cobalt} />
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
  modeBtnActive: { backgroundColor: colors.cobalt, borderColor: colors.cobalt },
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
  cardScroller: { marginHorizontal: -20 },
  occCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  occNumber: {
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  occDate: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.ink,
    marginTop: 4,
  },
  occTime: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.inkSoft,
    marginTop: 2,
    marginBottom: 12,
  },
  occBooked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  occBookedText: { fontFamily: fonts.body, fontSize: 14, color: colors.pine },
  occUnbooked: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkSoft,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  needCourtBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.cobalt,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 16,
  },
  needCourtBtnText: {
    fontFamily: fonts.ui,
    fontSize: 15,
    color: colors.cobalt,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    marginBottom: 16,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.cobalt, width: 20 },
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
