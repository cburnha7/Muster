import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FormSelect, SelectOption } from '../forms/FormSelect';
import { colors, fonts, Spacing } from '../../theme';
import { SportType } from '../../types';
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
  { label: 'Other', value: SportType.OTHER },
];

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
  createLabel?: string;
  onCreatePress?: () => void;
}

export function TabSearchModal({
  visible,
  onClose,
  title,
  placeholder,
  onSearch,
  onResultPress,
  createLabel,
  onCreatePress,
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
      {/* Sport filter */}
      <View style={styles.filterRow}>
        <FormSelect
          label=""
          options={SPORT_OPTIONS}
          value={selectedSport || ''}
          onSelect={(o) => setSelectedSport(o.value ? (o.value as SportType) : null)}
          placeholder="All Sports"
        />
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

      {/* Create button */}
      {createLabel && onCreatePress && (
        <TouchableOpacity style={styles.createBtn} onPress={onCreatePress} activeOpacity={0.85}>
          <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
          <Text style={styles.createBtnText}>{createLabel}</Text>
        </TouchableOpacity>
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
    bottom: 0,
    backgroundColor: colors.cream,
    zIndex: 100,
  },
  filterRow: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
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
