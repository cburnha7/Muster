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
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { fonts, useTheme } from '../../theme';

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
  const { colors } = useTheme();
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
  const loadBooking = useCallback(
    async (isRefresh = false) => {
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
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load booking';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [bookingId]
  );

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
      Alert.alert(
        'Cannot Leave',
        validationResult.reason || 'Cannot leave this event'
      );
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

    Alert.alert('Leave', alertMessage, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: confirmCancelBooking,
      },
    ]);
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
      dispatch(
        cancelBookingAction({
          bookingId: booking.id,
          cancellationReason: 'Cancelled by user',
        })
      );

      // Show success message with refund info
      const confirmationMessage =
        BookingValidationService.getCancellationConfirmationMessage(
          booking.event,
          refundAmount
        );

      Alert.alert('Left Event', confirmationMessage, [{ text: 'OK' }]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to cancel booking';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsCancelling(false);
    }
  };

  // Handle view event
  const handleViewEvent = () => {
    if (booking?.event) {
      navigation.navigate(
        'EventDetails' as never,
        { eventId: booking.event.id } as never
      );
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
        return colors.pine;
      case BookingStatus.CANCELLED:
        return colors.error;
      case BookingStatus.COMPLETED:
        return colors.cobalt;
      case BookingStatus.NO_SHOW:
        return colors.warning;
      default:
        return colors.inkSecondary;
    }
  };

  // Get payment status color
  const getPaymentStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.PAID:
        return colors.pine;
      case PaymentStatus.PENDING:
        return colors.warning;
      case PaymentStatus.FAILED:
        return colors.error;
      case PaymentStatus.REFUNDED:
        return colors.cobalt;
      default:
        return colors.inkSecondary;
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgScreen }]}>
        <ScreenHeader
          title="Booking Details"
          showBack={false}
          onBackPress={() => navigation.goBack()}
        />
        <LoadingSpinner />
      </View>
    );
  }

  if (error || !booking) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgScreen }]}>
        <ScreenHeader
          title="Booking Details"
          showBack={false}
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
  const canCancel =
    booking.status === BookingStatus.CONFIRMED &&
    event &&
    event.status !== 'cancelled' &&
    new Date(event.startTime) > new Date();

  return (
    <View style={[styles.container, { backgroundColor: colors.bgScreen }]}>
      <ScreenHeader
        title="Booking Details"
        showBack={false}
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadBooking(true)}
            colors={[colors.cobalt]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Booking Status */}
        <View
          style={[
            styles.section,
            { backgroundColor: colors.bgCard, shadowColor: colors.ink },
          ]}
        >
          <View style={styles.statusHeader}>
            <Text style={[styles.sectionTitle, { color: colors.ink }]}>
              Booking Status
            </Text>
            {booking.status !== BookingStatus.COMPLETED && (
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(booking.status) },
                ]}
              >
                <Text style={[styles.statusText, { color: colors.white }]}>
                  {booking.status
                    ? booking.status.replace('_', ' ').toUpperCase()
                    : 'UNKNOWN'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.inkSecondary }]}>Booking ID</Text>
            <Text style={[styles.detailValue, { color: colors.ink }]}>{booking.id}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.inkSecondary }]}>Booked On</Text>
            <Text style={[styles.detailValue, { color: colors.ink }]}>
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
              <Text style={[styles.detailLabel, { color: colors.inkSecondary }]}>Cancelled On</Text>
              <Text style={[styles.detailValue, { color: colors.ink }]}>
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
              <Text style={[styles.detailLabel, { color: colors.inkSecondary }]}>Cancellation Reason</Text>
              <Text style={[styles.detailValue, { color: colors.ink }]}>
                {booking.cancellationReason}
              </Text>
            </View>
          )}
        </View>

        {/* Event Details */}
        {event && (
          <View style={[styles.section, { backgroundColor: colors.bgCard, shadowColor: colors.ink }]}>
            <View style={styles.eventHeader}>
              <Ionicons
                name={getSportIcon(event.sportType) as any}
                size={24}
                color={colors.cobalt}
              />
              <Text style={[styles.eventTitle, { color: colors.ink }]}>{event.title}</Text>
            </View>

            <Text style={[styles.eventDescription, { color: colors.inkSecondary }]}>{event.description}</Text>

            <View style={styles.detailRow}>
              <Ionicons
                name="calendar-outline"
                size={16}
                color={colors.inkSecondary}
              />
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { color: colors.inkSecondary }]}>Date & Time</Text>
                <Text style={[styles.detailValue, { color: colors.ink }]}>
                  {formatDateTime(event.startTime).date}
                </Text>
                <Text style={[styles.detailSubtext, { color: colors.inkSecondary }]}>
                  {formatDateTime(event.startTime).time} -{' '}
                  {formatDateTime(event.endTime).time}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons
                name="location-outline"
                size={16}
                color={colors.inkSecondary}
              />
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { color: colors.inkSecondary }]}>Location</Text>
                <Text style={[styles.detailValue, { color: colors.ink }]}>
                  {event.facility?.name || event.locationName || 'Location TBD'}
                </Text>
                {event.facility && (
                  <Text style={[styles.detailSubtext, { color: colors.inkSecondary }]}>
                    {event.facility.street}, {event.facility.city}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons
                name="trophy-outline"
                size={16}
                color={colors.inkSecondary}
              />
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { color: colors.inkSecondary }]}>Skill Level</Text>
                <Text style={[styles.detailValue, { color: colors.ink }]}>
                  {event.skillLevel
                    ? event.skillLevel.replace('_', ' ').toUpperCase()
                    : 'N/A'}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons
                name="people-outline"
                size={16}
                color={colors.inkSecondary}
              />
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { color: colors.inkSecondary }]}>Participants</Text>
                <Text style={[styles.detailValue, { color: colors.ink }]}>
                  {event.currentParticipants} / {event.maxParticipants}
                </Text>
              </View>
            </View>

            {event.equipment && event.equipment.length > 0 && (
              <View style={styles.detailRow}>
                <Ionicons
                  name="construct-outline"
                  size={16}
                  color={colors.inkSecondary}
                />
                <View style={styles.detailContent}>
                  <Text style={[styles.detailLabel, { color: colors.inkSecondary }]}>Equipment Needed</Text>
                  <Text style={[styles.detailValue, { color: colors.ink }]}>
                    {event.equipment.join(', ')}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Payment Details */}
        <View style={[styles.section, { backgroundColor: colors.bgCard, shadowColor: colors.ink }]}>
          <Text style={[styles.sectionTitle, { color: colors.ink }]}>Payment Details</Text>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.inkSecondary }]}>Amount</Text>
            <Text style={[styles.detailValue, { color: colors.ink }]}>
              {event?.price > 0 ? `$${event.price.toFixed(2)}` : 'Free'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.inkSecondary }]}>Payment Status</Text>
            <View
              style={[
                styles.paymentStatusBadge,
                {
                  backgroundColor: getPaymentStatusColor(booking.paymentStatus),
                },
              ]}
            >
              <Text style={[styles.paymentStatusText, { color: colors.white }]}>
                {booking.paymentStatus
                  ? booking.paymentStatus.replace('_', ' ').toUpperCase()
                  : 'UNKNOWN'}
              </Text>
            </View>
          </View>

          {booking.paymentId && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.inkSecondary }]}>Payment ID</Text>
              <Text style={[styles.detailValue, { color: colors.ink }]}>{booking.paymentId}</Text>
            </View>
          )}

          {booking.refundAmount && booking.refundAmount > 0 && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.inkSecondary }]}>Refund Amount</Text>
              <Text style={[styles.detailValue, { color: colors.ink }]}>${booking.refundAmount}</Text>
            </View>
          )}
        </View>

        {/* Team Details */}
        {booking.team && (
          <View style={[styles.section, { backgroundColor: colors.bgCard, shadowColor: colors.ink }]}>
            <Text style={[styles.sectionTitle, { color: colors.ink }]}>Team Details</Text>

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.inkSecondary }]}>Team Name</Text>
              <Text style={[styles.detailValue, { color: colors.ink }]}>{booking.team.name}</Text>
            </View>

            {booking.team.description && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.inkSecondary }]}>Description</Text>
                <Text style={[styles.detailValue, { color: colors.ink }]}>
                  {booking.team.description}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={[styles.actions, { backgroundColor: colors.bgCard, borderTopColor: colors.bgScreen }]}>
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  section: {
    borderRadius: 16,
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
    fontSize: 18,
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
    fontSize: 12,
    fontFamily: fonts.headingSemi,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 20,
    fontFamily: fonts.headingSemi,
    marginLeft: 8,
    flex: 1,
  },
  eventDescription: {
    fontSize: 16,
    fontFamily: fonts.body,
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
    fontFamily: fonts.body,
    marginBottom: 2,
    flex: 1,
  },
  detailValue: {
    fontSize: 16,
    fontFamily: fonts.label,
    flex: 2,
  },
  detailSubtext: {
    fontSize: 14,
    fontFamily: fonts.body,
    marginTop: 2,
  },
  paymentStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  paymentStatusText: {
    fontSize: 12,
    fontFamily: fonts.headingSemi,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 6,
  },
});
