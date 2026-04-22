import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Modal,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { debounce } from '../../utils/performance';

import { SearchBar } from '../../components/ui/SearchBar';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { ViewToggle } from '../../components/maps/ViewToggle';
import { EventsMapViewWrapper } from '../../components/maps/EventsMapViewWrapper';
import { fonts, Spacing, useTheme } from '../../theme';
import { formatSportType } from '../../utils/formatters';

import { eventService } from '../../services/api/EventService';
import {
  useGetEventsQuery,
  DEFAULT_EVENT_FILTERS,
} from '../../store/api/eventsApi';
import { Event, SportType, EventStatus } from '../../types';
import { useDependentContext } from '../../hooks/useDependentContext';

export function EventsListScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { isDependent } = useDependentContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSports, setSelectedSports] = useState<SportType[]>([]);
  const [searchResults, setSearchResults] = useState<Event[] | null>(null);

  const {
    data: eventsData,
    isLoading,
    error: eventsError,
    refetch: refetchEvents,
  } = useGetEventsQuery({
    filters: {
      ...DEFAULT_EVENT_FILTERS,
      status: EventStatus.ACTIVE,
      ...(selectedSports.length > 0 ? { sportType: selectedSports[0] } : {}),
    },
    pagination: { page: 1, limit: 100 },
  });

  const events = useMemo(() => {
    const raw = searchResults ?? eventsData?.data ?? [];
    const now = new Date();
    return raw
      .filter(e => new Date(e.startTime) >= now)
      .sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
  }, [eventsData, searchResults]);

  const debouncedSearch = useMemo(
    () =>
      debounce(async (query: string) => {
        if (!query.trim()) {
          setSearchResults(null);
          return;
        }
        try {
          const response = await eventService.searchEvents(
            query,
            { status: EventStatus.ACTIVE },
            { page: 1, limit: 100 }
          );
          setSearchResults(response.results);
        } catch (err) {
          console.error('Search error:', err);
        }
      }, 300),
    []
  );

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      debouncedSearch(query);
    },
    [debouncedSearch]
  );

  const handleEventPress = (event: Event) => {
    (navigation as any).navigate('EventDetails', { eventId: event.id });
  };

  const handleCreateEvent = () => {
    (navigation as any).navigate('CreateEvent');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setSearchResults(null);
    setSearchQuery('');
    await refetchEvents();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      refetchEvents();
    }, [])
  );

  const toggleSport = (sport: SportType) => {
    setSelectedSports(prev =>
      prev.includes(sport) ? prev.filter(s => s !== sport) : [...prev, sport]
    );
  };

  const handleApplyFilters = () => {
    setShowFilters(false);
    setSearchResults(null);
  };

  const handleClearFilters = () => {
    setSelectedSports([]);
    setShowFilters(false);
    setSearchResults(null);
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });

  const formatTime = (date: string) =>
    new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'UTC',
    });

  const renderEventCard = (item: Event, index: number) => (
    <TouchableOpacity
      key={item.id}
      style={[
        styles.eventCard,
        { backgroundColor: colors.bgCard, shadowColor: colors.ink },
      ]}
      onPress={() => handleEventPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <View style={styles.eventHeader}>
          <View
            style={[styles.numberBadge, { backgroundColor: colors.cobalt }]}
          >
            <Text style={[styles.numberText, { color: colors.white }]}>
              {index + 1}
            </Text>
          </View>
          <Text
            style={[styles.eventName, { color: colors.ink }]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
        </View>
        {item.sportType && (
          <View
            style={[styles.sportTag, { backgroundColor: colors.cobaltTint }]}
          >
            <Text style={[styles.sportTagText, { color: colors.cobalt }]}>
              {formatSportType(item.sportType)}
            </Text>
          </View>
        )}
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={15} color={colors.inkFaint} />
          <Text style={[styles.detailText, { color: colors.inkFaint }]}>
            {formatDate(item.startTime as unknown as string)} at{' '}
            {formatTime(item.startTime as unknown as string)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={15} color={colors.inkFaint} />
          <Text
            style={[styles.detailText, { color: colors.inkFaint }]}
            numberOfLines={1}
          >
            {item.facility?.name || 'Location TBD'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (eventsError && events.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgScreen }]}>
        <ErrorDisplay
          message="Unable to load events. Pull down to refresh."
          onRetry={() => refetchEvents()}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bgScreen }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.cobalt}
          />
        }
      >
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.ink }]}>
            Upcoming Events
          </Text>
          <View
            style={[styles.countBadge, { backgroundColor: colors.cobaltTint }]}
          >
            <Text style={[styles.countBadgeText, { color: colors.cobalt }]}>
              {events.length}
            </Text>
          </View>
        </View>

        <View style={styles.header}>
          <SearchBar
            placeholder="Search events..."
            value={searchQuery}
            onChangeText={handleSearch}
            onSearch={handleSearch}
            style={styles.searchBar}
          />
          <ViewToggle viewMode={viewMode} onToggle={setViewMode} />
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons name="filter" size={24} color={colors.cobalt} />
            {selectedSports.length > 0 && (
              <View
                style={[styles.filterBadge, { backgroundColor: colors.heart }]}
              />
            )}
          </TouchableOpacity>
        </View>

        {isLoading && events.length === 0 ? (
          <LoadingSpinner />
        ) : viewMode === 'map' ? (
          <View style={styles.mapContainer}>
            <EventsMapViewWrapper
              events={events}
              userBookedEventIds={[]}
              onEventPress={handleEventPress}
            />
          </View>
        ) : events.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="calendar-outline"
              size={64}
              color={colors.inkFaint}
            />
            <Text style={[styles.emptyTitle, { color: colors.ink }]}>
              No Upcoming Events
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.inkFaint }]}>
              {searchQuery
                ? 'Try adjusting your search or filters'
                : 'Check back soon for upcoming events'}
            </Text>
          </View>
        ) : (
          events.map((item, index) => renderEventCard(item, index))
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {!isDependent && (
        <TouchableOpacity
          style={[
            styles.fab,
            { backgroundColor: colors.cobalt, shadowColor: colors.cobalt },
          ]}
          onPress={handleCreateEvent}
        >
          <Ionicons name="add" size={28} color={colors.white} />
        </TouchableOpacity>
      )}

      <Modal
        visible={showFilters}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFilters(false)}
      >
        <View
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
        >
          <View
            style={[styles.modalContent, { backgroundColor: colors.bgCard }]}
          >
            <View
              style={[styles.modalHeader, { borderBottomColor: colors.border }]}
            >
              <Text style={[styles.modalTitle, { color: colors.ink }]}>
                Filter Events
              </Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color={colors.ink} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.filterContent}>
              <Text style={[styles.filterLabel, { color: colors.ink }]}>
                Sport Type
              </Text>
              <View style={styles.sportTypeContainer}>
                {Object.values(SportType).map(sport => {
                  const isSelected = selectedSports.includes(sport);
                  return (
                    <TouchableOpacity
                      key={sport}
                      style={[
                        styles.sportChip,
                        {
                          backgroundColor: colors.bgCard,
                          borderColor: colors.border,
                        },
                        isSelected && {
                          backgroundColor: colors.cobalt,
                          borderColor: colors.cobalt,
                        },
                      ]}
                      onPress={() => toggleSport(sport)}
                    >
                      <Text
                        style={[
                          styles.sportChipText,
                          { color: colors.ink },
                          isSelected && { color: colors.white },
                        ]}
                      >
                        {formatSportType(sport)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
            <View
              style={[styles.modalActions, { borderTopColor: colors.border }]}
            >
              <TouchableOpacity
                style={[styles.clearButton, { borderColor: colors.border }]}
                onPress={handleClearFilters}
              >
                <Text style={[styles.clearButtonText, { color: colors.ink }]}>
                  Clear All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.applyButton, { backgroundColor: colors.cobalt }]}
                onPress={handleApplyFilters}
              >
                <Text style={[styles.applyButtonText, { color: colors.white }]}>
                  Apply Filters
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 16 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: 6,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    flex: 1,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countBadgeText: {
    fontFamily: fonts.label,
    fontSize: 11,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  searchBar: { flex: 1 },
  filterButton: { padding: Spacing.sm, position: 'relative' as const },
  filterBadge: {
    position: 'absolute' as const,
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  mapContainer: { height: 400 },
  eventCard: {
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardContent: { gap: 6 },
  eventHeader: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 4,
  },
  numberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 12,
  },
  numberText: {
    fontSize: 16,
    fontFamily: fonts.heading,
  },
  eventName: {
    fontFamily: fonts.label,
    fontSize: 18,
    flex: 1,
    paddingTop: 4,
  },
  sportTag: {
    alignSelf: 'flex-start' as const,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sportTagText: { fontFamily: fonts.label, fontSize: 13 },
  detailRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  detailText: {
    fontFamily: fonts.body,
    fontSize: 13,
    flex: 1,
  },
  emptyState: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  emptyTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontFamily: fonts.body,
    fontSize: 16,
    textAlign: 'center' as const,
    lineHeight: 24,
  },
  fab: {
    position: 'absolute' as const,
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.38,
    shadowRadius: 12,
    elevation: 6,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: Spacing.xl,
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: 16,
    textAlign: 'center' as const,
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
    lineHeight: 24,
  },
  retryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 9999,
  },
  retryButtonText: {
    fontFamily: fonts.ui,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end' as const,
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  modalTitle: { fontFamily: fonts.heading, fontSize: 18 },
  filterContent: { padding: Spacing.lg },
  filterLabel: {
    fontFamily: fonts.label,
    fontSize: 16,
    marginBottom: Spacing.md,
  },
  sportTypeContainer: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    marginBottom: Spacing.lg,
    gap: 8,
  },
  sportChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
  },
  sportChipSelected: {},
  sportChipText: { fontFamily: fonts.body, fontSize: 14 },
  sportChipTextSelected: {},
  modalActions: {
    flexDirection: 'row' as const,
    padding: Spacing.lg,
    borderTopWidth: 1,
    gap: 8,
  },
  clearButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: 9999,
    borderWidth: 1,
    alignItems: 'center' as const,
  },
  clearButtonText: { fontFamily: fonts.ui, fontSize: 16 },
  applyButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: 9999,
    alignItems: 'center' as const,
  },
  applyButtonText: {
    fontFamily: fonts.ui,
    fontSize: 16,
  },
});
