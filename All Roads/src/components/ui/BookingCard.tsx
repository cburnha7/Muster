import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Booking, BookingStatus, PaymentStatus } from '../../types';
import { colors } from '../../theme';

interface BookingCardProps {
  booking: Booking;
  onPress?: (booking: Booking) => void;
  onCancel?: (booking: Booking) => void;
  style?: any;
}

export const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  onPress,
  onCancel,
  style,
}) => {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

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

  const canCancel = booking.status === BookingStatus.CONFIRMED &&
                   booking.event &&
                   new Date(booking.event.startTime) > new Date();

  const availableSpots = booking.event 
    ? booking.event.maxParticipants - booking.event.currentParticipants 
    : 0;
  const isFullyBooked = availableSpots <= 0;

  return (
    <View style={[styles.container, style]}>
      {/* Card content - tappable to navigate to event details */}
      <TouchableOpacity
        onPress={() => onPress?.(booking)}
        activeOpacity={0.7}
        disabled={!onPress}
      >
        <View style={styles.header}>
          <View style={styles.eventInfo}>
            <Text style={styles.eventTitle} numberOfLines={1}>
              {booking.event?.title || 'Event Details'}
            </Text>
            <Text style={styles.facilityName} numberOfLines={1}>
              {booking.event?.facility?.name || 'Location TBD'}
            </Text>
          </View>
        </View>

        {booking.event && (
          <View style={[
            styles.participantsTracker,
            isFullyBooked && {
              backgroundColor: colors.track + '15',
              borderColor: colors.track + '30',
            }
          ]}>
            <Ionicons 
              name="people" 
              size={16} 
              color={isFullyBooked ? colors.track : colors.grass} 
            />
            <Text style={[
              styles.participantsText,
              isFullyBooked && styles.participantsFullText
            ]}>
              {booking.event.currentParticipants}/{booking.event.maxParticipants} players
            </Text>
          </View>
        )}

        {booking.event && (
          <View style={styles.details}>
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={16} color="#666" />
              <Text style={styles.detailText}>
                {formatDate(booking.event.startTime)} at {formatTime(booking.event.startTime)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text style={styles.detailText}>
                Duration: {Math.round(
                  (new Date(booking.event.endTime).getTime() -
                   new Date(booking.event.startTime).getTime()) / (1000 * 60)
                )} minutes
              </Text>
            </View>
            {booking.team && (
              <View style={styles.detailRow}>
                <Ionicons name="people-outline" size={16} color="#666" />
                <Text style={styles.detailText}>
                  Roster: {booking.team.name}
                </Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>

      {/* Footer with price and Step Out button - NOT inside the parent touchable */}
      <View style={styles.footer}>
        <View style={styles.paymentInfo}>
          <Text style={styles.price}>
            {booking.event?.price && booking.event.price > 0 ? `$${booking.event.price.toFixed(2)}` : 'Free'}
          </Text>
          {booking.event?.price && booking.event.price > 0 && (
            <View
              style={[
                styles.paymentBadge,
                { backgroundColor: getPaymentStatusColor(booking.paymentStatus) },
              ]}
            >
              <Text style={styles.paymentText}>
                {booking.paymentStatus.toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {canCancel && onCancel && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              console.log('📍 BookingCard: Step Out button pressed');
              console.log('📍 Booking:', booking.id, booking.eventId);
              onCancel(booking);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelText}>Step Out</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.bookingInfo}>
        {(booking.bookedAt || booking.createdAt) && (
          <Text style={styles.bookingDate}>
            Booked on {formatDate(booking.bookedAt || booking.createdAt)}
          </Text>
        )}
        {booking.cancelledAt && (
          <Text style={styles.cancelledDate}>
            Cancelled on {formatDate(booking.cancelledAt)}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  eventInfo: {
    flex: 1,
    marginRight: 12,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  facilityName: {
    fontSize: 14,
    color: '#666',
  },
  participantsTracker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.grass + '15',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.grass + '30',
  },
  participantsText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.grass,
    marginLeft: 6,
  },
  participantsFullText: {
    color: colors.track,
  },
  details: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    minHeight: 40,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3D8C5E',
    marginRight: 12,
  },
  paymentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  paymentText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  bookingInfo: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 8,
  },
  bookingDate: {
    fontSize: 12,
    color: '#666',
  },
  cancelledDate: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 2,
  },
});
