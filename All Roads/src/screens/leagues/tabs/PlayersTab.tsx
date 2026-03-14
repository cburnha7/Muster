import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, FlatList, RefreshControl, Text, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PlayerRankingsTable } from '../../../components/league/PlayerRankingsTable';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../../components/ui/ErrorDisplay';
import { FormSelect, SelectOption } from '../../../components/forms/FormSelect';
import { leagueService } from '../../../services/api/LeagueService';
import { seasonService } from '../../../services/api/SeasonService';
import { PlayerRanking, Season } from '../../../types';
import { LeagueMembership } from '../../../types/league';
import { colors, fonts } from '../../../theme';

interface PlayersTabProps {
  leagueId: string;
  leagueType?: 'team' | 'pickup';
}

export const PlayersTab: React.FC<PlayersTabProps> = ({ leagueId, leagueType }) => {
  // If pickup league, show individual player list from memberships
  if (leagueType === 'pickup') {
    return <PickupPlayersList leagueId={leagueId} />;
  }

  // Default: show player rankings (team league or unknown)
  return <PlayerRankingsView leagueId={leagueId} />;
};

// ── Pickup League: Individual player list from active memberships ──
const PickupPlayersList: React.FC<{ leagueId: string }> = ({ leagueId }) => {
  const [memberships, setMemberships] = useState<LeagueMembership[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMembers();
  }, [leagueId]);

  const loadMembers = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const response = await leagueService.getMembers(leagueId, 1, 100);
      setMemberships(response.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load players';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadMembers(true);
  };

  // Only show active memberships (Requirement 7.3)
  const activePlayers = memberships.filter(
    (m) => m.status === 'active' && m.memberType === 'user'
  );

  const renderPlayerRow = ({ item }: { item: LeagueMembership }) => {
    const user = item.user;
    const displayName = user
      ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Unknown Player'
      : 'Unknown Player';

    return (
      <View style={pickupStyles.playerRow}>
        {user?.profileImage ? (
          <Image source={{ uri: user.profileImage }} style={pickupStyles.avatar} />
        ) : (
          <View style={pickupStyles.avatarPlaceholder}>
            <Ionicons name="person" size={18} color={colors.grass} />
          </View>
        )}
        <Text style={pickupStyles.playerName} numberOfLines={1}>
          {displayName}
        </Text>
      </View>
    );
  };

  const renderEmptyState = () => {
    if (isLoading) return null;
    return (
      <View style={pickupStyles.emptyState}>
        <Text style={pickupStyles.emptyText}>No players in this league yet</Text>
      </View>
    );
  };

  if (isLoading && !isRefreshing && memberships.length === 0) {
    return <LoadingSpinner />;
  }

  if (error && !isRefreshing && memberships.length === 0) {
    return <ErrorDisplay message={error} onRetry={() => loadMembers()} />;
  }

  return (
    <View style={pickupStyles.container}>
      <FlatList
        data={activePlayers}
        renderItem={renderPlayerRow}
        keyExtractor={(item) => item.id}
        contentContainerStyle={pickupStyles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.grass}
            colors={[colors.grass]}
          />
        }
        ListEmptyComponent={renderEmptyState}
      />
    </View>
  );
};

const pickupStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.chalk,
  },
  listContent: {
    paddingVertical: 8,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.chalk,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerName: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    fontFamily: fonts.semibold,
    color: colors.ink,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.inkFaint,
    textAlign: 'center',
  },
});

// ── Team League: Player rankings view (original behavior) ──
const PlayerRankingsView: React.FC<{ leagueId: string }> = ({ leagueId }) => {
  const [rankings, setRankings] = useState<PlayerRanking[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | undefined>(undefined);
  const [sortBy, setSortBy] = useState<string>('performanceScore');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadSeasons();
  }, [leagueId]);

  useEffect(() => {
    setPage(1);
    setRankings([]);
    setHasMore(true);
    loadRankings(true);
  }, [leagueId, selectedSeasonId, sortBy]);

  const loadSeasons = async () => {
    try {
      const response = await seasonService.getLeagueSeasons(leagueId, 1, 100);
      setSeasons(response.data);

      // Auto-select active season if available
      const activeSeason = response.data.find(s => s.isActive);
      if (activeSeason) {
        setSelectedSeasonId(activeSeason.id);
      }
    } catch (err) {
      console.error('Failed to load seasons:', err);
    }
  };

  const loadRankings = async (reset: boolean = false, forceRefresh: boolean = false) => {
    if (!hasMore && !reset && !forceRefresh) return;

    try {
      if (forceRefresh) {
        setIsRefreshing(true);
      } else if (reset) {
        setIsLoading(true);
      }
      setError(null);

      const currentPage = reset ? 1 : page;

      const response = await leagueService.getPlayerRankings(
        leagueId,
        selectedSeasonId,
        sortBy,
        currentPage,
        50
      );

      const newRankings = reset ? response.data : [...rankings, ...response.data];
      setRankings(newRankings);
      setPage(currentPage + 1);
      setHasMore(response.pagination.page < response.pagination.totalPages);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load player rankings';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setPage(1);
    setRankings([]);
    setHasMore(true);
    loadRankings(true, true);
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      loadRankings(false);
    }
  };

  const handleSeasonChange = (option: SelectOption) => {
    setSelectedSeasonId(option.value === 'all' ? undefined : option.value as string);
  };

  const handleSortChange = (option: SelectOption) => {
    setSortBy(option.value as string);
  };

  const seasonOptions: SelectOption[] = [
    { label: 'All Seasons', value: 'all' },
    ...seasons.map(season => ({
      label: season.name,
      value: season.id,
    })),
  ];

  const sortOptions: SelectOption[] = [
    { label: 'Performance Score', value: 'performanceScore' },
    { label: 'Average Rating', value: 'averageRating' },
    { label: 'Matches Played', value: 'matchesPlayed' },
    { label: 'Total Votes', value: 'totalVotes' },
  ];

  if (isLoading && !isRefreshing && rankings.length === 0) {
    return <LoadingSpinner />;
  }

  if (error && !isRefreshing && rankings.length === 0) {
    return <ErrorDisplay message={error} onRetry={() => loadRankings(true)} />;
  }

  return (
    <View style={rankingsStyles.container}>
      {/* Controls Section */}
      <View style={rankingsStyles.controls}>
        <View style={rankingsStyles.filtersRow}>
          {seasons.length > 0 && (
            <View style={rankingsStyles.filterItem}>
              <FormSelect
                placeholder="Season"
                value={selectedSeasonId || 'all'}
                options={seasonOptions}
                onSelect={handleSeasonChange}
                containerStyle={rankingsStyles.selectContainer}
              />
            </View>
          )}

          <View style={rankingsStyles.filterItem}>
            <FormSelect
              placeholder="Sort By"
              value={sortBy}
              options={sortOptions}
              onSelect={handleSortChange}
              containerStyle={rankingsStyles.selectContainer}
            />
          </View>
        </View>
      </View>

      {/* Player Rankings Table */}
      <ScrollView
        style={rankingsStyles.tableContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.grass}
            colors={[colors.grass]}
          />
        }
      >
        <PlayerRankingsTable
          rankings={rankings}
          onLoadMore={handleLoadMore}
          hasMore={hasMore}
          loading={isLoading}
        />
      </ScrollView>
    </View>
  );
};

const rankingsStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  controls: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.chalk,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 12,
  },
  filterItem: {
    flex: 1,
  },
  selectContainer: {
    marginBottom: 0,
  },
  tableContainer: {
    flex: 1,
  },
});
