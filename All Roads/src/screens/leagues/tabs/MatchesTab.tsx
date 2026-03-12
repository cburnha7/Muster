import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, RefreshControl, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MatchCard } from '../../../components/league/MatchCard';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../../components/ui/ErrorDisplay';
import { FormSelect, SelectOption } from '../../../components/forms/FormSelect';
import { matchService } from '../../../services/api/MatchService';
import { seasonService } from '../../../services/api/SeasonService';
import { Match, MatchStatus, Season } from '../../../types';
import { colors } from '../../../theme';
import { LeaguesStackParamList } from '../../../navigation/types';

interface MatchesTabProps {
  leagueId: string;
  isOperator: boolean;
}

type NavigationProp = NativeStackNavigationProp<LeaguesStackParamList>;

export const MatchesTab: React.FC<MatchesTabProps> = ({ leagueId, isOperator }) => {
  const navigation = useNavigation<NavigationProp>();
  
  const [matches, setMatches] = useState<Match[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<MatchStatus | 'all'>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
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
    setMatches([]);
    setHasMore(true);
    loadMatches(true);
  }, [leagueId, selectedSeasonId, statusFilter]);

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
      // Don't show error for seasons - just continue with all matches
    }
  };

  const loadMatches = async (reset: boolean = false, forceRefresh: boolean = false) => {
    if (!hasMore && !reset && !forceRefresh) return;

    try {
      if (forceRefresh) {
        setIsRefreshing(true);
      } else if (reset) {
        setIsLoading(true);
      }
      setError(null);

      const currentPage = reset ? 1 : page;
      const filters: any = { leagueId };
      
      if (selectedSeasonId) {
        filters.seasonId = selectedSeasonId;
      }
      
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }

      const response = await matchService.getMatches(filters, currentPage, 20);
      
      const newMatches = reset ? response.data : [...matches, ...response.data];
      setMatches(newMatches);
      setPage(currentPage + 1);
      setHasMore(response.pagination.page < response.pagination.totalPages);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load matches';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setPage(1);
    setMatches([]);
    setHasMore(true);
    loadMatches(true, true);
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      loadMatches(false);
    }
  };

  const handleSeasonChange = (option: SelectOption) => {
    setSelectedSeasonId(option.value === 'all' ? undefined : option.value as string);
  };

  const handleStatusFilterChange = (option: SelectOption) => {
    setStatusFilter(option.value as MatchStatus | 'all');
  };

  const handleSortToggle = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const handleMatchPress = (match: Match) => {
    // TODO: Navigate to match details
    console.log('Match pressed:', match.id);
  };

  const handleCreateMatch = () => {
    navigation.navigate('CreateMatch', { 
      leagueId,
      seasonId: selectedSeasonId 
    });
  };

  const seasonOptions: SelectOption[] = [
    { label: 'All Seasons', value: 'all' },
    ...seasons.map(season => ({
      label: season.name,
      value: season.id,
    })),
  ];

  const statusOptions: SelectOption[] = [
    { label: 'All Matches', value: 'all' },
    { label: 'Scheduled', value: 'scheduled' },
    { label: 'Completed', value: 'completed' },
  ];

  // Sort matches by date
  const sortedMatches = [...matches].sort((a, b) => {
    const dateA = new Date(a.scheduledAt).getTime();
    const dateB = new Date(b.scheduledAt).getTime();
    return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
  });

  const renderMatch = ({ item }: { item: Match }) => (
    <MatchCard
      match={item}
      onPress={handleMatchPress}
    />
  );

  const renderEmpty = () => {
    if (isLoading) return null;
    
    return (
      <View style={styles.emptyState}>
        <Ionicons name="calendar-outline" size={64} color="#CCC" />
        <Text style={styles.emptyText}>No matches found</Text>
        <Text style={styles.emptySubtext}>
          {statusFilter !== 'all' 
            ? `No ${statusFilter} matches available`
            : 'Matches will appear once they are scheduled'}
        </Text>
        {isOperator && (
          <TouchableOpacity
            style={styles.emptyActionButton}
            onPress={handleCreateMatch}
          >
            <Ionicons name="add-circle" size={20} color={colors.grass} />
            <Text style={styles.emptyActionText}>Create First Match</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderFooter = () => {
    if (!isLoading || isRefreshing) return null;
    return (
      <View style={styles.footer}>
        <LoadingSpinner size="small" />
      </View>
    );
  };

  if (isLoading && !isRefreshing && matches.length === 0) {
    return <LoadingSpinner />;
  }

  if (error && !isRefreshing && matches.length === 0) {
    return <ErrorDisplay message={error} onRetry={() => loadMatches(true)} />;
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
              placeholder="Status"
              value={statusFilter}
              options={statusOptions}
              onSelect={handleStatusFilterChange}
              containerStyle={styles.selectContainer}
            />
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={handleSortToggle}
          >
            <Ionicons 
              name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'} 
              size={18} 
              color={colors.grass} 
            />
            <Text style={styles.sortText}>
              {sortOrder === 'asc' ? 'Oldest First' : 'Newest First'}
            </Text>
          </TouchableOpacity>

          {isOperator && (
            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreateMatch}
            >
              <Ionicons name="add-circle" size={20} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Create Match</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Matches List */}
      <FlatList
        data={sortedMatches}
        renderItem={renderMatch}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.grass}
            colors={[colors.grass]}
          />
        }
      />
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
    gap: 12,
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
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.grass,
    gap: 6,
    flex: 1,
  },
  sortText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.grass,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.grass,
    borderRadius: 8,
    gap: 6,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  listContent: {
    paddingVertical: 8,
    flexGrow: 1,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
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
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.grass,
    gap: 8,
    marginTop: 24,
  },
  emptyActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.grass,
  },
});
