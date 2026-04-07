import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Booking, BookingStatus, PaymentStatus } from '../../types';
import { colors, fonts, Spacing } from '../../theme';
import { PressableCard } from './PressableCard';

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

  const canCancel =
    booking.status === BookingStatus.CONFIRMED &&
    booking.event &&
    new Date(booking.event.startTime) > new Date();

  const isCancelled =
    booking.status === BookingStatus.CANCELLED ||
    booking.event?.status === 'cancelled';

  // Determine if the event is currently live
  const isLive = (() => {
    if (!booking.event) return false;
    if (isCancelled) return false;
    const now = new Date();
    const start = new Date(booking.event.startTime);
    const end = booking.event.endTime ? new Date(booking.event.endTime) : null;
    return start <= now && (!end || end > now);
  })();

  // Determine if the event is in the past
  const isPast = (() => {
    if (!booking.event) return false;
    if (isCancelled || isLive) return false;
    const now = new Date();
    const end = booking.event.endTime ? new Date(booking.event.endTime) : null;
    const start = new Date(booking.event.startTime);
    return end ? end < now : start < now;
  })();

  return (
    <PressableCard
      style={[
        styles.container,
        isCancelled && styles.containerCancelled,
        isLive && styles.containerLive,
        isPast && styles.containerPast,
        style,
      ]}
      onPress={() => onPress?.(booking)}
      disabled={!onPress}
    >
      {/* Bubble stack — top-right, vertical */}
      <View style={styles.bubbleStack}>
        {isCancelled && (
          <View style={styles.cancelledBadge}>
            <Text style={styles.cancelledBadgeText}>Cancelled</Text>
          </View>
        )}
        {isLive && (
          <View style={styles.liveBadgePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveBadgePillText}>Live</Text>
          </View>
        )}
        {isPast && (
          <View style={styles.pastBadge}>
            <Text style={styles.pastBadgeText}>Past</Text>
          </View>
        )}
        {booking.status === BookingStatus.PENDING_APPROVAL && (
          <View style={styles.pendingApprovalBadge}>
            <Ionicons name="time-outline" size={11} color={colors.gold} />
            <Text style={styles.pendingApprovalText}>PENDING</Text>
          </View>
        )}
      </View>

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
            <Ionicons
              name="calendar-outline"
              size={16}
              color={colors.inkFaint}
            />
            <Text style={styles.detailText}>
              {formatDate(booking.event.startTime)} at{' '}
              {formatTime(booking.event.startTime)}
            </Text>
          </View>
        )}

        {booking.event && (
          <View style={styles.detailRow}>
            <Ionicons
              name="hourglass-outline"
              size={16}
              color={colors.inkFaint}
            />
            <Text style={styles.detailText}>
              {(() => {
                const ms =
                  new Date(booking.event.endTime).getTime() -
                  new Date(booking.event.startTime).getTime();
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
            <Text style={styles.detailText}>Roster: {booking.team.name}</Text>
          </View>
        )}
      </View>

      {/* Footer: capacity, price, payment status, Leave */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          {booking.event && (
            <Text style={styles.participants}>
              {booking.event.currentParticipants}/
              {booking.event.maxParticipants} players
            </Text>
          )}
          {!hidePrice && (
            <Text style={styles.price}>
              {booking.event?.price != null && booking.event.price > 0
                ? `$${booking.event.price.toFixed(2)}`
                : 'Free'}
            </Text>
          )}
          {!hidePrice &&
            booking.event?.price != null &&
            booking.event.price > 0 &&
            booking.paymentStatus === PaymentStatus.PENDING && (
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
    </PressableCard>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    paddingRight: 90,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#191C1E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3.84,
    elevation: 3,
    position: 'relative' as const,
  },
  containerCancelled: {
    backgroundColor: colors.heartTint,
  },
  containerLive: {
    backgroundColor: colors.goldTint,
  },
  containerPast: {
    backgroundColor: colors.surface,
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
    fontFamily: fonts.headingSemi,
    color: colors.ink,
    flex: 1,
  },
  liveBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gold,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 5,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  liveBadgePillText: {
    fontSize: 11,
    fontFamily: fonts.display,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  cancelledBadge: {
    backgroundColor: colors.heart,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  cancelledBadgeText: {
    fontSize: 11,
    fontFamily: fonts.display,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  pastBadge: {
    backgroundColor: colors.ink,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  pastBadgeText: {
    fontSize: 11,
    fontFamily: fonts.display,
    color: '#FFFFFF',
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
    fontFamily: fonts.body,
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
    fontFamily: fonts.body,
    color: colors.inkFaint,
  },
  price: {
    fontSize: 15,
    fontFamily: fonts.headingSemi,
    color: colors.ink,
  },
  pendingLabel: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.inkFaint,
    fontStyle: 'italic',
  },
  cancelButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: colors.goldTint,
  },
  cancelText: {
    fontFamily: fonts.ui,
    color: colors.gold,
    fontSize: 13,
  },
  bookingInfo: {
    borderTopWidth: 1,
    borderTopColor: colors.surface,
    paddingTop: 8,
    marginTop: 12,
  },
  bookingDate: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.inkFaint,
  },
  cancelledDate: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.heart,
  },
  pendingApprovalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(196, 168, 130, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 5,
  },
  pendingApprovalText: {
    fontSize: 11,
    fontFamily: fonts.display,
    color: colors.gold,
    letterSpacing: 0.5,
  },
});
