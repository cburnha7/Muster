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
import { useAuth } from '../../context/AuthContext';

import { BookingCard } from '../../components/ui/BookingCard';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { FormButton } from '../../components/forms/FormButton';
import { StepOutModal } from '../../components/bookings/StepOutModal';
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
      case 'cancelled':
        return allBookings.filter(booking => booking.status === BookingStatus.CANCELLED);
      default:
        return allBookings;
    }
  };

  const filteredBookings = getFilteredBookings();

  // Load bookings
  const loadBookings = useCallback(async (isRefresh = false, isLoadMore = false) => {
    // Don't load if not authenticated
    if (!isAuthenticated || !user) {
      console.log('BookingsListScreen: Not authenticated, skipping load');
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
  }, [dispatch, activeFilter, pagination.page, pagination.limit, isAuthenticated, user]);

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

      // Create a mock user object for validation
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

      // Show the modal
      setSelectedBooking(booking);
      setShowStepOutModal(true);
    }

  const confirmCancelBooking = async () => {
    if (!selectedBooking || !selectedBooking.event) {
      return;
    }

    try {
      await eventService.cancelBooking(selectedBooking.event.id, selectedBooking.id);
      
      dispatch(cancelBookingAction({
        bookingId: selectedBooking.id,
        cancellationReason: 'Cancelled by user',
      }));

      // Close modal and clear selection
      setShowStepOutModal(false);
      setSelectedBooking(null);

      // Reload bookings
      await loadBookings(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel booking';
      Alert.alert('Error', errorMessage);
      setShowStepOutModal(false);
      setSelectedBooking(null);
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
      if (isAuthenticated && user) {
        loadBookings();
      }
    }, [loadBookings, isAuthenticated, user])
  );

  // Show not authenticated state
  if (!isAuthenticated || !user) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="log-in-outline" size={64} color="#E0E0E0" />
          <Text style={styles.emptyTitle}>Not Logged In</Text>
          <Text style={styles.emptySubtitle}>Please log in to view your bookings</Text>
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
            subtitle: 'Join an event to see it here',
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
            subtitle: 'Start joining events to see them here',
            icon: 'calendar-outline',
          };
      }
    };

    const emptyState = getEmptyMessage();

    return (
      <View style={styles.emptyState}>
        <Ionicons name={emptyState.icon as any} size={64} color="#E0E0E0" />
        <Text style={styles.emptyTitle}>{emptyState.title}</Text>
        <Text style={styles.emptySubtitle}>{emptyState.subtitle}</Text>
        {activeFilter === 'upcoming' && (
          <TouchableOpacity 
            style={styles.browseButton}
            onPress={() => navigation.navigate('Events' as never)}
          >
            <Text style={styles.browseButtonText}>Browse Events</Text>
          </TouchableOpacity>
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
        <ErrorDisplay
          message={error}
          onRetry={() => loadBookings()}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
              tintColor="#3D8C5E"
              colors={['#3D8C5E']}
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

      {/* Step Out Modal */}
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
    backgroundColor: '#F7F4EE',
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
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
    backgroundColor: '#3D8C5E',
  },
  filterTabText: {
    fontSize: 14,
    color: '#666',
  },
  activeFilterTabText: {
    color: '#FFFFFF',
    fontWeight: '600',
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
    paddingVertical: 48,
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
    color: '#999',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  browseButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3D8C5E',
    borderRadius: 8,
  },
  browseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});