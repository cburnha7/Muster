import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { debounce, getOptimalBatchSize, getOptimalWindowSize } from '../../utils/performance';

import { EventCard } from '../../components/ui/EventCard';
import { SearchBar } from '../../components/ui/SearchBar';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { FormButton } from '../../components/forms/FormButton';
import { FormSelect, SelectOption } from '../../components/forms/FormSelect';
import { colors, Spacing } from '../../theme';

import { eventService } from '../../services/api/EventService';
import { useGetEventsQuery, useGetUserBookingsQuery, DEFAULT_EVENT_FILTERS } from '../../store/api/eventsApi';
import { selectEventsTabEvents } from '../../store/selectors/eventSelectors';
import {
  setLoading,
  setLoadingMore,
  setError,
  setEvents,
  appendEvents,
  setFilters,
  clearFilters,
  selectEvents,
  selectEventFilters,
  selectEventsPagination,
  selectEventsLoading,
  selectEventsLoadingMore,
  selectEventsError,
} from '../../store/slices/eventsSlice';
import { selectBookings } from '../../store/slices/bookingsSlice';
import { useAuth } from '../../context/AuthContext';
import { Event, EventFilters, SportType, SkillLevel, EventStatus } from '../../types';

export function EventsListScreen(): JSX.Element {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  // Auth context
  const { user: currentUser } = useAuth();

  // Local state for custom filters
  const [customFilters, setCustomFilters] = useState<EventFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Determine if using default or custom filters
  const hasCustomFilters = Object.keys(customFilters).length > 0 || searchQuery.trim().length > 0;
  const activeFilters = hasCustomFilters ? customFilters : DEFAULT_EVENT_FILTERS;

  // RTK Query hooks - use default filters when no custom filters applied
  const { 
    data: eventsData, 
    isLoading: eventsLoading, 
    error: eventsError,
    refetch: refetchEvents 
  } = useGetEventsQuery({
    filters: activeFilters,
    pagination: { page: 1, limit: 20 },
  });

  const { 
    data: bookingsData,
    isLoading: bookingsLoading,
    refetch: refetchBookings 
  } = useGetUserBookingsQuery({
    status: 'upcoming',
    pagination: { page: 1, limit: 100 },
  });

  // Use selector only when using default filters, otherwise use raw data
  const rawEvents = eventsData?.data || [];
  
  // Get user's booked event IDs to filter them out
  const upcomingBookings = bookingsData?.data || [];
  const bookedEventIds = new Set(upcomingBookings.map(b => b.eventId));
  
  // Filter out events that the user has already joined
  const availableEvents = rawEvents.filter(event => !bookedEventIds.has(event.id));

  console.log('📊 EventsListScreen - Events data:', {
    hasCustomFilters,
    rawEventsCount: rawEvents.length,
    availableEventsCount: availableEvents.length,
    eventsLoading,
    eventsError,
  });

  // Combined loading state
  const isLoading = eventsLoading || bookingsLoading;
  const isLoadingMore = false; // We'll handle pagination separately
  const error = eventsError ? String(eventsError) : null;

  // Filter options
  // Handle create event
  const handleCreateEvent = () => {
    (navigation as any).navigate('CreateEvent');
  };

  const sportTypeOptions: SelectOption[] = [
    { label: 'All Sports', value: '' },
    { label: 'Basketball', value: SportType.BASKETBALL },
    { label: 'Soccer', value: SportType.SOCCER },
    { label: 'Tennis', value: SportType.TENNIS },
    { label: 'Volleyball', value: SportType.VOLLEYBALL },
    { label: 'Badminton', value: SportType.BADMINTON },
    { label: 'Other', value: SportType.OTHER },
  ];

  const skillLevelOptions: SelectOption[] = [
    { label: 'All Levels', value: '' },
    { label: 'Beginner', value: SkillLevel.BEGINNER },
    { label: 'Intermediate', value: SkillLevel.INTERMEDIATE },
    { label: 'Advanced', value: SkillLevel.ADVANCED },
    { label: 'All Levels', value: SkillLevel.ALL_LEVELS },
  ];

  // Search events with debouncing
  const debouncedSearch = useMemo(
    () => debounce(async (query: string) => {
      if (!query.trim()) {
        setCustomFilters({});
        return;
      }

      try {
        const searchFilters: EventFilters = {
          ...customFilters,
          status: EventStatus.ACTIVE,
        };

        const response = await eventService.searchEvents(query, searchFilters, {
          page: 1,
          limit: 20,
        });

        // For search, we use the old Redux slice temporarily
        dispatch(setEvents({
          data: response.results,
          pagination: {
            page: 1,
            limit: 20,
            total: response.total,
            totalPages: Math.ceil(response.total / 20),
          },
        }));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Search failed';
        console.error('Search error:', errorMessage);
      }
    }, 300),
    [dispatch, customFilters]
  );

  const searchEvents = useCallback((query: string) => {
    debouncedSearch(query);
  }, [debouncedSearch]);

  // Handle event press
  const handleEventPress = (event: Event) => {
    (navigation as any).navigate('EventDetails', { eventId: event.id });
  };

  // Handle filter changes
  const handleFilterChange = (key: keyof EventFilters, value: string | undefined) => {
    const newFilters = { ...customFilters };
    if (value === '' || value === null || value === undefined) {
      delete newFilters[key];
    } else {
      (newFilters as any)[key] = value;
    }
    setCustomFilters(newFilters);
  };

  // Apply filters
  const applyFilters = () => {
    setShowFilters(false);
    // Filters are already applied via customFilters state
  };

  // Clear all filters
  const clearAllFilters = () => {
    setCustomFilters({});
    setSearchQuery('');
    setShowFilters(false);
  };

  // Load more events (pagination) - simplified for now
  const loadMoreEvents = () => {
    // Pagination will be handled in a future iteration
    console.log('Load more events - pagination not yet implemented with RTK Query');
  };

  // Refresh events
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchEvents(), refetchBookings()]);
    setRefreshing(false);
  };

  // Load events on screen focus
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 Events screen focused - refetching events and bookings');
      if (currentUser) {
        refetchEvents();
        refetchBookings();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser?.id])
  );

  // Render event item
  const renderEventItem = ({ item }: { item: Event }) => (
    <EventCard
      event={item}
      onPress={handleEventPress}
    />
  );

  // Memoize key extractor
  const keyExtractor = useCallback((item: Event) => item.id, []);

  // Get item layout for better performance
  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: 120, // Approximate height of EventCard
      offset: 120 * index,
      index,
    }),
    []
  );

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="calendar-outline" size={64} color={colors.soft} />
      <Text style={styles.emptyTitle}>No Events Found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery || Object.keys(customFilters).length > 0
          ? 'Try adjusting your search or filters'
          : 'Be the first to create an event!'}
      </Text>
      <TouchableOpacity style={styles.createButton} onPress={handleCreateEvent}>
        <Text style={styles.createButtonText}>Create Event</Text>
      </TouchableOpacity>
    </View>
  );

  // Render filters
  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <View style={styles.filtersHeader}>
        <Text style={styles.filtersTitle}>Filters</Text>
        <TouchableOpacity onPress={() => setShowFilters(false)}>
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <FormSelect
        label="Sport Type"
        placeholder="Select sport type"
        value={customFilters.sportType || ''}
        options={sportTypeOptions}
        onSelect={(option) => handleFilterChange('sportType', option.value as string)}
      />

      <FormSelect
        label="Skill Level"
        placeholder="Select skill level"
        value={customFilters.skillLevel || ''}
        options={skillLevelOptions}
        onSelect={(option) => handleFilterChange('skillLevel', option.value as string)}
      />

      <View style={styles.filtersActions}>
        <FormButton
          title="Clear All"
          variant="outline"
          onPress={clearAllFilters}
          style={styles.filterActionButton}
        />
        <FormButton
          title="Apply Filters"
          onPress={applyFilters}
          style={styles.filterActionButton}
        />
      </View>
    </View>
  );

  // Render footer (for loading more)
  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.grass} />
      </View>
    );
  };

  if (error && availableEvents.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.track} />
          <Text style={styles.errorText}>Unable to load events. Pull down to refresh.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetchEvents()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <SearchBar
          placeholder="Search events..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSearch={searchEvents}
          style={styles.searchBar}
        />
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={Object.keys(customFilters).length > 0 ? colors.grass : colors.ink}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleCreateEvent}
        >
          <Ionicons name="add" size={24} color={colors.grass} />
        </TouchableOpacity>
      </View>

      {isLoading && availableEvents.length === 0 ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={availableEvents}
          renderItem={renderEventItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          contentContainerStyle={availableEvents.length === 0 ? styles.emptyContainer : undefined}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.grass}
              colors={[colors.grass]}
            />
          }
          onEndReached={loadMoreEvents}
          onEndReachedThreshold={0.1}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={getOptimalBatchSize()}
          updateCellsBatchingPeriod={50}
          initialNumToRender={getOptimalBatchSize()}
          windowSize={getOptimalWindowSize()}
        />
      )}

      {showFilters && (
        <View style={styles.filtersOverlay}>
          <TouchableOpacity
            style={styles.filtersBackdrop}
            onPress={() => setShowFilters(false)}
          />
          {renderFilters()}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.chalk,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: colors.chalk,
  },
  searchBar: {
    flex: 1,
    marginRight: Spacing.md,
  },
  filterButton: {
    padding: Spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.chalk,
    borderWidth: 1,
    borderColor: colors.soft,
    marginRight: Spacing.sm,
  },
  addButton: {
    padding: Spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.chalk,
    borderWidth: 1,
    borderColor: colors.soft,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.ink,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.soft,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.lg,
  },
  createButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: colors.grass,
    borderRadius: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.chalk,
  },
  footer: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  filtersOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  filtersBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  filtersContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.chalk,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.soft,
  },
  filtersTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.ink,
  },
  filtersActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
  },
  filterActionButton: {
    flex: 1,
    marginHorizontal: Spacing.sm,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  errorText: {
    fontSize: 16,
    color: colors.track,
    textAlign: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
    lineHeight: 24,
  },
  retryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: colors.grass,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.chalk,
  },
  sectionContainer: {
    backgroundColor: colors.chalk,
    marginBottom: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: colors.chalk,
    borderBottomWidth: 1,
    borderBottomColor: colors.soft,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
    marginLeft: Spacing.sm,
  },
});