import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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

// Components
import { BookingCard } from '../../components/ui/BookingCard';
import { StepOutModal } from '../../components/bookings/StepOutModal';
import { CancelRequestCard } from '../../components/home/CancelRequestCard';
import { PendingReservationsSection } from '../../components/home/PendingReservationsSection';
import { CollapsibleSection } from '../../components/ui/CollapsibleSection';
import { DependentToggle } from '../../components/events/DependentToggle';

// Services
import { debriefService } from '../../services/api/DebriefService';
import { userService, RosterInvitation, LeagueInvitation, EventInvitation, ReadyToScheduleLeague } from '../../services/api/UserService';

// Context
import { useAuth } from '../../context/AuthContext';

// Store
import { selectUser } from '../../store/slices/authSlice';
import { selectActiveUserId, selectDependents } from '../../store/slices/contextSlice';
import { useGetEventsQuery, useGetUserBookingsQuery, useCancelBookingMutation, DEFAULT_EVENT_FILTERS } from '../../store/api/eventsApi';
import { useGetPendingCancelRequestsQuery, useApproveCancelRequestMutation, useDenyCancelRequestMutation } from '../../store/api/cancelRequestsApi';
import { BookingStatus } from '../../types';

// Theme
import { colors, fonts, Spacing } from '../../theme';

// Types
import { Booking } from '../../types';
import { HomeStackParamList } from '../../navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Utils
import { PersonFilter } from '../../types/eventsCalendar';
import { assignPersonColors } from '../../utils/eventsCalendarUtils';

type HomeScreenNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'HomeScreen'>;

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return 'just now';
  if (diffHours === 1) return '1 hour ago';
  return `${diffHours} hours ago`;
}

