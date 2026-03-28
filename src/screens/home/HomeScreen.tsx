import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
import { useSelector } from 'react-redux';
import { Calendar, DateData } from 'react-native-calendars';

// Components
import { BookingCard } from '../../components/ui/BookingCard';
import { StepOutModal } from '../../components/bookings/StepOutModal';
import { PendingReservationsSection } from '../../components/home/PendingReservationsSection';
import { EventSearchPanel } from '../../components/home/EventSearchPanel';
import { InboxSection } from '../../components/home/InboxSection';

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

  // Redux state
  const user = useSelector(selectUser);
  const activeUserId = useSelector(selectActiveUserId);
  const dependents = useSelector(selectDependents);

  // Calendar state
  const [selectedDate, setSelectedDate] = useState<string>(formatDateForCalendar(new Date()));

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

  // DependentToggle state — must be declared before allBookings memo that references it
  const [activeFilter, setActiveFilter] = useState<PersonFilter>({
    type: 'individual',
    userId: currentUser?.id || '',
  });

  // Calendar-only filter — does NOT switch the active account
  const handleFilterChange = useCallback((filter: PersonFilter) => {
    setActiveFilter(filter);
  }, []);

  // All bookings sorted chronologically, filtered by calendar toggle person
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

  // Build calendar marked dates — hollow circle for days with events, solid for selected
  const calendarMarkedDates = useMemo(() => {
    const marks: Record<string, any> = {};
    for (const b of allBookings) {
      if (!b.event?.startTime) continue;
      const dateStr = formatDateForCalendar(new Date(b.event.startTime));
      if (dateStr === selectedDate) continue; // selected date handled below
      marks[dateStr] = {
        customStyles: {
          container: {
            borderWidth: 1.5,
            borderColor: colors.pine,
            borderRadius: 16,
          },
          text: { color: colors.ink },
        },
      };
    }
    // Selected date — solid circle
    marks[selectedDate] = {
      selected: true,
      customStyles: {
        container: {
          backgroundColor: colors.pine,
          borderRadius: 16,
        },
        text: { color: '#FFFFFF' },
      },
    };
    return marks;
  }, [allBookings, selectedDate]);

  // Filter bookings by selected date
  const filteredBookings = useMemo(() => {
    return allBookings.filter((b) => {
      if (!b.event?.startTime) return false;
      return formatDateForCalendar(new Date(b.event.startTime)) === selectedDate;
    });
  }, [allBookings, selectedDate]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stepOutModalVisible, setStepOutModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const isLoading = bookingsLoading;

  // Debrief state
  const [debriefEvents, setDebriefEvents] = useState<Booking[]>([]);

  // Invitations state
  const [rosterInvitations, setRosterInvitations] = useState<RosterInvitation[]>([]);
  const [leagueInvitations, setLeagueInvitations] = useState<LeagueInvitation[]>([]);
  const [eventInvitations, setEventInvitations] = useState<EventInvitation[]>([]);

  // Ready to schedule leagues state
  const [readyToScheduleLeagues, setReadyToScheduleLeagues] = useState<ReadyToScheduleLeague[]>([]);

  const loadDebriefEvents = useCallback(async () => {
    try {
      const result = await debriefService.getDebriefEvents();
      setDebriefEvents(result.data || []);
    } catch (err) {
      console.error('Failed to load debrief events:', err);
      setDebriefEvents([]);
    }
  }, []);

  const loadInvitations = useCallback(async () => {
    try {
      const result = await userService.getInvitations();
      setRosterInvitations(result.rosterInvitations || []);
      setLeagueInvitations(result.leagueInvitations || []);
      setEventInvitations(result.eventInvitations || []);
    } catch (err) {
      console.error('Failed to load invitations:', err);
    }
  }, []);

  const loadReadyToScheduleLeagues = useCallback(async () => {
    try {
      const result = await userService.getLeaguesReadyToSchedule();
      setReadyToScheduleLeagues(result || []);
    } catch (err) {
      setReadyToScheduleLeagues([]);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
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

  // Listen for openSearch event from the header search pill — toggle
  useEffect(() => {
    const unsubscribe = searchEventBus.subscribe(() => {
      setSearchModalVisible((prev) => !prev);
    });
    return unsubscribe;
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
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.pine} />
        }
      >
        {user?.id && <PendingReservationsSection ownerId={user.id} />}

        {/* Calendar */}
        <View style={styles.sectionInner}>
          <Calendar
            current={selectedDate}
            markedDates={calendarMarkedDates}
            markingType="custom"
            onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
            theme={calendarTheme}
            style={styles.calendar}
          />

          {/* Filtered booking cards for selected day */}
          {filteredBookings.length === 0 ? (
            <Text style={styles.emptyText}>No events on this day</Text>
          ) : (
            filteredBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onPress={handleBookingPress}
                onCancel={handleStepOut}
              />
            ))
          )}
        </View>

        {/* Action items */}
        <InboxSection
          rosterInvitations={rosterInvitations}
          leagueInvitations={leagueInvitations}
          eventInvitations={eventInvitations}
          readyToScheduleLeagues={readyToScheduleLeagues}
          debriefEvents={debriefEvents}
          cancelRequests={cancelRequests}
          onRosterInvitationPress={handleRosterInvitationPress}
          onLeagueInvitationPress={handleLeagueInvitationPress}
          onEventInvitationPress={handleEventInvitationPress}
          onScheduleLeaguePress={handleReadyToSchedulePress}
          onDebriefPress={handleDebriefPress}
          onApproveCancelRequest={handleApproveCancelRequest}
          onDenyCancelRequest={handleDenyCancelRequest}
          isCancelLoading={isApproving || isDenying}
        />

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Floating Host button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleCreateEvent}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Host an event"
      >
        <Ionicons name="add" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      <StepOutModal visible={stepOutModalVisible} eventTitle={selectedBooking?.event?.title || 'Event'} onConfirm={handleStepOutConfirm} onCancel={handleStepOutCancel} />

      {/* Search panel — drops down below header */}
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
    backgroundColor: colors.cream,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.cream,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.inkFaint,
  },
  sectionInner: {
    paddingHorizontal: 16,
  },
  calendar: {
    borderRadius: 12,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
    textAlign: 'center',
    paddingVertical: 24,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.pine,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
