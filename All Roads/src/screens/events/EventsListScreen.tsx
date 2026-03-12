import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
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

import { eventService } from '../../services/api/EventService';
import { userService } from '../../services/api/UserService';
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
import { selectBookings, setBookings } from '../../store/slices/bookingsSlice';
import { useAuth } from '../../context/AuthContext';
import { Event, EventFilters, SportType, SkillLevel, EventStatus } from '../../types';

export function EventsListScreen(): JSX.Element {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  // Redux state
  const events = useSelector(selectEvents);
  const filters = useSelector(selectEventFilters);
  const pagination = useSelector(selectEventsPagination);
  const isLoading = useSelector(selectEventsLoading);
  const isLoadingMore = useSelector(selectEventsLoadingMore);
  const error = useSelector(selectEventsError);
  const bookings = useSelector(selectBookings);
  
  // Auth context
  const { user: currentUser } = useAuth();

  // Get booked event IDs
  const bookedEventIds = useMemo(() => {
    return new Set(bookings.map(booking => booking.eventId));
  }, [bookings]);

  // Filter out booked events only (show all events user hasn't joined, including their own)
  const availableEvents = useMemo(() => {
    if (!currentUser) return events;
    return events.filter(event => !bookedEventIds.has(event.id));
  }, [events, currentUser, bookedEventIds]);

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filter options
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

  // Load events
  const loadEvents = useCallback(async (isRefresh = false, isLoadMore = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (isLoadMore) {
        dispatch(setLoadingMore(true));
      } else {
        dispatch(setLoading(true));
      }

      // Fetch from API - skip cache on refresh to ensure fresh data
      const page = isLoadMore ? pagination.page + 1 : 1;
      const response = await eventService.getEvents(filters, { page, limit: pagination.limit }, isRefresh);

      if (isLoadMore) {
        dispatch(appendEvents(response));
      } else {
        dispatch(setEvents(response));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load events';
      dispatch(setError(errorMessage));
      
      if (isRefresh) {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, filters, pagination.page, pagination.limit]);

  // Search events with debouncing
  const debouncedSearch = useMemo(
    () => debounce(async (query: string) => {
      if (!query.trim()) {
        loadEvents();
        return;
      }

      try {
        dispatch(setLoading(true));
        
        const searchFilters: EventFilters = {
          ...filters,
          status: EventStatus.ACTIVE,
        };

        const response = await eventService.searchEvents(query, searchFilters, {
          page: 1,
          limit: pagination.limit,
        });

        dispatch(setEvents({
          data: response.results,
          pagination: {
            page: 1,
            limit: pagination.limit,
            total: response.total,
            totalPages: Math.ceil(response.total / pagination.limit),
          },
        }));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Search failed';
        dispatch(setError(errorMessage));
      }
    }, 300),
    [dispatch, filters, pagination.limit, loadEvents]
  );

  const searchEvents = useCallback((query: string) => {
    debouncedSearch(query);
  }, [debouncedSearch]);

  // Handle event press
  const handleEventPress = (event: Event) => {
    (navigation as any).navigate('EventDetails', { eventId: event.id });
  };

  // Handle create event
  const handleCreateEvent = () => {
    (navigation as any).navigate('CreateEvent');
  };

  // Handle filter changes
  const handleFilterChange = (key: keyof EventFilters, value: string | undefined) => {
    const newFilters = { ...filters };
    if (value === '' || value === null || value === undefined) {
      delete newFilters[key];
    } else {
      (newFilters as any)[key] = value;
    }
    dispatch(setFilters(newFilters));
  };

  // Apply filters
  const applyFilters = () => {
    setShowFilters(false);
    loadEvents();
  };

  // Clear all filters
  const clearAllFilters = () => {
    dispatch(clearFilters());
    setSearchQuery('');
    setShowFilters(false);
    loadEvents();
  };

  // Load more events (pagination)
  const loadMoreEvents = () => {
    if (!isLoadingMore && pagination.page < pagination.totalPages) {
      loadEvents(false, true);
    }
  };

  // Refresh events
  const onRefresh = () => {
    loadEvents(true);
  };

  // Load events on screen focus
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 Events screen focused - reloading events and bookings');
      
      // Reload both events and bookings to ensure accurate filtering
      const reloadData = async () => {
        try {
          // Reload events
          loadEvents(true);
          
          // Reload bookings to update the filter
          if (currentUser) {
            const bookingsResponse = await userService.getUserBookings('upcoming', { page: 1, limit: 100 });
            dispatch(setBookings(bookingsResponse));
          }
        } catch (error) {
          console.error('Error reloading data on focus:', error);
        }
      };
      
      reloadData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser?.id]) // Reload when user changes
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
      <Ionicons name="calendar-outline" size={64} color="#CCC" />
      <Text style={styles.emptyTitle}>No Events Found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery || Object.keys(filters).length > 0
          ? 'Try adjusting your search or filters'
          : 'Be the first to create an event!'}
      </Text>
      <FormButton
        title="Create Event"
        onPress={handleCreateEvent}
        style={styles.createButton}
      />
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
        value={filters.sportType || ''}
        options={sportTypeOptions}
        onSelect={(option) => handleFilterChange('sportType', option.value as string)}
      />

      <FormSelect
        label="Skill Level"
        placeholder="Select skill level"
        value={filters.skillLevel || ''}
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
        <LoadingSpinner size="small" />
      </View>
    );
  };

  if (error && events.length === 0) {
    return (
      <View style={styles.container}>
        <ScreenHeader
          title="Events"
          rightIcon="add"
          onRightPress={handleCreateEvent}
        />
        <ErrorDisplay
          message={error}
          onRetry={() => loadEvents()}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Events"
        rightIcon="add"
        onRightPress={handleCreateEvent}
      />

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
            color={Object.keys(filters).length > 0 ? '#007AFF' : '#666'}
          />
        </TouchableOpacity>
      </View>

      {isLoading && events.length === 0 ? (
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
              colors={['#007AFF']}
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
    backgroundColor: '#F9FAFB',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  searchBar: {
    flex: 1,
    marginRight: 12,
  },
  filterButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    paddingHorizontal: 32,
  },
  footer: {
    paddingVertical: 16,
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
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  filtersTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  filtersActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  filterActionButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  sectionContainer: {
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
});