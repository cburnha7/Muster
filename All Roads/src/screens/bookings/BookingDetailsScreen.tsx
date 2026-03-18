import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme';

import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { FormButton } from '../../components/forms/FormButton';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';

import { userService } from '../../services/api/UserService';
import { eventService } from '../../services/api/EventService';
import { BookingValidationService } from '../../services/booking';
import { cancelBooking as cancelBookingAction } from '../../store/slices/bookingsSlice';
import {
  Booking,
  BookingStatus,
  PaymentStatus,
  SportType,
  SkillLevel,
  EventStatus,
} from '../../types';

interface BookingDetailsScreenProps {
  route: {
    params: {
      bookingId: string;
    };
  };
}

export function BookingDetailsScreen(): JSX.Element {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const { bookingId } = (route.params as any) || {};

  // State
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Load booking details
  const loadBooking = useCallback(async (isRefresh = false) => {
    if (!bookingId) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      // Get user bookings and find the specific booking
      const response = await userService.getUserBookings();
      const foundBooking = response.data.find(b => b.id === bookingId);

      if (foundBooking) {
        setBooking(foundBooking);
      } else {
        setError('Booking not found');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load booking';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [bookingId]);

  // Load booking on screen focus
  useFocusEffect(
    useCallback(() => {
      loadBooking();
    }, [loadBooking])
  );

  // Handle cancel booking
  const handleCancelBooking = () => {
    if (!booking || !booking.event) {
      Alert.alert('Error', 'Booking information not available');
      return;
    }

    // Create a mock user object for validation (in real app, this would come from auth state)
    const mockUser = { id: booking.userId } as any;

    // Validate cancellation
    const validationResult = BookingValidationService.validateCancellation(
      booking.event,
      mockUser,
      booking.status
    );

    if (!validationResult.canBook) {
      Alert.alert('Cannot Leave', validationResult.reason || 'Cannot leave this event');
      return;
    }

    // Calculate refund amount
    const refundAmount = BookingValidationService.calculateRefundAmount(
      booking.event.price,
      booking.event.startTime
    );

    // Show cancellation confirmation with refund info
    let alertMessage = `Are you sure you want to leave "${booking.event.title}"?\n\nThis action cannot be undone.`;
    
    if (validationResult.warnings && validationResult.warnings.length > 0) {
      alertMessage += '\n\n' + validationResult.warnings.join('\n');
    }
    
    if (booking.event.price > 0) {
      alertMessage += `\n\nRefund amount: $${refundAmount.toFixed(2)}`;
    }

    Alert.alert(
      "Leave",
      alertMessage,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: "Leave",
          style: 'destructive',
          onPress: confirmCancelBooking,
        },
      ]
    );
  };

  const confirmCancelBooking = async () => {
    if (!booking || !booking.event) return;

    try {
      setIsCancelling(true);
      
      await eventService.cancelBooking(booking.event.id, booking.id);
      
      // Calculate refund amount for confirmation message
      const refundAmount = BookingValidationService.calculateRefundAmount(
        booking.event.price,
        booking.event.startTime
      );
      
      // Update local state
      const updatedBooking = {
        ...booking,
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: 'Cancelled by user',
        refundAmount,
      };
      setBooking(updatedBooking);
      
      // Update Redux state
      dispatch(cancelBookingAction({
        bookingId: booking.id,
        cancellationReason: 'Cancelled by user',
      }));

      // Show success message with refund info
      const confirmationMessage = BookingValidationService.getCancellationConfirmationMessage(
        booking.event,
        refundAmount
      );

      Alert.alert(
        'Left Event',
        confirmationMessage,
        [{ text: 'OK' }]
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel booking';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsCancelling(false);
    }
  };

  // Handle view event
  const handleViewEvent = () => {
    if (booking?.event) {
      navigation.navigate('EventDetails' as never, { eventId: booking.event.id } as never);
    }
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
      }),
      time: eventDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
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

  // Get status color
  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case BookingStatus.CONFIRMED:
        return '#34C759';
      case BookingStatus.CANCELLED:
        return '#FF3B30';
      case BookingStatus.COMPLETED:
        return '#007AFF';
      case BookingStatus.NO_SHOW:
        return '#FF9500';
      default:
        return '#666';
    }
  };

  // Get payment status color
  const getPaymentStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.PAID:
        return '#34C759';
      case PaymentStatus.PENDING:
        return '#FF9500';
      case PaymentStatus.FAILED:
        return '#FF3B30';
      case PaymentStatus.REFUNDED:
        return '#007AFF';
      default:
        return '#666';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ScreenHeader
          title="Booking Details"
          showBack={true}
          onBackPress={() => navigation.goBack()}
        />
        <LoadingSpinner />
      </View>
    );
  }

  if (error || !booking) {
    return (
      <View style={styles.container}>
        <ScreenHeader
          title="Booking Details"
          showBack={true}
          onBackPress={() => navigation.goBack()}
        />
        <ErrorDisplay
          message={error || 'Booking not found'}
          onRetry={() => loadBooking()}
        />
      </View>
    );
  }

  const event = booking.event;
  const canCancel = booking.status === BookingStatus.CONFIRMED && 
                   event && 
                   event.status !== 'cancelled' &&
                   new Date(event.startTime) > new Date();

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Booking Details"
        showBack={true}
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadBooking(true)}
            colors={['#007AFF']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Booking Status */}
        <View style={styles.section}>
          <View style={styles.statusHeader}>
            <Text style={styles.sectionTitle}>Booking Status</Text>
            {booking.status !== BookingStatus.COMPLETED && (
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(booking.status) },
                ]}
              >
                <Text style={styles.statusText}>
                  {booking.status ? booking.status.replace('_', ' ').toUpperCase() : 'UNKNOWN'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Booking ID</Text>
            <Text style={styles.detailValue}>{booking.id}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Booked On</Text>
            <Text style={styles.detailValue}>
              {new Date(booking.bookedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </Text>
          </View>

          {booking.cancelledAt && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Cancelled On</Text>
              <Text style={styles.detailValue}>
                {new Date(booking.cancelledAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          )}

          {booking.cancellationReason && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Cancellation Reason</Text>
              <Text style={styles.detailValue}>{booking.cancellationReason}</Text>
            </View>
          )}
        </View>

        {/* Event Details */}
        {event && (
          <View style={styles.section}>
            <View style={styles.eventHeader}>
              <Ionicons
                name={getSportIcon(event.sportType) as any}
                size={24}
                color="#007AFF"
              />
              <Text style={styles.eventTitle}>{event.title}</Text>
            </View>

            <Text style={styles.eventDescription}>{event.description}</Text>

            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={16} color="#666" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Date & Time</Text>
                <Text style={styles.detailValue}>
                  {formatDateTime(event.startTime).date}
                </Text>
                <Text style={styles.detailSubtext}>
                  {formatDateTime(event.startTime).time} - {formatDateTime(event.endTime).time}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={16} color="#666" />
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
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="trophy-outline" size={16} color="#666" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Skill Level</Text>
                <Text style={styles.detailValue}>
                  {event.skillLevel ? event.skillLevel.replace('_', ' ').toUpperCase() : 'N/A'}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="people-outline" size={16} color="#666" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Participants</Text>
                <Text style={styles.detailValue}>
                  {event.currentParticipants} / {event.maxParticipants}
                </Text>
              </View>
            </View>

            {event.equipment && event.equipment.length > 0 && (
              <View style={styles.detailRow}>
                <Ionicons name="construct-outline" size={16} color="#666" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Equipment Needed</Text>
                  <Text style={styles.detailValue}>
                    {event.equipment.join(', ')}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Payment Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Details</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount</Text>
            <Text style={styles.detailValue}>
              {event?.price > 0 ? `$${event.price.toFixed(2)}` : 'Free'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment Status</Text>
            <View
              style={[
                styles.paymentStatusBadge,
                { backgroundColor: getPaymentStatusColor(booking.paymentStatus) },
              ]}
            >
              <Text style={styles.paymentStatusText}>
                {booking.paymentStatus ? booking.paymentStatus.replace('_', ' ').toUpperCase() : 'UNKNOWN'}
              </Text>
            </View>
          </View>

          {booking.paymentId && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payment ID</Text>
              <Text style={styles.detailValue}>{booking.paymentId}</Text>
            </View>
          )}

          {booking.refundAmount && booking.refundAmount > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Refund Amount</Text>
              <Text style={styles.detailValue}>${booking.refundAmount}</Text>
            </View>
          )}
        </View>

        {/* Team Details */}
        {booking.team && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Team Details</Text>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Team Name</Text>
              <Text style={styles.detailValue}>{booking.team.name}</Text>
            </View>

            {booking.team.description && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Description</Text>
                <Text style={styles.detailValue}>{booking.team.description}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        {event && (
          <FormButton
            title="View Event"
            variant="outline"
            onPress={handleViewEvent}
            style={styles.actionButton}
          />
        )}
        
        {canCancel && (
          <FormButton
            title="Leave"
            variant="muted"
            onPress={handleCancelBooking}
            loading={isCancelling}
            disabled={isCancelling}
            style={styles.actionButton}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.chalkWarm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
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
    fontSize: 24,
    color: colors.ink,
    marginBottom: 12,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  eventDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    minHeight: 20,
  },
  detailContent: {
    marginLeft: 8,
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 2,
    flex: 1,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    flex: 2,
  },
  detailSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  paymentStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  paymentStatusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 6,
  },
});