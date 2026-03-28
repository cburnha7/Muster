import React, { useState, useEffect } from 'react';
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

const GENDER_OPTIONS: SelectOption[] = [
  { label: 'All Genders', value: '' },
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
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
  onSearch: (query: string, sport: SportType | null, gender?: string) => Promise<TabSearchResult[]>;
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
  const [selectedGender, setSelectedGender] = useState('');
  const [minAgeFilter, setMinAgeFilter] = useState('');
  const [maxAgeFilter, setMaxAgeFilter] = useState('');
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
      setSelectedGender('');
      setMinAgeFilter('');
      setMaxAgeFilter('');
      setResults([]);
    }
  }, [visible]);

  // Search — runs on every filter change and on open
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await onSearch(query, selectedSport, selectedGender || undefined);
        setResults(res);
      } catch { setResults([]); }
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, selectedSport, selectedGender, minAgeFilter, maxAgeFilter, visible]);

  if (!visible) return null;

  return (
    <View style={styles.container}>
      {/* Filters */}
      <View style={styles.filterRow}>
        <View style={{ flex: 1 }}>
          <FormSelect label="" options={SPORT_OPTIONS} value={selectedSport || ''} onSelect={(o) => setSelectedSport(o.value ? (o.value as SportType) : null)} placeholder="All Sports" />
        </View>
        <View style={{ flex: 1 }}>
          <FormSelect label="" options={GENDER_OPTIONS} value={selectedGender} onSelect={(o) => setSelectedGender(String(o.value))} placeholder="All Genders" />
        </View>
      </View>

      {/* Age filter */}
      <View style={styles.ageRow}>
        <TextInput style={styles.ageInput} placeholder="Min age" placeholderTextColor={colors.inkFaint} value={minAgeFilter} onChangeText={setMinAgeFilter} keyboardType="number-pad" />
        <TextInput style={styles.ageInput} placeholder="Max age" placeholderTextColor={colors.inkFaint} value={maxAgeFilter} onChangeText={setMaxAgeFilter} keyboardType="number-pad" />
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={colors.pine} /></View>
      ) : results.length === 0 ? (
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
    backgroundColor: colors.white,
    zIndex: 100,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  ageRow: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  ageInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.border,
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
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
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
