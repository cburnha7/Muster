import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { SearchBar } from '../../components/ui/SearchBar';
import { TeamCard } from '../../components/ui/TeamCard';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { FloatingActionButton } from '../../components/navigation/FloatingActionButton';
import { teamService } from '../../services/api/TeamService';
import { getOptimalBatchSize, getOptimalWindowSize } from '../../utils/performance';
import {
  setTeams,
  appendTeams,
  setLoading,
  setLoadingMore,
  setError,
  setFilters,
  selectTeams,
  selectTeamsLoading,
  selectTeamsLoadingMore,
  selectTeamsError,
  selectTeamFilters,
  selectTeamsPagination,
} from '../../store/slices/teamsSlice';
import { Team, SportType, SkillLevel } from '../../types';

export function TeamsListScreen(): JSX.Element {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const teams = useSelector(selectTeams);
  const isLoading = useSelector(selectTeamsLoading);
  const isLoadingMore = useSelector(selectTeamsLoadingMore);
  const error = useSelector(selectTeamsError);
  const filters = useSelector(selectTeamFilters);
  const pagination = useSelector(selectTeamsPagination);

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadTeams();
  }, [filters]);

  const loadTeams = async (page: number = 1) => {
    try {
      if (page === 1) {
        dispatch(setLoading(true));
      } else {
        dispatch(setLoadingMore(true));
      }

      const response = await teamService.getTeams(filters, {
        page,
        limit: pagination.limit,
      });

      if (page === 1) {
        dispatch(setTeams(response));
      } else {
        dispatch(appendTeams(response));
      }
    } catch (err: any) {
      console.error('Error loading teams:', err);
      dispatch(setError(err.message || 'Failed to load teams'));
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTeams(1);
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && pagination.page < pagination.totalPages) {
      loadTeams(pagination.page + 1);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.trim()) {
      try {
        dispatch(setLoading(true));
        const response = await teamService.searchTeams(query, filters, {
          page: 1,
          limit: pagination.limit,
        });
        dispatch(setTeams({
          data: response.results,
          pagination: response.pagination,
        }));
      } catch (err: any) {
        console.error('Error searching teams:', err);
        dispatch(setError(err.message || 'Failed to search teams'));
      }
    } else {
      loadTeams(1);
    }
  };

  const handleTeamPress = (team: Team) => {
    (navigation as any).navigate('TeamDetails', { teamId: team.id });
  };

  const handleCreateTeam = () => {
    (navigation as any).navigate('CreateTeam');
  };

  const handleJoinTeam = () => {
    (navigation as any).navigate('JoinTeam');
  };

  const handleFilterChange = (filterType: string, value: any) => {
    dispatch(setFilters({
      ...filters,
      [filterType]: value,
    }));
  };

  const renderTeamItem = useCallback(({ item }: { item: Team }) => (
    <TeamCard team={item} onPress={() => handleTeamPress(item)} />
  ), [handleTeamPress]);

  const keyExtractor = useCallback((item: Team) => item.id, []);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: 140, // Approximate height of TeamCard
      offset: 140 * index,
      index,
    }),
    []
  );

  const renderEmptyState = () => {
    if (isLoading) {
      return null;
    }

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateTitle}>No teams found</Text>
        <Text style={styles.emptyStateText}>
          {searchQuery
            ? 'Try adjusting your search or filters'
            : 'Be the first to create a team!'}
        </Text>
        <TouchableOpacity style={styles.emptyStateButton} onPress={handleCreateTeam}>
          <Text style={styles.emptyStateButtonText}>Create Team</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderFooter = () => {
    if (!isLoadingMore) {
      return null;
    }

    return (
      <View style={styles.footerLoader}>
        <LoadingSpinner size="small" />
      </View>
    );
  };

  if (error && !teams.length) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Teams" />
        <ErrorDisplay
          message={error}
          onRetry={() => loadTeams(1)}
        />
      </View>
    );
  }

  if (isLoading && !refreshing && !teams.length) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Teams" />
        <LoadingSpinner message="Loading teams..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Teams"
        rightAction={{
          icon: 'filter',
          onPress: () => setShowFilters(!showFilters),
        }}
      />

      <View style={styles.content}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSearch={handleSearch}
          placeholder="Search teams..."
        />

        {showFilters && (
          <View style={styles.filtersContainer}>
            <Text style={styles.filtersTitle}>Filters</Text>
            {/* Add filter options here */}
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => handleFilterChange('hasOpenSlots', !filters.hasOpenSlots)}
            >
              <Text style={styles.filterButtonText}>
                {filters.hasOpenSlots ? '✓ ' : ''}Open Slots Only
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <FlatList
          data={teams}
          renderItem={renderTeamItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          removeClippedSubviews={true}
          maxToRenderPerBatch={getOptimalBatchSize()}
          updateCellsBatchingPeriod={50}
          initialNumToRender={getOptimalBatchSize()}
          windowSize={getOptimalWindowSize()}
        />
      </View>

      <FloatingActionButton
        icon="add"
        onPress={handleCreateTeam}
        label="Create Team"
      />

      <TouchableOpacity
        style={styles.joinButton}
        onPress={handleJoinTeam}
      >
        <Text style={styles.joinButtonText}>Join with Code</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    marginBottom: 8,
  },
  filterButtonText: {
    fontSize: 14,
    color: '#374151',
  },
  joinButton: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});