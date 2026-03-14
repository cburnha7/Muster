import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, RefreshControl, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StandingsTable } from '../../../components/league/StandingsTable';
import { PlayerRankingsTable } from '../../../components/league/PlayerRankingsTable';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../../components/ui/ErrorDisplay';
import { FormSelect, SelectOption } from '../../../components/forms/FormSelect';
import { LeagueService } from '../../../services/api/LeagueService';
import { seasonService } from '../../../services/api/SeasonService';
import { TeamStanding, PlayerRanking, Season } from '../../../types';
import { colors } from '../../../theme';

interface StandingsTabProps {
  leagueId: string;
  leagueType?: 'team' | 'pickup';
}

export const StandingsTab: React.FC<StandingsTabProps> = ({ leagueId, leagueType }) => {
  const [standings, setStandings] = useState<TeamStanding[]>([]);
  const [playerRankings, setPlayerRankings] = useState<PlayerRanking[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rankingsPage, setRankingsPage] = useState(1);
  const [hasMoreRankings, setHasMoreRankings] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const isPickup = leagueType === 'pickup';

  useEffect(() => {
    loadSeasons();
  }, [leagueId]);

  useEffect(() => {
    if (seasons.length > 0 || selectedSeasonId === undefined) {
      loadStandings();
    }
  }, [leagueId, selectedSeasonId, leagueType]);

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
      // Don't show error for seasons - just continue with all-time standings
    }
  };

  const loadStandings = async (forceRefresh: boolean = false) => {
    try {
      if (forceRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const leagueService = new LeagueService();

      if (isPickup) {
        const response = await leagueService.getPlayerRankings(leagueId, selectedSeasonId);
        setPlayerRankings(response.data);
        setHasMoreRankings(response.data.length < response.pagination.total);
        setRankingsPage(1);
      } else {
        const data = await leagueService.getStandings(leagueId, selectedSeasonId);
        setStandings(data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load standings';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleLoadMoreRankings = useCallback(async () => {
    if (isLoadingMore || !hasMoreRankings) return;

    try {
      setIsLoadingMore(true);
      const nextPage = rankingsPage + 1;
      const leagueService = new LeagueService();
      const response = await leagueService.getPlayerRankings(leagueId, selectedSeasonId, 'performanceScore', nextPage);
      setPlayerRankings(prev => [...prev, ...response.data]);
      setRankingsPage(nextPage);
      setHasMoreRankings(response.data.length > 0 && playerRankings.length + response.data.length < response.pagination.total);
    } catch (err) {
      console.error('Failed to load more rankings:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMoreRankings, rankingsPage, leagueId, selectedSeasonId, playerRankings.length]);

  const handleRefresh = () => {
    loadStandings(true);
  };

  const handleSeasonChange = (option: SelectOption) => {
    setSelectedSeasonId(option.value === 'all' ? undefined : option.value as string);
  };

  const handleTeamPress = (teamId: string) => {
    // TODO: Navigate to roster details
    console.log('Roster pressed:', teamId);
  };

  const handlePlayerPress = (playerId: string) => {
    // TODO: Navigate to player profile
    console.log('Player pressed:', playerId);
  };

  const seasonOptions: SelectOption[] = [
    { label: 'All Seasons', value: 'all' },
    ...seasons.map(season => ({
      label: season.name,
      value: season.id,
    })),
  ];

  if (isLoading && !isRefreshing) {
    return <LoadingSpinner />;
  }

  if (error && !isRefreshing) {
    return <ErrorDisplay message={error} onRetry={loadStandings} />;
  }

  const renderContent = () => {
    if (isPickup) {
      if (playerRankings.length > 0) {
        return (
          <PlayerRankingsTable
            rankings={playerRankings}
            onPlayerPress={handlePlayerPress}
            onLoadMore={handleLoadMoreRankings}
            hasMore={hasMoreRankings}
            loading={isLoadingMore}
          />
        );
      }

      return (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={64} color="#CCC" />
          <Text style={styles.emptyText}>No player rankings available</Text>
          <Text style={styles.emptySubtext}>
            Rankings will appear once matches are played
          </Text>
        </View>
      );
    }

    // Team league standings
    if (standings.length > 0) {
      return (
        <StandingsTable
          standings={standings}
          onTeamPress={handleTeamPress}
        />
      );
    }

    return (
      <View style={styles.emptyState}>
        <Ionicons name="trophy-outline" size={64} color="#CCC" />
        <Text style={styles.emptyText}>No standings available</Text>
        <Text style={styles.emptySubtext}>
          Standings will appear once matches are recorded
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Controls Section */}
      <View style={styles.controls}>
        {seasons.length > 0 && (
          <View style={styles.seasonSelector}>
            <FormSelect
              placeholder="Select Season"
              value={selectedSeasonId || 'all'}
              options={seasonOptions}
              onSelect={handleSeasonChange}
              containerStyle={styles.selectContainer}
            />
          </View>
        )}
        
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
          disabled={isRefreshing}
        >
          <Ionicons 
            name="refresh" 
            size={20} 
            color={colors.grass} 
          />
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Standings / Rankings Content */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.grass}
            colors={[colors.grass]}
          />
        }
      >
        {renderContent()}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 12,
  },
  seasonSelector: {
    flex: 1,
  },
  selectContainer: {
    marginBottom: 0,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.grass,
    gap: 6,
  },
  refreshText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.grass,
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});
