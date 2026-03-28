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
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';

import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { FormButton } from '../../components/forms/FormButton';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { PlayerCard } from '../../components/ui/PlayerCard';

import { CancelEventModal } from '../../components/events/CancelEventModal';
import { StepOutModal } from '../../components/bookings/StepOutModal';
import { RosterParticipantList } from '../../components/events/RosterParticipantList';

import { eventService } from '../../services/api/EventService';
import { BookingValidationService } from '../../services/booking';
import { useAuth } from '../../context/AuthContext';
import { setSelectedEvent, updateEventParticipants, removeEvent } from '../../store/slices/eventsSlice';
import { addBooking, removeBooking } from '../../store/slices/bookingsSlice';
import { selectSelectedEvent } from '../../store/slices/eventsSlice';
import { useCancelBookingMutation } from '../../store/api/eventsApi';
import { colors, fonts } from '../../theme';
import { loggingService } from '../../services/LoggingService';import {
  Event,
  SportType,
  SkillLevel,
  EventStatus,
  EventType,
  Participant,
  RosterInfo,
  BookingStatus,
} from '../../types';
import type { Match } from '../../types/league';

interface EventDetailsScreenProps {
  route: {
    params: {
      eventId: string;
    };
  };
}

export function EventDetailsScreen(): JSX.Element {
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
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [rosters, setRosters] = useState<RosterInfo[]>([]);
  const [participantsLoaded, setParticipantsLoaded] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [salutedParticipants, setSalutedParticipants] = useState<Set<string>>(new Set());
  const [showSaluteModal, setShowSaluteModal] = useState(false);
  const [isSubmittingSalutes, setIsSubmittingSalutes] = useState(false);
  const [salutesSubmitted, setSalutesSubmitted] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showStepOutModal, setShowStepOutModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);

  // Load event details
  const loadEvent = useCallback(async (isRefresh = false, skipCache = false) => {
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
      const participantsData = await eventService.getEventParticipants(eventId, skipCache);

      // Check if event is in the past and if salutes have been submitted
      const isPastEvent = new Date(eventResponse.endTime) < new Date();
      if (isPastEvent) {
        const saluteStatus = await eventService.checkSaluteStatus(eventId);
        setSalutesSubmitted(saluteStatus.hasSubmitted);
      }

      setEvent(eventResponse);
      navigation.setOptions({ headerTitle: eventResponse.title });
      setParticipants(participantsData.participants);
      setRosters(participantsData.rosters ?? []);
      setParticipantsLoaded(true);
      dispatch(setSelectedEvent(eventResponse));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load event';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [eventId, dispatch]);

  // Load event on screen focus (always skip cache for participants)
  useFocusEffect(
    useCallback(() => {
      loadEvent(false, true);
    }, [loadEvent])
  );

  // Check if event is in the past
  const isPastEvent = event && new Date(event.endTime) < new Date();

  // Check if event is currently live (started but not ended)
  const isLive = event && new Date(event.startTime) <= new Date() && new Date(event.endTime) > new Date();

  // Only upcoming events allow edit/delete/join/leave actions
  const isUpcoming = event && !isPastEvent && !isLive && event.status !== EventStatus.CANCELLED;

  // Check if user is already booked
  const isUserBooked = participants.some(
    participant => participant.userId === currentUser?.id
  );
  
  console.log('≡ƒöì EventDetails - isUserBooked check:', {
    isUserBooked,
    participantsCount: participants.length,
    currentUserId: currentUser?.id,
    participantUserIds: participants.map(p => p.userId),
    participantsLoaded,
  });

  // Check if user is the organizer
  const isOrganizer = event?.organizerId === currentUser?.id;
  
  // Debug logging
  console.log('≡ƒöì EventDetails - isOrganizer check:', {
    isOrganizer,
    eventOrganizerId: event?.organizerId,
    currentUserId: currentUser?.id,
    eventTitle: event?.title,
  });

  // Check if event is bookable
  const canBook = event && 
    event.status === EventStatus.ACTIVE &&
    event.currentParticipants < event.maxParticipants &&
    !isUserBooked;

  // Handle booking
  const handleBookEvent = async () => {
    loggingService.logButton('Join', 'EventDetailsScreen', { eventId: event?.id });
    console.log('≡ƒÄ» handleBookEvent called');
    console.log('≡ƒôï Event:', event?.id, event?.title);
    console.log('≡ƒæñ Current user:', currentUser?.id, currentUser?.email);
    
    if (!event || !currentUser) {
      console.log('Γ¥î Missing event or currentUser', { hasEvent: !!event, hasCurrentUser: !!currentUser });
      Alert.alert('Authentication Required', 'Please log in to book events');
      return;
    }

    console.log('≡ƒöì Validating booking...');
    // Validate booking before attempting
    const validationResult = BookingValidationService.validateBooking(event, currentUser);
    console.log('Γ£à Validation result:', validationResult);
    
    if (!validationResult.canBook) {
      console.log('Γ¥î Cannot book:', validationResult.reason);
      Alert.alert('Cannot Join', validationResult.reason || 'Booking not allowed');
      return;
    }

    // Log warnings but proceed anyway (no alert dialog)
    if (validationResult.warnings && validationResult.warnings.length > 0) {
      console.log('ΓÜá∩╕Å Warnings (proceeding anyway):', validationResult.warnings);
    }

    console.log('Γ£à Proceeding with booking...');
    await proceedWithBooking();
  };

  const proceedWithBooking = async () => {
    if (!event || !currentUser) {
      console.log('Γ¥î proceedWithBooking: Missing event or currentUser');
      return;
    }

    console.log('≡ƒÜÇ Starting booking process...', { 
      eventId: event.id, 
      eventTitle: event.title,
      userId: currentUser.id,
      userEmail: currentUser.email 
    });

    try {
      setIsBooking(true);
      
      console.log('≡ƒô₧ Calling eventService.bookEvent API...');
      console.log('≡ƒôï Request params:', { eventId: event.id, userId: currentUser.id });
      
      const booking = await eventService.bookEvent(event.id, currentUser.id);
      
      console.log('Γ£à Booking API call successful!');
      console.log('≡ƒôª Booking response:', JSON.stringify(booking, null, 2));
      
      // Add booking to Redux store
      console.log('≡ƒÆ╛ Adding booking to Redux store...');
      dispatch(addBooking(booking));
      console.log('Γ£à Booking added to Redux');
      
      // Update local state
      const updatedParticipants = event.currentParticipants + 1;
      const updatedEvent = { ...event, currentParticipants: updatedParticipants };
      console.log('≡ƒôè Updating event participants count:', { 
        old: event.currentParticipants, 
        new: updatedParticipants 
      });
      setEvent(updatedEvent);
      dispatch(updateEventParticipants({ eventId: event.id, count: updatedParticipants }));
      
      // Reload participants (skip cache to get fresh data)
      console.log('≡ƒöä Reloading participants list...');
      const newParticipantsData = await eventService.getEventParticipants(event.id, true);
      console.log('Γ£à Participants reloaded successfully!');
      console.log('≡ƒôè Participants count:', newParticipantsData.participants.length);
      console.log('≡ƒæÑ Participant user IDs:', newParticipantsData.participants.map(p => p.userId));
      console.log('≡ƒöì Current user in participants?', newParticipantsData.participants.some(p => p.userId === currentUser.id));
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
              console.log('Γ£à User dismissed success alert, navigating to Home');
              // Navigate to Home tab after user dismisses alert
              (navigation as any).navigate('Home', { screen: 'HomeScreen' });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Γ¥î Booking error occurred!');
      console.error('Γ¥î Error details:', error);
      console.error('Γ¥î Error type:', typeof error);
      console.error('Γ¥î Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Γ¥î Full error object:', JSON.stringify(error, null, 2));
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to book event';
      Alert.alert('Booking Failed', errorMessage);
    } finally {
      console.log('≡ƒÅü Booking process finished, setting isBooking to false');
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
        Alert.alert('Cannot Leave', validationResult.reason || 'Cannot leave this event');
        return;
      }

      // Show the modal
      setShowStepOutModal(true);
    }

  // Handle step out confirmation from modal
  const handleStepOutConfirm = async () => {
    if (!event || !currentUser) {
      return;
    }
    loggingService.logButton('Leave', 'EventDetailsScreen', { eventId: event.id });

    const userBooking = participants.find(p => p.userId === currentUser.id);
    
    if (!userBooking) {
      Alert.alert('Error', 'Could not find your booking for this event');
      return;
    }

    try {
      console.log('≡ƒÜ╢ Canceling booking with RTK Query mutation:', {
        eventId: event.id,
        bookingId: userBooking.bookingId,
      });

      // Use RTK Query mutation - this will automatically invalidate cache
      await cancelBookingMutation({
        eventId: event.id,
        bookingId: userBooking.bookingId,
      }).unwrap();

      console.log('Γ£à Booking cancelled successfully');

      // Remove booking from Redux store
      dispatch(removeBooking(userBooking.bookingId));

      // Close modal
      setShowStepOutModal(false);

      // Clear participants state and reset loaded flag to show loading state
      setParticipants([]);
      setParticipantsLoaded(false);

      // Force a complete reload with cache bypass
      await loadEvent(false, true);
      
      console.log('Γ£à Event reloaded after step out');
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
      console.log('≡ƒùæ∩╕Å Cancelling event:', event.id, 'Reason:', reason);
      await eventService.deleteEvent(event.id, reason);
      console.log('Γ£à Event cancelled successfully');
      
      // Remove event from Redux store
      dispatch(removeEvent(event.id));
      
      // Close the modal
      setShowCancelModal(false);
      
      // Navigate to Home (will trigger refresh via useFocusEffect)
      navigation.navigate('HomeScreen' as never);
      
      // Show success message after navigation
      setTimeout(() => {
        Alert.alert('Success', 'Event cancelled successfully. Participants will be notified.');
      }, 300);
    } catch (err) {
      console.error('Γ¥î Cancel error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel event';
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
    if (salutedParticipants.size >= 3 && !salutedParticipants.has(participant.userId)) {
      Alert.alert('Salute Limit Reached', 'You can only salute up to 3 participants per event.');
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

    // TODO: Call API to save salute
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

    // TODO: Call API to remove salute
    // await eventService.unsaluteParticipant(event.id, selectedParticipant.userId);
  };

  // Handle submit salutes
  const handleSubmitSalutes = async () => {
    if (!event || salutedParticipants.size === 0) return;
    loggingService.logButton('Submit Salutes', 'EventDetailsScreen', { eventId: event.id });

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
              const result = await eventService.submitSalutes(event.id, salutedUserIds);

              // Mark as submitted
              setSalutesSubmitted(true);

              Alert.alert(
                '≡ƒÖî Salutes Submitted!',
                `Your salutes have been recorded and ${result.ratingsUpdated} player rating${result.ratingsUpdated > 1 ? 's have' : ' has'} been updated.`,
                [{ text: 'OK' }]
              );
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Failed to submit salutes';
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
        {sortedRosters.map((roster) => {
          const rosterParticipants = byRoster.get(roster.id) ?? [];
          return (
            <View key={roster.id} style={{ marginBottom: 16 }}>
              <View style={styles.rosterSaluteHeader}>
                <Ionicons name="shield-outline" size={14} color={colors.pine} />
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
              <Ionicons name="people-outline" size={14} color={colors.inkFaint} />
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

  // Format date and time
  const formatDateTime = (date: Date) => {
    const eventDate = new Date(date);
    return {
      date: eventDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      }),
      time: eventDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'UTC',
      }),
    };
  };

  // Get sport icon
  const getSportIcon = (sportType: SportType) => {
    switch (sportType) {
      case SportType.BASKETBALL:
        return 'basketball-outline';
      case SportType.SOCCER:
        return 'football-outline';
      case SportType.TENNIS:
      case SportType.PICKLEBALL:
        return 'tennisball-outline';
      case SportType.VOLLEYBALL:
        return 'american-football-outline';
      case SportType.SOFTBALL:
      case SportType.BASEBALL:
        return 'baseball-outline';
      case SportType.FLAG_FOOTBALL:
        return 'flag-outline';
      case SportType.KICKBALL:
        return 'football-outline';
      default:
        return 'fitness-outline';
    }
  };

  // Get skill level color (kept for backward compat)
  const getSkillLevelColor = (skillLevel: SkillLevel) => {
    switch (skillLevel) {
      case SkillLevel.BEGINNER:
        return '#34C759';
      case SkillLevel.INTERMEDIATE:
        return '#FF9500';
      case SkillLevel.ADVANCED:
        return '#FF3B30';
      default:
        return '#007AFF';
    }
  };

  const getRatingBadgeColor = (rating: number) => {
    if (rating >= 80) return colors.heart;
    if (rating >= 50) return colors.gold;
    return colors.pine;
  };

  // Get status color
  const getStatusColor = (status: EventStatus) => {
    switch (status) {
      case EventStatus.ACTIVE:
        return '#34C759';
      case EventStatus.CANCELLED:
        return '#FF3B30';
      case EventStatus.COMPLETED:
        return '#666';
      case EventStatus.FULL:
        return '#FF9500';
      default:
        return '#666';
    }
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
        <ErrorDisplay
          message={error}
          onRetry={() => loadEvent()}
        />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.container}>
        <ErrorDisplay
          message="Event not found"
          onRetry={() => loadEvent()}
        />
      </View>
    );
  }

  const startDateTime = formatDateTime(event.startTime);
  const endDateTime = formatDateTime(event.endTime);
  const availableSpots = event.maxParticipants - event.currentParticipants;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadEvent(true)}
            colors={['#007AFF']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Participants Section - Show salute grid at top for past GAME events only */}
        {isPastEvent && participants.length > 0 && event.eventType === EventType.GAME && (
          <View style={styles.section}>
            <View style={styles.participantsHeader}>
              <Text style={styles.sectionTitle}>
                Participants ({participants.length})
              </Text>
              {salutedParticipants.size > 0 && !salutesSubmitted && (
                <Text style={styles.saluteCount}>
                  ≡ƒÖî {salutedParticipants.size}/3 saluted
                </Text>
              )}
              {salutesSubmitted && (
                <View style={styles.submittedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.pine} />
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
                        <Text style={styles.submitSalutesButtonText}>Submitting...</Text>
                      ) : (
                        <>
                          <Ionicons name="send" size={20} color="#FFFFFF" />
                          <Text style={styles.submitSalutesButtonText}>
                            Submit {salutedParticipants.size} Salute{salutedParticipants.size > 1 ? 's' : ''}
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
                <Ionicons name="checkmark-circle" size={48} color={colors.pine} />
                <Text style={styles.salutesSubmittedTitle}>Salutes Submitted!</Text>
                <Text style={styles.salutesSubmittedDescription}>
                  You saluted {salutedParticipants.size} player{salutedParticipants.size > 1 ? 's' : ''} and their ratings have been updated.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* League Match Section */}
        {event.matches && event.matches.length > 0 && (() => {
          try {
            const match = event.matches[0] as Match;
            if (!match) return null;
            
            const leagueName = match.league?.name || 'League Match';
            
            return (
              <TouchableOpacity
                style={styles.leagueSection}
                onPress={() => handleNavigateToLeague(match.leagueId)}
                activeOpacity={0.7}
              >
                <View style={styles.leagueBadge}>
                  <Ionicons name="trophy" size={16} color={colors.gold} />
                  <Text style={styles.leagueBadgeText}>LEAGUE MATCH</Text>
                </View>
                
                <View style={styles.leagueContent}>
                  <View style={styles.leagueHeader}>
                    <Ionicons name="shield-outline" size={20} color={colors.pine} />
                    <Text style={styles.leagueName}>{leagueName}</Text>
                    <Ionicons name="chevron-forward" size={20} color={colors.inkFaint} />
                  </View>
                  
                  <View style={styles.matchDetails}>
                    <View style={styles.teamInfo}>
                      <Text style={styles.teamName}>
                        {match.homeTeam?.name || 'Home Roster'}
                      </Text>
                      {match.homeScore !== undefined && match.homeScore !== null && (
                        <Text style={styles.teamScore}>{match.homeScore}</Text>
                      )}
                    </View>
                    
                    <Text style={styles.vsText}>vs</Text>
                    
                    <View style={styles.teamInfo}>
                      <Text style={styles.teamName}>
                        {match.awayTeam?.name || 'Away Roster'}
                      </Text>
                      {match.awayScore !== undefined && match.awayScore !== null && (
                        <Text style={styles.teamScore}>{match.awayScore}</Text>
                      )}
                    </View>
                  </View>
                  
                  {match.scheduledAt && (
                    <View style={styles.matchMeta}>
                      <Ionicons name="calendar-outline" size={14} color={colors.inkFaint} />
                      <Text style={styles.matchMetaText}>
                        {new Date(match.scheduledAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Text>
                      {match.status && (
                        <>
                          <Text style={styles.matchMetaDot}>ΓÇó</Text>
                          <Text style={[styles.matchMetaText, { textTransform: 'capitalize' }]}>
                            {match.status.replace('_', ' ')}
                          </Text>
                        </>
                      )}
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          } catch (error) {
            console.error('Error rendering league match section:', error);
            return null;
          }
        })()}

        {/* Description */}
        {event.description ? (
          <View style={styles.section}>
            <Text style={styles.description}>{event.description}</Text>
          </View>
        ) : null}

        {/* Event Details */}
        <View style={styles.section}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={20} color="#666" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Start</Text>
              <Text style={styles.detailValue}>
                {startDateTime.date} at {startDateTime.time}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={20} color="#666" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>End</Text>
              <Text style={styles.detailValue}>
                {endDateTime.date} at {endDateTime.time}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="hourglass-outline" size={20} color="#666" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Duration</Text>
              <Text style={styles.detailValue}>
                {(() => {
                  const ms = new Date(event.endTime).getTime() - new Date(event.startTime).getTime();
                  const totalMinutes = Math.round(ms / 60000);
                  const hours = Math.floor(totalMinutes / 60);
                  const minutes = totalMinutes % 60;
                  if (hours === 0) return `${minutes}min`;
                  if (minutes === 0) return `${hours}h`;
                  return `${hours}h ${minutes}min`;
                })()}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={20} color="#666" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue}>
                {event.facility?.name || 'Location TBD'}
              </Text>
              {event.facility && (
                <Text style={styles.detailSubtext}>
                  {event.facility.street}, {event.facility.city}
                </Text>
              )}
              {event.rental && (
                <Text style={styles.detailSubtext}>
                  {event.rental.timeSlot.court.name}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="people-outline" size={20} color="#666" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Participants</Text>
              <Text style={styles.detailValue}>
                {event.currentParticipants} / {event.maxParticipants}
              </Text>
              <Text style={styles.detailSubtext}>
                {availableSpots > 0 ? `${availableSpots} spots available` : 'Event is full'}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="card-outline" size={20} color="#666" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Price</Text>
              <Text style={styles.detailValue}>
                {event.price > 0 ? `$${event.price.toFixed(2)}` : 'Free'}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="trophy-outline" size={20} color="#666" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Event Type</Text>
              <Text style={styles.detailValue}>
                {event.eventType.split('_').map((w, i) => i === 0 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')}
              </Text>
            </View>
          </View>
        </View>

        {/* Equipment */}
        {event.equipment.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Equipment Needed</Text>
            <View style={styles.equipmentList}>
              {event.equipment.map((item, index) => (
                <View key={index} style={styles.equipmentItem}>
                  <Ionicons name="checkmark-circle-outline" size={16} color="#34C759" />
                  <Text style={styles.equipmentText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Rules */}
        {event.rules && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rules & Notes</Text>
            <Text style={styles.rulesText}>{event.rules}</Text>
          </View>
        )}

        {/* Organizer */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Organizer</Text>
          <View style={styles.organizerInfo}>
            <Ionicons name="person-circle-outline" size={24} color="#666" />
            <Text style={styles.organizerName}>
              {event.organizer ? 
                `${event.organizer.firstName} ${event.organizer.lastName}` : 
                'Unknown Organizer'
              }
            </Text>
          </View>
        </View>

        {/* Condensed participant count (non-debrief view) */}
        {!isPastEvent && participants.length > 0 && (
          <View style={styles.section}>
            <View style={styles.detailRow}>
              <Ionicons name="people-outline" size={20} color="#666" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Players</Text>
                <Text style={styles.detailValue}>
                  {participants.length} / {event.maxParticipants} joined
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Compact member list for past non-game events */}
        {isPastEvent && event.eventType !== EventType.GAME && participants.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Players ({participants.length})</Text>
            {participants.map((p) => (
              <TouchableOpacity key={p.userId} style={styles.compactMemberRow} onPress={() => p.user && setSelectedPlayer({ id: p.userId, firstName: p.user.firstName, lastName: p.user.lastName, profileImage: p.user.profileImage, dateOfBirth: (p.user as any).dateOfBirth, gender: (p.user as any).gender })} activeOpacity={0.7}>
                {p.user?.profileImage ? (
                  <Image source={{ uri: p.user.profileImage }} style={styles.compactMemberAvatar} />
                ) : (
                  <View style={styles.compactMemberAvatarFallback}>
                    <Text style={styles.compactMemberInitial}>{p.user?.firstName?.[0] || '?'}</Text>
                  </View>
                )}
                <Text style={styles.compactMemberName}>
                  {p.user ? `${p.user.firstName} ${p.user.lastName}` : 'Unknown'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        {!participantsLoaded ? (
          <FormButton
            title="Loading..."
            disabled={true}
            loading={true}
            onPress={() => {}}
          />
        ) : event.status === EventStatus.CANCELLED ? (
          <FormButton
            title="Cancelled"
            disabled={true}
            onPress={() => {}}
          />
        ) : isPastEvent ? (
          <FormButton
            title="Event Ended"
            disabled={true}
            onPress={() => {}}
          />
        ) : isLive ? (
          <FormButton
            title="In Progress"
            disabled={true}
            onPress={() => {}}
          />
        ) : isUserBooked ? (
          <FormButton
            title="Step Out"
            variant="muted"
            onPress={handleCancelBooking}
            loading={isBooking}
            disabled={isBooking}
          />
        ) : canBook ? (
          <FormButton
            title={`Join Up${event.price > 0 ? ` - ${event.price}` : ''}`}
            onPress={handleBookEvent}
            loading={isBooking}
            disabled={isBooking}
          />
        ) : (
          <FormButton
            title={
              isUserBooked ? 'Already Joined' :
              event.status !== EventStatus.ACTIVE ? 'Event Not Available' :
              availableSpots <= 0 ? 'Event Full' :
              'Cannot Join Up'
            }
            disabled={true}
            onPress={() => {}}
          />
        )}

        {/* Edit Event — full-width, organizer only, upcoming only */}
        {isUpcoming && isOrganizer && (
          <FormButton
            title="Edit Event"
            variant="outline"
            onPress={handleEditEvent}
            style={{ marginTop: 10 }}
          />
        )}

        {/* Delete Event — full-width, organizer only, upcoming only */}
        {isUpcoming && isOrganizer && (
          <FormButton
            title="Delete Event"
            variant="danger"
            onPress={() => setShowCancelModal(true)}
            style={{ marginTop: 10 }}
          />
        )}
      </View>

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

      {/* Player Card Popup */}
      <PlayerCard
        visible={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
        player={selectedPlayer}
      />

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
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
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
                      You've already saluted this player. You can remove your salute if you'd like.
                    </Text>
                    <TouchableOpacity
                      style={styles.modalButtonSecondary}
                      onPress={handleUnsalute}
                    >
                      <Text style={styles.modalButtonSecondaryText}>Remove Salute</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.modalDescription}>
                      Give this player a salute to recognize their great sportsmanship and skills!
                    </Text>
                    <TouchableOpacity
                      style={styles.modalButtonPrimary}
                      onPress={handleSalute}
                    >
                      <Text style={styles.modalButtonPrimaryText}>≡ƒÖî Salute Player</Text>
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
    backgroundColor: colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 12,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  leagueSection: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 12,
    marginTop: 12,
    marginHorizontal: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.gold,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
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
    color: colors.pine,
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
  section: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 12,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
    marginTop: 12,
    marginHorizontal: 16,
    padding: 16,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.ink,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  detailContent: {
    marginLeft: 12,
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  detailSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
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
    color: '#333',
    marginLeft: 8,
  },
  rulesText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  organizerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  organizerName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginLeft: 8,
  },
  participantsList: {
    gap: 8,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantName: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  moreParticipants: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  actions: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  // Participants Grid Styles
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
    color: '#666',
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
    backgroundColor: colors.pine + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  rosterSaluteHomeBadgeText: {
    fontFamily: fonts.label,
    fontSize: 10,
    color: colors.pine,
  },
  participantCard: {
    width: '30%',
    aspectRatio: 0.75,
    backgroundColor: '#F9FAFB',
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
    backgroundColor: colors.pine,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  participantAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  participantCardName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
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
    backgroundColor: colors.navy,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  youBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  submittedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.pineLight + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  submittedText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.pine,
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
    color: '#FFFFFF',
  },
  submitSalutesHint: {
    fontSize: 13,
    color: '#666',
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
    color: colors.pine,
    marginTop: 16,
    marginBottom: 8,
  },
  salutesSubmittedDescription: {
    fontSize: 16,
    color: '#666',
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
    backgroundColor: '#FFFFFF',
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
    backgroundColor: colors.pine,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalAvatarText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
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
    color: '#666',
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
    color: '#FFFFFF',
  },
  modalButtonSecondary: {
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  modalButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalButtonClose: {
    paddingVertical: 12,
  },
  modalButtonCloseText: {
    fontSize: 16,
    color: '#666',
  },
  compactMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  compactMemberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  compactMemberAvatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.pine + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactMemberInitial: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.pine,
  },
  compactMemberName: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
});
