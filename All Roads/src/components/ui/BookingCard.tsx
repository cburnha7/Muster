import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Booking, BookingStatus, PaymentStatus } from '../../types';

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

  const isUpcoming = booking.event && 
                    new Date(booking.event.startTime) > new Date() &&
                    booking.status === BookingStatus.CONFIRMED;

  // Debug logging
  console.log('BookingCard render:', {
    bookingId: booking.id,
    status: booking.status,
    hasEvent: !!booking.event,
    canCancel,
    hasOnCancel: !!onCancel,
    willShowButton: canCancel && !!onCancel,
  });

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={() => onPress?.(booking)}
      activeOpacity={0.7}
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
                Team: {booking.team.name}
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.paymentInfo}>
          <Text style={styles.price}>
            {booking.event?.price ? `$${booking.event.price}` : 'Free'}
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
              onCancel(booking);
            }}
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
    </TouchableOpacity>
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
    marginBottom: 12,
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  details: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
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
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
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
  upcomingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F4FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
  },
  upcomingText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
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