import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { EventCard } from '../ui/EventCard';
import { FormSelect, SelectOption } from '../forms/FormSelect';
import { colors, fonts, Spacing } from '../../theme';
import { Event, SportType, EventType, EventStatus } from '../../types';
import { eventService } from '../../services/api/EventService';

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

interface EventSearchPanelProps {
  visible: boolean;
  onCreateEvent: () => void;
  onEventPress: (event: Event) => void;
}

export function EventSearchPanel({ visible, onCreateEvent, onEventPress }: EventSearchPanelProps) {
  const [query, setQuery] = useState('');
  const [sportFilter, setSportFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [results, setResults] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);

  const hasFilters = query.trim() !== '' || sportFilter !== '' || typeFilter !== '';

  // Live search — fires on every change
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const filters: any = {
          status: EventStatus.ACTIVE,
        };
        if (sportFilter) filters.sportType = sportFilter;

        const res = await eventService.getEvents(
          filters,
          { page: 1, limit: 30 },
        );
        let filtered = res.data || [];

        // Client-side text filter
        if (query.trim()) {
          const q = query.toLowerCase();
          filtered = filtered.filter((e: Event) =>
            e.title.toLowerCase().includes(q) ||
            e.facility?.name?.toLowerCase().includes(q) ||
            e.description?.toLowerCase().includes(q)
          );
        }

        // Client-side event type filter
        if (typeFilter) {
          filtered = filtered.filter((e: Event) => e.eventType === typeFilter);
        }

        // Sort soonest first
        const now = new Date();
        filtered = filtered
          .filter((e: Event) => new Date(e.startTime) >= now)
          .sort((a: Event, b: Event) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

        setResults(filtered);
      } catch {
        setResults([]);
      }
      setLoading(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, sportFilter, typeFilter, visible]);

  const handleReset = useCallback(() => {
    setQuery('');
    setSportFilter('');
    setTypeFilter('');
  }, []);

  if (!visible) return null;

  return (
    <View style={styles.container}>
      {/* Search input */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={colors.inkFaint} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search events, venues..."
          placeholderTextColor={colors.inkFaint}
          value={query}
          onChangeText={setQuery}
          autoFocus
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.inkFaint} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        <View style={{ flex: 1 }}>
          <FormSelect label="" options={SPORT_OPTIONS} value={sportFilter} onSelect={(o) => setSportFilter(String(o.value))} placeholder="Sport" />
        </View>
        <View style={{ flex: 1 }}>
          <FormSelect label="" options={EVENT_TYPE_OPTIONS} value={typeFilter} onSelect={(o) => setTypeFilter(String(o.value))} placeholder="Type" />
        </View>
      </View>

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
          renderItem={({ item }) => (
            <EventCard event={item} onPress={onEventPress} compact />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Create Event button pinned at bottom */}
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.cream,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
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
