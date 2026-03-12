import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { PlayerRankingsTable } from '../../../components/league/PlayerRankingsTable';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../../components/ui/ErrorDisplay';
import { FormSelect, SelectOption } from '../../../components/forms/FormSelect';
import { leagueService } from '../../../services/api/LeagueService';
import { seasonService } from '../../../services/api/SeasonService';
import { PlayerRanking, Season } from '../../../types';
import { colors } from '../../../theme';

interface PlayersTabProps {
  leagueId: string;
}

export const PlayersTab: React.FC<PlayersTabProps> = ({ leagueId }) => {
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
      // Don't show error for seasons - just continue with all rankings
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
    <View style={styles.container}>
      {/* Controls Section */}
      <View style={styles.controls}>
        <View style={styles.filtersRow}>
          {seasons.length > 0 && (
            <View style={styles.filterItem}>
              <FormSelect
                placeholder="Season"
                value={selectedSeasonId || 'all'}
                options={seasonOptions}
                onSelect={handleSeasonChange}
                containerStyle={styles.selectContainer}
              />
            </View>
          )}
          
          <View style={styles.filterItem}>
            <FormSelect
              placeholder="Sort By"
              value={sortBy}
              options={sortOptions}
              onSelect={handleSortChange}
              containerStyle={styles.selectContainer}
            />
          </View>
        </View>
      </View>

      {/* Player Rankings Table */}
      <ScrollView
        style={styles.tableContainer}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  controls: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
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
