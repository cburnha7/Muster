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
  Image,
  Platform,
  Linking,
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
  HeroSection,
  QuickStatsRow,
  PersonRow,
  DetailCard,
  FixedBottomCTA,
} from '../../components/detail';
import { GetDirectionsButton } from '../../components/ui/GetDirectionsButton';
import { getSportColor } from '../../constants/sportColors';

import { eventService } from '../../services/api/EventService';
import { conversationService } from '../../services/api/ConversationService';
import { BookingValidationService } from '../../services/booking';
import { useAuth } from '../../context/AuthContext';
import {
  setSelectedEvent,
  updateEventParticipants,
  removeEvent,
} from '../../store/slices/eventsSlice';
import { addBooking, removeBooking } from '../../store/slices/bookingsSlice';
import { selectSelectedEvent } from '../../store/slices/eventsSlice';
import { useCancelBookingMutation } from '../../store/api/eventsApi';
import { colors, fonts, useTheme } from '../../theme';
import { tokenColors } from '../../theme/tokens';
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
import { ContextualReturnButton } from '../../components/navigation/ContextualReturnButton';
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
  const { colors: themeColors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const { eventId } = (route.params as any) || {};

  // Redux state
  const selectedEvent = useSelector(selectSelectedEvent);

  // Auth context
  const { user: currentUser } = useAuth();

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
  const [selectedParticipant, setSelectedParticipant] =
    useState<Participant | null>(null);
  const [salutedParticipants, setSalutedParticipants] = useState<Set<string>>(
    new Set()
  );
  const [showSaluteModal, setShowSaluteModal] = useState(false);
  const [isSubmittingSalutes, setIsSubmittingSalutes] = useState(false);
  const [salutesSubmitted, setSalutesSubmitted] = useState(false);
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

        // Check if event is in the past and if salutes have been submitted
        const isPastEvent = new Date(eventResponse.endTime) < new Date();
        if (isPastEvent) {
          const saluteStatus = await eventService.checkSaluteStatus(eventId);
          setSalutesSubmitted(saluteStatus.hasSubmitted);
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

  // Handle participant click
  const handleParticipantClick = (participant: Participant) => {
    // Don't allow saluting yourself
    if (participant.userId === currentUser?.id) {
      return;
    }

    // Only allow saluting in past events
    if (!isPastEvent) {
      return;
    }

    // Check if already saluted 3 participants
    if (
      salutedParticipants.size >= 3 &&
      !salutedParticipants.has(participant.userId)
    ) {
      Alert.alert(
        'Salute Limit Reached',
        'You can only salute up to 3 participants per event.'
      );
      return;
    }

    setSelectedParticipant(participant);
    setShowSaluteModal(true);
  };

  // Handle salute
  const handleSalute = () => {
    if (!selectedParticipant) return;

    // Add to saluted participants
    const newSaluted = new Set(salutedParticipants);
    newSaluted.add(selectedParticipant.userId);
    setSalutedParticipants(newSaluted);

    // Close modal
    setShowSaluteModal(false);
    setSelectedParticipant(null);

    // Show success message
    Alert.alert(
      '≡ƒÖî Salute Sent!',
      `You saluted ${selectedParticipant.user?.firstName} ${selectedParticipant.user?.lastName}`,
      [{ text: 'OK' }]
    );

    // TODO: wire to API when endpoint exists
    // await eventService.saluteParticipant(event.id, selectedParticipant.userId);
  };

  // Handle unsalute
  const handleUnsalute = () => {
    if (!selectedParticipant) return;

    // Remove from saluted participants
    const newSaluted = new Set(salutedParticipants);
    newSaluted.delete(selectedParticipant.userId);
    setSalutedParticipants(newSaluted);

    // Close modal
    setShowSaluteModal(false);
    setSelectedParticipant(null);

    // Show success message
    Alert.alert('Salute Removed', 'You can salute someone else now.');

    // TODO: wire to API when endpoint exists
    // await eventService.unsaluteParticipant(event.id, selectedParticipant.userId);
  };

  // Handle submit salutes
  const handleSubmitSalutes = async () => {
    if (!event || salutedParticipants.size === 0) return;
    loggingService.logButton('Submit Salutes', 'EventDetailsScreen', {
      eventId: event.id,
    });

    Alert.alert(
      'Submit Salutes',
      `Submit ${salutedParticipants.size} salute${salutedParticipants.size > 1 ? 's' : ''}? This will update player ratings and cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            try {
              setIsSubmittingSalutes(true);

              // Convert Set to array for API call
              const salutedUserIds = Array.from(salutedParticipants);

              // Call API to submit salutes and recalculate ratings
              const result = await eventService.submitSalutes(
                event.id,
                salutedUserIds
              );

              // Mark as submitted
              setSalutesSubmitted(true);

              Alert.alert(
                '≡ƒÖî Salutes Submitted!',
                `Your salutes have been recorded and ${result.ratingsUpdated} player rating${result.ratingsUpdated > 1 ? 's have' : ' has'} been updated.`,
                [{ text: 'OK' }]
              );
            } catch (error) {
              const errorMessage =
                error instanceof Error
                  ? error.message
                  : 'Failed to submit salutes';
              Alert.alert('Submission Failed', errorMessage);
            } finally {
              setIsSubmittingSalutes(false);
            }
          },
        },
      ]
    );
  };

  // Render a single salute participant card (reused in flat and roster-grouped views)
  const renderSaluteCard = (participant: Participant) => {
    const isSaluted = salutedParticipants.has(participant.userId);
    const isCurrentUser = participant.userId === currentUser?.id;

    return (
      <TouchableOpacity
        key={participant.userId}
        style={[
          styles.participantCard,
          isSaluted && styles.participantCardSaluted,
          isCurrentUser && styles.participantCardDisabled,
        ]}
        onPress={() => handleParticipantClick(participant)}
        disabled={isCurrentUser}
        activeOpacity={0.7}
      >
        {participant.user?.profileImage ? (
          <Image
            source={{ uri: participant.user.profileImage }}
            style={styles.participantAvatar}
          />
        ) : (
          <View style={styles.participantAvatarPlaceholder}>
            <Text style={styles.participantAvatarText}>
              {participant.user?.firstName?.[0] || '?'}
              {participant.user?.lastName?.[0] || ''}
            </Text>
          </View>
        )}
        <Text style={styles.participantCardName} numberOfLines={2}>
          {participant.user
            ? `${participant.user.firstName} ${participant.user.lastName}`
            : 'Unknown Player'}
        </Text>
        {isSaluted && (
          <View style={styles.saluteBadge}>
            <Text style={styles.saluteBadgeText}>≡ƒÖî</Text>
          </View>
        )}
        {isCurrentUser && (
          <View style={styles.youBadge}>
            <Text style={styles.youBadgeText}>You</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Render the salute grid — roster-grouped for game events, flat otherwise
  const renderSaluteGrid = () => {
    const isGame = event?.eventType === EventType.GAME && rosters.length > 0;

    if (!isGame) {
      return (
        <View style={styles.participantsGrid}>
          {participants.map(renderSaluteCard)}
        </View>
      );
    }

    // Sort rosters: home first, then alphabetical
    const sortedRosters = [...rosters].sort((a, b) => {
      if (a.isHome && !b.isHome) return -1;
      if (!a.isHome && b.isHome) return 1;
      return a.name.localeCompare(b.name);
    });

    const byRoster = new Map<string, Participant[]>();
    const unassigned: Participant[] = [];
    for (const p of participants) {
      if (p.teamId) {
        const list = byRoster.get(p.teamId) ?? [];
        list.push(p);
        byRoster.set(p.teamId, list);
      } else {
        unassigned.push(p);
      }
    }

    return (
      <View>
        {sortedRosters.map(roster => {
          const rosterParticipants = byRoster.get(roster.id) ?? [];
          return (
            <View key={roster.id} style={{ marginBottom: 16 }}>
              <View style={styles.rosterSaluteHeader}>
                <Ionicons
                  name="shield-outline"
                  size={14}
                  color={colors.primary}
                />
                <Text style={styles.rosterSaluteLabel}>{roster.name}</Text>
                {roster.isHome && (
                  <View style={styles.rosterSaluteHomeBadge}>
                    <Text style={styles.rosterSaluteHomeBadgeText}>HOME</Text>
                  </View>
                )}
              </View>
              <View style={styles.participantsGrid}>
                {rosterParticipants.map(renderSaluteCard)}
              </View>
            </View>
          );
        })}
        {unassigned.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <View style={styles.rosterSaluteHeader}>
              <Ionicons
                name="people-outline"
                size={14}
                color={colors.inkFaint}
              />
              <Text style={styles.rosterSaluteLabel}>Other Players</Text>
            </View>
            <View style={styles.participantsGrid}>
              {unassigned.map(renderSaluteCard)}
            </View>
          </View>
        )}
      </View>
    );
  };

  if (isLoading && !event) {
    return (
      <View style={styles.container}>
        <LoadingSpinner />
      </View>
    );
  }

  if (error && !event) {
    return (
      <View style={styles.container}>
        <ErrorDisplay message={error} onRetry={() => loadEvent()} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.container}>
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
    ctaLabel = "Join Up — You're hosting";
    ctaVariant = 'primary';
    ctaAction = handleBookEvent;
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
    <View style={{ flex: 1, backgroundColor: themeColors.bgScreen }}>
      <ContextualReturnButton />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadEvent(true)}
            colors={[tokenColors.cobalt]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* HeroSection */}
        <HeroSection
          title={event.title}
          sportColor={getSportColor(event.sportType)}
          badges={[
            { label: formatEventType(event.eventType) },
            ...(event.status === EventStatus.CANCELLED
              ? [
                  {
                    label: 'Cancelled',
                    bgColor: colors.errorContainer,
                    textColor: colors.error,
                  },
                ]
              : []),
            ...(isLive
              ? [
                  {
                    label: 'Live',
                    bgColor: colors.secondaryContainer,
                    textColor: colors.secondary,
                  },
                ]
              : []),
          ]}
          headline={formatDateHero(event.startTime)}
          {...(locationString ? { subline: locationString } : {})}
          {...(locationString && (locationLat || locationAddress)
            ? {
                onSublinePress: () => {
                  const dest =
                    locationLat && locationLng
                      ? `${locationLat},${locationLng}`
                      : encodeURIComponent(locationAddress || '');
                  const url =
                    Platform.OS === 'ios'
                      ? `maps:?daddr=${dest}`
                      : `google.navigation:q=${dest}`;
                  Linking.openURL(url).catch(() => {
                    Linking.openURL(
                      `https://www.google.com/maps/dir/?api=1&destination=${dest}`
                    );
                  });
                },
              }
            : {})}
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
                <Text style={styles.locationNameLink}>
                  {event.facility.name}
                </Text>
              </TouchableOpacity>
            ) : event.locationName ? (
              <Text style={styles.locationNameText}>{event.locationName}</Text>
            ) : null}
            {locationAddress ? (
              <Text style={styles.locationAddressText}>{locationAddress}</Text>
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
            <Text style={styles.locationTBD}>Location TBD</Text>
          </DetailCard>
        )}

        {/* Game Thread Chat button */}
        {isUserBooked && (
          <TouchableOpacity
            style={styles.chatBtn}
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
              color={colors.primary}
            />
            <Text style={styles.chatBtnText}>Game Thread</Text>
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
                    <View style={styles.leagueBadge}>
                      <Ionicons name="trophy" size={16} color={colors.gold} />
                      <Text style={styles.leagueBadgeText}>LEAGUE MATCH</Text>
                    </View>

                    <View style={styles.leagueContent}>
                      <View style={styles.leagueHeader}>
                        <Ionicons
                          name="shield-outline"
                          size={20}
                          color={colors.primary}
                        />
                        <Text style={styles.leagueName}>{leagueName}</Text>
                        <Ionicons
                          name="chevron-forward"
                          size={20}
                          color={colors.inkFaint}
                        />
                      </View>

                      <View style={styles.matchDetails}>
                        <View style={styles.teamInfo}>
                          <Text style={styles.teamName}>
                            {match.homeTeam?.name || 'Home Roster'}
                          </Text>
                          {match.homeScore !== undefined &&
                            match.homeScore !== null && (
                              <Text style={styles.teamScore}>
                                {match.homeScore}
                              </Text>
                            )}
                        </View>

                        <Text style={styles.vsText}>vs</Text>

                        <View style={styles.teamInfo}>
                          <Text style={styles.teamName}>
                            {match.awayTeam?.name || 'Away Roster'}
                          </Text>
                          {match.awayScore !== undefined &&
                            match.awayScore !== null && (
                              <Text style={styles.teamScore}>
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
                          <Text style={styles.matchMetaText}>
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
                              <Text style={styles.matchMetaDot}>·</Text>
                              <Text
                                style={[
                                  styles.matchMetaText,
                                  { textTransform: 'capitalize' },
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
          {/* Past GAME events: salute grid */}
          {isPastEvent &&
          participants.length > 0 &&
          event.eventType === EventType.GAME ? (
            <>
              <View style={styles.participantsHeader}>
                {salutedParticipants.size > 0 && !salutesSubmitted && (
                  <Text style={styles.saluteCount}>
                    ≡ƒÖî {salutedParticipants.size}/3 saluted
                  </Text>
                )}
                {salutesSubmitted && (
                  <View style={styles.submittedBadge}>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={colors.primary}
                    />
                    <Text style={styles.submittedText}>Submitted</Text>
                  </View>
                )}
              </View>
              {!salutesSubmitted ? (
                <>
                  <Text style={styles.saluteInstructions}>
                    Tap a participant to salute them (max 3 per event)
                  </Text>
                  {renderSaluteGrid()}
                  {salutedParticipants.size > 0 && (
                    <View style={styles.submitSalutesContainer}>
                      <TouchableOpacity
                        style={styles.submitSalutesButton}
                        onPress={handleSubmitSalutes}
                        disabled={isSubmittingSalutes}
                      >
                        {isSubmittingSalutes ? (
                          <Text style={styles.submitSalutesButtonText}>
                            Submitting...
                          </Text>
                        ) : (
                          <>
                            <Ionicons
                              name="send"
                              size={20}
                              color={tokenColors.white}
                            />
                            <Text style={styles.submitSalutesButtonText}>
                              Submit {salutedParticipants.size} Salute
                              {salutedParticipants.size > 1 ? 's' : ''}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                      <Text style={styles.submitSalutesHint}>
                        This will update player ratings
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.salutesSubmittedContainer}>
                  <Ionicons
                    name="checkmark-circle"
                    size={48}
                    color={colors.primary}
                  />
                  <Text style={styles.salutesSubmittedTitle}>
                    Salutes Submitted!
                  </Text>
                  <Text style={styles.salutesSubmittedDescription}>
                    You saluted {salutedParticipants.size} player
                    {salutedParticipants.size > 1 ? 's' : ''} and their ratings
                    have been updated.
                  </Text>
                </View>
              )}
            </>
          ) : (
            /* Upcoming events and past non-game events: list as PersonRows */
            <>
              {participants.map((p, index) => {
                const pressHandler =
                  isPastEvent && p.userId !== currentUser?.id
                    ? () => handleParticipantClick(p)
                    : p.user
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
                      <View style={styles.personRowDivider} />
                    )}
                  </React.Fragment>
                );
              })}
              {participants.length === 0 && (
                <Text style={styles.emptyParticipantsText}>
                  No players yet — be the first!
                </Text>
              )}
            </>
          )}
        </DetailCard>

        {/* Details card */}
        <DetailCard title="Details" delay={150}>
          {/* Equipment checklist */}
          {event.equipment && event.equipment.length > 0 && (
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionLabel}>Equipment Needed</Text>
              <View style={styles.equipmentList}>
                {event.equipment.map((item, index) => (
                  <View key={index} style={styles.equipmentItem}>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={16}
                      color={tokenColors.success}
                    />
                    <Text style={styles.equipmentText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Rules & Notes */}
          {event.rules ? (
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionLabel}>Rules & Notes</Text>
              <Text style={styles.rulesText}>{event.rules}</Text>
            </View>
          ) : null}

          {/* Organizer as PersonRow */}
          {event.organizer ? (
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionLabel}>Organizer</Text>
              <PersonRow
                name={`${event.organizer.firstName} ${event.organizer.lastName}`}
                role="Organizer"
              />
            </View>
          ) : null}

          {/* Waiver banner (if required and not yet signed) */}
          {waiverStatus?.required && !waiverStatus?.signed && (
            <TouchableOpacity
              style={styles.waiverBanner}
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
                <Text style={styles.waiverBannerTitle}>Waiver Required</Text>
                <Text style={styles.waiverBannerSub}>Read & Sign Waiver →</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Organizer actions removed — now at bottom of scroll */}
        </DetailCard>

        {/* Description (if exists) */}
        {event.description ? (
          <DetailCard delay={200}>
            <Text style={styles.description}>{event.description}</Text>
          </DetailCard>
        ) : null}

        {/* Edit / Delete for organizer */}
        {isUpcoming && isOrganizer && (
          <View style={styles.ownerActions}>
            {isUserBooked ? (
              <TouchableOpacity
                style={styles.ownerStepOutBtn}
                onPress={handleCancelBooking}
                activeOpacity={0.7}
              >
                <Ionicons name="exit-outline" size={18} color={colors.gold} />
                <Text style={styles.ownerStepOutBtnText}>Step Out</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.ownerJoinBtn}
                onPress={handleBookEvent}
                disabled={isBooking || availableSpots <= 0}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={18}
                  color={colors.cobalt}
                />
                <Text style={styles.ownerJoinBtnText}>Join Up</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.ownerEditBtn}
              onPress={handleEditEvent}
              activeOpacity={0.7}
            >
              <Text style={styles.ownerEditBtnText}>Edit Event</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ownerDeleteBtn}
              onPress={() => setShowCancelModal(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.ownerDeleteBtnText}>Delete Event</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* FixedBottomCTA — hidden for past events */}
      {!isPastEvent && (
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
              backgroundColor: tokenColors.white,
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
                color={waiverAgreed ? colors.primary : colors.inkFaint}
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
                backgroundColor: waiverAgreed
                  ? colors.primary
                  : colors.inkFaint,
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
                  color: tokenColors.white,
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

      {/* Salute Modal */}
      <Modal
        visible={showSaluteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSaluteModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSaluteModal(false)}
        >
          <View
            style={styles.modalContent}
            onStartShouldSetResponder={() => true}
          >
            {selectedParticipant && (
              <>
                {/* Participant Avatar */}
                {selectedParticipant.user?.profileImage ? (
                  <Image
                    source={{ uri: selectedParticipant.user.profileImage }}
                    style={styles.modalAvatar}
                  />
                ) : (
                  <View style={styles.modalAvatarPlaceholder}>
                    <Text style={styles.modalAvatarText}>
                      {selectedParticipant.user?.firstName?.[0] || '?'}
                      {selectedParticipant.user?.lastName?.[0] || ''}
                    </Text>
                  </View>
                )}

                {/* Participant Name */}
                <Text style={styles.modalName}>
                  {selectedParticipant.user
                    ? `${selectedParticipant.user.firstName} ${selectedParticipant.user.lastName}`
                    : 'Unknown User'}
                </Text>

                {/* Salute Status */}
                {salutedParticipants.has(selectedParticipant.userId) ? (
                  <>
                    <View style={styles.modalSalutedBadge}>
                      <Text style={styles.modalSalutedText}>≡ƒÖî Saluted</Text>
                    </View>
                    <Text style={styles.modalDescription}>
                      You've already saluted this player. You can remove your
                      salute if you'd like.
                    </Text>
                    <TouchableOpacity
                      style={styles.modalButtonSecondary}
                      onPress={handleUnsalute}
                    >
                      <Text style={styles.modalButtonSecondaryText}>
                        Remove Salute
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.modalDescription}>
                      Give this player a salute to recognize their great
                      sportsmanship and skills!
                    </Text>
                    <TouchableOpacity
                      style={styles.modalButtonPrimary}
                      onPress={handleSalute}
                    >
                      <Text style={styles.modalButtonPrimaryText}>
                        ≡ƒÖî Salute Player
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* Close Button */}
                <TouchableOpacity
                  style={styles.modalButtonClose}
                  onPress={() => setShowSaluteModal(false)}
                >
                  <Text style={styles.modalButtonCloseText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Location card styles
  locationNameLink: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.cobalt,
    textDecorationLine: 'underline',
    marginBottom: 2,
  },
  locationNameText: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.ink,
    marginBottom: 2,
  },
  locationAddressText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkSoft,
    lineHeight: 20,
  },
  locationTBD: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
    fontStyle: 'italic',
  },
  // League match card styles
  leagueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.goldLight + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  leagueBadgeText: {
    color: colors.gold,
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
    color: colors.ink,
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
    color: colors.ink,
    flex: 1,
  },
  teamScore: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 8,
  },
  vsText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.inkFaint,
    marginHorizontal: 12,
  },
  matchMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  matchMetaText: {
    fontSize: 13,
    color: colors.inkFaint,
  },
  matchMetaDot: {
    fontSize: 13,
    color: colors.inkFaint,
  },
  // Details card sub-sections
  detailSection: {
    marginBottom: 16,
  },
  detailSectionLabel: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.inkFaint,
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
    color: colors.ink,
    marginLeft: 8,
  },
  rulesText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.inkSoft,
    lineHeight: 22,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.inkSoft,
    lineHeight: 24,
  },
  // Participants
  personRowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.outlineVariant,
    marginLeft: 52,
  },
  emptyParticipantsText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
    textAlign: 'center',
    paddingVertical: 16,
  },
  // Waiver banner
  waiverBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.goldTint,
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
    gap: 8,
  },
  waiverBannerTitle: {
    fontFamily: fonts.label,
    fontSize: 13,
    color: colors.ink,
  },
  waiverBannerSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkSoft,
  },
  // Owner edit/delete actions (bottom of scroll)
  ownerActions: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 10,
  },
  ownerEditBtn: {
    backgroundColor: colors.pine,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ownerEditBtnText: {
    fontFamily: fonts.ui,
    fontSize: 16,
    color: tokenColors.white,
  },
  ownerJoinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: colors.cobalt,
    borderRadius: 12,
    paddingVertical: 14,
  },
  ownerJoinBtnText: {
    fontFamily: fonts.ui,
    fontSize: 16,
    color: colors.cobalt,
  },
  ownerStepOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: colors.gold,
    borderRadius: 12,
    paddingVertical: 14,
    backgroundColor: colors.goldTint,
  },
  ownerStepOutBtnText: {
    fontFamily: fonts.ui,
    fontSize: 16,
    color: colors.gold,
  },
  ownerDeleteBtn: {
    borderWidth: 2,
    borderColor: colors.heart,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ownerDeleteBtnText: {
    fontFamily: fonts.ui,
    fontSize: 16,
    color: colors.heart,
  },
  // Participants Grid Styles (salute grid — kept exactly as-is)
  participantsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  saluteCount: {
    fontSize: 14,
    color: colors.gold,
    fontWeight: '600',
  },
  saluteInstructions: {
    fontSize: 14,
    color: tokenColors.inkSecondary,
    marginBottom: 16,
  },
  participantsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  rosterSaluteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  rosterSaluteLabel: {
    fontFamily: fonts.label,
    fontSize: 13,
    color: colors.ink,
    textTransform: 'uppercase',
    flex: 1,
  },
  rosterSaluteHomeBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  rosterSaluteHomeBadgeText: {
    fontFamily: fonts.label,
    fontSize: 10,
    color: colors.primary,
  },
  participantCard: {
    width: '30%',
    aspectRatio: 0.75,
    backgroundColor: tokenColors.background,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  participantCardSaluted: {
    borderColor: colors.gold,
    backgroundColor: colors.goldLight + '10',
  },
  participantCardDisabled: {
    opacity: 0.5,
  },
  participantAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  participantAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  participantAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: tokenColors.white,
  },
  participantCardName: {
    fontSize: 13,
    fontWeight: '500',
    color: tokenColors.ink,
    textAlign: 'center',
  },
  saluteBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.gold,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saluteBadgeText: {
    fontSize: 14,
  },
  youBadge: {
    position: 'absolute',
    bottom: 8,
    backgroundColor: colors.ink,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  youBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: tokenColors.white,
  },
  submittedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryFixed + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  submittedText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  submitSalutesContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  submitSalutesButton: {
    backgroundColor: colors.gold,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    width: '100%',
  },
  submitSalutesButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: tokenColors.white,
  },
  submitSalutesHint: {
    fontSize: 13,
    color: tokenColors.inkSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  salutesSubmittedContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  salutesSubmittedTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  salutesSubmittedDescription: {
    fontSize: 16,
    color: tokenColors.inkSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: tokenColors.white,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  modalAvatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalAvatarText: {
    fontSize: 40,
    fontWeight: '700',
    color: tokenColors.white,
  },
  modalName: {
    fontSize: 22,
    fontWeight: '700',
    color: tokenColors.ink,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalSalutedBadge: {
    backgroundColor: colors.goldLight + '20',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  modalSalutedText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gold,
  },
  modalDescription: {
    fontSize: 16,
    color: tokenColors.inkSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtonPrimary: {
    backgroundColor: colors.gold,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalButtonPrimaryText: {
    fontSize: 18,
    fontWeight: '600',
    color: tokenColors.white,
  },
  modalButtonSecondary: {
    backgroundColor: tokenColors.background,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: tokenColors.border,
  },
  modalButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: tokenColors.inkSecondary,
  },
  modalButtonClose: {
    paddingVertical: 12,
  },
  modalButtonCloseText: {
    fontSize: 16,
    color: tokenColors.inkSecondary,
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
    backgroundColor: colors.primary + '12',
    gap: 8,
  },
  chatBtnText: {
    fontFamily: fonts.label,
    fontSize: 14,
    color: colors.primary,
  },
});
