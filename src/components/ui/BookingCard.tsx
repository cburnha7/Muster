import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Booking, BookingStatus, PaymentStatus } from '../../types';
import { tokenSpacing, tokenRadius, tokenFontFamily } from '../../theme/tokens';
import { useTheme } from '../../theme';
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
  const { colors, shadow } = useTheme();

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
        { backgroundColor: colors.surface, ...shadow.card },
        isCancelled && { backgroundColor: colors.errorLight },
        isLive && { backgroundColor: colors.goldLight },
        isPast && { backgroundColor: colors.surface },
        style,
      ]}
      onPress={() => onPress?.(booking)}
      disabled={!onPress}
    >
      {/* Bubble stack — top-right, vertical */}
      <View style={styles.bubbleStack}>
        {isCancelled && (
          <View
            style={[styles.cancelledBadge, { backgroundColor: colors.error }]}
          >
            <Text style={[styles.cancelledBadgeText, { color: colors.white }]}>
              Cancelled
            </Text>
          </View>
        )}
        {isLive && (
          <View
            style={[styles.liveBadgePill, { backgroundColor: colors.gold }]}
          >
            <View style={[styles.liveDot, { backgroundColor: colors.white }]} />
            <Text style={[styles.liveBadgePillText, { color: colors.white }]}>
              Live
            </Text>
          </View>
        )}
        {isPast && (
          <View style={[styles.pastBadge, { backgroundColor: colors.ink }]}>
            <Text style={[styles.pastBadgeText, { color: colors.white }]}>
              Past
            </Text>
          </View>
        )}
        {booking.status === BookingStatus.PENDING_APPROVAL && (
          <View style={styles.pendingApprovalBadge}>
            <Ionicons name="time-outline" size={11} color={colors.gold} />
            <Text style={[styles.pendingApprovalText, { color: colors.gold }]}>
              PENDING
            </Text>
          </View>
        )}
      </View>

      {/* Header: title + location */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text
            style={[styles.eventTitle, { color: colors.ink }]}
            numberOfLines={1}
          >
            {booking.event?.title || 'Event Details'}
          </Text>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={16} color={colors.inkMuted} />
          <Text
            style={[styles.detailText, { color: colors.inkMuted }]}
            numberOfLines={1}
          >
            {booking.event?.facility?.name || 'Location TBD'}
          </Text>
        </View>

        {booking.event && (
          <View style={styles.detailRow}>
            <Ionicons
              name="calendar-outline"
              size={16}
              color={colors.inkMuted}
            />
            <Text style={[styles.detailText, { color: colors.inkMuted }]}>
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
              color={colors.inkMuted}
            />
            <Text style={[styles.detailText, { color: colors.inkMuted }]}>
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
            <Ionicons name="people-outline" size={16} color={colors.inkMuted} />
            <Text style={[styles.detailText, { color: colors.inkMuted }]}>
              Roster: {booking.team.name}
            </Text>
          </View>
        )}
      </View>

      {/* Footer: capacity, price, payment status, Leave */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          {booking.event && (
            <Text style={[styles.participants, { color: colors.inkMuted }]}>
              {booking.event.currentParticipants}/
              {booking.event.maxParticipants} players
            </Text>
          )}
          {!hidePrice && (
            <Text style={[styles.price, { color: colors.ink }]}>
              {booking.event?.price != null && booking.event.price > 0
                ? `${booking.event.price.toFixed(2)}`
                : 'Free'}
            </Text>
          )}
          {!hidePrice &&
            booking.event?.price != null &&
            booking.event.price > 0 &&
            booking.paymentStatus === PaymentStatus.PENDING && (
              <Text style={[styles.pendingLabel, { color: colors.inkMuted }]}>
                Pending
              </Text>
            )}
        </View>

        {canCancel && onCancel && (
          <TouchableOpacity
            style={[
              styles.cancelButton,
              { borderColor: colors.gold, backgroundColor: colors.goldLight },
            ]}
            onPress={() => {
              onCancel(booking);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.cancelText, { color: colors.gold }]}>
              Leave
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </PressableCard>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: tokenRadius.lg,
    padding: tokenSpacing.lg,
    paddingRight: 90,
    marginVertical: tokenSpacing.sm,
    marginHorizontal: tokenSpacing.lg,
    position: 'relative' as const,
  },
  bubbleStack: {
    position: 'absolute' as const,
    top: tokenSpacing.md,
    right: tokenSpacing.md,
    alignItems: 'flex-end' as const,
    gap: tokenSpacing.xs,
    zIndex: 1,
  },
  header: {
    marginBottom: tokenSpacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokenSpacing.sm,
  },
  eventTitle: {
    fontSize: 18,
    fontFamily: tokenFontFamily.uiSemiBold,
    flex: 1,
  },
  liveBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 5,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  liveBadgePillText: {
    fontSize: 11,
    fontFamily: tokenFontFamily.display,
    letterSpacing: 0.5,
  },
  cancelledBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  cancelledBadgeText: {
    fontSize: 11,
    fontFamily: tokenFontFamily.display,
    letterSpacing: 0.5,
  },
  pastBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  pastBadgeText: {
    fontSize: 11,
    fontFamily: tokenFontFamily.display,
    letterSpacing: 0.5,
  },
  details: {
    marginBottom: tokenSpacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: tokenSpacing.xs,
  },
  detailText: {
    fontSize: 14,
    fontFamily: tokenFontFamily.uiRegular,
    marginLeft: tokenSpacing.sm,
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
    gap: tokenSpacing.md,
  },
  participants: {
    fontSize: 13,
    fontFamily: tokenFontFamily.uiRegular,
  },
  price: {
    fontSize: 15,
    fontFamily: tokenFontFamily.uiSemiBold,
  },
  pendingLabel: {
    fontSize: 12,
    fontFamily: tokenFontFamily.uiRegular,
    fontStyle: 'italic',
  },
  cancelButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  cancelText: {
    fontFamily: tokenFontFamily.uiBold,
    fontSize: 13,
  },
  bookingInfo: {
    borderTopWidth: 1,
    paddingTop: tokenSpacing.sm,
    marginTop: tokenSpacing.md,
  },
  bookingDate: {
    fontSize: 12,
    fontFamily: tokenFontFamily.uiRegular,
  },
  pendingApprovalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(196, 168, 130, 0.15)',
    paddingHorizontal: tokenSpacing.sm,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 5,
  },
  pendingApprovalText: {
    fontSize: 11,
    fontFamily: tokenFontFamily.display,
    letterSpacing: 0.5,
  },
});
