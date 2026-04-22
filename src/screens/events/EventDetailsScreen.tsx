import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  RefreshControl,
  Modal,
} from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';

import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { PlayerCard } from '../../components/ui/PlayerCard';

import { CancelEventModal } from '../../components/events/CancelEventModal';
import { StepOutModal } from '../../components/bookings/StepOutModal';

import {
  EntityHeader,
  QuickStatsRow,
  PersonRow,
  DetailCard,
  FixedBottomCTA,
} from '../../components/detail';
import { GetDirectionsButton } from '../../components/ui/GetDirectionsButton';
import { formatSportType } from '../../utils/formatters';

import { eventService } from '../../services/api/EventService';
import { conversationService } from '../../services/api/ConversationService';
import { BookingValidationService } from '../../services/booking';
import {
  setSelectedEvent,
  updateEventParticipants,
  removeEvent,
} from '../../store/slices/eventsSlice';
import { addBooking, removeBooking } from '../../store/slices/bookingsSlice';
import { selectSelectedEvent } from '../../store/slices/eventsSlice';
import { selectUser } from '../../store/slices/authSlice';
import { useCancelBookingMutation } from '../../store/api/eventsApi';
import { fonts, useTheme } from '../../theme';
import { loggingService } from '../../services/LoggingService';
import {
  Event,
  EventStatus,
  EventType,
  Participant,
  RosterInfo,
  BookingStatus,
} from '../../types';
import type { Match } from '../../types/league';
import { API_BASE_URL } from '../../services/api/config';
import {
  ProfileSelectorModal,
  ProfileOption,
} from '../../components/ui/ProfileSelectorModal';
import { selectDependents } from '../../store/slices/contextSlice';

function formatDateHero(dateInput: string | Date): string {
  const d = new Date(dateInput as any);
  return (
    d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    }) +
    ' · ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  );
}

