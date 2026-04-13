import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, Spacing } from '../../theme';
import { TeamCard } from '../../components/ui/TeamCard';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { SkeletonRow } from '../../components/ui/SkeletonBox';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import {
  TabSearchModal,
  TabSearchResult,
} from '../../components/search/TabSearchModal';
import { teamService } from '../../services/api/TeamService';
import { userService } from '../../services/api/UserService';
import { setUserTeams } from '../../store/slices/teamsSlice';
import { Team, SportType } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useDependentContext } from '../../hooks/useDependentContext';
import { useActiveUserId } from '../../hooks/useActiveUserId';
import { searchEventBus } from '../../utils/searchEventBus';
import { MyCrewRow } from '../../components/home/MyCrewRow';
import { useCrewSelector } from '../../hooks/useCrewSelector';

const SPORTS: { label: string; value: string; icon: string }[] = [
  { label: 'All', value: '', icon: 'apps-outline' },
  { label: 'Baseball', value: SportType.BASEBALL, icon: 'baseball-outline' },
  {
    label: 'Basketball',
    value: SportType.BASKETBALL,
    icon: 'basketball-outline',
  },
  {
    label: 'Flag Football',
    value: SportType.FLAG_FOOTBALL,
    icon: 'flag-outline',
  },
  { label: 'Kickball', value: SportType.KICKBALL, icon: 'fitness-outline' },
  {
    label: 'Pickleball',
    value: SportType.PICKLEBALL,
    icon: 'tennisball-outline',
  },
  { label: 'Soccer', value: SportType.SOCCER, icon: 'football-outline' },
  { label: 'Softball', value: SportType.SOFTBALL, icon: 'baseball-outline' },
  { label: 'Tennis', value: SportType.TENNIS, icon: 'tennisball-outline' },
  {
    label: 'Volleyball',
    value: SportType.VOLLEYBALL,
    icon: 'american-football-outline',
  },
];

