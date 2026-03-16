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
import { userService as bookingUserService } from '../../services/api/UserService';
import { BookingStatus } from '../../types';

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

  // Also fetch all bookings for the schedule tabs
  const {
    data: allBookingsData,
    isLoading: allBookingsLoading,
    refetch: refetchAllBookings,
  } = useGetUserBookingsQuery({
    pagination: { page: 1, limit: 200 },
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

  // Schedule tab filter
  type ScheduleFilter = 'upcoming' | 'live' | 'past' | 'cancelled';
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleFilter>('upcoming');

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

  // Schedule tab bookings — derived from allBookingsData
  const allBookingsList = useMemo(() => allBookingsData?.data || [], [allBookingsData]);

  const scheduleBookings = useMemo(() => {
    const t = now.getTime();
    switch (scheduleFilter) {
      case 'live':
        return allBookingsList.filter((b) => {
          if (!b.event?.startTime || !b.event?.endTime) return false;
          if (b.status !== BookingStatus.CONFIRMED) return false;
          const start = new Date(b.event.startTime).getTime();
          const end = new Date(b.event.endTime).getTime();
          return t >= start && t < end;
        });
      case 'upcoming':
        return allBookingsList.filter((b) => {
          if (b.status === BookingStatus.CANCELLED) return false;
          if (b.status === BookingStatus.COMPLETED) return false;
          if (!b.event) return false;
          const endTime = b.event.endTime ? new Date(b.event.endTime).getTime() : null;
          const startTime = new Date(b.event.startTime).getTime();
          const hasEnded = endTime ? endTime < t : startTime < t;
          if (hasEnded) return false;
          // Exclude currently live
          const isLiveNow = t >= startTime && endTime && t < endTime;
          return !isLiveNow;
        });
      case 'past':
        return allBookingsList.filter((b) => {
          if (b.status === BookingStatus.CANCELLED) return false;
          if (b.status === BookingStatus.COMPLETED) return true;
          if (!b.event) return false;
          const endTime = b.event.endTime ? new Date(b.event.endTime).getTime() : null;
          const startTime = new Date(b.event.startTime).getTime();
          return endTime ? endTime < t : startTime < t;
        }).sort((a, b) => {
          const aTime = a.event?.startTime ? new Date(a.event.startTime).getTime() : 0;
          const bTime = b.event?.startTime ? new Date(b.event.startTime).getTime() : 0;
          return bTime - aTime; // most recent first
        });
      case 'cancelled':
        return allBookingsList
          .filter((b) => b.status === BookingStatus.CANCELLED)
          .sort((a, b) => {
            const aTime = a.event?.startTime ? new Date(a.event.startTime).getTime() : 0;
            const bTime = b.event?.startTime ? new Date(b.event.startTime).getTime() : 0;
            return bTime - aTime;
          });
      default:
        return [];
    }
  }, [allBookingsList, scheduleFilter, now]);

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

  // Navigate to read-only roster details for roster invitation
  const handleRosterInvitationPress = useCallback((inv: RosterInvitation) => {
    (navigation as any).navigate('Teams', {
      screen: 'TeamDetails',
      params: { teamId: inv.rosterId, readOnly: true },
    });
  }, [navigation]);

  // Navigate to roster details for league invitation — captain confirms from their roster context
  const handleLeagueInvitationPress = useCallback((inv: LeagueInvitation) => {
    (navigation as any).navigate('Teams', {
      screen: 'TeamDetails',
      params: { teamId: inv.rosterId, readOnly: true },
    });
  }, [navigation]);

  // Refresh data
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([refetchEvents(), refetchBookings(), refetchAllBookings(), loadDebriefEvents(), loadInvitations()]);
    setIsRefreshing(false);
  }, [refetchEvents, refetchBookings, refetchAllBookings, loadDebriefEvents, loadInvitations]);

  // Reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (!authLoading) {
        refetchEvents();
        refetchBookings();
        refetchAllBookings();
        loadDebriefEvents();
        loadInvitations();
      }
    }, [authLoading, refetchEvents, refetchBookings, refetchAllBookings, loadDebriefEvents, loadInvitations])
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

        {/* Schedule */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Schedule</Text>
            <TouchableOpacity onPress={() => (navigation as any).navigate('Bookings', { screen: 'BookingsList' })}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {/* Schedule filter tabs */}
          <View style={styles.scheduleFilterTabs}>
            {([
              { key: 'upcoming' as ScheduleFilter, label: 'Upcoming' },
              { key: 'live' as ScheduleFilter, label: 'Live' },
              { key: 'past' as ScheduleFilter, label: 'Past' },
              { key: 'cancelled' as ScheduleFilter, label: 'Cancelled' },
            ]).map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.scheduleFilterTab,
                  scheduleFilter === tab.key && styles.scheduleFilterTabActive,
                ]}
                onPress={() => setScheduleFilter(tab.key)}
              >
                {tab.key === 'live' && liveBookings.length > 0 && (
                  <Animated.View style={[styles.liveTabDot, { opacity: pulseAnim }]} />
                )}
                <Text
                  style={[
                    styles.scheduleFilterTabText,
                    scheduleFilter === tab.key && styles.scheduleFilterTabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {allBookingsLoading && scheduleBookings.length === 0 ? (
            <Text style={styles.placeholder}>Loading...</Text>
          ) : scheduleBookings.length > 0 ? (
            <View>
              {scheduleBookings.slice(0, 5).map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onPress={handleBookingPress}
                  onCancel={
                    booking.status === BookingStatus.CONFIRMED &&
                    booking.event &&
                    new Date(booking.event.startTime) > new Date()
                      ? () => handleStepOut(booking)
                      : undefined
                  }
                  hidePrice={scheduleFilter === 'past'}
                  style={styles.bookingCard}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons
                name={
                  scheduleFilter === 'upcoming' ? 'calendar-outline' :
                  scheduleFilter === 'live' ? 'radio-outline' :
                  scheduleFilter === 'past' ? 'time-outline' :
                  'close-circle-outline'
                }
                size={48}
                color={colors.inkFaint}
              />
              <Text style={styles.emptyStateTitle}>
                {scheduleFilter === 'upcoming' ? 'No upcoming events' :
                 scheduleFilter === 'live' ? 'Nothing live right now' :
                 scheduleFilter === 'past' ? 'No past events' :
                 'No cancelled events'}
              </Text>
              {scheduleFilter === 'upcoming' && (
                <TouchableOpacity 
                  style={styles.emptyStateButtonStyle}
                  onPress={() => (navigation as any).navigate('Events', { screen: 'EventsList' })}
                >
                  <Text style={styles.emptyStateButtonText}>Find Events</Text>
                </TouchableOpacity>
              )}
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
            <TouchableOpacity
              key={inv.id}
              style={styles.inviteCard}
              onPress={() => handleRosterInvitationPress(inv)}
              activeOpacity={0.7}
            >
              <View style={styles.inviteIconWrap}>
                <Ionicons name="shield-outline" size={22} color={colors.chalk} />
              </View>
              <View style={styles.inviteInfo}>
                <Text style={styles.inviteName} numberOfLines={1}>{inv.rosterName}</Text>
                <Text style={styles.inviteMeta}>
                  {inv.sportType ? `${inv.sportType} · ` : ''}{inv.playerCount} players
                </Text>
              </View>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>Pending</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
            </TouchableOpacity>
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

  // Schedule filter tabs
  scheduleFilterTabs: {
    flexDirection: 'row',
    backgroundColor: colors.chalk,
    marginBottom: Spacing.md,
    gap: 4,
  },
  scheduleFilterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    gap: 4,
  },
  scheduleFilterTabActive: {
    backgroundColor: colors.grass,
  },
  scheduleFilterTabText: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: colors.inkFaint,
  },
  scheduleFilterTabTextActive: {
    color: colors.chalk,
  },
  liveTabDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.grass,
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