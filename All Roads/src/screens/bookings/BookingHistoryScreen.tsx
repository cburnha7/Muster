import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';

import { BookingCard } from '../../components/ui/BookingCard';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { FormInput } from '../../components/forms/FormInput';
import { colors } from '../../theme';

import { userService } from '../../services/api/UserService';
import { Booking, Event } from '../../types';
import { colors } from '../../theme';

export function BookingHistoryScreen(): JSX.Element {
  const navigation = useNavigation();

  // State
  const [bookings, setBookings] = useState<(Booking & { event: Event })[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<(Booking & { event: Event })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Load booking history
  const loadBookingHistory = useCallback(async (isRefresh = false, isLoadMore = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (isLoadMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const currentPage = isLoadMore ? pagination.page + 1 : 1;
      
      // Get booking history with date range (last 2 years)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(endDate.getFullYear() - 2);

      const response = await userService.getBookingHistory(
        startDate,
        endDate,
        {
          page: currentPage,
          limit: pagination.limit,
          sortBy: 'bookedAt',
          sortOrder: 'desc',
        }
      );

      if (isLoadMore) {
        setBookings(prev => [...prev, ...response.data]);
      } else {
        setBookings(response.data);
      }
      
      setPagination(response.pagination);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load booking history';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      setRefreshing(false);
    }
  }, [pagination.page, pagination.limit]);

  // Filter bookings based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredBookings(bookings);
    } else {
      const filtered = bookings.filter(booking =>
        booking.event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.event.facility?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.event.sportType.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredBookings(filtered);
    }
  }, [bookings, searchQuery]);

  // Handle booking press
  const handleBookingPress = (booking: Booking & { event: Event }) => {
    navigation.navigate('EventDetails' as never, { eventId: booking.event.id } as never);
  };

  // Load more bookings (pagination)
  const loadMoreBookings = () => {
    if (!isLoadingMore && pagination.page < pagination.totalPages && !searchQuery) {
      loadBookingHistory(false, true);
    }
  };

  // Refresh bookings
  const onRefresh = () => {
    setSearchQuery('');
    loadBookingHistory(true);
  };

  // Load bookings on screen focus
  useFocusEffect(
    useCallback(() => {
      loadBookingHistory();
    }, [loadBookingHistory])
  );

  // Render booking item
  const renderBookingItem = ({ item }: { item: Booking & { event: Event } }) => (
    <BookingCard
      booking={item}
      onPress={handleBookingPress}
      showEventDetails={true}
    />
  );

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="time-outline" size={64} color="#CCC" />
      <Text style={styles.emptyTitle}>
        {searchQuery ? 'No Matching Bookings' : 'No Booking History'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery 
          ? 'Try adjusting your search terms'
          : 'Your booking history will appear here once you start booking events'
        }
      </Text>
    </View>
  );

  // Render footer (for loading more)
  const renderFooter = () => {
    if (!isLoadingMore || searchQuery) return null;
    return (
      <View style={styles.footer}>
        <LoadingSpinner size="small" />
      </View>
    );
  };

  // Render search header
  const renderSearchHeader = () => (
    <View style={styles.searchContainer}>
      <FormInput
        placeholder="Search bookings..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        leftIcon="search-outline"
        containerStyle={styles.searchInput}
      />
      {searchQuery.length > 0 && (
        <TouchableOpacity
          style={styles.clearButton}
          onPress={() => setSearchQuery('')}
        >
          <Ionicons name="close-circle" size={20} color="#666" />
        </TouchableOpacity>
      )}
    </View>
  );

  if (error && bookings.length === 0) {
    return (
      <View style={styles.container}>
        <ScreenHeader
          title="Booking History"
          showBack={true}
          onBackPress={() => navigation.goBack()}
        />
        <ErrorDisplay
          message={error}
          onRetry={() => loadBookingHistory()}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Booking History"
        showBack={true}
        onBackPress={() => navigation.goBack()}
      />

      {renderSearchHeader()}

      {isLoading && bookings.length === 0 ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={filteredBookings}
          renderItem={renderBookingItem}
          keyExtractor={(item) => item.id}
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
        />
      )}

      {/* Statistics Footer */}
      {bookings.length > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{bookings.length}</Text>
            <Text style={styles.statLabel}>Total Bookings</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {bookings.filter(b => b.status === 'completed').length}
            </Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {bookings.filter(b => b.status === 'cancelled').length}
            </Text>
            <Text style={styles.statLabel}>Cancelled</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              ${bookings.reduce((sum, b) => sum + (b.event.price || 0), 0).toFixed(0)}
            </Text>
            <Text style={styles.statLabel}>Total Spent</Text>
          </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  searchInput: {
    flex: 1,
    marginBottom: 0,
  },
  clearButton: {
    padding: 8,
    marginLeft: 8,
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
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});