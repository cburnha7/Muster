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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Calendar, DateData } from 'react-native-calendars';

// Components
import { BookingCard } from '../../components/ui/BookingCard';
import { StepOutModal } from '../../components/bookings/StepOutModal';
import { CancelRequestCard } from '../../components/home/CancelRequestCard';
import { PendingReservationsSection } from '../../components/home/PendingReservationsSection';
import { CollapsibleSection } from '../../components/ui/CollapsibleSection';
import { EventSearchModal, EventSearchParams } from '../../components/home/EventSearchModal';

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

  // User selector dropdown state
  const [userDropdownVisible, setUserDropdownVisible] = useState(false);

  const activeDisplayName = useMemo(() => {
    if (activeFilter.type === 'individual' && activeFilter.userId !== currentUser?.id) {
      const dep = dependents.find((d) => d.id === activeFilter.userId);
      return dep ? dep.firstName : currentUser?.firstName || 'Me';
    }
    return currentUser?.firstName || 'Me';
  }, [activeFilter, currentUser, dependents]);

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

  // Listen for openSearch event from the header search pill
  useEffect(() => {
    const unsubscribe = searchEventBus.subscribe(() => {
      setSearchModalVisible(true);
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

  const handleSearchSubmit = useCallback((params: EventSearchParams) => {
    setSearchModalVisible(false);
    navigation.navigate('EventSearchResults', {
      sportTypes: params.sportTypes,
      locationQuery: params.locationQuery,
      latitude: params.latitude,
      longitude: params.longitude,
      radiusMiles: params.radiusMiles,
    });
  }, [navigation]);

  const handleCreateEvent = useCallback(() => {
    setSearchModalVisible(false);
    navigation.navigate('CreateEvent', {});
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

        {/* Schedule section with calendar */}
        <CollapsibleSection
          title="Schedule"
          rightElement={
            <TouchableOpacity
              style={styles.userSelectorBtn}
              onPress={() => setUserDropdownVisible(true)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Viewing schedule for ${activeDisplayName}`}
            >
              <Ionicons name="person-circle-outline" size={18} color={colors.pine} />
              <Text style={styles.userSelectorText} numberOfLines={1}>{activeDisplayName}</Text>
              <Ionicons name="chevron-down" size={14} color={colors.pine} />
            </TouchableOpacity>
          }
        >
          <View style={styles.sectionInner}>
            {/* Calendar */}
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
        </CollapsibleSection>

        {/* Debrief section */}
        {debriefEvents.length > 0 && (
          <CollapsibleSection title="Debrief" count={debriefEvents.length}>
            <View style={styles.sectionInner}>
              <Text style={styles.sectionSubtitle}>Rate and salute players from recent games</Text>
              {debriefEvents.slice(0, 3).map((booking) => (
                <TouchableOpacity key={booking.id} style={styles.debriefCard} onPress={() => handleDebriefPress(booking)} activeOpacity={0.7}>
                  <View style={styles.debriefInfo}>
                    <Text style={styles.debriefTitle} numberOfLines={1}>{booking.event?.title || 'Event'}</Text>
                    <Text style={styles.debriefTime}>{booking.event?.endTime ? formatTimeAgo(new Date(booking.event.endTime)) : ''}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.inkFaint} />
                </TouchableOpacity>
              ))}
            </View>
          </CollapsibleSection>
        )}

        {/* Ready to schedule */}
        {readyToScheduleLeagues.length > 0 && (
          <CollapsibleSection title="Scheduling" count={readyToScheduleLeagues.length}>
            <View style={styles.sectionInner}>
              {readyToScheduleLeagues.map((league) => (
                <TouchableOpacity key={league.id} style={styles.actionCard} onPress={() => handleReadyToSchedulePress(league)} activeOpacity={0.7}>
                  <Ionicons name="calendar-outline" size={20} color={colors.pine} />
                  <View style={styles.actionCardInfo}>
                    <Text style={styles.actionCardTitle} numberOfLines={1}>{league.name} is ready to schedule.</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.inkFaint} />
                </TouchableOpacity>
              ))}
            </View>
          </CollapsibleSection>
        )}

        {/* Invitations */}
        {(rosterInvitations.length > 0 || leagueInvitations.length > 0 || eventInvitations.length > 0) && (
          <CollapsibleSection title="Invitations" count={rosterInvitations.length + leagueInvitations.length + eventInvitations.length}>
            <View style={styles.sectionInner}>
              {rosterInvitations.map((inv) => (
                <TouchableOpacity key={inv.id} style={styles.actionCard} onPress={() => handleRosterInvitationPress(inv)} activeOpacity={0.7}>
                  <Ionicons name="people-outline" size={20} color={colors.pine} />
                  <View style={styles.actionCardInfo}><Text style={styles.actionCardTitle}>{inv.rosterName}</Text><Text style={styles.actionCardSub}>Roster invitation</Text></View>
                  <Ionicons name="chevron-forward" size={20} color={colors.inkFaint} />
                </TouchableOpacity>
              ))}
              {leagueInvitations.map((inv) => (
                <TouchableOpacity key={inv.id} style={styles.actionCard} onPress={() => handleLeagueInvitationPress(inv)} activeOpacity={0.7}>
                  <Ionicons name="trophy-outline" size={20} color={colors.court} />
                  <View style={styles.actionCardInfo}><Text style={styles.actionCardTitle}>{inv.leagueName}</Text><Text style={styles.actionCardSub}>League invitation</Text></View>
                  <Ionicons name="chevron-forward" size={20} color={colors.inkFaint} />
                </TouchableOpacity>
              ))}
              {eventInvitations.map((inv) => (
                <TouchableOpacity key={inv.id} style={styles.actionCard} onPress={() => handleEventInvitationPress(inv)} activeOpacity={0.7}>
                  <Ionicons name="calendar-outline" size={20} color={colors.pine} />
                  <View style={styles.actionCardInfo}>
                    <Text style={styles.actionCardTitle}>{inv.eventTitle}</Text>
                    <Text style={styles.actionCardSub}>{inv.startTime ? new Date(inv.startTime).toLocaleDateString(undefined, { timeZone: 'UTC' }) : 'Event invitation'}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.inkFaint} />
                </TouchableOpacity>
              ))}
            </View>
          </CollapsibleSection>
        )}

        {/* Cancel Requests */}
        {cancelRequests.length > 0 && (
          <CollapsibleSection title="Cancel Requests" count={cancelRequests.length}>
            <View style={styles.sectionInner}>
              <View style={{ gap: Spacing.sm }}>
                {cancelRequests.map((request) => (
                  <CancelRequestCard key={request.id} cancelRequest={request} onApprove={handleApproveCancelRequest} onDeny={handleDenyCancelRequest} isLoading={isApproving || isDenying} />
                ))}
              </View>
            </View>
          </CollapsibleSection>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* User selector dropdown */}
      <Modal visible={userDropdownVisible} transparent animationType="fade" onRequestClose={() => setUserDropdownVisible(false)}>
        <Pressable style={styles.dropdownBackdrop} onPress={() => setUserDropdownVisible(false)}>
          <View style={styles.dropdownMenu}>
            {/* Guardian */}
            <TouchableOpacity
              style={[styles.dropdownRow, activeFilter.type === 'individual' && activeFilter.userId === currentUser?.id && styles.dropdownRowActive]}
              onPress={() => { handleFilterChange({ type: 'individual', userId: currentUser?.id || '' }); setUserDropdownVisible(false); }}
            >
              <Ionicons name="person" size={16} color={activeFilter.userId === currentUser?.id ? colors.pine : colors.inkFaint} />
              <Text style={[styles.dropdownRowText, activeFilter.userId === currentUser?.id && styles.dropdownRowTextActive]}>{currentUser?.firstName || 'Me'}</Text>
              {activeFilter.type === 'individual' && activeFilter.userId === currentUser?.id && <Ionicons name="checkmark" size={18} color={colors.pine} />}
            </TouchableOpacity>
            {/* Dependents */}
            {dependents.map((dep) => {
              const isActive = activeFilter.type === 'individual' && activeFilter.userId === dep.id;
              return (
                <TouchableOpacity
                  key={dep.id}
                  style={[styles.dropdownRow, isActive && styles.dropdownRowActive]}
                  onPress={() => { handleFilterChange({ type: 'individual', userId: dep.id }); setUserDropdownVisible(false); }}
                >
                  <Ionicons name="person" size={16} color={isActive ? colors.pine : colors.inkFaint} />
                  <Text style={[styles.dropdownRowText, isActive && styles.dropdownRowTextActive]}>{dep.firstName}</Text>
                  {isActive && <Ionicons name="checkmark" size={18} color={colors.pine} />}
                </TouchableOpacity>
              );
            })}
            {/* Add Dependent */}
            <View style={styles.dropdownDivider} />
            <TouchableOpacity
              style={styles.dropdownRow}
              onPress={() => { setUserDropdownVisible(false); (navigation as any).navigate('Profile', { screen: 'DependentForm', params: {} }); }}
            >
              <Ionicons name="add-circle-outline" size={16} color={colors.pine} />
              <Text style={[styles.dropdownRowText, { color: colors.pine }]}>Add Dependent</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <StepOutModal visible={stepOutModalVisible} eventTitle={selectedBooking?.event?.title || 'Event'} onConfirm={handleStepOutConfirm} onCancel={handleStepOutCancel} />
      <EventSearchModal
        visible={searchModalVisible}
        onClose={() => setSearchModalVisible(false)}
        onSearch={handleSearchSubmit}
        onCreateEvent={handleCreateEvent}
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
  actionCard: {
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
  actionCardInfo: {
    flex: 1,
  },
  actionCardTitle: {
    fontFamily: fonts.label,
    fontSize: 15,
    color: colors.ink,
  },
  actionCardSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
    marginTop: 2,
  },
  userSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.pine + '15',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 4,
    maxWidth: 140,
  },
  userSelectorText: {
    fontFamily: fonts.label,
    fontSize: 13,
    color: colors.pine,
    flexShrink: 1,
  },
  dropdownBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 140,
    paddingRight: 16,
  },
  dropdownMenu: {
    backgroundColor: colors.chalk,
    borderRadius: 12,
    minWidth: 200,
    maxWidth: 260,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 8,
  },
  dropdownRowActive: {
    backgroundColor: colors.pine + '0D',
  },
  dropdownRowText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
  },
  dropdownRowTextActive: {
    fontFamily: fonts.label,
    color: colors.pine,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: colors.cream,
    marginHorizontal: 14,
  },
});
