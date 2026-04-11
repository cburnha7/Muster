import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { LeagueCard } from '../../components/ui/LeagueCard';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { SkeletonRow } from '../../components/ui/SkeletonBox';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import {
  TabSearchModal,
  TabSearchResult,
} from '../../components/search/TabSearchModal';
import { colors, fonts, Spacing } from '../../theme';
import { leagueService } from '../../services/api/LeagueService';
import { userService } from '../../services/api/UserService';
import { selectUser } from '../../store/slices/authSlice';
import { selectActiveUserId } from '../../store/slices/contextSlice';
import { SportType } from '../../types';
import { searchEventBus } from '../../utils/searchEventBus';
import { useDependentContext } from '../../hooks/useDependentContext';

type LeagueItem = any;

const SPORTS = [
  { label: 'All', value: '' },
  { label: 'Basketball', value: SportType.BASKETBALL },
  { label: 'Soccer', value: SportType.SOCCER },
  { label: 'Tennis', value: SportType.TENNIS },
  { label: 'Pickleball', value: SportType.PICKLEBALL },
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
  const { width: screenWidth } = useWindowDimensions();

  const [myLeagues, setMyLeagues] = useState<LeagueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sportFilter, setSportFilter] = useState('');
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [pastExpanded, setPastExpanded] = useState(false);

  // Search modal toggle
  useEffect(() => {
    const unsub = searchEventBus.subscribeTab('Leagues', () =>
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
      const res = await leagueService.getLeagues({ page: 1, limit: 100 });
      setMyLeagues(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load leagues');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );
  useEffect(() => {
    loadData();
  }, [activeUserId]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // Split into active and past
  const { activeLeagues, pastLeagues } = useMemo(() => {
    const now = new Date();
    let filtered = myLeagues;
    if (sportFilter)
      filtered = filtered.filter(l => l.sportType === sportFilter);

    const active: LeagueItem[] = [];
    const past: LeagueItem[] = [];
    filtered.forEach(l => {
      if (l.endDate && new Date(l.endDate) < now) {
        past.push(l);
      } else {
        active.push(l);
      }
    });
    return {
      activeLeagues: active.sort((a: LeagueItem, b: LeagueItem) =>
        a.name.localeCompare(b.name)
      ),
      pastLeagues: past.sort((a: LeagueItem, b: LeagueItem) =>
        a.name.localeCompare(b.name)
      ),
    };
  }, [myLeagues, sportFilter]);

  const handleLeaguePress = (league: LeagueItem) => {
    (navigation as any).navigate('LeagueDetails', { leagueId: league.id });
  };

  const handleCreateLeague = () => {
    (navigation as any).navigate('CreateLeague');
  };

  // Search modal handlers
  const handleSearchLeagues = useCallback(
    async (
      query: string,
      sport: SportType | null
    ): Promise<TabSearchResult[]> => {
      try {
        const res = await leagueService.getLeagues({ page: 1, limit: 30 });
        return (res.data || [])
          .filter((l: LeagueItem) => {
            const nameMatch =
              !query.trim() ||
              l.name.toLowerCase().includes(query.toLowerCase());
            const sportMatch = !sport || l.sportType === sport;
            return nameMatch && sportMatch;
          })
          .map((l: LeagueItem) => ({
            id: l.id,
            name: l.seasonName || l.name,
            subtitle: l.sportType,
          }));
      } catch {
        return [];
      }
    },
    []
  );

  const handleSearchResultPress = useCallback(
    (result: TabSearchResult) => {
      (navigation as any).navigate('LeagueDetails', { leagueId: result.id });
    },
    [navigation]
  );

  const contentMaxWidth = screenWidth > 600 ? 540 : undefined;

  if (error && !myLeagues.length) {
    return (
      <View style={styles.container}>
        <ErrorDisplay message={error} onRetry={loadData} />
      </View>
    );
  }

  if (loading && !refreshing && !myLeagues.length) {
    return (
      <View style={styles.container}>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Sport filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={[
          styles.chipRow,
          contentMaxWidth
            ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const }
            : undefined,
        ]}
      >
        {SPORTS.map(sport => (
          <TouchableOpacity
            key={sport.value}
            style={[
              styles.chip,
              sportFilter === sport.value && styles.chipActive,
            ]}
            onPress={() => setSportFilter(sport.value)}
          >
            <Text
              style={[
                styles.chipText,
                sportFilter === sport.value && styles.chipTextActive,
              ]}
            >
              {sport.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Active leagues */}
      <FlatList
        data={activeLeagues}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View
            style={
              contentMaxWidth
                ? {
                    maxWidth: contentMaxWidth,
                    alignSelf: 'center' as const,
                    width: '100%',
                  }
                : undefined
            }
          >
            <LeagueCard
              league={item}
              onPress={() => handleLeaguePress(item)}
              isOwner={item.organizerId === currentUser?.id}
            />
          </View>
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          activeLeagues.length > 0 ? (
            <View
              style={
                contentMaxWidth
                  ? {
                      maxWidth: contentMaxWidth,
                      alignSelf: 'center' as const,
                      width: '100%',
                    }
                  : undefined
              }
            >
              <Text style={styles.sectionTitle}>Active</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name="trophy-outline"
              size={40}
              color={colors.outlineVariant}
            />
            <Text style={styles.emptyTitle}>No active leagues</Text>
            <Text style={styles.emptySubtitle}>
              Join or create a league to get started
            </Text>
          </View>
        }
        ListFooterComponent={
          pastLeagues.length > 0 ? (
            <View
              style={
                contentMaxWidth
                  ? {
                      maxWidth: contentMaxWidth,
                      alignSelf: 'center' as const,
                      width: '100%',
                    }
                  : undefined
              }
            >
              <TouchableOpacity
                style={styles.pastHeader}
                onPress={() => setPastExpanded(v => !v)}
                activeOpacity={0.7}
              >
                <Text style={styles.sectionTitle}>Past Seasons</Text>
                <Ionicons
                  name={pastExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.onSurfaceVariant}
                />
              </TouchableOpacity>
              {pastExpanded &&
                pastLeagues.map(league => (
                  <LeagueCard
                    key={league.id}
                    league={league}
                    onPress={() => handleLeaguePress(league)}
                    isOwner={league.organizerId === currentUser?.id}
                  />
                ))}
            </View>
          ) : null
        }
      />

      {/* FAB */}
      {!isDependent && (
        <TouchableOpacity style={styles.fab} onPress={handleCreateLeague}>
          <Ionicons name="add" size={26} color={'#FFFFFF'} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  chipRow: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
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
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.onSurface,
    letterSpacing: -0.3,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  pastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 8,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.onSurface,
  },
  emptySubtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.onSurfaceVariant,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#191C1E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 4.65,
    elevation: 8,
  },
});