export function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { isLoading: authLoading } = useAuth();
  const { user: currentUser } = useAuth();
  
  // Redux state
  const user = useSelector(selectUser);
  const activeUserId = useSelector(selectActiveUserId);
  const dependents = useSelector(selectDependents);
  
  // RTK Query hooks
  const { 
    isLoading: eventsLoading, 
    error: eventsError,
    refetch: refetchEvents 
  } = useGetEventsQuery({
    filters: DEFAULT_EVENT_FILTERS,
    pagination: { page: 1, limit: 20 },
    ...(user?.id ? { userId: user.id } : {}),
  });

  const { 
    data: bookingsData, 
    isLoading: bookingsLoading,
    refetch: refetchBookings 
  } = useGetUserBookingsQuery({
    status: 'all',
    pagination: { page: 1, limit: 100 },
  });

  const [cancelBookingMutation] = useCancelBookingMutation();

  // Cancel requests hooks
  const { data: cancelRequests = [] } = useGetPendingCancelRequestsQuery(user?.id || '', { skip: !user?.id });
  const [approveCancelRequest, { isLoading: isApproving }] = useApproveCancelRequestMutation();
  const [denyCancelRequest, { isLoading: isDenying }] = useDenyCancelRequestMutation();

  // Schedule bookings: all events sorted soonest first
  const scheduleBookings = useMemo(() => {
    const all = bookingsData?.data || [];
    return [...all].sort((a, b) => {
      const aTime = a.event?.startTime ? new Date(a.event.startTime).getTime() : 0;
      const bTime = b.event?.startTime ? new Date(b.event.startTime).getTime() : 0;
      return aTime - bTime;
    });
  }, [bookingsData]);

  // Debrief state
  const [debriefEvents, setDebriefEvents] = useState<Booking[]>([]);
  const [debriefLoading, setDebriefLoading] = useState(false);

  // Invitations state
  const [rosterInvitations, setRosterInvitations] = useState<RosterInvitation[]>([]);
  const [leagueInvitations, setLeagueInvitations] = useState<LeagueInvitation[]>([]);
  const [eventInvitations, setEventInvitations] = useState<EventInvitation[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);

  // Ready to schedule leagues state
  const [readyToScheduleLeagues, setReadyToScheduleLeagues] = useState<ReadyToScheduleLeague[]>([]);

  // DependentToggle state (moved from Events tab)
  const [activeFilter, setActiveFilter] = useState<PersonFilter>({
    type: 'individual',
    userId: currentUser?.id || '',
  });

  const personColors = useMemo(
    () => assignPersonColors(currentUser?.id || '', dependents),
    [currentUser?.id, dependents],
  );
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stepOutModalVisible, setStepOutModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const isLoading = eventsLoading || bookingsLoading;

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

  const loadInvitations = useCallback(async () => {
    try {
      setInvitationsLoading(true);
      const result = await userService.getInvitations();
      setRosterInvitations(result.rosterInvitations || []);
      setLeagueInvitations(result.leagueInvitations || []);
      setEventInvitations(result.eventInvitations || []);
    } catch (err) {
      console.error('Failed to load invitations:', err);
    } finally {
      setInvitationsLoading(false);
    }
  }, []);

  const loadReadyToScheduleLeagues = useCallback(async () => {
    try {
      const result = await userService.getLeaguesReadyToSchedule();
      setReadyToScheduleLeagues(result || []);
    } catch (err) {
      console.error('Failed to load ready to schedule leagues:', err);
      setReadyToScheduleLeagues([]);
    }
  }, []);

  const handleRosterInvitationPress = useCallback((inv: RosterInvitation) => {
    (navigation as any).navigate('Teams', {
      screen: 'TeamDetails',
      params: { teamId: inv.rosterId, readOnly: true },
    });
  }, [navigation]);

  const handleLeagueInvitationPress = useCallback((inv: LeagueInvitation) => {
    (navigation as any).navigate('Teams', {
      screen: 'TeamDetails',
      params: { teamId: inv.rosterId, readOnly: true },
    });
  }, [navigation]);

  const handleEventInvitationPress = useCallback((inv: EventInvitation) => {
    (navigation as any).navigate('Events', {
      screen: 'EventDetails',
      params: { eventId: inv.eventId },
    });
  }, [navigation]);

  const handleReadyToSchedulePress = useCallback((league: ReadyToScheduleLeague) => {
    (navigation as any).navigate('Leagues', {
      screen: 'LeagueScheduling',
      params: { leagueId: league.id },
    });
  }, [navigation]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([refetchEvents(), refetchBookings(), loadDebriefEvents(), loadInvitations(), loadReadyToScheduleLeagues()]);
    setIsRefreshing(false);
  }, [refetchEvents, refetchBookings, loadDebriefEvents, loadInvitations, loadReadyToScheduleLeagues]);

  useFocusEffect(
    useCallback(() => {
      if (!authLoading) {
        refetchEvents();
        refetchBookings();
        loadDebriefEvents();
        loadInvitations();
        loadReadyToScheduleLeagues();
      }
    }, [authLoading, refetchEvents, refetchBookings, loadDebriefEvents, loadInvitations, loadReadyToScheduleLeagues])
  );

  // Re-fetch all data when the active user context changes (guardian ↔ dependent)
  useEffect(() => {
    if (!authLoading) {
      refetchEvents();
      refetchBookings();
      loadDebriefEvents();
      loadInvitations();
      loadReadyToScheduleLeagues();
    }
  }, [activeUserId]);

  const handleDebriefPress = useCallback((booking: Booking) => {
    navigation.navigate('Debrief', { eventId: booking.eventId });
  }, [navigation]);

  const handleBookingPress = useCallback((booking: Booking) => {
    navigation.navigate('EventDetails', { eventId: booking.eventId });
  }, [navigation]);

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
      await Promise.all([refetchEvents(), refetchBookings()]);
    } catch (error) {
      console.error('Error stepping out:', error);
      Alert.alert('Error', 'Failed to leave the event. Please try again.');
    }
  }, [selectedBooking, cancelBookingMutation, refetchEvents, refetchBookings]);

  const handleStepOutCancel = useCallback(() => {
    setStepOutModalVisible(false);
    setSelectedBooking(null);
  }, []);

  const handleApproveCancelRequest = async (id: string) => {
    try {
      await approveCancelRequest({ id, userId: user?.id || '' }).unwrap();
      Alert.alert('Approved', 'Cancellation request approved. The reservation has been cancelled and refunded.');
    } catch (error) {
      Alert.alert('Error', 'Failed to approve cancellation request.');
    }
  };

  const handleDenyCancelRequest = async (id: string) => {
    try {
      await denyCancelRequest({ id, userId: user?.id || '' }).unwrap();
      Alert.alert('Denied', 'Cancellation request denied. The reservation remains active.');
    } catch (error) {
      Alert.alert('Error', 'Failed to deny cancellation request.');
    }
  };

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
        {/* Pending reservations for facility owners */}
        {user?.id && <PendingReservationsSection ownerId={user.id} />}

        {/* Schedule section — no segmented controls, just upcoming bookings */}
        <CollapsibleSection title="Schedule" count={scheduleBookings.length}>
          <View style={styles.sectionInner}>
            {/* Calendar/profile toggle — moved from Events tab */}
            <DependentToggle
              guardian={{ id: currentUser?.id || '', firstName: currentUser?.firstName || 'Me' }}
              dependents={dependents}
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              personColors={personColors}
            />

            {scheduleBookings.length === 0 ? (
              <Text style={styles.emptyText}>No upcoming events</Text>
            ) : (
              scheduleBookings.slice(0, 5).map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onPress={handleBookingPress}
                  onCancel={handleStepOut}
                />
              ))
            )}
          </View>
        </CollapsibleSection>

        {/* Debrief section */}
        {debriefEvents.length > 0 && (
          <CollapsibleSection title="Debrief" count={debriefEvents.length}>
            <View style={styles.sectionInner}>
            <Text style={styles.sectionSubtitle}>Rate and salute players from recent games</Text>
            {debriefEvents.slice(0, 3).map((booking) => (
              <TouchableOpacity
                key={booking.id}
                style={styles.debriefCard}
                onPress={() => handleDebriefPress(booking)}
                activeOpacity={0.7}
              >
                <View style={styles.debriefInfo}>
                  <Text style={styles.debriefTitle} numberOfLines={1}>
                    {booking.event?.title || 'Event'}
                  </Text>
                  <Text style={styles.debriefTime}>
                    {booking.event?.endTime ? formatTimeAgo(new Date(booking.event.endTime)) : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.inkFaint} />
              </TouchableOpacity>
            ))}
            </View>
          </CollapsibleSection>
        )}

        {/* Ready to schedule section */}
        {readyToScheduleLeagues.length > 0 && (
          <CollapsibleSection title="Scheduling" count={readyToScheduleLeagues.length}>
            <View style={styles.sectionInner}>
            {readyToScheduleLeagues.map((league) => (
              <TouchableOpacity
                key={league.id}
                style={styles.readyToScheduleCard}
                onPress={() => handleReadyToSchedulePress(league)}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar-outline" size={20} color={colors.pine} />
                <View style={styles.readyToScheduleInfo}>
                  <Text style={styles.readyToScheduleTitle} numberOfLines={1}>
                    {league.name} is ready to schedule.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.inkFaint} />
              </TouchableOpacity>
            ))}
            </View>
          </CollapsibleSection>
        )}

        {/* Invitations section */}
        {(rosterInvitations.length > 0 || leagueInvitations.length > 0 || eventInvitations.length > 0) && (
          <CollapsibleSection title="Invitations" count={rosterInvitations.length + leagueInvitations.length + eventInvitations.length}>
            <View style={styles.sectionInner}>
            {rosterInvitations.map((inv) => (
              <TouchableOpacity
                key={inv.id}
                style={styles.invitationCard}
                onPress={() => handleRosterInvitationPress(inv)}
                activeOpacity={0.7}
              >
                <Ionicons name="people-outline" size={20} color={colors.pine} />
                <View style={styles.invitationInfo}>
                  <Text style={styles.invitationTitle}>{inv.rosterName}</Text>
                  <Text style={styles.invitationSubtitle}>Roster invitation</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.inkFaint} />
              </TouchableOpacity>
            ))}
            {leagueInvitations.map((inv) => (
              <TouchableOpacity
                key={inv.id}
                style={styles.invitationCard}
                onPress={() => handleLeagueInvitationPress(inv)}
                activeOpacity={0.7}
              >
                <Ionicons name="trophy-outline" size={20} color={colors.court} />
                <View style={styles.invitationInfo}>
                  <Text style={styles.invitationTitle}>{inv.leagueName}</Text>
                  <Text style={styles.invitationSubtitle}>League invitation</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.inkFaint} />
              </TouchableOpacity>
            ))}
            {eventInvitations.map((inv) => (
              <TouchableOpacity
                key={inv.id}
                style={styles.invitationCard}
                onPress={() => handleEventInvitationPress(inv)}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar-outline" size={20} color={colors.pine} />
                <View style={styles.invitationInfo}>
                  <Text style={styles.invitationTitle}>{inv.eventTitle}</Text>
                  <Text style={styles.invitationSubtitle}>
                    {inv.startTime ? new Date(inv.startTime).toLocaleDateString(undefined, { timeZone: 'UTC' }) : 'Event invitation'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.inkFaint} />
              </TouchableOpacity>
            ))}
            </View>
          </CollapsibleSection>
        )}

        {/* Cancel Requests section */}
        {cancelRequests.length > 0 && (
          <CollapsibleSection title="Cancel Requests" count={cancelRequests.length}>
            <View style={styles.sectionInner}>
            <View style={{ gap: Spacing.sm }}>
              {cancelRequests.map((request) => (
                <CancelRequestCard
                  key={request.id}
                  cancelRequest={request}
                  onApprove={handleApproveCancelRequest}
                  onDeny={handleDenyCancelRequest}
                  isLoading={isApproving || isDenying}
                />
              ))}
            </View>
            </View>
          </CollapsibleSection>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      <StepOutModal
        visible={stepOutModalVisible}
        eventTitle={selectedBooking?.event?.title || 'Event'}
        onConfirm={handleStepOutConfirm}
        onCancel={handleStepOutCancel}
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
  sectionSubtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
    marginBottom: 12,
    marginTop: -4,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
    textAlign: 'center',
    paddingVertical: 24,
  },
  debriefCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  debriefInfo: {
    flex: 1,
  },
  debriefTitle: {
    fontFamily: fonts.label,
    fontSize: 15,
    color: colors.ink,
  },
  debriefTime: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
    marginTop: 2,
  },
  invitationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
    gap: 12,
  },
  invitationInfo: {
    flex: 1,
  },
  invitationTitle: {
    fontFamily: fonts.label,
    fontSize: 15,
    color: colors.ink,
  },
  invitationSubtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
    marginTop: 2,
  },
  readyToScheduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
    gap: 12,
  },
  readyToScheduleInfo: {
    flex: 1,
  },
  readyToScheduleTitle: {
    fontFamily: fonts.label,
    fontSize: 15,
    color: colors.ink,
  },
});
