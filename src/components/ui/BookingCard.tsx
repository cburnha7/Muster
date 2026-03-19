import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Booking, BookingStatus, PaymentStatus } from '../../types';
import { colors, Spacing } from '../../theme';

interface BookingCardProps {
  booking: Booking;
  onPress?: (booking: Booking) => void;
  onCancel?: (booking: Booking) => void;
  hidePrice?: boolean;
  style?: any;
}

export const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  onPress,
  onCancel,
  hidePrice = false,
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

  const canCancel = booking.status === BookingStatus.CONFIRMED &&
                   booking.event &&
                   new Date(booking.event.startTime) > new Date();

  // Determine if the event is currently live
  const isLive = (() => {
    if (!booking.event) return false;
    const now = new Date();
    const start = new Date(booking.event.startTime);
    const end = booking.event.endTime ? new Date(booking.event.endTime) : null;
    return start <= now && (!end || end > now);
  })();

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={() => onPress?.(booking)}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      {/* Bubble stack — top-right, vertical */}
      {isLive && (
        <View style={styles.bubbleStack}>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
      )}

      {/* Header: title + location */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.eventTitle} numberOfLines={1}>
            {booking.event?.title || 'Event Details'}
          </Text>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={16} color={colors.inkFaint} />
          <Text style={styles.detailText} numberOfLines={1}>
            {booking.event?.facility?.name || 'Location TBD'}
          </Text>
        </View>

        {booking.event && (
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.inkFaint} />
            <Text style={styles.detailText}>
              {formatDate(booking.event.startTime)} at {formatTime(booking.event.startTime)}
            </Text>
          </View>
        )}

        {booking.event && (
          <View style={styles.detailRow}>
            <Ionicons name="hourglass-outline" size={16} color={colors.inkFaint} />
            <Text style={styles.detailText}>
              {(() => {
                const ms = new Date(booking.event.endTime).getTime() - new Date(booking.event.startTime).getTime();
                const totalMinutes = Math.round(ms / 60000);
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;
                if (hours === 0) return `${minutes}min`;
                if (minutes === 0) return `${hours}h`;
                return `${hours}h ${minutes}min`;
              })()}
            </Text>
          </View>
        )}

        {booking.team && (
          <View style={styles.detailRow}>
            <Ionicons name="people-outline" size={16} color={colors.inkFaint} />
            <Text style={styles.detailText}>
              Roster: {booking.team.name}
            </Text>
          </View>
        )}
      </View>

      {/* Footer: capacity, price, payment status, Leave */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          {booking.event && (
            <Text style={styles.participants}>
              {booking.event.currentParticipants}/{booking.event.maxParticipants} players
            </Text>
          )}
          {!hidePrice && (
            <Text style={styles.price}>
              {booking.event?.price != null && booking.event.price > 0 ? `$${booking.event.price.toFixed(2)}` : 'Free'}
            </Text>
          )}
          {!hidePrice && booking.event?.price != null && booking.event.price > 0 && booking.paymentStatus === PaymentStatus.PENDING && (
            <Text style={styles.pendingLabel}>Pending</Text>
          )}
        </View>

        {canCancel && onCancel && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              onCancel(booking);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelText}>Leave</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Booking meta */}
      {(booking.bookedAt || booking.createdAt || booking.cancelledAt) && (
        <View style={styles.bookingInfo}>
          {(booking.bookedAt || booking.createdAt) && !booking.cancelledAt && (
            <Text style={styles.bookingDate}>
              Joined {formatDate(booking.bookedAt || booking.createdAt)}
            </Text>
          )}
          {booking.cancelledAt && (
            <Text style={styles.cancelledDate}>
              Cancelled {formatDate(booking.cancelledAt)}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    paddingRight: 90,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    position: 'relative' as const,
  },
  bubbleStack: {
    position: 'absolute' as const,
    top: 12,
    right: 12,
    alignItems: 'flex-end' as const,
    gap: 4,
    zIndex: 1,
  },
  header: {
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.ink,
    flex: 1,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDECEC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 5,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.heart,
  },
  liveText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.heart,
    letterSpacing: 0.5,
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
    color: colors.inkFaint,
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  participants: {
    fontSize: 13,
    color: colors.inkFaint,
  },
  price: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  pendingLabel: {
    fontSize: 12,
    color: colors.inkFaint,
    fontStyle: 'italic',
  },
  cancelButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.inkFaint,
  },
  cancelText: {
    color: colors.inkFaint,
    fontSize: 13,
    fontWeight: '600',
  },
  bookingInfo: {
    borderTopWidth: 1,
    borderTopColor: colors.chalk,
    paddingTop: 8,
    marginTop: 12,
  },
  bookingDate: {
    fontSize: 12,
    color: colors.inkFaint,
  },
  cancelledDate: {
    fontSize: 12,
    color: colors.heart,
  },
});
