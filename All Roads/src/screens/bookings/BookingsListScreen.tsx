import React, { useState, useCallback } from 'react';
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

import { BookingCard } from '../../components/ui/BookingCard';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { FormButton } from '../../components/forms/FormButton';
import { getOptimalBatchSize, getOptimalWindowSize } from '../../utils/performance';

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

type BookingFilter = 'all' | 'upcoming' | 'past' | 'cancelled';

export function BookingsListScreen(): JSX.Element {
  const navigation = useNavigation();
  const dispatch = useDispatch();

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

  // Get filtered bookings
  const getFilteredBookings = (): Booking[] => {
    switch (activeFilter) {
      case 'upcoming':
        return upcomingBookings;
      case 'past':
        return pastBookings;
      case 'cancelled':
        return allBookings.filter(booking => booking.status === BookingStatus.CANCELLED);
      default:
        return allBookings;
    }
  };

  const filteredBookings = getFilteredBookings();

  // Load bookings
  const loadBookings = useCallback(async (isRefresh = false, isLoadMore = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (isLoadMore) {
        dispatch(setLoadingMore(true));
      } else {
        dispatch(setLoading(true));
      }

      const currentPage = isLoadMore ? pagination.page + 1 : 1;
      const statusFilter = activeFilter === 'all' ? undefined : 
                          activeFilter === 'upcoming' ? 'upcoming' :
                          activeFilter === 'past' ? 'past' : 
                          'cancelled';

      const response = await userService.getUserBookings(statusFilter as any, {
        page: currentPage,
        limit: pagination.limit,
      });

      if (isLoadMore) {
        dispatch(appendBookings(response));
      } else {
        dispatch(setBookings(response));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load bookings';
      dispatch(setError(errorMessage));
      
      if (isRefresh) {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, activeFilter, pagination.page, pagination.limit]);

  // Handle booking press
  const handleBookingPress = (booking: Booking) => {
    if (booking.event) {
      navigation.navigate('EventDetails' as never, { eventId: booking.event.id } as never);
    } else {
      navigation.navigate('BookingDetails' as never, { bookingId: booking.id } as never);
    }
  };

  // Handle cancel booking
  const handleCancelBooking = (booking: Booking) => {
    if (!booking.event) {
      Alert.alert('Error', 'Event information not available');
      return;
    }

    // Create a mock user object for validation (in real app, this would come from auth state)
    const mockUser = { id: booking.userId } as any;

    // Validate cancellation
    const BookingValidationService = require('../../services/booking').BookingValidationService;
    const validationResult = BookingValidationService.validateCancellation(
      booking.event,
      mockUser,
      booking.status
    );

    if (!validationResult.canBook) {
      Alert.alert('Cannot Step Out', validationResult.reason || 'Cannot leave this event');
      return;
    }

    // Calculate refund amount
    const refundAmount = BookingValidationService.calculateRefundAmount(
      booking.event.price,
      booking.event.startTime
    );

    let alertMessage = `Are you sure you want to step out of "${booking.event.title}"?`;
    
    if (validationResult.warnings && validationResult.warnings.length > 0) {
      alertMessage += '\n\n' + validationResult.warnings.join('\n');
    }
    
    if (booking.event.price > 0) {
      alertMessage += `\n\nRefund amount: $${refundAmount.toFixed(2)}`;
    }

    Alert.alert(
      'Step Out',
      alertMessage,
      [
        { text: 'Stay In', style: 'cancel' },
        {
          text: 'Step Out',
          style: 'destructive',
          onPress: () => confirmCancelBooking(booking, refundAmount),
        },
      ]
    );
  };

  const confirmCancelBooking = async (booking: Booking, refundAmount: number) => {
    try {
      await eventService.cancelBooking(booking.event!.id, booking.id);
      
      dispatch(cancelBookingAction({
        bookingId: booking.id,
        cancellationReason: 'Cancelled by user',
      }));

      // Show success message with refund info
      const BookingValidationService = require('../../services/booking').BookingValidationService;
      const confirmationMessage = BookingValidationService.getCancellationConfirmationMessage(
        booking.event!,
        refundAmount
      );

      Alert.alert('Stepped Out', confirmationMessage);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel booking';
      Alert.alert('Error', errorMessage);
    }
  };

  // Handle filter change
  const handleFilterChange = (filter: BookingFilter) => {
    setActiveFilter(filter);
  };

  // Load more bookings (pagination)
  const loadMoreBookings = () => {
    if (!isLoadingMore && pagination.page < pagination.totalPages) {
      loadBookings(false, true);
    }
  };

  // Refresh bookings
  const onRefresh = () => {
    loadBookings(true);
  };

  // Load bookings on screen focus or filter change
  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [loadBookings])
  );

  // Render booking item
  const renderBookingItem = useCallback(({ item }: { item: Booking }) => (
    <BookingCard
      booking={item}
      onPress={handleBookingPress}
      onCancel={item.status === BookingStatus.CONFIRMED ? () => handleCancelBooking(item) : undefined}
    />
  ), [handleBookingPress, handleCancelBooking]);

  const keyExtractor = useCallback((item: Booking) => item.id, []);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: 150, // Approximate height of BookingCard
      offset: 150 * index,
      index,
    }),
    []
  );

  // Render filter tabs
  const renderFilterTabs = () => {
    const filters: { key: BookingFilter; label: string; count?: number }[] = [
      { key: 'upcoming', label: 'Upcoming', count: upcomingBookings.length },
      { key: 'past', label: 'Past', count: pastBookings.length },
      { key: 'cancelled', label: 'Cancelled', count: allBookings.filter(b => b.status === BookingStatus.CANCELLED).length },
      { key: 'all', label: 'All', count: allBookings.filter(b => b.status !== BookingStatus.CANCELLED).length },
    ];

    return (
      <View style={styles.filterTabs}>
        {filters.map((filter) => (
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
            {filter.count !== undefined && filter.count > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{filter.count}</Text>
              </View>
            )}
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
            title: 'No Upcoming Bookings',
            subtitle: 'Book an event to see it here',
            icon: 'calendar-outline',
          };
        case 'past':
          return {
            title: 'No Past Bookings',
            subtitle: 'Your completed bookings will appear here',
            icon: 'time-outline',
          };
        case 'cancelled':
          return {
            title: 'No Cancelled Bookings',
            subtitle: 'Cancelled bookings will appear here',
            icon: 'close-circle-outline',
          };
        default:
          return {
            title: 'No Bookings Yet',
            subtitle: 'Start booking events to see them here',
            icon: 'calendar-outline',
          };
      }
    };

    const emptyState = getEmptyMessage();

    return (
      <View style={styles.emptyState}>
        <Ionicons name={emptyState.icon as any} size={64} color="#CCC" />
        <Text style={styles.emptyTitle}>{emptyState.title}</Text>
        <Text style={styles.emptySubtitle}>{emptyState.subtitle}</Text>
        {activeFilter === 'upcoming' && (
          <FormButton
            title="Browse Events"
            onPress={() => navigation.navigate('Events' as never)}
            style={styles.browseButton}
          />
        )}
      </View>
    );
  };

  // Render footer (for loading more)
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
      <View style={styles.container}>
        <ScreenHeader
          title="My Bookings"
          showBack={false}
        />
        <ErrorDisplay
          message={error}
          onRetry={() => loadBookings()}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="My Bookings"
        showBack={false}
      />

      {renderFilterTabs()}

      {isLoading && filteredBookings.length === 0 ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={filteredBookings}
          renderItem={renderBookingItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          contentContainerStyle={filteredBookings.length === 0 ? styles.emptyContainer : undefined}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#007AFF']}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginHorizontal: 4,
  },
  activeFilterTab: {
    backgroundColor: '#007AFF',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeFilterTabText: {
    color: '#FFFFFF',
  },
  filterBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
    minWidth: 20,
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
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
  browseButton: {
    paddingHorizontal: 32,
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});