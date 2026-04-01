import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  Pressable,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Calendar, DateData } from 'react-native-calendars';

// Components
import { BookingCard } from '../../components/ui/BookingCard';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { StepOutModal } from '../../components/bookings/StepOutModal';
import { EventSearchPanel } from '../../components/home/EventSearchPanel';
import { InboxSection } from '../../components/home/InboxSection';
import { NextUpCard } from '../../components/home/NextUpCard';
import { UpcomingRow } from '../../components/home/UpcomingRow';
import { EmptyHomeState } from '../../components/home/EmptyHomeState';
import { LiveGameBanner } from '../../components/home/LiveGameBanner';
import { FamilyPulseSection } from '../../components/home/FamilyPulseSection';
import { MilestoneOverlay } from '../../components/ui/MilestoneOverlay';
import { useMilestoneCheck } from '../../hooks/useMilestoneCheck';

// Services
import { debriefService } from '../../services/api/DebriefService';
import { userService, RosterInvitation, LeagueInvitation, EventInvitation, ReadyToScheduleLeague } from '../../services/api/UserService';

// Context
import { useAuth } from '../../context/AuthContext';

// Store
import { selectUser } from '../../store/slices/authSlice';
import { selectActiveUserId, selectDependents } from '../../store/slices/contextSlice';
import { useGetUserBookingsQuery, useCancelBookingMutation, useGetEventsQuery, useBookEventMutation } from '../../store/api/eventsApi';
import { useGetPendingCancelRequestsQuery, useApproveCancelRequestMutation, useDenyCancelRequestMutation } from '../../store/api/cancelRequestsApi';

// Theme
import { colors, fonts, Spacing } from '../../theme';

// Types
import { Booking, Event, Team, EventStatus } from '../../types';
import { HomeStackParamList } from '../../navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Utils
import { PersonFilter } from '../../types/eventsCalendar';
import { formatDateForCalendar, calendarTheme } from '../../utils/calendarUtils';
import { searchEventBus } from '../../utils/searchEventBus';
import { getSportEmoji } from '../../constants/sports';

type HomeScreenNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'HomeScreen'>;

