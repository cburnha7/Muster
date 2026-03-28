import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { EventCard } from '../ui/EventCard';
import { FormSelect, SelectOption } from '../forms/FormSelect';
import { colors, fonts, Spacing } from '../../theme';
import { Event, SportType, EventType, EventStatus } from '../../types';
import { eventService } from '../../services/api/EventService';
import { searchEventBus } from '../../utils/searchEventBus';

const SPORT_OPTIONS: SelectOption[] = [
  { label: 'All Sports', value: '' },
  { label: 'Basketball', value: SportType.BASKETBALL },
  { label: 'Pickleball', value: SportType.PICKLEBALL },
  { label: 'Tennis', value: SportType.TENNIS },
  { label: 'Soccer', value: SportType.SOCCER },
  { label: 'Softball', value: SportType.SOFTBALL },
  { label: 'Baseball', value: SportType.BASEBALL },
  { label: 'Volleyball', value: SportType.VOLLEYBALL },
  { label: 'Flag Football', value: SportType.FLAG_FOOTBALL },
  { label: 'Kickball', value: SportType.KICKBALL },
];

const EVENT_TYPE_OPTIONS: SelectOption[] = [
  { label: 'All Types', value: '' },
  { label: 'Game', value: EventType.GAME },
  { label: 'Practice', value: EventType.PRACTICE },
  { label: 'Pickup', value: EventType.PICKUP },
];

const PROXIMITY_OPTIONS = [5, 10, 25, 50, 100];

interface EventSearchPanelProps {
  visible: boolean;
  onCreateEvent: () => void;
  onEventPress: (event: Event) => void;
}

