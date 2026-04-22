import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StandingsTable } from '../../../components/league/StandingsTable';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../../components/ui/ErrorDisplay';
import { FormSelect, SelectOption } from '../../../components/forms/FormSelect';
import { LeagueService } from '../../../services/api/LeagueService';
import { seasonService } from '../../../services/api/SeasonService';
import { TeamStanding, Season } from '../../../types';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../theme';

interface StandingsTabProps {
  leagueId: string;
}

export const StandingsTab: React.FC<StandingsTabProps> = ({ leagueId }) => {
  const { colors } = useTheme();
  const [standings, setStandings] = useState<TeamStanding[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | undefined>(
    undefined
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSeasons();
  }, [leagueId]);

  useEffect(() => {
    if (seasons.length > 0 || selectedSeasonId === undefined) {
      loadStandings();
    }
  }, [leagueId, selectedSeasonId]);

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
      const data = await leagueService.getStandings(leagueId, selectedSeasonId);
      setStandings(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load standings';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadStandings(true);
  };

  const handleSeasonChange = (option: SelectOption) => {
    setSelectedSeasonId(
      option.value === 'all' ? undefined : (option.value as string)
    );
  };

  const navigation = useNavigation();
  const handleTeamPress = (teamId: string) => {
    (navigation as any).navigate('TeamDetails', { teamId });
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
    if (standings.length > 0) {
      return (
        <StandingsTable standings={standings} onTeamPress={handleTeamPress} />
      );
    }

    return (
      <View style={styles.emptyState}>
        <Ionicons name="trophy-outline" size={64} color={colors.inkMuted} />
        <Text style={[styles.emptyText, { color: colors.inkSecondary }]}>No standings available</Text>
        <Text style={[styles.emptySubtext, { color: colors.inkMuted }]}>
          Standings will appear once matches are recorded
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgScreen }]}>
      {/* Controls Section */}
      <View style={[styles.controls, { backgroundColor: colors.bgScreen, borderBottomColor: colors.border }]}>
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
          style={[styles.refreshButton, { backgroundColor: colors.bgCard, borderColor: colors.cobalt }]}
          onPress={handleRefresh}
          disabled={isRefreshing}
        >
          <Ionicons name="refresh" size={20} color={colors.cobalt} />
          <Text style={[styles.refreshText, { color: colors.cobalt }]}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Standings / Rankings Content */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.cobalt}
            colors={[colors.cobalt]}
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
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
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
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  refreshText: {
    fontSize: 14,
    fontWeight: '600',
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
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
