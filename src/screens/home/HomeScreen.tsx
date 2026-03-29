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

// Services
import { debriefService } from '../../services/api/DebriefService';
import { userService, RosterInvitation, LeagueInvitation, EventInvitation, ReadyToScheduleLeague } from '../../services/api/UserService';

// Context
import { useAuth } from '../../context/AuthContext';

// Store
import { selectUser } from '../../store/slices/authSlice';
import { selectActiveUserId, selectDependents } from '../../store/slices/contextSlice';
import { useGetUserBookingsQuery, useCancelBookingMutation } from '../../store/api/eventsApi';
import { useGetPendingCancelRequestsQuery, useApproveCancelRequestMutation, useDenyCancelRequestMutation } from '../../store/api/cancelRequestsApi';

// Theme
import { colors, fonts, Spacing } from '../../theme';

// Types
import { Booking } from '../../types';
import { HomeStackParamList } from '../../navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Utils
import { PersonFilter } from '../../types/eventsCalendar';
import { formatDateForCalendar, calendarTheme } from '../../utils/calendarUtils';
import { searchEventBus } from '../../utils/searchEventBus';

type HomeScreenNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'HomeScreen'>;

export function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { isLoading: authLoading, user: currentUser } = useAuth();
  const { width: screenWidth } = useWindowDimensions();

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

  // Cancel requests hooks
  const { data: cancelRequests = [] } = useGetPendingCancelRequestsQuery(user?.id || '', { skip: !user?.id });
  const [approveCancelRequest, { isLoading: isApproving }] = useApproveCancelRequestMutation();
  const [denyCancelRequest, { isLoading: isDenying }] = useDenyCancelRequestMutation();

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

  // Future bookings only (for cards view)
  const futureBookings = useMemo(() => {
    const now = new Date();
    return allBookings.filter((b) => {
      if (!b.event?.startTime) return false;
      if (b.status === 'cancelled') return false;
      return new Date(b.event.endTime || b.event.startTime) >= now;
    });
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

  // Calendar marked dates
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
  }, [allBookings, selectedDate]);

  // Bookings for selected calendar date
  const calendarDateBookings = useMemo(() => {
    return allBookings.filter((b) => {
      if (!b.event?.startTime) return false;
      return formatDateForCalendar(new Date(b.event.startTime)) === selectedDate;
    });
  }, [allBookings, selectedDate]);

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
    await Promise.all([refetchBookings(), loadDebriefEvents(), loadInvitations(), loadReadyToScheduleLeagues()]);
    setIsRefreshing(false);
  }, [refetchBookings, loadDebriefEvents, loadInvitations, loadReadyToScheduleLeagues]);

  useFocusEffect(
    useCallback(() => {
      if (!authLoading) {
        refetchBookings();
        loadDebriefEvents();
        loadInvitations();
        loadReadyToScheduleLeagues();
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
      loadDebriefEvents();
      loadInvitations();
      loadReadyToScheduleLeagues();
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

          {/* ── Inbox ──────────────────────────── */}
          {inboxCount > 0 && (
            <TouchableOpacity style={styles.inboxBtn} onPress={() => setInboxModalVisible(true)} activeOpacity={0.85}>
              <View style={styles.inboxDot} />
              <Text style={styles.inboxBtnText}>
                {inboxCount} item{inboxCount !== 1 ? 's' : ''} need{inboxCount === 1 ? 's' : ''} your attention
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.outline} />
            </TouchableOpacity>
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

      {/* Inbox modal */}
      <Modal visible={inboxModalVisible} transparent animationType="fade" onRequestClose={() => setInboxModalVisible(false)}>
        <Pressable style={styles.inboxBackdrop} onPress={() => setInboxModalVisible(false)}>
          <View style={[styles.inboxModal, isWide && { maxWidth: 480, alignSelf: 'center' as const, width: '100%' }]}>
            <View style={styles.inboxHeader}>
              <Text style={styles.inboxTitle}>Inbox</Text>
              <TouchableOpacity onPress={() => setInboxModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={colors.onSurface} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.inboxScroll} showsVerticalScrollIndicator={false}>
              <InboxSection
                rosterInvitations={rosterInvitations}
                leagueInvitations={leagueInvitations}
                eventInvitations={eventInvitations}
                readyToScheduleLeagues={readyToScheduleLeagues}
                debriefEvents={debriefEvents}
                cancelRequests={cancelRequests}
                onRosterInvitationPress={(inv) => { setInboxModalVisible(false); handleRosterInvitationPress(inv); }}
                onLeagueInvitationPress={(inv) => { setInboxModalVisible(false); handleLeagueInvitationPress(inv); }}
                onEventInvitationPress={(inv) => { setInboxModalVisible(false); handleEventInvitationPress(inv); }}
                onScheduleLeaguePress={(league) => { setInboxModalVisible(false); handleReadyToSchedulePress(league); }}
                onDebriefPress={(booking) => { setInboxModalVisible(false); handleDebriefPress(booking); }}
                onApproveCancelRequest={handleApproveCancelRequest}
                onDenyCancelRequest={handleDenyCancelRequest}
                isCancelLoading={isApproving || isDenying}
              />
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

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