export function EventSearchPanel({ visible, onCreateEvent, onEventPress }: EventSearchPanelProps) {
  const [query, setQuery] = useState('');
  const [sportFilter, setSportFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [locationText, setLocationText] = useState('');
  const [radiusMiles, setRadiusMiles] = useState(25);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [results, setResults] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);

  const hasFilters = query.trim() !== '' || sportFilter !== '' || typeFilter !== '' || locationText !== '';

  // Listen for query changes from the header pill
  useEffect(() => {
    const unsub = searchEventBus.subscribeQuery((q) => setQuery(q));
    return unsub;
  }, []);

  // Reset when panel closes
  useEffect(() => {
    if (!visible) {
      setQuery('');
      setSportFilter('');
      setTypeFilter('');
      setLocationText('');
      setUserLat(null);
      setUserLng(null);
      setResults([]);
    }
  }, [visible]);

  // Live search
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const filters: any = { status: EventStatus.ACTIVE };
        if (sportFilter) filters.sportType = sportFilter;
        const res = await eventService.getEvents(filters, { page: 1, limit: 40 });
        let filtered = res.data || [];

        // Text filter
        if (query.trim()) {
          const q = query.toLowerCase();
          filtered = filtered.filter((e: Event) =>
            e.title.toLowerCase().includes(q) ||
            e.facility?.name?.toLowerCase().includes(q) ||
            e.description?.toLowerCase().includes(q)
          );
        }
        // Event type filter
        if (typeFilter) filtered = filtered.filter((e: Event) => e.eventType === typeFilter);

        // Location filter (client-side distance calc if we have coords)
        if (userLat != null && userLng != null) {
          filtered = filtered.filter((e: Event) => {
            if (!e.facility?.latitude || !e.facility?.longitude) return true;
            const dLat = ((e.facility.latitude - userLat) * Math.PI) / 180;
            const dLng = ((e.facility.longitude - userLng) * Math.PI) / 180;
            const a = Math.sin(dLat / 2) ** 2 + Math.cos((userLat * Math.PI) / 180) * Math.cos((e.facility.latitude * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
            const distMiles = 3959 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return distMiles <= radiusMiles;
          });
        }

        // Sort soonest first
        const now = new Date();
        filtered = filtered
          .filter((e: Event) => new Date(e.startTime) >= now)
          .sort((a: Event, b: Event) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

        setResults(filtered);
      } catch { setResults([]); }
      setLoading(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, sportFilter, typeFilter, visible, userLat, userLng, radiusMiles]);

  const handleUseCurrentLocation = useCallback(async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setLocationLoading(false); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserLat(loc.coords.latitude);
      setUserLng(loc.coords.longitude);
      setLocationText('Current Location');
    } catch {}
    setLocationLoading(false);
  }, []);

  const handleReset = useCallback(() => {
    setQuery('');
    setSportFilter('');
    setTypeFilter('');
    setLocationText('');
    setUserLat(null);
    setUserLng(null);
    setRadiusMiles(25);
    searchEventBus.emitQuery('');
  }, []);

  if (!visible) return null;

  return (
    <View style={styles.container}>
      {/* Filters */}
      <View style={styles.filterRow}>
        <View style={{ flex: 1 }}>
          <FormSelect label="" options={SPORT_OPTIONS} value={sportFilter} onSelect={(o) => setSportFilter(String(o.value))} placeholder="Sport" />
        </View>
        <View style={{ flex: 1 }}>
          <FormSelect label="" options={EVENT_TYPE_OPTIONS} value={typeFilter} onSelect={(o) => setTypeFilter(String(o.value))} placeholder="Type" />
        </View>
      </View>

      {/* Location */}
      <View style={styles.locationRow}>
        <View style={styles.locationInput}>
          <Ionicons name="location-outline" size={16} color={colors.inkFaint} />
          <TextInput
            style={styles.locationText}
            placeholder="City or venue"
            placeholderTextColor={colors.inkFaint}
            value={locationText}
            onChangeText={(t) => { setLocationText(t); if (userLat) { setUserLat(null); setUserLng(null); } }}
          />
        </View>
        <TouchableOpacity style={styles.gpsBtn} onPress={handleUseCurrentLocation} disabled={locationLoading}>
          {locationLoading ? (
            <ActivityIndicator size="small" color={colors.pine} />
          ) : (
            <Ionicons name="navigate" size={16} color={colors.pine} />
          )}
        </TouchableOpacity>
      </View>

      {/* Proximity chips */}
      {(userLat != null || locationText.trim()) && (
        <View style={styles.proximityRow}>
          {PROXIMITY_OPTIONS.map((mi) => {
            const active = radiusMiles === mi;
            return (
              <TouchableOpacity key={mi} style={[styles.proxChip, active && styles.proxChipActive]} onPress={() => setRadiusMiles(mi)}>
                <Text style={[styles.proxChipText, active && styles.proxChipTextActive]}>{mi} mi</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Reset link */}
      {hasFilters && (
        <TouchableOpacity onPress={handleReset} style={styles.resetRow}>
          <Text style={styles.resetText}>Reset Filters</Text>
        </TouchableOpacity>
      )}

      {/* Results */}
      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={colors.pine} /></View>
      ) : results.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="search-outline" size={40} color={colors.inkFaint} />
          <Text style={styles.emptyText}>{hasFilters ? 'No games found' : 'Start searching for games'}</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <EventCard event={item} onPress={onEventPress} compact />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Create Event pinned at bottom */}
      <TouchableOpacity style={styles.createBtn} onPress={onCreateEvent} activeOpacity={0.85}>
        <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
        <Text style={styles.createBtnText}>Create Event</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.cream,
    zIndex: 50,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    gap: 8,
  },
  locationInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.cream,
  },
  locationText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
  },
  gpsBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.cream,
  },
  proximityRow: {
    flexDirection: 'row',
    gap: 6,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
  },
  proxChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.cream,
  },
  proxChipActive: {
    backgroundColor: colors.pine,
    borderColor: colors.pine,
  },
  proxChipText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.ink,
  },
  proxChipTextActive: {
    color: '#FFFFFF',
    fontFamily: fonts.label,
  },
  resetRow: {
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  resetText: {
    fontFamily: fonts.label,
    fontSize: 13,
    color: colors.heart,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.inkFaint,
  },
  listContent: {
    paddingBottom: 80,
  },
  createBtn: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.pine,
    paddingVertical: 16,
    gap: 8,
  },
  createBtnText: {
    fontFamily: fonts.ui,
    fontSize: 16,
    color: '#FFFFFF',
  },
});