export function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { isLoading: authLoading, user: currentUser } = useAuth();
  const { width: screenWidth } = useWindowDimensions();
  const { pendingMilestone, dismissMilestone } = useMilestoneCheck();

  const isWide = screenWidth > 600;
  const contentMaxWidth = isWide ? 540 : undefined;

  // Redux state
  const user = useSelector(selectUser);
  const activeUserId = useSelector(selectActiveUserId);
  const dependents = useSelector(selectDependents);

  // Calendar state
  const [selectedDate, setSelectedDate] = useState<string>(formatDateForCalendar(new Date()));
  const [showCalendar, setShowCalendar] = useState(false);

  // Search modal state
  const [searchModalVisible, setSearchModalVisible] = useState(false);

  const {
    data: bookingsData,
    isLoading: bookingsLoading,
    refetch: refetchBookings,
  } = useGetUserBookingsQuery({
    status: 'all',
    pagination: { page: 1, limit: 200 },
  });

  const [cancelBookingMutation] = useCancelBookingMutation();
  const [bookEventMutation] = useBookEventMutation();

  // Cancel requests hooks
  const { data: cancelRequests = [] } = useGetPendingCancelRequestsQuery(user?.id || '', { skip: !user?.id });
  const [approveCancelRequest, { isLoading: isApproving }] = useApproveCancelRequestMutation();
  const [denyCancelRequest, { isLoading: isDenying }] = useDenyCancelRequestMutation();

  // Discover events query (games near you, filtered by sport preferences)
  const sportPrefs = user?.sportPreferences;
  const {
    data: discoverData,
    isLoading: discoverLoading,
    refetch: refetchDiscover,
  } = useGetEventsQuery({
    filters: {
      status: EventStatus.ACTIVE,
      ...(sportPrefs && sportPrefs.length > 0 ? { sportTypes: sportPrefs.join(',') } : {}),
    },
    pagination: { page: 1, limit: 6 },
  });

  const discoverEvents = useMemo(() => {
    const events = discoverData?.data || [];
    // Exclude events the user is already booked into
    const bookedEventIds = new Set((bookingsData?.data || []).map((b) => b.eventId));
    return events.filter((e) => !bookedEventIds.has(e.id));
  }, [discoverData, bookingsData]);

  // User teams state
  const [userTeams, setUserTeams] = useState<Team[]>([]);
  const [organizedEvents, setOrganizedEvents] = useState<Event[]>([]);

  const loadUserTeams = useCallback(async () => {
    try {
      const result = await userService.getUserTeams({ page: 1, limit: 10 });
      setUserTeams(result.data || []);
    } catch (err) {
      console.warn('Failed to fetch user teams:', err);
      setUserTeams([]);
    }
  }, []);

  const loadOrganizedEvents = useCallback(async () => {
    try {
      const result = await userService.getUserEvents(undefined, { page: 1, limit: 100 });
      const bookedEventIds = new Set((bookingsData?.data || []).map((b) => b.eventId));
      setOrganizedEvents((result.data || []).filter((e: Event) => !bookedEventIds.has(e.id)));
    } catch {
      setOrganizedEvents([]);
    }
  }, [bookingsData]);

  // DependentToggle state
  const [activeFilter, setActiveFilter] = useState<PersonFilter>({
    type: 'individual',
    userId: currentUser?.id || '',
  });

  const handleFilterChange = useCallback((filter: PersonFilter) => {
    setActiveFilter(filter);
  }, []);

  // All bookings sorted chronologically
  const allBookings = useMemo(() => {
    const all = bookingsData?.data || [];
    const filtered = activeFilter.type === 'individual'
      ? all.filter((b) => b.userId === activeFilter.userId)
      : all;
    return [...filtered].sort((a, b) => {
      const aTime = a.event?.startTime ? new Date(a.event.startTime).getTime() : 0;
      const bTime = b.event?.startTime ? new Date(b.event.startTime).getTime() : 0;
      return aTime - bTime;
    });
  }, [bookingsData, activeFilter]);

  // Future bookings + organized events (for cards view)
  const futureBookings = useMemo(() => {
    const now = new Date();
    const fromBookings = allBookings.filter((b) => {
      if (!b.event?.startTime) return false;
      if (b.status === 'cancelled') return false;
      return new Date(b.event.endTime || b.event.startTime) >= now;
    });
    // Add organized events not already in bookings
    const bookedEventIds = new Set(fromBookings.map((b) => b.eventId));
    const fromOrganized = organizedEvents
      .filter((e) => e.startTime && new Date(e.endTime || e.startTime) >= now && !bookedEventIds.has(e.id))
      .map((e) => ({
        id: `org-${e.id}`,
        eventId: e.id,
        userId: currentUser?.id || '',
        status: 'confirmed',
        bookingType: 'event',
        totalPrice: 0,
        paymentStatus: 'paid',
        debriefSubmitted: false,
        createdAt: e.createdAt || new Date().toISOString(),
        updatedAt: e.updatedAt || new Date().toISOString(),
        event: e,
      } as Booking));
    return [...fromBookings, ...fromOrganized].sort((a, b) => {
      const aTime = a.event?.startTime ? new Date(a.event.startTime).getTime() : 0;
      const bTime = b.event?.startTime ? new Date(b.event.startTime).getTime() : 0;
      return aTime - bTime;
    });
  }, [allBookings, organizedEvents, currentUser]);

  // Live game = any booking currently in progress
  const liveGameBooking = useMemo(() => {
    const now = new Date();
    return allBookings.find((b) => {
      if (!b.event?.startTime || !b.event?.endTime) return false;
      if (b.status === 'cancelled') return false;
      return new Date(b.event.startTime) <= now && now <= new Date(b.event.endTime);
    }) || null;
  }, [allBookings]);

  // Next up = first future booking
  const nextUpBooking = futureBookings[0] || null;

  // Upcoming = rest of future bookings (next 7 days, max 10)
  const upcomingBookings = useMemo(() => {
    const sevenDaysOut = new Date();
    sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);
    return futureBookings
      .slice(1) // skip the "next up" one
      .filter((b) => new Date(b.event!.startTime) <= sevenDaysOut)
      .slice(0, 10);
  }, [futureBookings]);

  // Calendar marked dates — include both bookings and organized events
  const calendarMarkedDates = useMemo(() => {
    const marks: Record<string, any> = {};
    for (const b of allBookings) {
      if (!b.event?.startTime) continue;
      const dateStr = formatDateForCalendar(new Date(b.event.startTime));
      if (dateStr === selectedDate) continue;
      marks[dateStr] = {
        customStyles: {
          container: {
            borderWidth: 1.5,
            borderColor: colors.primary,
            borderRadius: 16,
          },
          text: { color: colors.onSurface },
        },
      };
    }
    for (const e of organizedEvents) {
      if (!e.startTime) continue;
      const dateStr = formatDateForCalendar(new Date(e.startTime));
      if (dateStr === selectedDate || marks[dateStr]) continue;
      marks[dateStr] = {
        customStyles: {
          container: {
            borderWidth: 1.5,
            borderColor: colors.primary,
            borderRadius: 16,
          },
          text: { color: colors.onSurface },
        },
      };
    }
    marks[selectedDate] = {
      selected: true,
      customStyles: {
        container: {
          backgroundColor: colors.primary,
          borderRadius: 16,
        },
        text: { color: '#FFFFFF' },
      },
    };
    return marks;
  }, [allBookings, organizedEvents, selectedDate]);

  // Bookings + organized events for selected calendar date
  const calendarDateBookings = useMemo(() => {
    const fromBookings = allBookings.filter((b) => {
      if (!b.event?.startTime) return false;
      return formatDateForCalendar(new Date(b.event.startTime)) === selectedDate;
    });
    // Create pseudo-bookings for organized events on this date
    const bookedEventIds = new Set(fromBookings.map((b) => b.eventId));
    const fromOrganized = organizedEvents
      .filter((e) => e.startTime && formatDateForCalendar(new Date(e.startTime)) === selectedDate && !bookedEventIds.has(e.id))
      .map((e) => ({
        id: `org-${e.id}`,
        eventId: e.id,
        userId: currentUser?.id || '',
        status: 'confirmed',
        bookingType: 'event',
        totalPrice: 0,
        paymentStatus: 'paid',
        debriefSubmitted: false,
        createdAt: e.createdAt || new Date().toISOString(),
        updatedAt: e.updatedAt || new Date().toISOString(),
        event: e,
      } as Booking));
    return [...fromBookings, ...fromOrganized];
  }, [allBookings, organizedEvents, selectedDate, currentUser]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stepOutModalVisible, setStepOutModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [inboxModalVisible, setInboxModalVisible] = useState(false);

  const isLoading = bookingsLoading;

  // Debrief state
  const [debriefEvents, setDebriefEvents] = useState<Booking[]>([]);

  // Invitations state
  const [rosterInvitations, setRosterInvitations] = useState<RosterInvitation[]>([]);
  const [leagueInvitations, setLeagueInvitations] = useState<LeagueInvitation[]>([]);
  const [eventInvitations, setEventInvitations] = useState<EventInvitation[]>([]);
  const [readyToScheduleLeagues, setReadyToScheduleLeagues] = useState<ReadyToScheduleLeague[]>([]);
  const [error, setError] = useState<string | null>(null);

  const inboxCount = rosterInvitations.length + leagueInvitations.length + eventInvitations.length + readyToScheduleLeagues.length + debriefEvents.length + cancelRequests.length;

  const loadDebriefEvents = useCallback(async () => {
    try {
      const result = await debriefService.getDebriefEvents();
      setDebriefEvents(result.data || []);
    } catch (err) {
      setDebriefEvents([]);
      setError('Failed to load debrief events. Pull down to refresh.');
    }
  }, []);

  const loadInvitations = useCallback(async () => {
    try {
      const result = await userService.getInvitations();
      setRosterInvitations(result.rosterInvitations || []);
      setLeagueInvitations(result.leagueInvitations || []);
      setEventInvitations(result.eventInvitations || []);
    } catch (err) {
      setError('Failed to load invitations. Pull down to refresh.');
    }
  }, []);

  const loadReadyToScheduleLeagues = useCallback(async () => {
    try {
      const result = await userService.getLeaguesReadyToSchedule();
      setReadyToScheduleLeagues(result || []);
    } catch (err) {
      setReadyToScheduleLeagues([]);
      setError('Failed to load league data. Pull down to refresh.');
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    await Promise.all([refetchBookings(), refetchDiscover(), loadDebriefEvents(), loadInvitations(), loadReadyToScheduleLeagues(), loadUserTeams(), loadOrganizedEvents()]);
    setIsRefreshing(false);
  }, [refetchBookings, refetchDiscover, loadDebriefEvents, loadInvitations, loadReadyToScheduleLeagues, loadUserTeams, loadOrganizedEvents]);

  useFocusEffect(
    useCallback(() => {
      if (!authLoading) {
        refetchBookings();
        refetchDiscover();
        loadDebriefEvents();
        loadInvitations();
        loadReadyToScheduleLeagues();
        loadUserTeams();
        loadOrganizedEvents();
      }
    }, [authLoading])
  );

  useEffect(() => {
    const unsubscribe = searchEventBus.subscribe(() => setSearchModalVisible(true));
    const unsubClose = searchEventBus.subscribeClose(() => setSearchModalVisible(false));
    return () => { unsubscribe(); unsubClose(); };
  }, []);

  useEffect(() => {
    if (!authLoading) {
      refetchBookings();
      refetchDiscover();
      loadDebriefEvents();
      loadInvitations();
      loadReadyToScheduleLeagues();
      loadUserTeams();
      loadOrganizedEvents();
    }
  }, [activeUserId]);

  const handleBookingPress = useCallback((booking: Booking) => {
    navigation.navigate('EventDetails', { eventId: booking.eventId });
  }, [navigation]);

  const handleDebriefPress = useCallback((booking: Booking) => {
    navigation.navigate('Debrief', { eventId: booking.eventId });
  }, [navigation]);

  const handleStepOut = useCallback((booking: Booking) => {
    setSelectedBooking(booking);
    setStepOutModalVisible(true);
  }, []);

  const handleStepOutConfirm = useCallback(async () => {
    if (!selectedBooking) return;
    try {
      await cancelBookingMutation({ eventId: selectedBooking.eventId, bookingId: selectedBooking.id }).unwrap();
      setStepOutModalVisible(false);
      setSelectedBooking(null);
      Alert.alert('Success', 'You have stepped out of the event');
      await refetchBookings();
    } catch (error) {
      Alert.alert('Error', 'Failed to leave the event. Please try again.');
    }
  }, [selectedBooking, cancelBookingMutation, refetchBookings]);

  const handleStepOutCancel = useCallback(() => {
    setStepOutModalVisible(false);
    setSelectedBooking(null);
  }, []);

  const handleApproveCancelRequest = async (id: string) => {
    try {
      await approveCancelRequest({ id, userId: user?.id || '' }).unwrap();
      Alert.alert('Approved', 'Cancellation request approved.');
    } catch (error) {
      Alert.alert('Error', 'Failed to approve cancellation request.');
    }
  };

  const handleDenyCancelRequest = async (id: string) => {
    try {
      await denyCancelRequest({ id, userId: user?.id || '' }).unwrap();
      Alert.alert('Denied', 'Cancellation request denied.');
    } catch (error) {
      Alert.alert('Error', 'Failed to deny cancellation request.');
    }
  };

  const handleRosterInvitationPress = useCallback((inv: RosterInvitation) => {
    (navigation as any).navigate('Teams', { screen: 'TeamDetails', params: { teamId: inv.rosterId, readOnly: true } });
  }, [navigation]);

  const handleLeagueInvitationPress = useCallback((inv: LeagueInvitation) => {
    (navigation as any).navigate('Teams', { screen: 'TeamDetails', params: { teamId: inv.rosterId, readOnly: true } });
  }, [navigation]);

  const handleEventInvitationPress = useCallback((inv: EventInvitation) => {
    navigation.navigate('EventDetails', { eventId: inv.eventId });
  }, [navigation]);

  const handleReadyToSchedulePress = useCallback((league: ReadyToScheduleLeague) => {
    (navigation as any).navigate('Leagues', { screen: 'LeagueScheduling', params: { leagueId: league.id } });
  }, [navigation]);

  // ── Discover helpers ─────────────────────────

  const formatEventTime = useCallback((dateStr: string | Date) => {
    const d = new Date(dateStr);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const hours = d.getHours();
    const mins = d.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    const h = hours % 12 || 12;
    return `${days[d.getDay()]} ${h}${mins > 0 ? ':' + mins.toString().padStart(2, '0') : ''}${ampm}`;
  }, []);

  const handleJoinEvent = useCallback(async (eventId: string) => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to join a game.');
      return;
    }
    try {
      await bookEventMutation({ eventId, userId: user.id }).unwrap();
      Alert.alert('Joined!', 'You have been added to the game.');
    } catch (err: any) {
      const msg = err?.data?.message || 'Failed to join game. Please try again.';
      Alert.alert('Error', msg);
    }
  }, [bookEventMutation, user?.id]);

  const handleCreateEvent = useCallback(() => {
    setSearchModalVisible(false);
    navigation.navigate('CreateEvent', {});
  }, [navigation]);

  const handleSearchEventPress = useCallback((event: any) => {
    setSearchModalVisible(false);
    navigation.navigate('EventDetails', { eventId: event.id });
  }, [navigation]);

  if (authLoading || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size={40} color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <ErrorDisplay
          message={error}
          onRetry={handleRefresh}
        />
      </View>
    );
  }

  const hasEvents = futureBookings.length > 0;

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          contentMaxWidth && { alignItems: 'center' as const },
        ]}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.inner, contentMaxWidth && { maxWidth: contentMaxWidth, width: '100%' }]}>

          {/* ── Live game banner ────────────────── */}
          {liveGameBooking && (
            <LiveGameBanner
              booking={liveGameBooking}
              onPress={handleBookingPress}
            />
          )}

          {/* ── Cards view: Next Up + Upcoming ──── */}
          {hasEvents ? (
            <>
              <NextUpCard
                booking={nextUpBooking!}
                onPress={handleBookingPress}
              />

              <UpcomingRow
                bookings={upcomingBookings}
                onPress={handleBookingPress}
              />
            </>
          ) : (
            <EmptyHomeState
              userName={currentUser?.firstName}
              onCreateEvent={handleCreateEvent}
            />
          )}

          {/* ── Family pulse (guardians only) ───── */}
          <FamilyPulseSection />

          {/* ── Games near you ─────────────────── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Games near you</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Events' as any)}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          {discoverLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 16 }} />
          ) : discoverEvents.length > 0 ? (
            discoverEvents.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={styles.discoverCard}
                onPress={() => navigation.navigate('EventDetails', { eventId: event.id })}
                activeOpacity={0.8}
              >
                <View style={styles.discoverIcon}>
                  <Text style={{ fontSize: 20 }}>{getSportEmoji(event.sportType)}</Text>
                </View>
                <View style={styles.discoverInfo}>
                  <Text style={styles.discoverTitle} numberOfLines={1}>{event.title}</Text>
                  <Text style={styles.discoverMeta} numberOfLines={1}>
                    {formatEventTime(event.startTime)} {'\u00B7'} {event.facility?.name || event.locationName || 'Location TBD'} {'\u00B7'} {event.currentParticipants}/{event.maxParticipants || '\u221E'}
                  </Text>
                </View>
                <TouchableOpacity style={styles.joinBtn} onPress={() => handleJoinEvent(event.id)}>
                  <Text style={styles.joinBtnText}>Join</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.discoverEmpty}>
              <Text style={styles.discoverEmptyText}>No games near you yet</Text>
              <TouchableOpacity style={styles.hostFirstBtn} onPress={handleCreateEvent}>
                <Text style={styles.hostFirstBtnText}>Host the first one</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Your teams ─────────────────────── */}
          {userTeams.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Your teams</Text>
                <TouchableOpacity onPress={() => (navigation as any).navigate('Teams')}>
                  <Text style={styles.seeAll}>See all</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.teamsRow}>
                {userTeams.map((team) => (
                  <TouchableOpacity
                    key={team.id}
                    style={styles.teamCard}
                    onPress={() => (navigation as any).navigate('Teams', { screen: 'TeamDetails', params: { teamId: team.id } })}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 24 }}>{getSportEmoji(team.sportType)}</Text>
                    <Text style={styles.teamCardName} numberOfLines={1}>{team.name}</Text>
                    <Text style={styles.teamCardMeta}>{team.members?.length || '\u2014'} members</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {/* ── Calendar toggle ─────────────────── */}
          <TouchableOpacity
            style={styles.calendarToggle}
            onPress={() => setShowCalendar(!showCalendar)}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar-outline" size={18} color={colors.onSurfaceVariant} />
            <Text style={styles.calendarToggleText}>
              {showCalendar ? 'Hide Calendar' : 'View Calendar'}
            </Text>
            <Ionicons
              name={showCalendar ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.outline}
            />
          </TouchableOpacity>

          {/* ── Calendar view ──────────────────── */}
          {showCalendar && (
            <View style={styles.calendarSection}>
              <View style={styles.calendarCard}>
                <Calendar
                  current={selectedDate}
                  markedDates={calendarMarkedDates}
                  markingType="custom"
                  onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
                  theme={calendarTheme}
                  style={styles.calendar}
                />
              </View>

              {calendarDateBookings.length === 0 ? (
                <Text style={styles.emptyText}>No events on this day</Text>
              ) : (
                calendarDateBookings.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    onPress={handleBookingPress}
                    onCancel={handleStepOut}
                  />
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleCreateEvent}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Host an event"
      >
        <Ionicons name="add" size={26} color="#FFFFFF" />
      </TouchableOpacity>

      <StepOutModal visible={stepOutModalVisible} eventTitle={selectedBooking?.event?.title || 'Event'} onConfirm={handleStepOutConfirm} onCancel={handleStepOutCancel} />

      <EventSearchPanel
        visible={searchModalVisible}
        onCreateEvent={handleCreateEvent}
        onEventPress={handleSearchEventPress}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  inner: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  // ── Loading ─────────────────────────────
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.outline,
  },

  // ── Inbox button ────────────────────────
  inboxBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 10,
    shadowColor: '#191C1E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  inboxDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  inboxBtnText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.onSurface,
  },

  // ── Calendar toggle ─────────────────────
  calendarToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingVertical: 12,
    gap: 6,
  },
  calendarToggleText: {
    fontFamily: fonts.headingSemi,
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },

  // ── Calendar section ────────────────────
  calendarSection: {
    marginTop: 8,
  },
  calendarCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 20,
    padding: 8,
    shadowColor: '#191C1E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  calendar: {
    borderRadius: 16,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.outline,
    textAlign: 'center',
    paddingVertical: 24,
  },

  // ── Section headers ────────────────────
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.onSurface,
  },
  seeAll: {
    fontFamily: fonts.headingSemi,
    fontSize: 14,
    color: colors.primary,
  },

  // ── Discover cards ────────────────────
  discoverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  discoverIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discoverInfo: {
    flex: 1,
  },
  discoverTitle: {
    fontFamily: fonts.headingSemi,
    fontSize: 15,
    color: colors.onSurface,
  },
  discoverMeta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  joinBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  joinBtnText: {
    fontFamily: fonts.headingSemi,
    fontSize: 14,
    color: colors.primary,
  },

  // ── Discover empty ────────────────────
  discoverEmpty: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  discoverEmptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginBottom: 12,
  },
  hostFirstBtn: {
    backgroundColor: colors.primary,
    borderRadius: 9999,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  hostFirstBtnText: {
    fontFamily: fonts.headingSemi,
    fontSize: 14,
    color: '#FFFFFF',
  },

  // ── Teams row ─────────────────────────
  teamsRow: {
    marginBottom: 8,
  },
  teamCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    width: 140,
    alignItems: 'center',
    gap: 6,
  },
  teamCardName: {
    fontFamily: fonts.headingSemi,
    fontSize: 14,
    color: colors.onSurface,
    textAlign: 'center',
  },
  teamCardMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },

  // ── FAB ─────────────────────────────────
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#191C1E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },

  // ── Inbox modal ─────────────────────────
  inboxBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(25, 28, 30, 0.4)',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 70,
  },
  inboxModal: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 24,
    maxHeight: '80%',
    overflow: 'hidden',
    shadowColor: '#191C1E',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 10,
  },
  inboxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  inboxTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.onSurface,
  },
  inboxScroll: {
    paddingVertical: 8,
  },
});
