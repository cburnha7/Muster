import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, Spacing } from '../../theme';
import { SportType } from '../../types';
import { searchEventBus } from '../../utils/searchEventBus';

const TAB_BAR_HEIGHT = 60;

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

const ACTIVE_SPORTS = Object.values(SportType).filter(
  (s) => s !== SportType.BADMINTON && s !== SportType.HOCKEY,
);

export interface TabSearchResult {
  id: string;
  name: string;
  subtitle?: string;
}

interface TabSearchModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  placeholder: string;
  onSearch: (query: string, sport: SportType | null) => Promise<TabSearchResult[]>;
  onResultPress: (result: TabSearchResult) => void;
}

export function TabSearchModal({
  visible,
  onClose,
  title,
  placeholder,
  onSearch,
  onResultPress,
}: TabSearchModalProps) {
  const [query, setQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState<SportType | null>(null);
  const [results, setResults] = useState<TabSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Listen for query from header pill
  useEffect(() => {
    const unsub = searchEventBus.subscribeQuery((q) => setQuery(q));
    return unsub;
  }, []);

  // Reset when hidden
  useEffect(() => {
    if (!visible) {
      setQuery('');
      setSelectedSport(null);
      setResults([]);
    }
  }, [visible]);

  // Debounced search
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(async () => {
      if (!query.trim() && !selectedSport) { setResults([]); return; }
      setLoading(true);
      try {
        const res = await onSearch(query, selectedSport);
        setResults(res);
      } catch { setResults([]); }
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, selectedSport, visible]);

  if (!visible) return null;

  return (
    <View style={styles.container}>
      {/* Sport filter chips */}
      <View style={styles.chipScroll}>
        <TouchableOpacity
          style={[styles.chip, !selectedSport && styles.chipSelected]}
          onPress={() => setSelectedSport(null)}
        >
          <Text style={[styles.chipText, !selectedSport && styles.chipTextSelected]}>All</Text>
        </TouchableOpacity>
        {ACTIVE_SPORTS.map((sport) => {
          const active = selectedSport === sport;
          return (
            <TouchableOpacity
              key={sport}
              style={[styles.chip, active && styles.chipSelected]}
              onPress={() => setSelectedSport(active ? null : sport)}
            >
              <Text style={[styles.chipText, active && styles.chipTextSelected]}>
                {SPORT_LABELS[sport] || sport}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={colors.pine} /></View>
      ) : results.length === 0 && (query.trim() || selectedSport) ? (
        <View style={styles.centered}>
          <Ionicons name="search-outline" size={40} color={colors.inkFaint} />
          <Text style={styles.emptyText}>No results found</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.resultRow} onPress={() => { onResultPress(item); onClose(); }} activeOpacity={0.7}>
              <View style={styles.resultBody}>
                <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
                {item.subtitle && <Text style={styles.resultSub} numberOfLines={1}>{item.subtitle}</Text>}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: TAB_BAR_HEIGHT,
    backgroundColor: colors.cream,
    zIndex: 100,
  },
  chipScroll: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.cream,
  },
  chipSelected: {
    backgroundColor: colors.pine,
    borderColor: colors.pine,
  },
  chipText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ink,
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontFamily: fonts.label,
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
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: Spacing.lg,
    marginBottom: 6,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  resultBody: {
    flex: 1,
  },
  resultName: {
    fontFamily: fonts.label,
    fontSize: 15,
    color: colors.ink,
  },
  resultSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkFaint,
    marginTop: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
});
