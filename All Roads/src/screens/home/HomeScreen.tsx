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
import { eventService } from '../../services/api/EventService';
import { userService } from '../../services/api/UserService';
import { authService } from '../../services/api/AuthService';

// Context
import { useAuth } from '../../context/AuthContext';

// Store
import { selectUser } from '../../store/slices/authSlice';
import { selectUpcomingBookings } from '../../store/slices/bookingsSlice';
import { setBookings } from '../../store/slices/bookingsSlice';

// Types
import { Event, Booking } from '../../types';
import { HomeStackParamList } from '../../navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type HomeScreenNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'HomeScreen'>;

export function HomeScreen(): JSX.Element {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const dispatch = useDispatch();
  const { isLoading: authLoading } = useAuth();
  
  // Redux state
  const user = useSelector(selectUser);
  const upcomingBookings = useSelector(selectUpcomingBookings);
  
  // Local state
  const [nearbyEvents, setNearbyEvents] = useState<Event[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stepOutModalVisible, setStepOutModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Load initial data
  const loadHomeData = useCallback(async (skipCache = false) => {
    try {
      setIsLoading(true);
      
      // Ensure auth service is initialized before making API calls
      await authService.ensureInitialized();
      
      // Fetch real data from backend - skip cache if requested
      const [eventsResponse, bookingsResponse] = await Promise.all([
        eventService.getEvents({}, { page: 1, limit: 20 }, skipCache),
        userService.getUserBookings('upcoming', { page: 1, limit: 20 }, skipCache),
      ]);
      
      console.log('HomeScreen: Loaded bookings:', bookingsResponse.data.length);
      console.log('HomeScreen: Bookings:', bookingsResponse.data.map(b => ({
        id: b.id,
        eventId: b.eventId,
        status: b.status,
        paymentStatus: b.paymentStatus,
        eventTitle: b.event?.title,
        startTime: b.event?.startTime,
      })));
      
      // Set bookings in Redux store
      dispatch(setBookings(bookingsResponse));
      
      console.log('HomeScreen: After dispatch');
      
      // Get booked event IDs to filter them out from nearby events
      const bookedEventIds = new Set(bookingsResponse.data.map(booking => booking.eventId));
      console.log('HomeScreen: Booked event IDs:', Array.from(bookedEventIds));
      
      // Filter out events that user has already booked
      const filteredEvents = eventsResponse.data.filter(event => !bookedEventIds.has(event.id));
      console.log('HomeScreen: Total events:', eventsResponse.data.length, 'Filtered events:', filteredEvents.length);
      setNearbyEvents(filteredEvents);
      
    } catch (error) {
      console.error('Error loading home data:', error);
      Alert.alert('Error', 'Failed to load home screen data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  // Refresh data
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadHomeData();
    setIsRefreshing(false);
  }, [loadHomeData]);

  // Load data on mount, but wait for auth to be ready
  useEffect(() => {
    if (!authLoading) {
      loadHomeData();
    }
  }, [authLoading, loadHomeData]);

  // Reload data when screen comes into focus (e.g., after creating/deleting an event)
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 Home screen focused - reloading data with skipCache=true');
      if (!authLoading) {
        loadHomeData(true); // Skip cache on focus to get fresh data
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authLoading]) // Only depend on authLoading to avoid excessive reloads
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
    console.log('🚶 Step out clicked for booking:', booking.id, 'event:', booking.eventId);
    setSelectedBooking(booking);
    setStepOutModalVisible(true);
  }, []);

  const handleStepOutConfirm = useCallback(async () => {
    if (!selectedBooking) return;

    console.log('✅ User confirmed step out');
    try {
      console.log('🔄 Calling cancelBooking with eventId:', selectedBooking.eventId, 'bookingId:', selectedBooking.id);
      await eventService.cancelBooking(selectedBooking.eventId, selectedBooking.id);
      console.log('✅ Successfully stepped out');
      
      // Close modal
      setStepOutModalVisible(false);
      setSelectedBooking(null);
      
      // Show success message
      Alert.alert('Success', 'You have stepped out of the event');
      
      // Reload data to reflect changes
      await loadHomeData(true);
    } catch (error) {
      console.error('❌ Error stepping out:', error);
      Alert.alert('Error', 'Failed to step out of the event. Please try again.');
    }
  }, [selectedBooking, loadHomeData]);

  const handleStepOutCancel = useCallback(() => {
    console.log('❌ User cancelled step out');
    setStepOutModalVisible(false);
    setSelectedBooking(null);
  }, []);

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
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
          placeholder="Search events, facilities, teams..."
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
          
          {isLoading ? (
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
              <Ionicons name="calendar-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyStateTitle}>No upcoming bookings</Text>
              <Text style={styles.emptyStateText}>Book your next sports activity!</Text>
              <FormButton
                title="Find Events"
                onPress={() => (navigation as any).navigate('Events', { screen: 'EventsList' })}
                variant="primary"
                size="small"
                style={styles.emptyStateButton}
              />
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
          
          {isLoading ? (
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
              <Ionicons name="location-outline" size={48} color="#9CA3AF" />
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
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  searchBar: {
    marginBottom: 20,
    marginHorizontal: -4, // Offset the SearchBar's internal margin
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  seeAllText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  placeholder: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  
  // Cards
  bookingCard: {
    marginHorizontal: 0,
    marginVertical: 4,
  },
  eventCard: {
    marginHorizontal: 0,
    marginVertical: 4,
  },
  
  // Empty States
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyStateButton: {
    minWidth: 120,
  },
});