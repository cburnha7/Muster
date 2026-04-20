import React, { useState, useCallback, useEffect } from 'react';
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
import { useAuth } from '../../context/AuthContext';

import { BookingCard } from '../../components/ui/BookingCard';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { StepOutModal } from '../../components/bookings/StepOutModal';
import {
  getOptimalBatchSize,
  getOptimalWindowSize,
} from '../../utils/performance';

import { userService } from '../../services/api/UserService';
import { eventService } from '../../services/api/EventService';
import {
  setLoading,
  setLoadingMore,
  setError,
  setBookings,
  appendBookings,
  cancelBooking as cancelBookingAction,
  selectBookings,
  selectUpcomingBookings,
  selectPastBookings,
  selectBookingsPagination,
  selectBookingsLoading,
  selectBookingsLoadingMore,
  selectBookingsError,
} from '../../store/slices/bookingsSlice';
import { Booking, BookingStatus } from '../../types';
import { colors, fonts, Spacing, useTheme } from '../../theme';
import { tokenColors } from '../../theme/tokens';

type BookingFilter = 'all' | 'upcoming' | 'past' | 'cancelled';

export function BookingsListScreen(): JSX.Element {
  const { colors: themeColors } = useTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useAuth();

  // Redux state
  const allBookings = useSelector(selectBookings);
  const upcomingBookings = useSelector(selectUpcomingBookings);
  const pastBookings = useSelector(selectPastBookings);
  const pagination = useSelector(selectBookingsPagination);
  const isLoading = useSelector(selectBookingsLoading);
  const isLoadingMore = useSelector(selectBookingsLoadingMore);
  const error = useSelector(selectBookingsError);

  // Local state
  const [activeFilter, setActiveFilter] = useState<BookingFilter>('upcoming');
  const [refreshing, setRefreshing] = useState(false);
  const [showStepOutModal, setShowStepOutModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Get filtered bookings
  const getFilteredBookings = (): Booking[] => {
    switch (activeFilter) {
      case 'upcoming':
        return upcomingBookings;
      case 'past':
        return pastBookings;
      case 'cancelled': {
        const cancelled = allBookings.filter(
          booking => booking.status === BookingStatus.CANCELLED
        );
        const now = new Date();
        // Sort: nearest future events first, then past events most-recent-first
        return cancelled.sort((a, b) => {
          const aTime = a.event?.startTime
            ? new Date(a.event.startTime).getTime()
            : 0;
          const bTime = b.event?.startTime
            ? new Date(b.event.startTime).getTime()
            : 0;
          const aFuture = aTime >= now.getTime();
          const bFuture = bTime >= now.getTime();
          // Future events come before past events
          if (aFuture && !bFuture) return -1;
          if (!aFuture && bFuture) return 1;
          // Both future: nearest first (ascending)
          if (aFuture && bFuture) return aTime - bTime;
          // Both past: most recent first (descending)
          return bTime - aTime;
        });
      }
      default:
        return allBookings;
    }
  };

  const filteredBookings = getFilteredBookings();

  // Load bookings
  const loadBookings = useCallback(
    async (isRefresh = false, isLoadMore = false) => {
      if (!isAuthenticated || !user) {
        return;
      }

      try {
        if (isRefresh) {
          setRefreshing(true);
        } else if (isLoadMore) {
          dispatch(setLoadingMore(true));
        } else {
          dispatch(setLoading(true));
        }

        const currentPage = isLoadMore ? pagination.page + 1 : 1;
        const statusFilter =
          activeFilter === 'all'
            ? undefined
            : activeFilter === 'upcoming'
              ? 'upcoming'
              : activeFilter === 'past'
                ? 'past'
                : 'cancelled';

        const response = await userService.getUserBookings(
          statusFilter as any,
          {
            page: currentPage,
            limit: pagination.limit,
          }
        );

        if (isLoadMore) {
          dispatch(appendBookings(response));
        } else {
          dispatch(setBookings(response));
        }
      } catch (err: any) {
        if (err?.code === 'SESSION_EXPIRED') {
          return;
        }

        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load bookings';
        dispatch(setError(errorMessage));

        if (isRefresh) {
          Alert.alert('Error', errorMessage);
        }
      } finally {
        setRefreshing(false);
      }
    },
    [
      dispatch,
      activeFilter,
      pagination.page,
      pagination.limit,
      isAuthenticated,
      user,
    ]
  );

  // Handle booking press
  const handleBookingPress = (booking: Booking) => {
    // Past or completed bookings go to the Debrief screen
    if (
      booking.event &&
      (activeFilter === 'past' || booking.status === BookingStatus.CONFIRMED)
    ) {
      const endTime = booking.event.endTime
        ? new Date(booking.event.endTime)
        : null;
      const isPast = endTime && endTime < new Date();

      if (isPast) {
        const hoursSinceEnd = endTime
          ? (Date.now() - endTime.getTime()) / (1000 * 60 * 60)
          : Infinity;
        const withinWindow = hoursSinceEnd <= 24;
        const alreadySubmitted = booking.debriefSubmitted === true;

        // Within 24h and not submitted → interactive debrief
        // Otherwise → readonly debrief summary
        navigation.navigate(
          'Debrief' as never,
          {
            eventId: booking.event.id,
            readonly: !withinWindow || alreadySubmitted,
          } as never
        );
        return;
      }
    }

    // Upcoming / other bookings go to event details
    if (booking.event) {
      navigation.navigate(
        'EventDetails' as never,
        { eventId: booking.event.id } as never
      );
    } else {
      navigation.navigate(
        'BookingDetails' as never,
        { bookingId: booking.id } as never
      );
    }
  };

  // Handle cancel booking
  const handleCancelBooking = (booking: Booking) => {
    if (!booking.event) {
      Alert.alert('Error', 'Event information not available');
      return;
    }

    const mockUser = { id: booking.userId } as any;

    const BookingValidationService =
      require('../../services/booking').BookingValidationService;
    const validationResult = BookingValidationService.validateCancellation(
      booking.event,
      mockUser,
      booking.status
    );

    if (!validationResult.canBook) {
      Alert.alert(
        'Cannot Leave',
        validationResult.reason || 'Cannot leave this event'
      );
      return;
    }

    setSelectedBooking(booking);
    setShowStepOutModal(true);
  };

  const confirmCancelBooking = async () => {
    if (!selectedBooking || !selectedBooking.event) {
      return;
    }

    try {
      await eventService.cancelBooking(
        selectedBooking.event.id,
        selectedBooking.id
      );

      dispatch(
        cancelBookingAction({
          bookingId: selectedBooking.id,
          cancellationReason: 'Cancelled by user',
        })
      );

      setShowStepOutModal(false);
      setSelectedBooking(null);
      await loadBookings(true);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to cancel booking';
      Alert.alert('Error', errorMessage);
      setShowStepOutModal(false);
      setSelectedBooking(null);
    }
  };

  // Handle filter change
  const handleFilterChange = (filter: BookingFilter) => {
    setActiveFilter(filter);
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      loadBookings();
    }
  }, [activeFilter]);

  const loadMoreBookings = () => {
    if (!isLoadingMore && pagination.page < pagination.totalPages) {
      loadBookings(false, true);
    }
  };

  const onRefresh = () => {
    loadBookings(true);
  };

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated && user) {
        loadBookings();
      }
    }, [loadBookings, isAuthenticated, user])
  );

  // Show not authenticated state
  if (!isAuthenticated || !user) {
    return (
      <View
        style={[styles.container, { backgroundColor: themeColors.bgScreen }]}
      >
        <View style={styles.emptyState}>
          <Ionicons name="log-in-outline" size={64} color={colors.inkFaint} />
          <Text style={styles.emptyTitle}>Not Logged In</Text>
          <Text style={styles.emptySubtitle}>
            Please log in to view your schedule
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => navigation.navigate('Auth' as never)}
          >
            <Text style={styles.browseButtonText}>Log In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const renderBookingItem = useCallback(
    ({ item }: { item: Booking }) => (
      <BookingCard
        booking={item}
        onPress={handleBookingPress}
        onCancel={
          item.status === BookingStatus.CONFIRMED
            ? () => handleCancelBooking(item)
            : undefined
        }
        hidePrice={activeFilter === 'past'}
      />
    ),
    [handleBookingPress, handleCancelBooking, activeFilter]
  );

  const keyExtractor = useCallback((item: Booking) => item.id, []);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: 150,
      offset: 150 * index,
      index,
    }),
    []
  );

  // Render filter tabs
  const renderFilterTabs = () => {
    const filters: { key: BookingFilter; label: string }[] = [
      { key: 'upcoming', label: 'Upcoming' },
      { key: 'past', label: 'Past' },
      { key: 'cancelled', label: 'Cancelled' },
    ];

    return (
      <View style={styles.filterTabs}>
        {filters.map(filter => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterTab,
              activeFilter === filter.key && styles.activeFilterTab,
            ]}
            onPress={() => handleFilterChange(filter.key)}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === filter.key && styles.activeFilterTabText,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Render empty state
  const renderEmptyState = () => {
    const getEmptyMessage = () => {
      switch (activeFilter) {
        case 'upcoming':
          return {
            title: 'No Upcoming Events',
            subtitle: 'Join an event to see it here',
            icon: 'calendar-outline',
          };
        case 'past':
          return {
            title: 'No Past Events',
            subtitle: 'Your completed events will appear here',
            icon: 'time-outline',
          };
        case 'cancelled':
          return {
            title: 'No Cancelled Events',
            subtitle: 'Cancelled events will appear here',
            icon: 'close-circle-outline',
          };
        default:
          return {
            title: 'Nothing Scheduled',
            subtitle: 'Start joining events to see them here',
            icon: 'calendar-outline',
          };
      }
    };

    const emptyState = getEmptyMessage();

    return (
      <View style={styles.emptyState}>
        <Ionicons
          name={emptyState.icon as any}
          size={64}
          color={colors.inkFaint}
        />
        <Text style={styles.emptyTitle}>{emptyState.title}</Text>
        <Text style={styles.emptySubtitle}>{emptyState.subtitle}</Text>
        {activeFilter === 'upcoming' && (
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => navigation.navigate('Home' as never)}
          >
            <Text style={styles.browseButtonText}>Browse Events</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footer}>
        <LoadingSpinner size="small" />
      </View>
    );
  };

  if (error && filteredBookings.length === 0) {
    return (
      <View
        style={[styles.container, { backgroundColor: themeColors.bgScreen }]}
      >
        <ErrorDisplay message={error} onRetry={() => loadBookings()} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.bgScreen }]}>
      {renderFilterTabs()}

      {isLoading && filteredBookings.length === 0 ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={filteredBookings}
          renderItem={renderBookingItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          contentContainerStyle={
            filteredBookings.length === 0
              ? styles.emptyContainer
              : styles.listContent
          }
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          onEndReached={loadMoreBookings}
          onEndReachedThreshold={0.1}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={getOptimalBatchSize()}
          updateCellsBatchingPeriod={50}
          initialNumToRender={getOptimalBatchSize()}
          windowSize={getOptimalWindowSize()}
        />
      )}

      <StepOutModal
        visible={showStepOutModal}
        eventTitle={selectedBooking?.event?.title || 'Event'}
        onCancel={() => {
          setShowStepOutModal(false);
          setSelectedBooking(null);
        }}
        onConfirm={confirmCancelBooking}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: 9999,
    marginHorizontal: 2,
  },
  activeFilterTab: {
    backgroundColor: colors.pine,
  },
  filterTabText: {
    fontSize: 14,
    color: colors.inkFaint,
    fontFamily: fonts.label,
  },
  activeFilterTabText: {
    color: tokenColors.white,
    fontFamily: fonts.headingSemi,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  listContent: {
    paddingBottom: 80,
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
    fontFamily: fonts.headingSemi,
    color: colors.ink,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.inkFaint,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.lg,
  },
  browseButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: colors.pine,
    borderRadius: 9999,
  },
  browseButtonText: {
    fontSize: 16,
    fontFamily: fonts.headingSemi,
    color: tokenColors.white,
  },
  footer: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
});
