import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { searchService, UnifiedSearchFilters } from '../../services/search';
import { Event, Facility, Team } from '../../types';
import { EventCard } from '../../components/ui/EventCard';
import { FacilityCard } from '../../components/ui/FacilityCard';
import { TeamCard } from '../../components/ui/TeamCard';
import { SearchBar } from '../../components/ui/SearchBar';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import {
  getOptimalBatchSize,
  getOptimalWindowSize,
} from '../../utils/performance';
import { useTheme } from '../../theme';

interface SearchResultsScreenProps {
  route: {
    params: {
      query?: string;
      filters?: UnifiedSearchFilters;
      searchType?: 'all' | 'events' | 'facilities' | 'teams';
    };
  };
  navigation: any;
}

type TabType = 'all' | 'events' | 'facilities' | 'teams';

export function SearchResultsScreen({
  route,
  navigation,
}: SearchResultsScreenProps): JSX.Element {
  const {
    query: initialQuery = '',
    filters: initialFilters,
    searchType = 'all',
  } = route.params ?? {};

  const { colors } = useTheme();
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<UnifiedSearchFilters>(
    initialFilters || {}
  );
  const [activeTab, setActiveTab] = useState<TabType>(searchType);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search results
  const [events, setEvents] = useState<Event[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [totalResults, setTotalResults] = useState(0);

  useEffect(() => {
    if (query || Object.keys(filters).length > 0) {
      performSearch();
    }
  }, [query, filters, activeTab]);

  const keyExtractor = useCallback(
    (item: any, index: number) => {
      if (activeTab === 'all') {
        return `${item.type}-${item.data.id}-${index}`;
      }
      return item.id;
    },
    [activeTab]
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: 130, // Approximate height of cards
      offset: 130 * index,
      index,
    }),
    []
  );

  const performSearch = async () => {
    if (!query && Object.keys(filters).length === 0) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (activeTab === 'all') {
        const result = await searchService.searchAll(query, filters);
        setEvents(result.events.results);
        setFacilities(result.facilities.results);
        setTeams(result.teams.results);
        setTotalResults(result.totalResults);
      } else if (activeTab === 'events') {
        const result = await searchService.searchEvents(query, filters);
        setEvents(result.results);
        setTotalResults(result.total);
      } else if (activeTab === 'facilities') {
        const result = await searchService.searchFacilities(query, filters);
        setFacilities(result.results);
        setTotalResults(result.total);
      } else if (activeTab === 'teams') {
        const result = await searchService.searchTeams(query, filters);
        setTeams(result.results);
        setTotalResults(result.total);
      }

      // Save search to history
      await searchService.saveSearchToHistory(query, filters, totalResults);
    } catch (err: any) {
      setError(err.message || 'Failed to perform search');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await performSearch();
    setRefreshing(false);
  };

  const handleEventPress = (event: Event) => {
    navigation.navigate('EventDetails', { eventId: event.id });
  };

  const handleFacilityPress = (facility: Facility) => {
    navigation.navigate('FacilityDetails', { facilityId: facility.id });
  };

  const handleTeamPress = (team: Team) => {
    navigation.navigate('TeamDetails', { teamId: team.id });
  };

  const renderTabButton = (tab: TabType, label: string, count?: number) => (
    <TouchableOpacity
      style={[styles.tabButton, { backgroundColor: colors.surface }, activeTab === tab && styles.tabButtonActive, activeTab === tab && { backgroundColor: colors.cobalt }]}
      onPress={() => setActiveTab(tab)}
      activeOpacity={0.75}
    >
      <Text style={[styles.tabText, { color: colors.inkSoft }, activeTab === tab && styles.tabTextActive, activeTab === tab && { color: colors.white }]}>
        {label}
        {count !== undefined && ` (${count})`}
      </Text>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="search-outline" size={64} color={colors.inkFaint} />
      <Text style={[styles.emptyTitle, { color: colors.ink }]}>No results found</Text>
      <Text style={[styles.emptySubtitle, { color: colors.inkSoft }]}>
        Try adjusting your search or filters
      </Text>
    </View>
  );

  const renderResults = () => {
    if (loading && !refreshing) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.cobalt} />
          <Text style={[styles.loadingText, { color: colors.inkSoft }]}>Searching...</Text>
        </View>
      );
    }

    if (error) {
      return <ErrorDisplay message={error} onRetry={performSearch} />;
    }

    if (activeTab === 'all') {
      const allResults = [
        ...events.map(e => ({ type: 'event', data: e })),
        ...facilities.map(f => ({ type: 'facility', data: f })),
        ...teams.map(t => ({ type: 'team', data: t })),
      ];

      if (allResults.length === 0) {
        return renderEmptyState();
      }

      return (
        <FlatList
          data={allResults}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            if (item.type === 'event') {
              return (
                <EventCard
                  event={item.data as Event}
                  onPress={() => handleEventPress(item.data as Event)}
                />
              );
            } else if (item.type === 'facility') {
              return (
                <FacilityCard
                  facility={item.data as Facility}
                  onPress={() => handleFacilityPress(item.data as Facility)}
                />
              );
            } else {
              return (
                <TeamCard
                  team={item.data as Team}
                  onPress={() => handleTeamPress(item.data as Team)}
                />
              );
            }
          }}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          removeClippedSubviews={true}
          maxToRenderPerBatch={getOptimalBatchSize()}
          updateCellsBatchingPeriod={50}
          initialNumToRender={getOptimalBatchSize()}
          windowSize={getOptimalWindowSize()}
        />
      );
    } else if (activeTab === 'events') {
      if (events.length === 0) {
        return renderEmptyState();
      }

      return (
        <FlatList
          data={events}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <EventCard event={item} onPress={() => handleEventPress(item)} />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          removeClippedSubviews={true}
          maxToRenderPerBatch={getOptimalBatchSize()}
          updateCellsBatchingPeriod={50}
          initialNumToRender={getOptimalBatchSize()}
          windowSize={getOptimalWindowSize()}
        />
      );
    } else if (activeTab === 'facilities') {
      if (facilities.length === 0) {
        return renderEmptyState();
      }

      return (
        <FlatList
          data={facilities}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <FacilityCard
              facility={item}
              onPress={() => handleFacilityPress(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          removeClippedSubviews={true}
          maxToRenderPerBatch={getOptimalBatchSize()}
          updateCellsBatchingPeriod={50}
          initialNumToRender={getOptimalBatchSize()}
          windowSize={getOptimalWindowSize()}
        />
      );
    } else {
      if (teams.length === 0) {
        return renderEmptyState();
      }

      return (
        <FlatList
          data={teams}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TeamCard team={item} onPress={() => handleTeamPress(item)} />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          removeClippedSubviews={true}
          maxToRenderPerBatch={getOptimalBatchSize()}
          updateCellsBatchingPeriod={50}
          initialNumToRender={getOptimalBatchSize()}
          windowSize={getOptimalWindowSize()}
        />
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.white }, { backgroundColor: colors.bgScreen }]}>
      <SearchBar
        value={query}
        onChangeText={setQuery}
        onSearch={performSearch}
        showFilters
        filters={filters}
        onFiltersChange={setFilters}
        placeholder="Search events, facilities, rosters..."
      />

      <View style={styles.header}>
        <Text style={[styles.resultCount, { color: colors.inkSoft }]}>
          {totalResults} {totalResults === 1 ? 'result' : 'results'}
        </Text>
      </View>

      <View style={[styles.tabContainer, { borderBottomColor: colors.border, backgroundColor: colors.white }]}>
        {renderTabButton('all', 'All', totalResults)}
        {renderTabButton('events', 'Events', events.length)}
        {renderTabButton('facilities', 'Facilities', facilities.length)}
        {renderTabButton('teams', 'Rosters', teams.length)}
      </View>

      {renderResults()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resultCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
  },
  tabButtonActive: {},
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabTextActive: {},
  listContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
});
