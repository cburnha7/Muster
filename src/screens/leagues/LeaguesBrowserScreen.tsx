import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { LeagueCard } from '../../components/ui/LeagueCard';
import { FormSelect, SelectOption } from '../../components/forms/FormSelect';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { TabSearchModal, TabSearchResult } from '../../components/search/TabSearchModal';
import { colors, fonts, Spacing } from '../../theme';
import { leagueService } from '../../services/api/LeagueService';
import { userService } from '../../services/api/UserService';
import { selectUser } from '../../store/slices/authSlice';
import { selectActiveUserId } from '../../store/slices/contextSlice';
import { SportType } from '../../types';
import { searchEventBus } from '../../utils/searchEventBus';
import { useDependentContext } from '../../hooks/useDependentContext';

type LeagueItem = any;

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

export function LeaguesBrowserScreen() {
  const navigation = useNavigation();
  const currentUser = useSelector(selectUser);
  const activeUserId = useSelector(selectActiveUserId);
  const { isDependent } = useDependentContext();

  const [myLeagues, setMyLeagues] = useState<LeagueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sportFilter, setSportFilter] = useState('');
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [pastModalVisible, setPastModalVisible] = useState(false);

  // Search modal toggle
  useEffect(() => {
    const unsub = searchEventBus.subscribeTab('Leagues', () => setSearchModalVisible(true));
    const unsubClose = searchEventBus.subscribeClose(() => { setSearchModalVisible(false); setPastModalVisible(false); });
    return () => { unsub(); unsubClose(); };
  }, []);

  const loadData = useCallback(async () => {
    try {
      const res = await leagueService.getLeagues({ page: 1, limit: 100 });
      setMyLeagues(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load leagues');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));
  useEffect(() => { loadData(); }, [activeUserId]);

  const handleRefresh = useCallback(() => { setRefreshing(true); loadData(); }, [loadData]);

  // Split into active and past
  const { activeLeagues, pastLeagues } = useMemo(() => {
    const now = new Date();
    let filtered = myLeagues;
    if (sportFilter) filtered = filtered.filter((l) => l.sportType === sportFilter);

    const active: LeagueItem[] = [];
    const past: LeagueItem[] = [];
    filtered.forEach((l) => {
      if (l.endDate && new Date(l.endDate) < now) {
        past.push(l);
      } else {
        active.push(l);
      }
    });
    return {
      activeLeagues: active.sort((a: LeagueItem, b: LeagueItem) => a.name.localeCompare(b.name)),
      pastLeagues: past.sort((a: LeagueItem, b: LeagueItem) => a.name.localeCompare(b.name)),
    };
  }, [myLeagues, sportFilter]);

  const handleLeaguePress = (league: LeagueItem) => {
    (navigation as any).navigate('LeagueDetails', { leagueId: league.id });
  };

  const handleCreateLeague = () => {
    (navigation as any).navigate('CreateLeague');
  };

  // Search modal handlers
  const handleSearchLeagues = useCallback(async (query: string, sport: SportType | null): Promise<TabSearchResult[]> => {
    try {
      const res = await leagueService.getLeagues({ page: 1, limit: 30 });
      return (res.data || [])
        .filter((l: LeagueItem) => {
          const nameMatch = !query.trim() || l.name.toLowerCase().includes(query.toLowerCase());
          const sportMatch = !sport || l.sportType === sport;
          return nameMatch && sportMatch;
        })
        .map((l: LeagueItem) => ({ id: l.id, name: l.seasonName || l.name, subtitle: l.sportType }));
    } catch { return []; }
  }, []);

  const handleSearchResultPress = useCallback((result: TabSearchResult) => {
    (navigation as any).navigate('LeagueDetails', { leagueId: result.id });
  }, [navigation]);

  if (error && !myLeagues.length) {
    return <View style={styles.container}><ErrorDisplay message={error} onRetry={loadData} /></View>;
  }

  if (loading && !refreshing && !myLeagues.length) {
    return <View style={styles.container}><LoadingSpinner /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Sport filter */}
      <View style={styles.filterRow}>
        <FormSelect label="" options={SPORT_OPTIONS} value={sportFilter} onSelect={(o) => setSportFilter(String(o.value))} placeholder="All Sports" />
      </View>

      {/* Active leagues */}
      <FlatList
        data={activeLeagues}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <LeagueCard league={item} onPress={() => handleLeaguePress(item)} isOwner={item.organizerId === currentUser?.id} />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.cobalt} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="trophy-outline" size={40} color={colors.inkFaint} />
            <Text style={styles.emptyText}>No active leagues</Text>
          </View>
        }
        ListFooterComponent={
          pastLeagues.length > 0 ? (
            <TouchableOpacity style={styles.pastBtn} onPress={() => setPastModalVisible(true)} activeOpacity={0.7}>
              <Ionicons name="time-outline" size={18} color={colors.cobalt} />
              <Text style={styles.pastBtnText}>Past Seasons</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
            </TouchableOpacity>
          ) : null
        }
      />

      {/* FAB */}
      {!isDependent && (
        <TouchableOpacity style={styles.fab} onPress={handleCreateLeague}>
          <Ionicons name="add" size={28} color={colors.surface} />
        </TouchableOpacity>
      )}

      <TabSearchModal
        visible={searchModalVisible}
        onClose={() => setSearchModalVisible(false)}
        title="Search Leagues"
        placeholder="Looking for a league?"
        onSearch={handleSearchLeagues}
        onResultPress={handleSearchResultPress}
        createLabel="Create League"
        onCreatePress={handleCreateLeague}
      />

      {/* Past Seasons modal */}
      <Modal visible={pastModalVisible} transparent animationType="fade" onRequestClose={() => setPastModalVisible(false)}>
        <Pressable style={styles.pastBackdrop} onPress={() => setPastModalVisible(false)}>
          <View style={styles.pastModal}>
            <View style={styles.pastHeader}>
              <Text style={styles.pastTitle}>Past Seasons</Text>
              <TouchableOpacity onPress={() => setPastModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.ink} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pastScroll} showsVerticalScrollIndicator={false}>
              {pastLeagues.map((league) => (
                <LeagueCard
                  key={league.id}
                  league={league}
                  onPress={() => { setPastModalVisible(false); handleLeaguePress(league); }}
                  isOwner={league.organizerId === currentUser?.id}
                />
              ))}
              {pastLeagues.length === 0 && (
                <Text style={styles.emptyText}>No past seasons</Text>
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  filterRow: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  listContent: {
    paddingBottom: 100,
  },
  pastBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  pastBtnText: {
    flex: 1,
    fontFamily: fonts.label,
    fontSize: 15,
    color: colors.cobalt,
  },
  pastBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 70,
  },
  pastModal: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    maxHeight: '80%',
    overflow: 'hidden',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  pastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.white,
  },
  pastTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.ink,
  },
  pastScroll: {
    paddingVertical: 8,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.inkFaint,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.cobalt,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
});
