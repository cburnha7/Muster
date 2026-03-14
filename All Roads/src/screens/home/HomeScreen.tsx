import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { debounce } from '../../utils/performance';

// Components
import { SearchBar, SearchFilters } from '../../components/ui/SearchBar';
import { EventCard } from '../../components/ui/EventCard';
import { BookingCard } from '../../components/ui/BookingCard';
import { FormButton } from '../../components/forms/FormButton';
import { StepOutModal } from '../../components/bookings/StepOutModal';

// Services
import { authService } from '../../services/api/AuthService';

// Context
import { useAuth } from '../../context/AuthContext';

// Store
import { selectUser } from '../../store/slices/authSlice';
import { useGetEventsQuery, useGetUserBookingsQuery, useCancelBookingMutation, DEFAULT_EVENT_FILTERS } from '../../store/api/eventsApi';
import { selectHomeScreenEvents } from '../../store/selectors/eventSelectors';

// Theme
import { colors, Spacing } from '../../theme';

// Types
import { Event, Booking } from '../../types';
import { HomeStackParamList } from '../../navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type HomeScreenNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'HomeScreen'>;

export function HomeScreen(): JSX.Element {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { isLoading: authLoading } = useAuth();
  
  // Redux state
  const user = useSelector(selectUser);
  
  // RTK Query hooks
  const { 
    data: eventsData, 
    isLoading: eventsLoading, 
    error: eventsError,
    refetch: refetchEvents 
  } = useGetEventsQuery({
    filters: DEFAULT_EVENT_FILTERS,
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

  // RTK Query mutations
  const [cancelBookingMutation] = useCancelBookingMutation();

  // Use selector to get filtered events (max 10 for home screen)
  const rawEvents = eventsData?.data || [];
  const upcomingBookings = bookingsData?.data || [];
  
  // Filter out events that the user has already joined
  const bookedEventIds = new Set(upcomingBookings.map(b => b.eventId));
  const nearbyEvents = rawEvents
    .filter(event => !bookedEventIds.has(event.id))
    .slice(0, 10);

  console.log('🏠 HomeScreen - Events data:', {
    rawEventsCount: rawEvents.length,
    nearbyEventsCount: nearbyEvents.length,
    eventsLoading,
  });

  // Combined loading state
  const isLoading = eventsLoading || bookingsLoading;
  
  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stepOutModalVisible, setStepOutModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Refresh data
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([refetchEvents(), refetchBookings()]);
    setIsRefreshing(false);
  }, [refetchEvents, refetchBookings]);

  // Reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 Home screen focused - refetching data');
      if (!authLoading) {
        refetchEvents();
        refetchBookings();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authLoading])
  );

  // Handle search with debouncing for better performance
  const debouncedSearch = useMemo(
    () => debounce(async (query: string) => {
      if (query.trim()) {
        // Navigate to search results screen with query and filters
        (navigation as any).navigate('SearchResults', { 
          query, 
          filters: searchFilters,
        });
      }
    }, 300),
    [navigation, searchFilters]
  );

  const handleSearch = useCallback((query: string) => {
    debouncedSearch(query);
  }, [debouncedSearch]);

  // Handle event press
  const handleEventPress = useCallback((event: Event) => {
    navigation.navigate('EventDetails', { eventId: event.id });
  }, [navigation]);

  // Handle booking press - navigate to event details
  const handleBookingPress = useCallback((booking: Booking) => {
    navigation.navigate('EventDetails', { eventId: booking.eventId });
  }, [navigation]);

  // Handle step out (cancel booking)
  const handleStepOut = useCallback((booking: Booking) => {
    console.log('🚶 HomeScreen: handleStepOut called');
    console.log('🚶 Step out clicked for booking:', booking.id, 'event:', booking.eventId);
    console.log('🚶 Booking object:', JSON.stringify(booking, null, 2));
    setSelectedBooking(booking);
    setStepOutModalVisible(true);
    console.log('🚶 Modal should now be visible');
  }, []);

  const handleStepOutConfirm = useCallback(async () => {
    if (!selectedBooking) return;

    console.log('✅ User confirmed step out');
    try {
      console.log('🔄 Calling cancelBooking mutation with eventId:', selectedBooking.eventId, 'bookingId:', selectedBooking.id);
      
      // Use RTK Query mutation - this will automatically invalidate cache and refetch
      await cancelBookingMutation({
        eventId: selectedBooking.eventId,
        bookingId: selectedBooking.id,
      }).unwrap();
      
      console.log('✅ Successfully stepped out');
      
      // Close modal
      setStepOutModalVisible(false);
      setSelectedBooking(null);
      
      // Show success message
      Alert.alert('Success', 'You have stepped out of the event');
      
      // RTK Query will automatically refetch due to cache invalidation
      // But we can manually trigger it to be sure
      await Promise.all([refetchEvents(), refetchBookings()]);
    } catch (error) {
      console.error('❌ Error stepping out:', error);
      Alert.alert('Error', 'Failed to step out of the event. Please try again.');
    }
  }, [selectedBooking, cancelBookingMutation, refetchEvents, refetchBookings]);

  const handleStepOutCancel = useCallback(() => {
    console.log('❌ User cancelled step out');
    setStepOutModalVisible(false);
    setSelectedBooking(null);
  }, []);

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl 
          refreshing={isRefreshing} 
          onRefresh={handleRefresh}
          tintColor={colors.grass}
          colors={[colors.grass]}
        />
      }
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            Welcome back{user?.firstName ? `, ${user.firstName}` : ''}!
          </Text>
          <Text style={styles.subtitle}>Ready for your next sports adventure?</Text>
        </View>

        {/* Search Bar */}
        <SearchBar
          placeholder="Search events, facilities, rosters..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSearch={handleSearch}
          showFilters={true}
          filters={searchFilters}
          onFiltersChange={setSearchFilters}
          style={styles.searchBar}
        />

        {/* Upcoming Bookings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Bookings</Text>
            <TouchableOpacity onPress={() => (navigation as any).navigate('Bookings', { screen: 'BookingsList' })}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {eventsError ? (
            <View style={styles.errorState}>
              <Ionicons name="alert-circle-outline" size={48} color={colors.track} />
              <Text style={styles.errorText}>Unable to load events. Pull down to refresh.</Text>
            </View>
          ) : isLoading ? (
            <Text style={styles.placeholder}>Loading...</Text>
          ) : upcomingBookings.length > 0 ? (
            <View>
              {upcomingBookings.slice(0, 3).map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onPress={handleBookingPress}
                  onCancel={handleStepOut}
                  style={styles.bookingCard}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color={colors.soft} />
              <Text style={styles.emptyStateTitle}>No upcoming bookings</Text>
              <Text style={styles.emptyStateText}>Book your next sports activity!</Text>
              <TouchableOpacity 
                style={styles.emptyStateButtonStyle}
                onPress={() => (navigation as any).navigate('Events', { screen: 'EventsList' })}
              >
                <Text style={styles.emptyStateButtonText}>Find Events</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Nearby Events */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nearby Events</Text>
            <TouchableOpacity onPress={() => (navigation as any).navigate('Events', { screen: 'EventsList' })}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {eventsError ? (
            <View style={styles.errorState}>
              <Ionicons name="alert-circle-outline" size={48} color={colors.track} />
              <Text style={styles.errorText}>Unable to load events. Pull down to refresh.</Text>
            </View>
          ) : isLoading ? (
            <Text style={styles.placeholder}>Loading...</Text>
          ) : nearbyEvents.length > 0 ? (
            <View>
              {nearbyEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onPress={handleEventPress}
                  style={styles.eventCard}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="location-outline" size={64} color={colors.soft} />
              <Text style={styles.emptyStateTitle}>No nearby events</Text>
              <Text style={styles.emptyStateText}>Check back later or expand your search area</Text>
            </View>
          )}
        </View>
      </View>

      {/* Step Out Modal */}
      <StepOutModal
        visible={stepOutModalVisible}
        eventTitle={selectedBooking?.event?.title || 'Event'}
        onCancel={handleStepOutCancel}
        onConfirm={handleStepOutConfirm}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.chalk,
  },
  content: {
    padding: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: colors.soft,
    lineHeight: 24,
  },
  searchBar: {
    marginBottom: Spacing.lg,
    marginHorizontal: -4, // Offset the SearchBar's internal margin
  },
  section: {
    backgroundColor: colors.chalk,
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.ink,
  },
  seeAllText: {
    fontSize: 16,
    color: colors.sky,
    fontWeight: '500',
  },
  placeholder: {
    fontSize: 16,
    color: colors.soft,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  
  // Cards
  bookingCard: {
    marginHorizontal: 0,
    marginVertical: Spacing.xs,
  },
  eventCard: {
    marginHorizontal: 0,
    marginVertical: Spacing.xs,
  },
  
  // Empty States
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.ink,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.soft,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.lg,
  },
  emptyStateButton: {
    minWidth: 120,
  },
  emptyStateButtonStyle: {
    backgroundColor: colors.grass,
    borderRadius: 8,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.chalk,
  },
  
  // Error State
  errorState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  errorText: {
    fontSize: 16,
    color: colors.track,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 24,
  },
});