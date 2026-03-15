import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { debounce } from '../../utils/performance';

// Components
import { SearchBar, SearchFilters } from '../../components/ui/SearchBar';
import { BookingCard } from '../../components/ui/BookingCard';
import { FormButton } from '../../components/forms/FormButton';
import { StepOutModal } from '../../components/bookings/StepOutModal';

// Services
import { debriefService } from '../../services/api/DebriefService';
import { userService, RosterInvitation, LeagueInvitation } from '../../services/api/UserService';

// Context
import { useAuth } from '../../context/AuthContext';

// Store
import { selectUser } from '../../store/slices/authSlice';
import { useGetEventsQuery, useGetUserBookingsQuery, useCancelBookingMutation, DEFAULT_EVENT_FILTERS } from '../../store/api/eventsApi';

// Theme
import { colors, fonts, Spacing } from '../../theme';

// Types
import { Booking } from '../../types';
import { HomeStackParamList } from '../../navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type HomeScreenNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'HomeScreen'>;

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return 'just now';
  if (diffHours === 1) return '1 hour ago';
  return `${diffHours} hours ago`;
}

export function HomeScreen(): JSX.Element {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { isLoading: authLoading } = useAuth();
  
  // Redux state
  const user = useSelector(selectUser);
  
  // RTK Query hooks
  const { 
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
  const upcomingBookings = bookingsData?.data || [];

  // Debrief state
  const [debriefEvents, setDebriefEvents] = useState<Booking[]>([]);
  const [debriefLoading, setDebriefLoading] = useState(false);

  // Invitations state
  const [rosterInvitations, setRosterInvitations] = useState<RosterInvitation[]>([]);
  const [leagueInvitations, setLeagueInvitations] = useState<LeagueInvitation[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  // Live events — derived from bookings where now is between start and end
  const [now, setNow] = useState(() => new Date());
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for live indicator
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Poll every 30s to keep live section current
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const liveBookings = useMemo(() => {
    const t = now.getTime();
    return (bookingsData?.data || []).filter((b) => {
      if (!b.event?.startTime || !b.event?.endTime) return false;
      if (b.status !== 'confirmed') return false;
      const start = new Date(b.event.startTime).getTime();
      const end = new Date(b.event.endTime).getTime();
      return t >= start && t < end;
    });
  }, [bookingsData, now]);

  // Exclude live events from the upcoming list
  const liveIds = useMemo(() => new Set(liveBookings.map((b) => b.id)), [liveBookings]);
  const upcomingOnly = useMemo(
    () => upcomingBookings.filter((b) => !liveIds.has(b.id)),
    [upcomingBookings, liveIds]
  );

  // Combined loading state
  const isLoading = eventsLoading || bookingsLoading;
  
  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stepOutModalVisible, setStepOutModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Load debrief-eligible events
  const loadDebriefEvents = useCallback(async () => {
    try {
      setDebriefLoading(true);
      const result = await debriefService.getDebriefEvents();
      setDebriefEvents(result.data || []);
    } catch (err) {
      console.error('Failed to load debrief events:', err);
      setDebriefEvents([]);
    } finally {
      setDebriefLoading(false);
    }
  }, []);

  // Load pending invitations
  const loadInvitations = useCallback(async () => {
    try {
      setInvitationsLoading(true);
      const result = await userService.getInvitations();
      setRosterInvitations(result.rosterInvitations || []);
      setLeagueInvitations(result.leagueInvitations || []);
    } catch (err) {
      console.error('Failed to load invitations:', err);
    } finally {
      setInvitationsLoading(false);
    }
  }, []);

  // Accept roster invitation
  const handleAcceptRoster = useCallback(async (inv: RosterInvitation) => {
    setAcceptingId(inv.id);
    try {
      await userService.acceptRosterInvitation(inv.rosterId);
      Alert.alert('Joined', `You joined ${inv.rosterName}`);
      loadInvitations();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to join roster');
    } finally {
      setAcceptingId(null);
    }
  }, [loadInvitations]);

  // Navigate to roster details for league invitation
  const handleLeagueInvitationPress = useCallback((inv: LeagueInvitation) => {
    if (inv.rosterId) {
      (navigation as any).navigate('Teams', {
        screen: 'TeamDetails',
        params: { teamId: inv.rosterId },
      });
    }
  }, [navigation]);

  // Refresh data
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([refetchEvents(), refetchBookings(), loadDebriefEvents(), loadInvitations()]);
    setIsRefreshing(false);
  }, [refetchEvents, refetchBookings, loadDebriefEvents, loadInvitations]);

  // Reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (!authLoading) {
        refetchEvents();
        refetchBookings();
        loadDebriefEvents();
        loadInvitations();
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

  // Handle debrief press - navigate to debrief screen
  const handleDebriefPress = useCallback((booking: Booking) => {
    navigation.navigate('Debrief', { eventId: booking.eventId });
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
      Alert.alert('Error', 'Failed to leave the event. Please try again.');
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

        {/* Live Events — only shown when there are events in progress */}
        {liveBookings.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.liveSectionTitleRow}>
                <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
                <Text style={styles.sectionTitle}>Live Now</Text>
              </View>
            </View>
            {liveBookings.map((booking) => (
              <View key={booking.id}>
                <View style={styles.liveBadgeRow}>
                  <View style={styles.liveBadge}>
                    <View style={styles.liveBadgeDot} />
                    <Text style={styles.liveBadgeText}>LIVE</Text>
                  </View>
                </View>
                <BookingCard
                  booking={booking}
                  onPress={handleBookingPress}
                  style={[styles.bookingCard, styles.liveCard]}
                />
              </View>
            ))}
          </View>
        )}

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
          ) : upcomingOnly.length > 0 ? (
            <View>
              {upcomingOnly.slice(0, 3).map((booking) => (
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
              <Text style={styles.emptyStateText}>Join up for your next sports activity!</Text>
              <TouchableOpacity 
                style={styles.emptyStateButtonStyle}
                onPress={() => (navigation as any).navigate('Events', { screen: 'EventsList' })}
              >
                <Text style={styles.emptyStateButtonText}>Find Events</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Debrief */}
        {debriefEvents.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Debrief</Text>
            </View>
            {debriefEvents.map((booking) => {
              const endTime = booking.event?.endTime
                ? new Date(booking.event.endTime)
                : null;
              return (
                <TouchableOpacity
                  key={booking.id}
                  style={styles.debriefCard}
                  onPress={() => handleDebriefPress(booking)}
                  activeOpacity={0.7}
                >
                  <View style={styles.debriefCardContent}>
                    <Ionicons name="chatbubbles-outline" size={24} color={colors.court} />
                    <View style={styles.debriefCardText}>
                      <Text style={styles.debriefTitle} numberOfLines={1}>
                        {booking.event?.title || 'Event'}
                      </Text>
                      <Text style={styles.debriefMeta}>
                        {booking.event?.sportType || ''}
                        {endTime ? ` · Ended ${formatTimeAgo(endTime)}` : ''}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.inkFaint} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* Invitations */}
      {(rosterInvitations.length > 0 || leagueInvitations.length > 0) && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Invitations</Text>
            <View style={styles.inviteBadge}>
              <Text style={styles.inviteBadgeText}>
                {rosterInvitations.length + leagueInvitations.length}
              </Text>
            </View>
          </View>

          {/* Roster invitations */}
          {rosterInvitations.map((inv) => (
            <View key={inv.id} style={styles.inviteCard}>
              <View style={styles.inviteIconWrap}>
                <Ionicons name="shield-outline" size={22} color={colors.chalk} />
              </View>
              <View style={styles.inviteInfo}>
                <Text style={styles.inviteName} numberOfLines={1}>{inv.rosterName}</Text>
                <Text style={styles.inviteMeta}>
                  {inv.sportType ? `${inv.sportType} · ` : ''}{inv.playerCount} players
                </Text>
              </View>
              <TouchableOpacity
                style={styles.joinUpButton}
                onPress={() => handleAcceptRoster(inv)}
                disabled={acceptingId === inv.id}
                activeOpacity={0.7}
              >
                <Text style={styles.joinUpButtonText}>
                  {acceptingId === inv.id ? '...' : 'Join Up'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* League invitations */}
          {leagueInvitations.map((inv) => (
            <TouchableOpacity
              key={inv.id}
              style={styles.inviteCard}
              onPress={() => handleLeagueInvitationPress(inv)}
              activeOpacity={0.7}
            >
              <View style={[styles.inviteIconWrap, { backgroundColor: colors.court }]}>
                <Ionicons name="trophy-outline" size={22} color={colors.chalk} />
              </View>
              <View style={styles.inviteInfo}>
                <Text style={styles.inviteName} numberOfLines={1}>{inv.leagueName}</Text>
                <Text style={styles.inviteMeta}>
                  {inv.rosterName ? `via ${inv.rosterName} · ` : ''}{inv.sportType || 'League'}
                </Text>
              </View>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>Pending</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
            </TouchableOpacity>
          ))}
        </View>
      )}

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
  liveCard: {
    borderWidth: 1,
    borderColor: colors.grass + '40',
  },
  liveSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.grass,
  },
  liveBadgeRow: {
    marginBottom: 4,
    marginLeft: 4,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.grass + '15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 5,
  },
  liveBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.grass,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.grass,
    letterSpacing: 1,
  },
  eventCard: {
    marginHorizontal: 0,
    marginVertical: Spacing.xs,
  },
  
  // Debrief cards
  debriefCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  debriefCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  debriefCardText: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  debriefTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  debriefMeta: {
    fontSize: 13,
    color: colors.inkFaint,
    marginTop: 2,
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
  // Invitations
  inviteBadge: {
    backgroundColor: colors.court,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  inviteBadgeText: {
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.chalk,
    fontWeight: '700',
  },
  inviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  inviteIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.grass,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  inviteInfo: {
    flex: 1,
    marginRight: 12,
  },
  inviteName: {
    fontFamily: fonts.ui,
    fontSize: 15,
    color: colors.ink,
  },
  inviteMeta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkFaint,
    marginTop: 2,
  },
  joinUpButton: {
    backgroundColor: colors.grass,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinUpButtonText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: colors.chalk,
  },
  pendingBadge: {
    backgroundColor: colors.courtLight,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
  },
  pendingBadgeText: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});