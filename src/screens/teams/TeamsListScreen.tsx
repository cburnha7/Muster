import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, Spacing } from '../../theme';
import { FormSelect, SelectOption } from '../../components/forms/FormSelect';
import { TeamCard } from '../../components/ui/TeamCard';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { TabSearchModal, TabSearchResult } from '../../components/search/TabSearchModal';
import { teamService } from '../../services/api/TeamService';
import { userService } from '../../services/api/UserService';
import { setUserTeams } from '../../store/slices/teamsSlice';
import { Team, SportType } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useDependentContext } from '../../hooks/useDependentContext';
import { useActiveUserId } from '../../hooks/useActiveUserId';
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

export function TeamsListScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { user } = useAuth();
  const { isDependent } = useDependentContext();
  const effectiveUserId = useActiveUserId();

  const [myRosters, setMyRosters] = useState<Team[]>([]);
  const [publicRosters, setPublicRosters] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sportFilter, setSportFilter] = useState('');
  const [searchModalVisible, setSearchModalVisible] = useState(false);

  // Search modal toggle
  useEffect(() => {
    const unsub = searchEventBus.subscribeTab('Teams', () => setSearchModalVisible(true));
    const unsubClose = searchEventBus.subscribeClose(() => setSearchModalVisible(false));
    return () => { unsub(); unsubClose(); };
  }, []);

  // Load data
  const loadData = useCallback(async () => {
    try {
      const [myRes, allRes] = await Promise.all([
        userService.getUserTeams(),
        teamService.getTeams({}, { page: 1, limit: 100 }),
      ]);
      const myTeams = myRes?.data ?? [];
      const myTeamIds = new Set(myTeams.map((t) => t.id));
      setMyRosters(myTeams);
      dispatch(setUserTeams(myTeams));
      setPublicRosters((allRes?.data ?? []).filter((t) => t.isPublic && !myTeamIds.has(t.id)));
    } catch (err: any) {
      setError(err.message || 'Failed to load rosters');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dispatch]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));
  useEffect(() => { loadData(); }, [effectiveUserId]);

  const handleRefresh = useCallback(() => { setRefreshing(true); loadData(); }, [loadData]);

  // Unified list: my rosters + public rosters, filtered by sport
  const allRosters = useMemo(() => {
    const merged = [...myRosters, ...publicRosters];
    // Dedupe by id
    const seen = new Set<string>();
    const unique = merged.filter((t) => { if (seen.has(t.id)) return false; seen.add(t.id); return true; });
    // Sport filter
    const filtered = sportFilter
      ? unique.filter((t) => t.sportType === sportFilter || (t.sportTypes || []).includes(sportFilter as SportType))
      : unique;
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [myRosters, publicRosters, sportFilter]);

  const handleTeamPress = (team: Team) => (navigation as any).navigate('TeamDetails', { teamId: team.id });
  const handleCreateTeam = () => (navigation as any).navigate('CreateTeam');
  const handleJoinTeam = () => (navigation as any).navigate('JoinTeam');

  // Search modal handlers
  const handleSearchRosters = useCallback(async (query: string, sport: SportType | null): Promise<TabSearchResult[]> => {
    try {
      const filters: any = {};
      if (sport) filters.sportType = sport;
      const res = await teamService.getTeams(filters, { page: 1, limit: 30 });
      // Show only public rosters and rosters user is invited to
      const myIds = new Set(myRosters.map((t) => t.id));
      return (res.data || [])
        .filter((t: Team) => {
          const nameMatch = !query.trim() || t.name.toLowerCase().includes(query.toLowerCase());
          const isRelevant = t.isPublic || myIds.has(t.id);
          return nameMatch && isRelevant;
        })
        .map((t: Team) => ({ id: t.id, name: t.name, subtitle: t.sportType }));
    } catch { return []; }
  }, [myRosters]);

  const handleSearchResultPress = useCallback((result: TabSearchResult) => {
    (navigation as any).navigate('TeamDetails', { teamId: result.id });
  }, [navigation]);

  if (error && !myRosters.length && !publicRosters.length) {
    return <View style={styles.container}><ErrorDisplay message={error} onRetry={loadData} /></View>;
  }

  if (loading && !refreshing && !myRosters.length && !publicRosters.length) {
    return <View style={styles.container}><LoadingSpinner /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Sport filter */}
      <View style={styles.filterRow}>
        <FormSelect label="" options={SPORT_OPTIONS} value={sportFilter} onSelect={(o) => setSportFilter(String(o.value))} placeholder="All Sports" />
      </View>

      {/* Roster list */}
      <FlatList
        data={allRosters}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TeamCard team={item} onPress={() => handleTeamPress(item)} currentUserId={user?.id ?? undefined} />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.pine} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={40} color={colors.inkFaint} />
            <Text style={styles.emptyText}>No rosters found</Text>
          </View>
        }
      />

      {/* FAB — hidden for dependents */}
      {!isDependent && (
        <TouchableOpacity style={styles.fab} onPress={handleCreateTeam}>
          <Ionicons name="add" size={28} color={colors.chalk} />
        </TouchableOpacity>
      )}

      {/* Join with Code */}
      <TouchableOpacity style={[styles.joinButton, isDependent && { bottom: 20 }]} onPress={handleJoinTeam}>
        <Text style={styles.joinButtonText}>Join with Code</Text>
      </TouchableOpacity>

      <TabSearchModal
        visible={searchModalVisible}
        onClose={() => setSearchModalVisible(false)}
        title="Search Rosters"
        placeholder="Search by roster name..."
        onSearch={handleSearchRosters}
        onResultPress={handleSearchResultPress}
        createLabel="Create Roster"
        onCreatePress={handleCreateTeam}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  filterRow: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  listContent: {
    paddingBottom: 100,
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
    backgroundColor: colors.pine,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  joinButton: {
    position: 'absolute',
    bottom: 84,
    right: 16,
    backgroundColor: colors.pine,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 24,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  joinButtonText: {
    fontFamily: fonts.ui,
    color: colors.chalk,
    fontSize: 14,
  },
});
