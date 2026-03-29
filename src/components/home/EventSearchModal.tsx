import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { colors, fonts, Spacing } from '../../theme';
import { SportType } from '../../types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const PROXIMITY_OPTIONS = [5, 10, 25, 50, 100];

const SPORT_LABELS: Record<string, string> = {
  basketball: 'Basketball',
  pickleball: 'Pickleball',
  tennis: 'Tennis',
  soccer: 'Soccer',
  softball: 'Softball',
  baseball: 'Baseball',
  volleyball: 'Volleyball',
  flag_football: 'Flag Football',
  kickball: 'Kickball',
  other: 'Other',
};

export interface EventSearchParams {
  sportTypes: SportType[];
  locationQuery: string;
  latitude: number | null;
  longitude: number | null;
  radiusMiles: number;
}

interface EventSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSearch: (params: EventSearchParams) => void;
  onCreateEvent: () => void;
}

export function EventSearchModal({ visible, onClose, onSearch, onCreateEvent }: EventSearchModalProps) {
  const [selectedSports, setSelectedSports] = useState<SportType[]>([]);
  const [locationText, setLocationText] = useState('');
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [usingCurrentLocation, setUsingCurrentLocation] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [radiusMiles, setRadiusMiles] = useState(25);
  const [slideAnim] = useState(new Animated.Value(SCREEN_HEIGHT));

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      slideAnim.setValue(SCREEN_HEIGHT);
    }
  }, [visible]);

  const toggleSport = useCallback((sport: SportType) => {
    setSelectedSports((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport],
    );
  }, []);

  const handleUseCurrentLocation = useCallback(async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserLat(loc.coords.latitude);
      setUserLng(loc.coords.longitude);
      setUsingCurrentLocation(true);
      setLocationText('Current Location');
    } catch (err) {
      console.error('Location error:', err);
    }
    setLocationLoading(false);
  }, []);

  const handleLocationTextChange = useCallback((text: string) => {
    setLocationText(text);
    if (usingCurrentLocation) {
      setUsingCurrentLocation(false);
      setUserLat(null);
      setUserLng(null);
    }
  }, [usingCurrentLocation]);

  const handleReset = useCallback(() => {
    setSelectedSports([]);
    setLocationText('');
    setUserLat(null);
    setUserLng(null);
    setUsingCurrentLocation(false);
    setRadiusMiles(25);
  }, []);

  const handleSearch = useCallback(() => {
    onSearch({
      sportTypes: selectedSports,
      locationQuery: usingCurrentLocation ? '' : locationText.trim(),
      latitude: userLat,
      longitude: userLng,
      radiusMiles,
    });
  }, [selectedSports, locationText, userLat, userLng, radiusMiles, usingCurrentLocation, onSearch]);

  const activeSports = Object.values(SportType).filter(
    (s) => s !== SportType.BADMINTON && s !== SportType.HOCKEY,
  );

  return (
    <Modal visible={visible} animationType="none" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View style={[styles.modalContainer, { transform: [{ translateY: slideAnim }] }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close search" accessibilityRole="button">
              <Ionicons name="close" size={24} color={colors.ink} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Find a Game</Text>
            <TouchableOpacity onPress={handleReset} accessibilityLabel="Reset filters" accessibilityRole="button">
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
            {/* Sport multi-select */}
            <Text style={styles.fieldLabel}>Sport</Text>
            <View style={styles.chipContainer}>
              {activeSports.map((sport) => {
                const isSelected = selectedSports.includes(sport);
                return (
                  <TouchableOpacity
                    key={sport}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => toggleSport(sport)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isSelected }}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {SPORT_LABELS[sport] || sport}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Location */}
            <Text style={styles.fieldLabel}>Location</Text>
            <View style={styles.locationInputRow}>
              <Ionicons name="location-outline" size={20} color={colors.inkFaint} />
              <TextInput
                style={styles.locationInput}
                placeholder="City, state, or venue name"
                placeholderTextColor={colors.inkFaint}
                value={locationText}
                onChangeText={handleLocationTextChange}
                returnKeyType="done"
              />
            </View>
            <TouchableOpacity style={styles.currentLocationBtn} onPress={handleUseCurrentLocation} disabled={locationLoading} accessibilityRole="button">
              {locationLoading ? (
                <ActivityIndicator size="small" color={colors.cobalt} />
              ) : (
                <Ionicons name="navigate" size={18} color={colors.cobalt} />
              )}
              <Text style={styles.currentLocationText}>Use my current location</Text>
            </TouchableOpacity>

            {/* Proximity */}
            <Text style={styles.fieldLabel}>Proximity</Text>
            <View style={styles.chipContainer}>
              {PROXIMITY_OPTIONS.map((miles) => {
                const isSelected = radiusMiles === miles;
                return (
                  <TouchableOpacity
                    key={miles}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => setRadiusMiles(miles)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {miles} mi
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Create event */}
            <TouchableOpacity
              style={styles.createEventBtn}
              onPress={() => { onClose(); onCreateEvent(); }}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <Ionicons name="add-circle-outline" size={22} color={colors.cobalt} />
              <View style={styles.createEventInfo}>
                <Text style={styles.createEventTitle}>Create an Event</Text>
                <Text style={styles.createEventSub}>Can't find what you're looking for? Host your own.</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.inkFaint} />
            </TouchableOpacity>
          </ScrollView>

          {/* Search button */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.searchButton} onPress={handleSearch} activeOpacity={0.8} accessibilityRole="button">
              <Ionicons name="search" size={20} color="#FFFFFF" />
              <Text style={styles.searchButtonText}>Search</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.92,
    minHeight: SCREEN_HEIGHT * 0.75,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.white,
  },
  closeBtn: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.ink,
  },
  resetText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: colors.heart,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  fieldLabel: {
    fontFamily: fonts.label,
    fontSize: 14,
    color: colors.ink,
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  chipSelected: {
    backgroundColor: colors.cobalt,
    borderColor: colors.cobalt,
  },
  chipText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontFamily: fonts.label,
  },
  locationInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  locationInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
    marginLeft: Spacing.sm,
  },
  currentLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  currentLocationText: {
    fontFamily: fonts.label,
    fontSize: 14,
    color: colors.cobalt,
  },
  createEventBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginTop: Spacing.xxl,
    gap: 12,
    borderWidth: 1.5,
    borderColor: colors.cobalt + '30',
  },
  createEventInfo: {
    flex: 1,
  },
  createEventTitle: {
    fontFamily: fonts.label,
    fontSize: 15,
    color: colors.cobalt,
  },
  createEventSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkFaint,
    marginTop: 2,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.white,
    backgroundColor: colors.surface,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cobalt,
    borderRadius: 28,
    paddingVertical: 16,
    gap: Spacing.sm,
  },
  searchButtonText: {
    fontFamily: fonts.ui,
    fontSize: 16,
    color: '#FFFFFF',
  },
});
