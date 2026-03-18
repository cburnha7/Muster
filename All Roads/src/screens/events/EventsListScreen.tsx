import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { debounce } from '../../utils/performance';

import { EventCard } from '../../components/ui/EventCard';
import { SearchBar } from '../../components/ui/SearchBar';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { FormButton } from '../../components/forms/FormButton';
import { FormSelect, SelectOption } from '../../components/forms/FormSelect';
import { ViewToggle } from '../../components/maps/ViewToggle';
import { EventsMapViewWrapper } from '../../components/maps/EventsMapViewWrapper';
import { colors, fonts, Spacing } from '../../theme';

import { eventService } from '../../services/api/EventService';
import { useGetEventsQuery, useGetUserBookingsQuery, DEFAULT_EVENT_FILTERS } from '../../store/api/eventsApi';
import {
  setEvents,
} from '../../store/slices/eventsSlice';
import { useAuth } from '../../context/AuthContext';
import { Event, EventFilters, SportType, EventStatus } from '../../types';

interface EventSection {
  title: string;
  data: Event[];
  emptyMessage: string;
}

export function EventsListScreen(): JSX.Element {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { user: currentUser } = useAuth();

  const [customFilters, setCustomFilters] = useState<EventFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [page, setPage] = useState(1);
  const [allFetchedEvents, setAllFetchedEvents] = useState<Event[]>([]);
  const [hasMore, setHasMore] = useState(true);

  const hasCustomFilters = Object.keys(customFilters).length > 0 || searchQuery.trim().length > 0;
  const activeFilters = hasCustomFilters ? customFilters : DEFAULT_EVENT_FILTERS;


  const { 
    data: eventsData, 
    isLoading: eventsLoading, 
    isFetching: eventsFetching,
    error: eventsError,
    refetch: refetchEvents 
  } = useGetEventsQuery({
    filters: activeFilters,
    pagination: { page, limit: 20 },
    ...(currentUser?.id ? { userId: currentUser.id } : {}),
  });

  // Accumulate events across pages
  React.useEffect(() => {
    if (eventsData?.data) {
      if (page === 1) {
        setAllFetchedEvents(eventsData.data);
      } else {
        setAllFetchedEvents(prev => {
          const existingIds = new Set(prev.map(e => e.id));
          const newEvents = eventsData.data.filter(e => !existingIds.has(e.id));
          return [...prev, ...newEvents];
        });
      }
      const totalPages = eventsData.pagination?.totalPages ?? 1;
      setHasMore(page < totalPages);
    }
  }, [eventsData, page]);

  const { 
    data: bookingsData,
    isLoading: bookingsLoading,
    refetch: refetchBookings 
  } = useGetUserBookingsQuery({
    status: 'upcoming',
    pagination: { page: 1, limit: 100 },
  });

  const rawEvents = allFetchedEvents;
  const upcomingBookings = bookingsData?.data || [];
  const bookedEventIds = new Set(upcomingBookings.map(b => b.eventId));

  // Split into My Events (user is organizer) and Public Events
  const myEvents = rawEvents.filter(event => event.organizerId === currentUser?.id);
  const publicEvents = rawEvents.filter(
    event => event.organizerId !== currentUser?.id && !bookedEventIds.has(event.id)
  );
  const allDisplayEvents = [...myEvents, ...publicEvents];

  const sections: EventSection[] = [
    {
      title: 'My Events',
      data: myEvents,
      emptyMessage: 'You haven\'t created any events yet',
    },
    {
      title: 'Public Events',
      data: publicEvents,
      emptyMessage: searchQuery ? 'No matching events' : 'No public events available',
    },
  ];

  const isLoading = eventsLoading || bookingsLoading;

  const handleCreateEvent = () => {
    (navigation as any).navigate('CreateEvent');
  };

  const sportTypeOptions: SelectOption[] = [
    { label: 'All Sports', value: '' },
    { label: 'Basketball', value: SportType.BASKETBALL },
    { label: 'Pickleball', value: SportType.PICKLEBALL },
    { label: 'Tennis', value: SportType.TENNIS },
    { label: 'Soccer', value: SportType.SOCCER },
    { label: 'Softball', value: SportType.SOFTBALL },
    { label: 'Baseball', value: SportType.BASEBALL },
    { label: 'Volleyball', value: SportType.VOLLEYBALL },
    { label: 'Flag Football', value: SportType.FLAG_FOOTBALL },
    { label: 'Kickball', value: SportType.KICKBALL },
    { label: 'Other', value: SportType.OTHER },
  ];

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
        console.error('Search error:', err instanceof Error ? err.message : 'Search failed');
      }
    }, 300),
    [dispatch, customFilters]
  );

  const searchEvents = useCallback((query: string) => {
    debouncedSearch(query);
  }, [debouncedSearch]);

  const handleEventPress = (event: Event) => {
    (navigation as any).navigate('EventDetails', { eventId: event.id });
  };

  const handleFilterChange = (key: keyof EventFilters, value: string | undefined) => {
    const newFilters = { ...customFilters };
    if (value === '' || value === null || value === undefined) {
      delete newFilters[key];
    } else {
      (newFilters as any)[key] = value;
    }
    setCustomFilters(newFilters);
  };

  const applyFilters = () => {
    setShowFilters(false);
    setPage(1);
    setHasMore(true);
  };

  const clearAllFilters = () => {
    setCustomFilters({});
    setSearchQuery('');
    setShowFilters(false);
    setPage(1);
    setHasMore(true);
  };

  const loadMoreEvents = () => {
    if (!eventsFetching && hasMore) {
      setPage(prev => prev + 1);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    await Promise.all([refetchEvents(), refetchBookings()]);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      if (currentUser) {
        refetchEvents();
        refetchBookings();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser?.id])
  );

  const renderEventItem = ({ item }: { item: Event }) => (
    <EventCard
      event={item}
      onPress={handleEventPress}
      isHost={item.organizerId === currentUser?.id ? true : undefined}
    />
  );

  const keyExtractor = useCallback((item: Event) => item.id, []);


  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <View style={styles.filtersHeader}>
        <Text style={styles.filtersTitle}>Filters</Text>
        <TouchableOpacity onPress={() => setShowFilters(false)}>
          <Ionicons name="close" size={24} color={colors.inkFaint} />
        </TouchableOpacity>
      </View>
      <FormSelect
        label="Sport Type"
        placeholder="Select sport type"
        value={customFilters.sportType || ''}
        options={sportTypeOptions}
        onSelect={(option) => handleFilterChange('sportType', option.value as string)}
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

  const renderFooter = () => {
    if (eventsFetching && page > 1) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator size="small" color={colors.grass} />
        </View>
      );
    }
    return null;
  };

  if (eventsError && rawEvents.length === 0) {
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
        <ViewToggle viewMode={viewMode} onToggle={setViewMode} />
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons
            name="filter"
            size={24}
            color={colors.grass}
          />
          {Object.keys(customFilters).length > 0 && <View style={styles.filterBadge} />}
        </TouchableOpacity>
      </View>

      {isLoading && rawEvents.length === 0 ? (
        <LoadingSpinner />
      ) : viewMode === 'map' ? (
        <EventsMapViewWrapper
          events={allDisplayEvents}
          userBookedEventIds={Array.from(bookedEventIds)}
          onEventPress={handleEventPress}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={keyExtractor}
          renderItem={renderEventItem}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{section.data.length}</Text>
              </View>
            </View>
          )}
          renderSectionFooter={({ section }) =>
            section.data.length === 0 ? (
              <View style={styles.emptySection}>
                <Text style={styles.emptySectionText}>{(section as EventSection).emptyMessage}</Text>
              </View>
            ) : null
          }
          contentContainerStyle={styles.listContent}
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
          stickySectionHeadersEnabled={false}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={handleCreateEvent}>
        <Ionicons name="add" size={28} color={colors.chalk} />
      </TouchableOpacity>

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
    backgroundColor: colors.chalkWarm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: colors.chalkWarm,
    gap: Spacing.sm,
  },
  searchBar: {
    flex: 1,
  },
  filterButton: {
    padding: Spacing.sm,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.track,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.grass,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  listContent: {
    paddingBottom: 80,
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
    backgroundColor: colors.chalkWarm,
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
    borderBottomColor: colors.inkFaint,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    backgroundColor: colors.chalkWarm,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: colors.ink,
  },
  countBadge: {
    backgroundColor: `${colors.grass}20`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  countBadgeText: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.grass,
  },
  emptySection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  emptySectionText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
  },
});
