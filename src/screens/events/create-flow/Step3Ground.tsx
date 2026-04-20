import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { FormSelect, SelectOption } from '../../../components/forms/FormSelect';
import { useCreateEvent } from './CreateEventContext';
import { useAuth } from '../../../context/AuthContext';
import { facilityService } from '../../../services/api/FacilityService';
import { fonts, useTheme } from '../../../theme';

export function Step3Ground() {
  const { colors } = useTheme();
  const { state, dispatch } = useCreateEvent();
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const [facilities, setFacilities] = useState<
    { id: string; name: string; isOwned: boolean }[]
  >([]);
  const [loadingFacilities, setLoadingFacilities] = useState(false);
  const [facilityError, setFacilityError] = useState('');

  // Court state — wired to getCourtsForEvent API
  const [courts, setCourts] = useState<SelectOption[]>([]);
  const [loadingCourts, setLoadingCourts] = useState(false);
  const [courtError, setCourtError] = useState('');

  const loadFacilities = useCallback(async () => {
    if (!user?.id) return;
    setLoadingFacilities(true);
    setFacilityError('');
    try {
      const res = await facilityService.getAuthorizedFacilities(user.id);
      setFacilities(
        res.data.map(f => ({ id: f.id, name: f.name, isOwned: f.isOwned }))
      );
    } catch {
      setFacilityError('Could not load grounds. Tap to retry.');
    } finally {
      setLoadingFacilities(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadFacilities();
  }, [loadFacilities]);

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
    setCourtError('');
  };

  // Load courts when facility changes
  useEffect(() => {
    if (!state.facilityId || !user?.id) {
      setCourts([]);
      return;
    }
    setLoadingCourts(true);
    setCourtError('');
    facilityService
      .getCourtsForEvent(state.facilityId, user.id, state.sport ?? undefined)
      .then(res => {
        setCourts(
          res.data.map(c => ({
            label: `${c.name} (${c.availableSlotCount} slots)`,
            value: c.id,
          }))
        );
      })
      .catch(() => {
        setCourtError("Couldn't load courts. Try selecting the ground again.");
        setCourts([]);
      })
      .finally(() => setLoadingCourts(false));
  }, [state.facilityId, user?.id, state.sport]);

  const handleCourtSelect = (value: string | number | boolean) => {
    const court = courts.find(c => c.value === value);
    if (!court) return;
    dispatch({
      type: 'SET_COURT',
      courtId: String(court.value),
      courtName: court.label,
    });
  };

  const handleBookCourtTime = () => {
    navigation.navigate('Facilities', {
      screen: 'FacilitiesList',
      params: { openSearch: true },
    });
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bgScreen }]}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.heading}>Where's the game?</Text>

      {loadingFacilities ? (
        <ActivityIndicator
          size="small"
          color={colors.cobalt}
          style={styles.loader}
        />
      ) : facilityError ? (
        <TouchableOpacity onPress={loadFacilities}>
          <Text style={styles.errorText}>{facilityError}</Text>
        </TouchableOpacity>
      ) : (
        <FormSelect
          label="Ground"
          placeholder="Search for a ground"
          value={state.facilityId || undefined}
          options={facilityOptions}
          onValueChange={handleFacilitySelect}
        />
      )}

      {state.facilityId !== '' && (
        <>
          {loadingCourts ? (
            <ActivityIndicator
              size="small"
              color={colors.cobalt}
              style={styles.loader}
            />
          ) : courtError ? (
            <Text style={styles.errorText}>{courtError}</Text>
          ) : (
            <FormSelect
              label="Court"
              placeholder="Select a court"
              value={state.courtId || undefined}
              options={courts}
              onValueChange={handleCourtSelect}
              disabled={courts.length === 0}
            />
          )}
        </>
      )}

      <TouchableOpacity
        style={styles.bookButton}
        onPress={handleBookCourtTime}
        activeOpacity={0.8}
      >
        <Ionicons name="calendar-outline" size={20} color={colors.cobalt} />
        <Text style={styles.bookButtonText}>Book Court Time</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  heading: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: colors.ink,
    marginBottom: 24,
  },
  loader: {
    marginVertical: 16,
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.heart,
    textAlign: 'center',
    marginVertical: 16,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cobalt,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 24,
    gap: 8,
  },
  bookButtonText: {
    fontFamily: fonts.ui,
    fontSize: 16,
    color: colors.cobalt,
  },
});
