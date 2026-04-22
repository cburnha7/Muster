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
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { StepOutModal } from '../../components/bookings/StepOutModal';
import { EventSearchPanel } from '../../components/home/EventSearchPanel';
import { InboxSection } from '../../components/home/InboxSection';
import { LiveGameBanner } from '../../components/home/LiveGameBanner';
import { MyCrewRow } from '../../components/home/MyCrewRow';
import { useCrewSelector } from '../../hooks/useCrewSelector';
import { CrewEventCard } from '../../components/home/CrewEventCard';
import { ProfileSelectorModal } from '../../components/ui/ProfileSelectorModal';
import { MilestoneOverlay } from '../../components/ui/MilestoneOverlay';
import { useMilestoneCheck } from '../../hooks/useMilestoneCheck';

// Services
import { debriefService } from '../../services/api/DebriefService';
import {
  userService,
  RosterInvitation,
  LeagueInvitation,
  EventInvitation,
  ReadyToScheduleLeague,
} from '../../services/api/UserService';

// Context
import { useAuth } from '../../context/AuthContext';

// Store
import { selectUser } from '../../store/slices/authSlice';
import {
  selectActiveUserId,
  selectDependents,
} from '../../store/slices/contextSlice';
import {
  useGetUserBookingsQuery,
  useCancelBookingMutation,
  useGetEventsQuery,
  useBookEventMutation,
} from '../../store/api/eventsApi';
import {
  useGetPendingCancelRequestsQuery,
  useApproveCancelRequestMutation,
  useDenyCancelRequestMutation,
} from '../../store/api/cancelRequestsApi';

// Theme
import { fonts, Spacing, useTheme } from '../../theme';

// Types
import { Booking, Event, Team, EventStatus } from '../../types';
import { HomeStackParamList } from '../../navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Utils
import { PersonFilter, PERSON_COLORS } from '../../types/eventsCalendar';
import {
  assignPersonColors,
  buildMarkedDates,
} from '../../utils/eventsCalendarUtils';
import {
  formatDateForCalendar,
  calendarTheme,
} from '../../utils/calendarUtils';
import { searchEventBus } from '../../utils/searchEventBus';
import { getSportEmoji } from '../../constants/sports';

type HomeScreenNavigationProp = NativeStackNavigationProp<
  HomeStackParamList,
  'HomeScreen'
>;