function formatEventType(eventType: string): string {
  return eventType
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function EventDetailsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const { eventId } = (route.params as any) || {};

  // Redux state
  const selectedEvent = useSelector(selectSelectedEvent);

  // Auth context
  const currentUser = useSelector(selectUser);

  // RTK Query mutations
  const [cancelBookingMutation] = useCancelBookingMutation();

  // Local state
  const [event, setEvent] = useState<Event | null>(selectedEvent);
  const [isLoading, setIsLoading] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [showProfileSelector, setShowProfileSelector] = useState(false);
  const [profileSelectorFamilyOnly, setProfileSelectorFamilyOnly] =
    useState(false);
  const dependents = useSelector(selectDependents);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [rosters, setRosters] = useState<RosterInfo[]>([]);
  const [participantsLoaded, setParticipantsLoaded] = useState(false);
  const [debriefCompleted, setDebriefCompleted] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showStepOutModal, setShowStepOutModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [waiverStatus, setWaiverStatus] = useState<{
    required: boolean;
    signed: boolean;
    waiverVersion: string | null;
    waiverText?: string | null;
  } | null>(null);
  const [showWaiverModal, setShowWaiverModal] = useState(false);
  const [waiverAgreed, setWaiverAgreed] = useState(false);
  const [signingWaiver, setSigningWaiver] = useState(false);

  // Load event details
  const loadEvent = useCallback(
    async (isRefresh = false, skipCache = false) => {
      if (!eventId) return;

      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setIsLoading(true);
        }
        setError(null);

        // Fetch event from API
        const eventResponse = await eventService.getEvent(eventId);

        // Fetch participants (skip cache if requested)
        const participantsData = await eventService.getEventParticipants(
          eventId,
          skipCache
        );

        // Check debrief window for game events
        const endTime = new Date(eventResponse.endTime).getTime();
        const hoursSinceEnd = (Date.now() - endTime) / (1000 * 60 * 60);
        const inDebriefWindow =
          eventResponse.eventType === 'game' &&
          hoursSinceEnd > 0 &&
          hoursSinceEnd < 24;
        if (inDebriefWindow) {
          try {
            const saluteStatus = await eventService.checkSaluteStatus(eventId);
            setDebriefCompleted(saluteStatus.hasSubmitted);
          } catch {}
        }

        setEvent(eventResponse);
        setParticipants(participantsData.participants);
        setRosters(participantsData.rosters ?? []);
        setParticipantsLoaded(true);

        // Fetch waiver status if event has a facility
        if (eventResponse.facilityId && currentUser?.id) {
          try {
            const wRes = await fetch(
              `${API_BASE_URL}/waivers/facility/${eventResponse.facilityId}/status?userId=${currentUser.id}`
            );
            if (wRes.ok) {
              const wData = await wRes.json();
              if (wData.required && !wData.signed) {
                // Also fetch waiver text
                const tRes = await fetch(
                  `${API_BASE_URL}/waivers/facility/${eventResponse.facilityId}`
                );
                if (tRes.ok) {
                  const tData = await tRes.json();
                  setWaiverStatus({ ...wData, waiverText: tData.waiverText });
                } else {
                  setWaiverStatus(wData);
                }
              } else {
                setWaiverStatus(wData);
              }
            }
          } catch {}
        }
        dispatch(setSelectedEvent(eventResponse));
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load event';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [eventId, dispatch]
  );

  // Load event on screen focus (always skip cache for participants)
  useFocusEffect(
    useCallback(() => {
      loadEvent(false, true);
    }, [loadEvent])
  );

  // Check if event is in the past
  const isPastEvent = event && new Date(event.endTime) < new Date();

  // Check if event is currently live (started but not ended)
  const isLive =
    event &&
    new Date(event.startTime) <= new Date() &&
    new Date(event.endTime) > new Date();

  // Only upcoming events allow edit/delete/join/leave actions
  const isUpcoming =
    event && !isPastEvent && !isLive && event.status !== EventStatus.CANCELLED;

  // Debrief window: 0–24 hours after game end
  const eventEndTime = new Date(event?.endTime ?? 0).getTime();
  const hoursSinceEnd = (Date.now() - eventEndTime) / (1000 * 60 * 60);
  const isInDebriefWindow =
    event?.eventType === EventType.GAME &&
    hoursSinceEnd > 0 &&
    hoursSinceEnd < 24;
  const hoursRemaining = Math.max(1, Math.floor(24 - hoursSinceEnd));

  // Check if user is already booked
  const isUserBooked = participants.some(
    participant => participant.userId === currentUser?.id
  );

  // Check if user is the organizer
  const isOrganizer = event?.organizerId === currentUser?.id;

  // Check if event is bookable
  const canBook =
    event &&
    event.status === EventStatus.ACTIVE &&
    event.currentParticipants < event.maxParticipants &&
    !isUserBooked;

  // Handle booking
  const handleBookEvent = async () => {
    loggingService.logButton('Join', 'EventDetailsScreen', {
      eventId: event?.id,
    });

    if (!event || !currentUser) {
      return;
    }

    // Validate booking before attempting
    const validationResult = BookingValidationService.validateBooking(
      event,
      currentUser
    );

    if (!validationResult.canBook) {
      Alert.alert(
        'Cannot Join',
        validationResult.reason || 'Booking not allowed'
      );
      return;
    }

    // If user has dependents, show profile selector
    if (dependents.length > 0) {
      setProfileSelectorFamilyOnly(false);
      setShowProfileSelector(true);
    } else {
      await proceedWithBooking();
    }
  };

  const handleProfileSelected = async (profileId: string) => {
    setShowProfileSelector(false);
    setProfileSelectorFamilyOnly(false);
    await proceedWithBooking(profileId);
  };

  const proceedWithBooking = async (profileId?: string) => {
    const bookingUserId = profileId || currentUser?.id;
    if (!event || !bookingUserId) {
      return;
    }

    try {
      setIsBooking(true);

      const booking = await eventService.bookEvent(event.id, bookingUserId);

      // Add booking to Redux store
      dispatch(addBooking(booking));

      // Update local state
      const updatedParticipants = event.currentParticipants + 1;
      const updatedEvent = {
        ...event,
        currentParticipants: updatedParticipants,
      };
      setEvent(updatedEvent);
      dispatch(
        updateEventParticipants({
          eventId: event.id,
          count: updatedParticipants,
        })
      );

      // Reload participants (skip cache to get fresh data)
      const newParticipantsData = await eventService.getEventParticipants(
        event.id,
        true
      );
      setParticipants(newParticipantsData.participants);
      setRosters(newParticipantsData.rosters ?? []);

      // Show success message
      Alert.alert(
        'Joined Up!',
        `You've successfully joined "${event.title}". Check your bookings to see details.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to Home tab after user dismisses alert
              (navigation as any).navigate('Home', { screen: 'HomeScreen' });
            },
          },
        ]
      );
    } catch (error) {
      console.error('Γ¥î Booking error occurred!');
      console.error('Γ¥î Error details:', error);
      console.error('Γ¥î Error type:', typeof error);
      console.error(
        'Γ¥î Error message:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      console.error('Γ¥î Full error object:', JSON.stringify(error, null, 2));

      const errorMessage =
        error instanceof Error ? error.message : 'Failed to book event';
      Alert.alert('Booking Failed', errorMessage);
    } finally {
      setIsBooking(false);
    }
  };

  // Handle cancel booking
  const handleCancelBooking = async () => {
    if (!event || !currentUser) {
      return;
    }

    const userBooking = participants.find(p => p.userId === currentUser.id);

    if (!userBooking) {
      Alert.alert('Error', 'Could not find your booking for this event');
      return;
    }

    // Validate cancellation
    const validationResult = BookingValidationService.validateCancellation(
      event,
      currentUser,
      userBooking.status as unknown as BookingStatus
    );

    if (!validationResult.canBook) {
      Alert.alert(
        'Cannot Leave',
        validationResult.reason || 'Cannot leave this event'
      );
      return;
    }

    // Show the modal
    setShowStepOutModal(true);
  };

  // Handle step out confirmation from modal
  const handleStepOutConfirm = async () => {
    if (!event || !currentUser) {
      return;
    }
    loggingService.logButton('Leave', 'EventDetailsScreen', {
      eventId: event.id,
    });

    const userBooking = participants.find(p => p.userId === currentUser.id);

    if (!userBooking) {
      Alert.alert('Error', 'Could not find your booking for this event');
      return;
    }

    try {
      // Use RTK Query mutation - this will automatically invalidate cache
      await cancelBookingMutation({
        eventId: event.id,
        bookingId: userBooking.bookingId,
      }).unwrap();

      // Remove booking from Redux store
      dispatch(removeBooking(userBooking.bookingId));

      // Close modal
      setShowStepOutModal(false);

      // Clear participants state and reset loaded flag to show loading state
      setParticipants([]);
      setParticipantsLoaded(false);

      // Force a complete reload with cache bypass
      await loadEvent(false, true);
    } catch (error) {
      console.error('Γ¥î Step out error:', error);
      Alert.alert('Error', 'Failed to leave. Please try again.');
      setShowStepOutModal(false);
    }
  };

  // Handle edit event
  const handleEditEvent = () => {
    if (!event) return;
    (navigation as any).navigate('EditEvent', { eventId: event.id });
  };

  // Handle cancel event (organizer cancels the event)
  const handleCancelEvent = async (reason: string) => {
    if (!event) return;

    try {
      await eventService.deleteEvent(event.id, reason);

      // Remove event from Redux store
      dispatch(removeEvent(event.id));

      // Close the modal
      setShowCancelModal(false);

      // Navigate to Home (will trigger refresh via useFocusEffect)
      navigation.navigate('HomeScreen' as never);

      // Show success message after navigation
      setTimeout(() => {
        Alert.alert(
          'Success',
          'Event cancelled successfully. Participants will be notified.'
        );
      }, 300);
    } catch (err) {
      console.error('Γ¥î Cancel error:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to cancel event';
      throw new Error(errorMessage);
    }
  };

  // Handle navigate to league details
  const handleNavigateToLeague = (leagueId: string) => {
    // Navigate to Leagues tab, then to LeagueDetails
    (navigation as any).navigate('Leagues', {
      screen: 'LeagueDetails',
      params: { leagueId },
    });
  };

  if (isLoading && !event) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgScreen }]}>
        <LoadingSpinner />
      </View>
    );
  }

  if (error && !event) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgScreen }]}>
        <ErrorDisplay message={error} onRetry={() => loadEvent()} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgScreen }]}>
        <ErrorDisplay message="Event not found" onRetry={() => loadEvent()} />
      </View>
    );
  }

  const availableSpots = event.maxParticipants - event.currentParticipants;

  // Derive duration string
  const durationString = (() => {
    const ms =
      new Date(event.endTime).getTime() - new Date(event.startTime).getTime();
    const totalMinutes = Math.round(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  })();

  // Derive location string and coordinates
  const locationString = event.facility
    ? [
        event.facility.name,
        event.facility.street && event.facility.city
          ? `${event.facility.street}, ${event.facility.city}`
          : event.facility.city || '',
      ]
        .filter(Boolean)
        .join(' · ')
    : event.locationName
      ? [event.locationName, event.locationAddress].filter(Boolean).join(' · ')
      : '';

  const locationLat = event.facility?.latitude ?? event.locationLat ?? null;
  const locationLng = event.facility?.longitude ?? event.locationLng ?? null;
  const locationAddress = event.facility
    ? [
        event.facility.street,
        event.facility.city,
        event.facility.state,
        event.facility.zipCode,
      ]
        .filter(Boolean)
        .join(', ')
    : (event.locationAddress ?? null);

  // Derive CTA label, variant, and action
  type CTAVariant = 'primary' | 'confirmed' | 'secondary' | 'disabled';
  let ctaLabel: string;
  let ctaVariant: CTAVariant;
  let ctaAction: () => void;

  // Build family-aware "who's in" label when dependents exist
  const familyInLabel = (() => {
    if (!participantsLoaded || dependents.length === 0) return null;
    const participantIds = new Set(participants.map(p => p.userId));
    const meIn = currentUser?.id ? participantIds.has(currentUser.id) : false;
    const depsIn = dependents.filter(d => participantIds.has(d.id));
    if (!meIn && depsIn.length === 0) return null;
    if (meIn && depsIn.length === 0) return null; // plain "You're in" is fine
    if (!meIn && depsIn.length === 1)
      return `${depsIn[0].firstName} is in \u2713`;
    if (!meIn && depsIn.length === 2)
      return `${depsIn[0].firstName} and ${depsIn[1].firstName} are in \u2713`;
    if (!meIn)
      return `${depsIn[0].firstName} and ${depsIn.length - 1} others are in \u2713`;
    if (depsIn.length === 1)
      return `You and ${depsIn[0].firstName} are in \u2713`;
    if (depsIn.length === 2)
      return `You, ${depsIn[0].firstName} and ${depsIn[1].firstName} are in \u2713`;
    return `You and ${depsIn.length} others are in \u2713`;
  })();

  // Dependents not yet in the event (for "More from the family?" prompt)
  const unjoinedDependents = participantsLoaded
    ? dependents.filter(d => !participants.some(p => p.userId === d.id))
    : [];

  const handleMoreFromFamily = () => {
    setProfileSelectorFamilyOnly(true);
    setShowProfileSelector(true);
  };

  if (!participantsLoaded) {
    ctaLabel = 'Loading...';
    ctaVariant = 'disabled';
    ctaAction = () => {};
  } else if (event.status === EventStatus.CANCELLED) {
    ctaLabel = 'Event cancelled';
    ctaVariant = 'disabled';
    ctaAction = () => {};
  } else if (isPastEvent) {
    ctaLabel = 'Event Ended';
    ctaVariant = 'disabled';
    ctaAction = () => {};
  } else if (isLive) {
    ctaLabel = 'In Progress';
    ctaVariant = 'disabled';
    ctaAction = () => {};
  } else if (isOrganizer && isUserBooked) {
    ctaLabel = familyInLabel ?? "You're in ✓";
    ctaVariant = 'confirmed';
    ctaAction = () => {};
  } else if (isOrganizer && !isUserBooked) {
    ctaLabel = '';
    ctaVariant = 'disabled';
    ctaAction = () => {};
  } else if (isUserBooked) {
    ctaLabel = familyInLabel ?? "You're in ✓";
    ctaVariant = 'confirmed';
    ctaAction = () => {};
  } else if (!canBook && availableSpots <= 0) {
    ctaLabel = 'Join waitlist';
    ctaVariant = 'secondary';
    ctaAction = () => {};
  } else if (canBook) {
    ctaLabel = `I'm in — Join game${event.price > 0 ? ` · $${event.price}` : ''}`;
    ctaVariant = 'primary';
    ctaAction = handleBookEvent;
  } else {
    ctaLabel = 'Cannot Join';
    ctaVariant = 'disabled';
    ctaAction = () => {};
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgScreen }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadEvent(true)}
            colors={[colors.cobalt]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* EntityHeader */}
        <EntityHeader
          name={event.title}
          coverUrl={(event as any).imageUrl}
          chips={[
            { label: formatSportType(event.sportType) },
            { label: formatEventType(event.eventType) },
            ...(event.status === EventStatus.CANCELLED
              ? [{ label: 'Cancelled' }]
              : []),
            ...(isLive ? [{ label: 'Live' }] : []),
          ]}
          subtitle={formatDateHero(event.startTime)}
          subtitle2={locationString || undefined}
          showEdit={isOrganizer && !!isUpcoming}
          onEdit={handleEditEvent}
        />

        {/* QuickStatsRow — Duration / Players / Price */}
        <QuickStatsRow
          stats={[
            { label: 'Duration', value: durationString },
            {
              label: 'Players',
              value: `${event.currentParticipants}/${event.maxParticipants}`,
              fillRatio: event.currentParticipants / event.maxParticipants,
            },
            {
              label: 'Price',
              value: event.price > 0 ? `$${event.price}` : 'Free',
            },
          ]}
        />

        {/* Location Card with Get Directions */}
        {locationString ? (
          <DetailCard title="Location" delay={25}>
            {event.facility ? (
              <TouchableOpacity
                onPress={() =>
                  (navigation as any).navigate('FacilityDetails', {
                    facilityId: event.facility!.id,
                  })
                }
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.locationNameLink, { color: colors.cobalt }]}
                >
                  {event.facility.name}
                </Text>
              </TouchableOpacity>
            ) : event.locationName ? (
              <Text style={[styles.locationNameText, { color: colors.ink }]}>
                {event.locationName}
              </Text>
            ) : null}
            {locationAddress ? (
              <Text
                style={[styles.locationAddressText, { color: colors.inkSoft }]}
              >
                {locationAddress}
              </Text>
            ) : null}
            <View style={{ marginTop: 10 }}>
              <GetDirectionsButton
                latitude={locationLat}
                longitude={locationLng}
                address={locationAddress}
              />
            </View>
          </DetailCard>
        ) : (
          <DetailCard title="Location" delay={25}>
            <Text style={[styles.locationTBD, { color: colors.inkFaint }]}>
              Location TBD
            </Text>
          </DetailCard>
        )}

        {/* Game Thread Chat button */}
        {isUserBooked && (
          <TouchableOpacity
            style={[styles.chatBtn, { backgroundColor: colors.cobalt + '12' }]}
            onPress={async () => {
              try {
                const conv =
                  await conversationService.getOrCreateGameThread(eventId);
                (navigation as any).navigate('Messages', {
                  screen: 'Chat',
                  params: {
                    conversationId: conv.id,
                    title: event.title ?? 'Game Thread',
                    type: 'GAME_THREAD',
                  },
                });
              } catch (e) {
                console.error('Navigate to chat error:', e);
                Alert.alert(
                  'Error',
                  'Could not open game thread. Please try again.'
                );
              }
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="chatbubbles-outline"
              size={18}
              color={colors.cobalt}
            />
            <Text style={[styles.chatBtnText, { color: colors.cobalt }]}>
              Game Thread
            </Text>
          </TouchableOpacity>
        )}

        {/* League Match Section */}
        {event.matches &&
          event.matches.length > 0 &&
          (() => {
            try {
              const match = event.matches[0] as Match;
              if (!match) return null;

              const leagueName = match.league?.name || 'League Match';

              return (
                <DetailCard title="League Match" delay={50}>
                  <TouchableOpacity
                    onPress={() => handleNavigateToLeague(match.leagueId)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.leagueBadge,
                        { backgroundColor: colors.goldLight + '20' },
                      ]}
                    >
                      <Ionicons name="trophy" size={16} color={colors.gold} />
                      <Text
                        style={[styles.leagueBadgeText, { color: colors.gold }]}
                      >
                        LEAGUE MATCH
                      </Text>
                    </View>

                    <View style={styles.leagueContent}>
                      <View style={styles.leagueHeader}>
                        <Ionicons
                          name="shield-outline"
                          size={20}
                          color={colors.cobalt}
                        />
                        <Text
                          style={[styles.leagueName, { color: colors.ink }]}
                        >
                          {leagueName}
                        </Text>
                        <Ionicons
                          name="chevron-forward"
                          size={20}
                          color={colors.inkFaint}
                        />
                      </View>

                      <View style={styles.matchDetails}>
                        <View style={styles.teamInfo}>
                          <Text
                            style={[styles.teamName, { color: colors.ink }]}
                          >
                            {match.homeTeam?.name || 'Home Roster'}
                          </Text>
                          {match.homeScore !== undefined &&
                            match.homeScore !== null && (
                              <Text
                                style={[
                                  styles.teamScore,
                                  { color: colors.cobalt },
                                ]}
                              >
                                {match.homeScore}
                              </Text>
                            )}
                        </View>

                        <Text
                          style={[styles.vsText, { color: colors.inkFaint }]}
                        >
                          vs
                        </Text>

                        <View style={styles.teamInfo}>
                          <Text
                            style={[styles.teamName, { color: colors.ink }]}
                          >
                            {match.awayTeam?.name || 'Away Roster'}
                          </Text>
                          {match.awayScore !== undefined &&
                            match.awayScore !== null && (
                              <Text
                                style={[
                                  styles.teamScore,
                                  { color: colors.cobalt },
                                ]}
                              >
                                {match.awayScore}
                              </Text>
                            )}
                        </View>
                      </View>

                      {match.scheduledAt && (
                        <View style={styles.matchMeta}>
                          <Ionicons
                            name="calendar-outline"
                            size={14}
                            color={colors.inkFaint}
                          />
                          <Text
                            style={[
                              styles.matchMetaText,
                              { color: colors.inkFaint },
                            ]}
                          >
                            {new Date(match.scheduledAt).toLocaleDateString(
                              'en-US',
                              {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              }
                            )}
                          </Text>
                          {match.status && (
                            <>
                              <Text
                                style={[
                                  styles.matchMetaDot,
                                  { color: colors.inkFaint },
                                ]}
                              >
                                ·
                              </Text>
                              <Text
                                style={[
                                  styles.matchMetaText,
                                  {
                                    textTransform: 'capitalize',
                                    color: colors.inkFaint,
                                  },
                                ]}
                              >
                                {match.status.replace('_', ' ')}
                              </Text>
                            </>
                          )}
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                </DetailCard>
              );
            } catch (error) {
              console.error('Error rendering league match section:', error);
              return null;
            }
          })()}

        {/* Players section */}
        <DetailCard
          title={`Players (${event.currentParticipants}/${event.maxParticipants})`}
          delay={100}
        >
          {participants.map((p, index) => {
            const pressHandler = p.user
              ? () =>
                  setSelectedPlayer({
                    id: p.userId,
                    firstName: p.user!.firstName,
                    lastName: p.user!.lastName,
                    profileImage: p.user!.profileImage,
                    dateOfBirth: (p.user as any).dateOfBirth,
                    gender: (p.user as any).gender,
                  })
              : null;
            const personRowProps = {
              name: p.user
                ? `${p.user.firstName} ${p.user.lastName}`
                : 'Unknown Player',
              ...(p.userId === event.organizerId
                ? { role: 'Organizer' as const }
                : {}),
              ...(pressHandler ? { onPress: pressHandler } : {}),
            };
            return (
              <React.Fragment key={p.userId}>
                <PersonRow {...personRowProps} />
                {index < participants.length - 1 && (
                  <View
                    style={[
                      styles.personRowDivider,
                      { backgroundColor: colors.border },
                    ]}
                  />
                )}
              </React.Fragment>
            );
          })}
          {participants.length === 0 && (
            <Text
              style={[styles.emptyParticipantsText, { color: colors.inkFaint }]}
            >
              No players yet — be the first!
            </Text>
          )}
          {isInDebriefWindow && !debriefCompleted && (
            <TouchableOpacity
              style={[
                styles.debriefBanner,
                {
                  backgroundColor: colors.cobaltLight + '15',
                  borderColor: colors.cobalt + '40',
                },
              ]}
              onPress={() =>
                (navigation as any).navigate('Debrief', { eventId: event.id })
              }
            >
              <Ionicons name="star-outline" size={20} color={colors.cobalt} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text
                  style={[styles.debriefBannerTitle, { color: colors.cobalt }]}
                >
                  Post-Game Debrief
                </Text>
                <Text
                  style={[
                    styles.debriefBannerSubtitle,
                    { color: colors.inkSecondary },
                  ]}
                >
                  Recognize your teammates — window closes in {hoursRemaining}h
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.cobalt}
              />
            </TouchableOpacity>
          )}
        </DetailCard>

        {/* Details card */}
        <DetailCard title="Details" delay={150}>
          {/* Equipment checklist */}
          {event.equipment && event.equipment.length > 0 && (
            <View style={styles.detailSection}>
              <Text
                style={[styles.detailSectionLabel, { color: colors.inkFaint }]}
              >
                Equipment Needed
              </Text>
              <View style={styles.equipmentList}>
                {event.equipment.map((item, index) => (
                  <View key={index} style={styles.equipmentItem}>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={16}
                      color={colors.success}
                    />
                    <Text style={[styles.equipmentText, { color: colors.ink }]}>
                      {item}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Rules & Notes */}
          {event.rules ? (
            <View style={styles.detailSection}>
              <Text
                style={[styles.detailSectionLabel, { color: colors.inkFaint }]}
              >
                Rules & Notes
              </Text>
              <Text style={[styles.rulesText, { color: colors.inkSoft }]}>
                {event.rules}
              </Text>
            </View>
          ) : null}

          {/* Organizer as PersonRow */}
          {event.organizer ? (
            <View style={styles.detailSection}>
              <Text
                style={[styles.detailSectionLabel, { color: colors.inkFaint }]}
              >
                Organizer
              </Text>
              <PersonRow
                name={`${event.organizer.firstName} ${event.organizer.lastName}`}
                role="Organizer"
              />
            </View>
          ) : null}

          {/* Waiver banner (if required and not yet signed) */}
          {waiverStatus?.required && !waiverStatus?.signed && (
            <TouchableOpacity
              style={[
                styles.waiverBanner,
                { backgroundColor: colors.goldTint },
              ]}
              onPress={() => {
                setWaiverAgreed(false);
                setShowWaiverModal(true);
              }}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={colors.gold}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.waiverBannerTitle, { color: colors.ink }]}>
                  Waiver Required
                </Text>
                <Text
                  style={[styles.waiverBannerSub, { color: colors.inkSoft }]}
                >
                  Read & Sign Waiver →
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Organizer actions removed — now at bottom of scroll */}
        </DetailCard>

        {/* Description (if exists) */}
        {event.description ? (
          <DetailCard delay={200}>
            <Text style={[styles.description, { color: colors.inkSoft }]}>
              {event.description}
            </Text>
          </DetailCard>
        ) : null}

        {/* Edit / Delete for organizer */}
        {isUpcoming && isOrganizer && (
          <View style={styles.ownerActions}>
            {isUserBooked ? (
              <>
                {/* Add family member link — shown when organizer is booked and has unjoined dependents */}
                {unjoinedDependents.length > 0 && (
                  <TouchableOpacity
                    style={styles.familyLink}
                    onPress={handleMoreFromFamily}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="people-outline"
                      size={16}
                      color={colors.cobalt}
                    />
                    <Text
                      style={[styles.familyLinkText, { color: colors.cobalt }]}
                    >
                      Add another member of the family
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[
                    styles.ownerStepOutBtn,
                    {
                      borderColor: colors.gold,
                      backgroundColor: colors.goldTint,
                    },
                  ]}
                  onPress={handleCancelBooking}
                  activeOpacity={0.7}
                >
                  <Ionicons name="exit-outline" size={18} color={colors.gold} />
                  <Text
                    style={[styles.ownerStepOutBtnText, { color: colors.gold }]}
                  >
                    Step Out
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[
                  styles.ownerJoinBtn,
                  { backgroundColor: colors.cobalt },
                ]}
                onPress={handleBookEvent}
                disabled={isBooking || availableSpots <= 0}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={18}
                  color={colors.white}
                />
                <Text
                  style={[styles.ownerJoinBtnText, { color: colors.white }]}
                >
                  Join Up
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.ownerEditBtn, { backgroundColor: colors.pine }]}
              onPress={handleEditEvent}
              activeOpacity={0.7}
            >
              <Text style={[styles.ownerEditBtnText, { color: colors.white }]}>
                Edit Event
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.ownerDeleteBtn, { borderColor: colors.heart }]}
              onPress={() => setShowCancelModal(true)}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.ownerDeleteBtnText, { color: colors.heart }]}
              >
                Delete Event
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* FixedBottomCTA — hidden for past events and all organizer views */}
      {!isPastEvent && !isOrganizer && (
        <FixedBottomCTA
          label={ctaLabel}
          onPress={ctaAction}
          variant={ctaVariant}
          loading={isBooking}
          {...(isUserBooked && !isOrganizer && unjoinedDependents.length === 0
            ? {
                secondaryLabel: 'Back out',
                onSecondaryPress: handleCancelBooking,
              }
            : isUserBooked && unjoinedDependents.length > 0
              ? {
                  secondaryLabel: 'More from the family?',
                  onSecondaryPress: handleMoreFromFamily,
                }
              : {})}
        />
      )}

      {/* Cancel Event Modal */}
      <CancelEventModal
        visible={showCancelModal}
        eventTitle={event.title}
        onCancel={() => setShowCancelModal(false)}
        onConfirm={handleCancelEvent}
      />

      {/* Step Out Modal */}
      <StepOutModal
        visible={showStepOutModal}
        eventTitle={event?.title || 'Event'}
        onCancel={() => setShowStepOutModal(false)}
        onConfirm={handleStepOutConfirm}
      />

      {/* Profile Selector for Join Up */}
      <ProfileSelectorModal
        visible={showProfileSelector}
        profiles={
          profileSelectorFamilyOnly
            ? unjoinedDependents.map(d => ({
                id: d.id,
                firstName: d.firstName,
                lastName: d.lastName,
                profileImage: d.profileImage,
              }))
            : [
                ...(currentUser
                  ? [
                      {
                        id: currentUser.id,
                        firstName: currentUser.firstName,
                        lastName: currentUser.lastName,
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
              ]
        }
        onSelect={handleProfileSelected}
        onCancel={() => {
          setShowProfileSelector(false);
          setProfileSelectorFamilyOnly(false);
        }}
      />

      {/* Player Card Popup */}
      <PlayerCard
        visible={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
        player={selectedPlayer}
      />

      {/* Waiver Modal */}
      <Modal
        visible={showWaiverModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWaiverModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.4)',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: colors.white,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: '85%',
              padding: 20,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.heading,
                fontSize: 20,
                color: colors.ink,
                marginBottom: 12,
              }}
            >
              {event?.facility?.name || 'Facility'} Waiver
            </Text>
            <ScrollView style={{ maxHeight: 300, marginBottom: 16 }}>
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 14,
                  color: colors.ink,
                  lineHeight: 22,
                }}
              >
                {waiverStatus?.waiverText || 'Loading waiver...'}
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                marginBottom: 16,
              }}
              onPress={() => setWaiverAgreed(!waiverAgreed)}
            >
              <Ionicons
                name={waiverAgreed ? 'checkbox' : 'square-outline'}
                size={22}
                color={waiverAgreed ? colors.cobalt : colors.inkFaint}
              />
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 14,
                  color: colors.ink,
                  flex: 1,
                }}
              >
                I have read and agree to this waiver
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: waiverAgreed ? colors.cobalt : colors.inkFaint,
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
                marginBottom: 8,
              }}
              disabled={!waiverAgreed || signingWaiver}
              onPress={async () => {
                if (!currentUser?.id || !event?.facilityId) return;
                setSigningWaiver(true);
                try {
                  const resp = await fetch(`${API_BASE_URL}/waivers/sign`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      userId: currentUser.id,
                      facilityId: event.facilityId,
                    }),
                  });
                  if (resp.ok) {
                    setWaiverStatus(prev =>
                      prev ? { ...prev, signed: true } : prev
                    );
                    setShowWaiverModal(false);
                  } else {
                    Alert.alert(
                      'Error',
                      'Something went wrong. Please try again.'
                    );
                  }
                } catch {
                  Alert.alert(
                    'Error',
                    'Something went wrong. Please try again.'
                  );
                }
                setSigningWaiver(false);
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.ui,
                  fontSize: 16,
                  color: colors.white,
                }}
              >
                {signingWaiver ? 'Signing...' : 'Sign & Continue'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ alignItems: 'center', paddingVertical: 8 }}
              onPress={() => setShowWaiverModal(false)}
            >
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 14,
                  color: colors.inkFaint,
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Location card styles
  locationNameLink: {
    fontFamily: fonts.heading,
    fontSize: 16,
    textDecorationLine: 'underline',
    marginBottom: 2,
  },
  locationNameText: {
    fontFamily: fonts.heading,
    fontSize: 16,
    marginBottom: 2,
  },
  locationAddressText: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  locationTBD: {
    fontFamily: fonts.body,
    fontSize: 14,
    fontStyle: 'italic',
  },
  // League match card styles
  leagueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  leagueBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  leagueContent: {
    gap: 12,
  },
  leagueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  leagueName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  matchDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  teamInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamName: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  teamScore: {
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 8,
  },
  vsText: {
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 12,
  },
  matchMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  matchMetaText: {
    fontSize: 13,
  },
  matchMetaDot: {
    fontSize: 13,
  },
  // Details card sub-sections
  detailSection: {
    marginBottom: 16,
  },
  detailSectionLabel: {
    fontFamily: fonts.label,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  equipmentList: {
    gap: 8,
  },
  equipmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  equipmentText: {
    fontSize: 16,
    marginLeft: 8,
  },
  rulesText: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 24,
  },
  // Participants
  personRowDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 52,
  },
  emptyParticipantsText: {
    fontFamily: fonts.body,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 16,
  },
  // Waiver banner
  waiverBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
    gap: 8,
  },
  waiverBannerTitle: {
    fontFamily: fonts.label,
    fontSize: 13,
  },
  waiverBannerSub: {
    fontFamily: fonts.body,
    fontSize: 12,
  },
  // Owner edit/delete actions (bottom of scroll)
  ownerActions: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 10,
  },
  ownerEditBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ownerEditBtnText: {
    fontFamily: fonts.ui,
    fontSize: 16,
  },
  ownerJoinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
  },
  ownerJoinBtnText: {
    fontFamily: fonts.ui,
    fontSize: 16,
  },
  familyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  familyLinkText: {
    fontFamily: fonts.ui,
    fontSize: 14,
  },
  ownerStepOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 14,
  },
  ownerStepOutBtnText: {
    fontFamily: fonts.ui,
    fontSize: 16,
  },
  ownerDeleteBtn: {
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ownerDeleteBtnText: {
    fontFamily: fonts.ui,
    fontSize: 16,
  },
  // Debrief banner
  debriefBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
  },
  debriefBannerTitle: {
    fontSize: 14,
    fontFamily: fonts.ui,
  },
  debriefBannerSubtitle: {
    fontSize: 12,
    fontFamily: fonts.body,
    marginTop: 2,
  },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  chatBtnText: {
    fontFamily: fonts.label,
    fontSize: 14,
  },
});