export function TeamsListScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { user } = useAuth();
  const { isDependent } = useDependentContext();
  const effectiveUserId = useActiveUserId();
  const { width: screenWidth } = useWindowDimensions();
  const isWide = screenWidth > 600;
  const { crewMembers, selectedCrewId, onSelectCrew, hasDependents } =
    useCrewSelector();

  const [myRosters, setMyRosters] = useState<Team[]>([]);
  const [publicRosters, setPublicRosters] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sportFilter, setSportFilter] = useState('');
  const [searchModalVisible, setSearchModalVisible] = useState(false);

  useEffect(() => {
    const unsub = searchEventBus.subscribeTab('Teams', () =>
      setSearchModalVisible(true)
    );
    const unsubClose = searchEventBus.subscribeClose(() =>
      setSearchModalVisible(false)
    );
    return () => {
      unsub();
      unsubClose();
    };
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [myRes, allRes] = await Promise.all([
        userService.getUserTeams(),
        teamService.getTeams({}, { page: 1, limit: 100 }),
      ]);
      const myTeams = myRes?.data ?? [];
      const myTeamIds = new Set(myTeams.map(t => t.id));
      setMyRosters(myTeams);
      dispatch(setUserTeams(myTeams));
      setPublicRosters(
        (allRes?.data ?? []).filter(t => t.isPublic && !myTeamIds.has(t.id))
      );
    } catch (err: any) {
      setError(err.message || 'Failed to load rosters');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );
  useEffect(() => {
    loadData();
  }, [effectiveUserId]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const allTeams = useMemo(() => {
    const merged = [...myRosters, ...publicRosters];
    const seen = new Set<string>();
    const unique = merged.filter(t => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
    const filtered = sportFilter
      ? unique.filter(
          t =>
            t.sportType === sportFilter ||
            (t.sportTypes || []).includes(sportFilter as SportType)
        )
      : unique;
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [myRosters, publicRosters, sportFilter]);

  // Split into my teams and others
  const myTeamIds = useMemo(
    () => new Set(myRosters.map(t => t.id)),
    [myRosters]
  );
  const myTeams = useMemo(
    () => allTeams.filter(t => myTeamIds.has(t.id)),
    [allTeams, myTeamIds]
  );
  const otherTeams = useMemo(
    () => allTeams.filter(t => !myTeamIds.has(t.id)),
    [allTeams, myTeamIds]
  );

  const handleTeamPress = (team: Team) =>
    (navigation as any).navigate('TeamDetails', { teamId: team.id });
  const handleCreateTeam = () => (navigation as any).navigate('CreateTeam');
  const handleJoinTeam = () => (navigation as any).navigate('JoinTeam');

  const handleSearchRosters = useCallback(
    async (
      query: string,
      sport: SportType | null
    ): Promise<TabSearchResult[]> => {
      try {
        const filters: any = {};
        if (sport) filters.sportType = sport;
        const res = await teamService.getTeams(filters, { page: 1, limit: 30 });
        const myIds = new Set(myRosters.map(t => t.id));
        return (res.data || [])
          .filter((t: Team) => {
            const nameMatch =
              !query.trim() ||
              t.name.toLowerCase().includes(query.toLowerCase());
            const isRelevant = t.isPublic || myIds.has(t.id);
            return nameMatch && isRelevant;
          })
          .map((t: Team) => ({
            id: t.id,
            name: t.name,
            subtitle: t.sportType,
          }));
      } catch {
        return [];
      }
    },
    [myRosters]
  );

  const handleSearchResultPress = useCallback(
    (result: TabSearchResult) => {
      (navigation as any).navigate('TeamDetails', { teamId: result.id });
    },
    [navigation]
  );

  if (error && !myRosters.length && !publicRosters.length) {
    return (
      <View style={styles.container}>
        <ErrorDisplay message={error} onRetry={loadData} />
      </View>
    );
  }

  if (loading && !refreshing && !myRosters.length && !publicRosters.length) {
    return (
      <View style={styles.container}>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </View>
    );
  }

  const renderHeader = () => (
    <>
      {/* Family crew selector */}
      {hasDependents && (
        <MyCrewRow
          members={crewMembers}
          selectedId={selectedCrewId}
          onSelect={onSelectCrew}
        />
      )}

      {/* Sport filter chips */}
      <FlatList
        horizontal
        data={SPORTS}
        keyExtractor={item => item.value}
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={styles.chipRow}
        renderItem={({ item }) => {
          const isActive = sportFilter === item.value;
          return (
            <TouchableOpacity
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => setSportFilter(item.value)}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.chipText, isActive && styles.chipTextActive]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* My Teams section */}
      {myTeams.length > 0 && (
        <Text style={styles.sectionTitle}>My Rosters</Text>
      )}
    </>
  );

  const renderFooter = () => (
    <>
      {/* Other teams section */}
      {otherTeams.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Discover</Text>
          {otherTeams.map(team => (
            <TeamCard
              key={team.id}
              team={team}
              onPress={() => handleTeamPress(team)}
              currentUserId={user?.id ?? undefined}
            />
          ))}
        </>
      )}

      {/* Join with code */}
      <TouchableOpacity
        style={styles.joinBtn}
        onPress={handleJoinTeam}
        activeOpacity={0.85}
      >
        <Ionicons name="key-outline" size={18} color={colors.primary} />
        <Text style={styles.joinBtnText}>Join a Roster with Code</Text>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={colors.outlineVariant}
        />
      </TouchableOpacity>

      <View style={{ height: 100 }} />
    </>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={myTeams}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TeamCard
            team={item}
            onPress={() => handleTeamPress(item)}
            currentUserId={user?.id ?? undefined}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          isWide && {
            maxWidth: 540,
            alignSelf: 'center' as const,
            width: '100%',
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          myTeams.length === 0 && otherTeams.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons
                name="people-outline"
                size={36}
                color={colors.outlineVariant}
              />
              <Text style={styles.emptyTitle}>No rosters yet</Text>
              <Text style={styles.emptyText}>
                Create a roster or join one with a code
              </Text>
            </View>
          ) : null
        }
      />

      {/* FAB */}
      {!isDependent && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleCreateTeam}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={26} color="#FFFFFF" />
        </TouchableOpacity>
      )}

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
    backgroundColor: colors.background,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  // ── Sport filter chips ──────────────────
  chipRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    alignItems: 'center' as any,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: colors.surfaceContainerLowest,
    alignSelf: 'flex-start' as any,
  },
  chipActive: {
    backgroundColor: colors.cobalt,
  },
  chipText: {
    fontFamily: fonts.headingSemi,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },

  // ── Section titles ──────────────────────
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.onSurface,
    letterSpacing: -0.3,
    marginBottom: 10,
    marginTop: 8,
  },

  // ── Empty state ─────────────────────────
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 6,
  },
  emptyTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.onSurface,
    marginTop: 8,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.onSurfaceVariant,
  },

  // ── Join button ─────────────────────────
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cobaltTint,
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.cobalt + '30',
  },
  joinBtnText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.cobalt,
  },

  // ── FAB ─────────────────────────────────
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.cobalt,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.38,
    shadowRadius: 12,
    elevation: 6,
  },
});