export function HomeScreen() {
  const { colors } = useTheme();
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
  const [selectedDate, setSelectedDate] = useState<string>(
    formatDateForCalendar(new Date())
  );

  // My Crew selection — shared across all tabs via Redux
  const {
    crewMembers,
    selectedCrewId,
    onSelectCrew,
    hasDependents,
    personColors,
  } = useCrewSelector();

  // Search modal state
  const [searchModalVisible, setSearchModalVisible] = useState(false);

  const {
    data: bookingsData,
    isLoading: bookingsLoading,
    refetch: refetchBookings,
  } = useGetUserBookingsQuery({
    status: 'all',
    pagination: { page: 1, limit: 200 },
    includeFamily: true,
  });

  const [cancelBookingMutation] = useCancelBookingMutation();
  const [bookEventMutation] = useBookEventMutation();

  // Cancel requests hooks
  const { data: cancelRequests = [] } = useGetPendingCancelRequestsQuery(
    user?.id || '',
    { skip: !user?.id }
  );
  const [approveCancelRequest, { isLoading: isApproving }] =
    useApproveCancelRequestMutation();
  const [denyCancelRequest, { isLoading: isDenying }] =
    useDenyCancelRequestMutation();

  // Discover events query (games near you, filtered by sport preferences)
  const sportPrefs = user?.sportPreferences;
  const {
    data: discoverData,
    isLoading: discoverLoading,
    refetch: refetchDiscover,
  } = useGetEventsQuery({
    filters: {
      status: EventStatus.ACTIVE,
      ...(sportPrefs && sportPrefs.length > 0
        ? { sportTypes: sportPrefs.join(',') }
        : {}),
    },
    pagination: { page: 1, limit: 6 },
  });

  const discoverEvents = useMemo(() => {
    const events = discoverData?.data || [];
    // Exclude events that ANY family member has already joined
    const allBookingsList = bookingsData?.data || [];
    const bookedEventIds = new Set(allBookingsList.map(b => b.eventId));
    return events.filter(e => !bookedEventIds.has(e.id));
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
      const result = await userService.getUserEvents(undefined, {
        page: 1,
        limit: 100,
      });
      const bookedEventIds = new Set(
        (bookingsData?.data || []).map(b => b.eventId)
      );
      setOrganizedEvents(
        (result.data || []).filter((e: Event) => !bookedEventIds.has(e.id))
      );
    } catch {
      setOrganizedEvents([]);
    }
  }, [bookingsData]);

  // DependentToggle state
  const activeFilter: PersonFilter = useMemo(() => {
    if (selectedCrewId === null) return { type: 'wholeCrew' };
    return { type: 'individual', userId: selectedCrewId };
  }, [selectedCrewId]);

  // personColors and crewMembers come from useCrewSelector hook above

  // All bookings sorted chronologically
  const allBookings = useMemo(() => {
    const all = bookingsData?.data || [];
    const filtered =
      activeFilter.type === 'individual'
        ? all.filter(b => b.userId === activeFilter.userId)
        : all;
    return [...filtered].sort((a, b) => {
      const aTime = a.event?.startTime
        ? new Date(a.event.startTime).getTime()
        : 0;
      const bTime = b.event?.startTime
        ? new Date(b.event.startTime).getTime()
        : 0;
      return aTime - bTime;
    });
  }, [bookingsData, activeFilter]);

  // Future bookings + organized events (for cards view)
  const futureBookings = useMemo(() => {
    const now = new Date();
    const fromBookings = allBookings.filter(b => {
      if (!b.event?.startTime) return false;
      if (b.status === 'cancelled') return false;
      return new Date(b.event.endTime || b.event.startTime) >= now;
    });
    // Add organized events not already in bookings, filtered by crew selection
    const bookedEventIds = new Set(fromBookings.map(b => b.eventId));
    const filteredOrganized =
      activeFilter.type === 'individual'
        ? organizedEvents.filter(e => e.organizerId === activeFilter.userId)
        : organizedEvents;
    const fromOrganized = filteredOrganized
      .filter(
        e =>
          e.startTime &&
          new Date(e.endTime || e.startTime) >= now &&
          !bookedEventIds.has(e.id)
      )
      .map(
        e =>
          ({
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
          }) as Booking
      );
    return [...fromBookings, ...fromOrganized].sort((a, b) => {
      const aTime = a.event?.startTime
        ? new Date(a.event.startTime).getTime()
        : 0;
      const bTime = b.event?.startTime
        ? new Date(b.event.startTime).getTime()
        : 0;
      return aTime - bTime;
    });
  }, [allBookings, organizedEvents, currentUser, activeFilter]);

  // Live game = any booking currently in progress
  const liveGameBooking = useMemo(() => {
    const now = new Date();
    return (
      allBookings.find(b => {
        if (!b.event?.startTime || !b.event?.endTime) return false;
        if (b.status === 'cancelled') return false;
        return (
          new Date(b.event.startTime) <= now && now <= new Date(b.event.endTime)
        );
      }) || null
    );
  }, [allBookings]);

  // Upcoming = future bookings (max 10)
  const upcomingBookings = useMemo(() => {
    return futureBookings.slice(0, 10);
  }, [futureBookings]);

  // Resolve crew color for a booking
  const getBookingCrewColor = useCallback(
    (booking: Booking): string => {
      const userId = booking.userId;
      return (
        personColors.get(userId) ||
        personColors.get(currentUser?.id || '') ||
        PERSON_COLORS[0]
      );
    },
    [personColors, currentUser]
  );

  // Color-coded calendar marked dates using multi-dot
  const familyUserIds = useMemo(() => {
    const ids = [currentUser?.id || ''];
    for (const dep of dependents) ids.push(dep.id);
    return ids;
  }, [currentUser, dependents]);

  const allEventsForCalendar = useMemo(() => {
    const events: Array<{
      startTime: string | Date;
      organizerId?: string;
      participants?: Array<{ userId: string }>;
    }> = [];
    for (const b of allBookings) {
      if (b.event) events.push(b.event);
    }
    for (const e of organizedEvents) {
      if (!events.some(ev => (ev as any).id === e.id)) events.push(e);
    }
    return events;
  }, [allBookings, organizedEvents]);

  const calendarMarkedDates = useMemo(() => {
    return buildMarkedDates(
      allEventsForCalendar,
      activeFilter,
      familyUserIds,
      personColors,
      selectedDate
    );
  }, [
    allEventsForCalendar,
    activeFilter,
    familyUserIds,
    personColors,
    selectedDate,
  ]);

  // Bookings + organized events for selected calendar date
  const calendarDateBookings = useMemo(() => {
    const fromBookings = allBookings.filter(b => {
      if (!b.event?.startTime) return false;
      return (
        formatDateForCalendar(new Date(b.event.startTime)) === selectedDate
      );
    });
    // Create pseudo-bookings for organized events on this date, filtered by crew
    const bookedEventIds = new Set(fromBookings.map(b => b.eventId));
    const filteredOrganized =
      activeFilter.type === 'individual'
        ? organizedEvents.filter(e => e.organizerId === activeFilter.userId)
        : organizedEvents;
    const fromOrganized = filteredOrganized
      .filter(
        e =>
          e.startTime &&
          formatDateForCalendar(new Date(e.startTime)) === selectedDate &&
          !bookedEventIds.has(e.id)
      )
      .map(
        e =>
          ({
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
          }) as Booking
      );
    return [...fromBookings, ...fromOrganized];
  }, [allBookings, organizedEvents, selectedDate, currentUser, activeFilter]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stepOutModalVisible, setStepOutModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [inboxModalVisible, setInboxModalVisible] = useState(false);

  const isLoading = bookingsLoading;

  // Debrief state
  const [debriefEvents, setDebriefEvents] = useState<Booking[]>([]);

  // Invitations state
  const [rosterInvitations, setRosterInvitations] = useState<
    RosterInvitation[]
  >([]);
  const [leagueInvitations, setLeagueInvitations] = useState<
    LeagueInvitation[]
  >([]);
  const [eventInvitations, setEventInvitations] = useState<EventInvitation[]>(
    []
  );
  const [readyToScheduleLeagues, setReadyToScheduleLeagues] = useState<
    ReadyToScheduleLeague[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  const inboxCount =
    rosterInvitations.length +
    leagueInvitations.length +
    eventInvitations.length +
    readyToScheduleLeagues.length +
    debriefEvents.length +
    cancelRequests.length;

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
    await Promise.all([
      refetchBookings(),
      refetchDiscover(),
      loadDebriefEvents(),
      loadInvitations(),
      loadReadyToScheduleLeagues(),
      loadUserTeams(),
      loadOrganizedEvents(),
    ]);
    setIsRefreshing(false);
  }, [
    refetchBookings,
    refetchDiscover,
    loadDebriefEvents,
    loadInvitations,
    loadReadyToScheduleLeagues,
    loadUserTeams,
    loadOrganizedEvents,
  ]);

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
    }, [
      authLoading,
      loadDebriefEvents,
      loadInvitations,
      loadReadyToScheduleLeagues,
      loadUserTeams,
      loadOrganizedEvents,
    ])
  );

  useEffect(() => {
    const unsubscribe = searchEventBus.subscribe(() =>
      setSearchModalVisible(true)
    );
    const unsubClose = searchEventBus.subscribeClose(() =>
      setSearchModalVisible(false)
    );
    return () => {
      unsubscribe();
      unsubClose();
    };
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

  const handleBookingPress = useCallback(
    (booking: Booking) => {
      navigation.navigate('EventDetails', { eventId: booking.eventId });
    },
    [navigation]
  );

  const handleDebriefPress = useCallback(
    (booking: Booking) => {
      navigation.navigate('Debrief', { eventId: booking.eventId });
    },
    [navigation]
  );

  const handleStepOut = useCallback((booking: Booking) => {
    setSelectedBooking(booking);
    setStepOutModalVisible(true);
  }, []);

  const handleStepOutConfirm = useCallback(async () => {
    if (!selectedBooking) return;
    try {
      await cancelBookingMutation({
        eventId: selectedBooking.eventId,
        bookingId: selectedBooking.id,
      }).unwrap();
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

  const handleRosterInvitationPress = useCallback(
    (inv: RosterInvitation) => {
      (navigation as any).navigate('Teams', {
        screen: 'TeamDetails',
        params: { teamId: inv.rosterId, readOnly: true },
      });
    },
    [navigation]
  );

  const handleLeagueInvitationPress = useCallback(
    (inv: LeagueInvitation) => {
      (navigation as any).navigate('Teams', {
        screen: 'TeamDetails',
        params: { teamId: inv.rosterId, readOnly: true },
      });
    },
    [navigation]
  );

  const handleEventInvitationPress = useCallback(
    (inv: EventInvitation) => {
      navigation.navigate('EventDetails', { eventId: inv.eventId });
    },
    [navigation]
  );

  const handleReadyToSchedulePress = useCallback(
    (league: ReadyToScheduleLeague) => {
      (navigation as any).navigate('Leagues', {
        screen: 'LeagueScheduling',
        params: { leagueId: league.id },
      });
    },
    [navigation]
  );

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

  // Profile selector for join
  const [joinEventId, setJoinEventId] = useState<string | null>(null);
  const [showJoinProfileSelector, setShowJoinProfileSelector] = useState(false);

  const handleJoinEvent = useCallback(
    (eventId: string) => {
      if (!user?.id) {
        Alert.alert('Error', 'You must be logged in to join a game.');
        return;
      }
      if (dependents.length > 0) {
        setJoinEventId(eventId);
        setShowJoinProfileSelector(true);
      } else {
        doJoinEvent(eventId, user.id);
      }
    },
    [user?.id, dependents]
  );

  const doJoinEvent = useCallback(
    async (eventId: string, userId: string) => {
      try {
        await bookEventMutation({ eventId, userId }).unwrap();
        Alert.alert('Joined!', 'You have been added to the game.');
      } catch (err: any) {
        const msg =
          err?.data?.message || 'Failed to join game. Please try again.';
        Alert.alert('Error', msg);
      }
    },
    [bookEventMutation]
  );

  const handleJoinProfileSelected = useCallback(
    (profileId: string) => {
      setShowJoinProfileSelector(false);
      if (joinEventId) doJoinEvent(joinEventId, profileId);
      setJoinEventId(null);
    },
    [joinEventId, doJoinEvent]
  );

  const handleCreateEvent = useCallback(() => {
    setSearchModalVisible(false);
    navigation.navigate('CreateEvent', {});
  }, [navigation]);

  const handleSearchEventPress = useCallback(
    (event: any) => {
      setSearchModalVisible(false);
      navigation.navigate('EventDetails', { eventId: event.id });
    },
    [navigation]
  );

  if (authLoading || isLoading) {
    return (
      <View
        style={[styles.loadingContainer, { backgroundColor: colors.bgScreen }]}
      >
        <LoadingSpinner size={40} color={colors.cobalt} />
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[styles.loadingContainer, { backgroundColor: colors.bgScreen }]}
      >
        <ErrorDisplay message={error} onRetry={handleRefresh} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bgScreen }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          contentMaxWidth && { alignItems: 'center' as const },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.cobalt}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.inner,
            contentMaxWidth && { maxWidth: contentMaxWidth, width: '100%' },
          ]}
        >
          {/* ── Live game banner ────────────────── */}
          {liveGameBooking && (
            <LiveGameBanner
              booking={liveGameBooking}
              onPress={handleBookingPress}
            />
          )}

          {/* ── My Crew ────────────────────────── */}
          {hasDependents && (
            <MyCrewRow
              members={crewMembers}
              selectedId={selectedCrewId}
              onSelect={onSelectCrew}
            />
          )}

          {/* ── Calendar (always visible) ──────── */}
          <View style={styles.calendarSection}>
            <View
              style={[
                styles.calendarCard,
                { backgroundColor: colors.bgCard, shadowColor: colors.ink },
              ]}
            >
              <Calendar
                current={selectedDate}
                markedDates={calendarMarkedDates}
                markingType="multi-dot"
                onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
                theme={calendarTheme}
                style={styles.calendar}
              />
            </View>

            {calendarDateBookings.map(booking => (
              <CrewEventCard
                key={booking.id}
                booking={booking}
                crewColor={getBookingCrewColor(booking)}
                onPress={handleBookingPress}
              />
            ))}
          </View>

          {/* ── Games near you ─────────────────── */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.ink }]}>
              Games near you
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Events' as any)}
            >
              <Text style={[styles.seeAll, { color: colors.cobalt }]}>
                See all
              </Text>
            </TouchableOpacity>
          </View>

          {discoverLoading ? (
            <ActivityIndicator
              size="small"
              color={colors.cobalt}
              style={{ marginVertical: 16 }}
            />
          ) : discoverEvents.length > 0 ? (
            discoverEvents.map(event => (
              <TouchableOpacity
                key={event.id}
                style={[
                  styles.discoverCard,
                  { backgroundColor: colors.bgCard },
                ]}
                onPress={() =>
                  navigation.navigate('EventDetails', { eventId: event.id })
                }
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.discoverIcon,
                    { backgroundColor: colors.bgSubtle },
                  ]}
                >
                  <Text style={{ fontSize: 20 }}>
                    {getSportEmoji(event.sportType)}
                  </Text>
                </View>
                <View style={styles.discoverInfo}>
                  <Text
                    style={[styles.discoverTitle, { color: colors.ink }]}
                    numberOfLines={1}
                  >
                    {event.title}
                  </Text>
                  <Text
                    style={[
                      styles.discoverMeta,
                      { color: colors.inkSecondary },
                    ]}
                    numberOfLines={1}
                  >
                    {formatEventTime(event.startTime)} {'\u00B7'}{' '}
                    {event.facility?.name ||
                      event.locationName ||
                      'Location TBD'}{' '}
                    {'\u00B7'} {event.currentParticipants}/
                    {event.maxParticipants || '\u221E'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.joinBtn}
                  onPress={() => handleJoinEvent(event.id)}
                >
                  <Text style={[styles.joinBtnText, { color: colors.cobalt }]}>
                    Join
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          ) : (
            <View
              style={[styles.discoverEmpty, { backgroundColor: colors.bgCard }]}
            >
              <Text
                style={[
                  styles.discoverEmptyText,
                  { color: colors.inkSecondary },
                ]}
              >
                No games near you yet
              </Text>
              <TouchableOpacity
                style={[
                  styles.hostFirstBtn,
                  { backgroundColor: colors.cobalt },
                ]}
                onPress={handleCreateEvent}
              >
                <Text
                  style={[styles.hostFirstBtnText, { color: colors.white }]}
                >
                  Host the first one
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[
          styles.fab,
          { backgroundColor: colors.cobalt, shadowColor: colors.cobalt },
        ]}
        onPress={handleCreateEvent}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Host an event"
      >
        <Ionicons name="add" size={26} color={colors.white} />
      </TouchableOpacity>

      <StepOutModal
        visible={stepOutModalVisible}
        eventTitle={selectedBooking?.event?.title || 'Event'}
        onConfirm={handleStepOutConfirm}
        onCancel={handleStepOutCancel}
      />

      <EventSearchPanel
        visible={searchModalVisible}
        onCreateEvent={handleCreateEvent}
        onEventPress={handleSearchEventPress}
      />

      <ProfileSelectorModal
        visible={showJoinProfileSelector}
        profiles={[
          ...(currentUser
            ? [
                {
                  id: currentUser.id,
                  firstName: currentUser.firstName,
                  lastName: currentUser.lastName || '',
                  profileImage: currentUser.profileImage,
                },
              ]
            : []),
          ...dependents.map(d => ({
            id: d.id,
            firstName: d.firstName,
            lastName: d.lastName,
            profileImage: d.profileImage,
          })),
        ]}
        onSelect={handleJoinProfileSelected}
        onCancel={() => {
          setShowJoinProfileSelector(false);
          setJoinEventId(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  inner: {
    paddingHorizontal: 20,
    paddingTop: 0,
  },

  // ── Loading ─────────────────────────────
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: fonts.body,
    fontSize: 16,
  },

  // ── Inbox button ────────────────────────
  inboxBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  inboxDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  inboxBtnText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
  },

  // ── Calendar section ────────────────────
  calendarSection: {
    marginTop: 24,
  },
  calendarCard: {
    borderRadius: 20,
    padding: 8,
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
    textAlign: 'center',
    paddingVertical: 24,
  },

  // ── Section headers ────────────────────
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  seeAll: {
    fontFamily: fonts.headingSemi,
    fontSize: 14,
  },

  // ── Discover cards ────────────────────
  discoverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  discoverIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discoverInfo: {
    flex: 1,
  },
  discoverTitle: {
    fontFamily: fonts.headingSemi,
    fontSize: 15,
  },
  discoverMeta: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: 2,
  },
  joinBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  joinBtnText: {
    fontFamily: fonts.headingSemi,
    fontSize: 14,
  },

  // ── Discover empty ────────────────────
  discoverEmpty: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  discoverEmptyText: {
    fontFamily: fonts.body,
    fontSize: 15,
    marginBottom: 12,
  },
  hostFirstBtn: {
    borderRadius: 9999,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  hostFirstBtnText: {
    fontFamily: fonts.headingSemi,
    fontSize: 14,
  },

  // ── Upcoming section ───────────────────
  upcomingSection: {
    marginTop: 20,
  },

  // ── FAB ─────────────────────────────────
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.38,
    shadowRadius: 12,
    elevation: 6,
  },

  // ── Inbox modal ─────────────────────────
  inboxBackdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 70,
  },
  inboxModal: {
    borderRadius: 24,
    maxHeight: '80%',
    overflow: 'hidden',
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
  },
  inboxScroll: {
    paddingVertical: 8,
  },
});
