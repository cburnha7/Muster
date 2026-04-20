import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableCard } from './PressableCard';
import { Event, SportType, SkillLevel } from '../../types';
import { EventEligibilityService } from '../../services/events/EventEligibilityService';
import {
  tokenColors,
  tokenSpacing,
  tokenRadius,
  tokenType,
  tokenShadow,
  tokenFontFamily,
} from '../../theme/tokens';

interface EventCardProps {
  event: Event;
  onPress?: (event: Event) => void;
  style?: any;
  compact?: boolean;
  isHost?: boolean | undefined;
  colorIndicator?: string;
}

const EventCardInner: React.FC<EventCardProps> = ({
  event,
  onPress,
  style,
  compact = false,
  isHost,
  colorIndicator,
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

  const getSkillLevelColor = (skillLevel: SkillLevel) => {
    switch (skillLevel) {
      case SkillLevel.BEGINNER:
        return tokenColors.success;
      case SkillLevel.INTERMEDIATE:
        return tokenColors.gold;
      case SkillLevel.ADVANCED:
        return tokenColors.error;
      default:
        return tokenColors.cobalt;
    }
  };

  const getRatingBadgeColor = (rating: number) => {
    if (rating >= 80) return tokenColors.error;
    if (rating >= 50) return tokenColors.gold;
    return tokenColors.cobalt;
  };

  const availableSpots = event.maxParticipants - event.currentParticipants;
  const isFullyBooked = availableSpots <= 0;
  const isInviteOnly =
    event.eligibility?.isInviteOnly &&
    !event.eligibility?.wasAutoOpenedToPublic;
  const wasAutoOpened = event.eligibility?.wasAutoOpenedToPublic;

  return (
    <PressableCard
      style={[
        styles.container,
        colorIndicator ? styles.containerWithIndicator : undefined,
        style,
      ]}
      onPress={() => onPress?.(event)}
    >
      {colorIndicator && (
        <View
          style={[
            styles.colorIndicatorStripe,
            { backgroundColor: colorIndicator },
          ]}
        />
      )}
      {/* Bubble stack — top-right, vertical */}
      <View style={styles.bubbleStack}>
        {event.scheduledStatus === 'unscheduled' && (
          <View style={styles.pendingBadge}>
            <Ionicons name="time-outline" size={10} color={tokenColors.gold} />
            <Text style={styles.pendingBadgeText}>Pending</Text>
          </View>
        )}
        {isHost && (
          <View style={styles.hostBadge}>
            <Ionicons name="star" size={10} color={tokenColors.white} />
            <Text style={styles.hostBadgeText}>Host</Text>
          </View>
        )}
        {isInviteOnly && (
          <View style={styles.inviteOnlyBadge}>
            <Ionicons name="lock-closed" size={12} color={tokenColors.gold} />
            <Text style={styles.inviteOnlyText}>Invite Only</Text>
          </View>
        )}
        {event.minPlayerRating != null && event.minPlayerRating > 0 && (
          <View
            style={[
              styles.skillBadge,
              { backgroundColor: getRatingBadgeColor(event.minPlayerRating) },
            ]}
          >
            <Text style={styles.skillText}>
              {event.minPlayerRating}+ RATING
            </Text>
          </View>
        )}
      </View>

      <View style={styles.header}>
        <View style={styles.sportInfo}>
          <Ionicons
            name={getSportIcon(event.sportType) as any}
            size={24}
            color={tokenColors.inkSecondary}
          />
          <Text style={styles.title} numberOfLines={1}>
            {event.title}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.participantsTracker,
          isFullyBooked && {
            backgroundColor: tokenColors.error + '15',
            borderColor: tokenColors.error + '30',
          },
        ]}
      >
        <Ionicons
          name="people"
          size={16}
          color={isFullyBooked ? tokenColors.error : tokenColors.cobalt}
        />
        <Text
          style={[
            styles.participantsText,
            isFullyBooked && styles.participantsFullText,
          ]}
        >
          {event.currentParticipants}/{event.maxParticipants} players
        </Text>
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {event.description}
      </Text>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Ionicons
            name="calendar-outline"
            size={16}
            color={tokenColors.inkSecondary}
          />
          <Text style={styles.detailText}>
            {formatDate(event.startTime)} at {formatTime(event.startTime)}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons
            name="hourglass-outline"
            size={16}
            color={tokenColors.inkSecondary}
          />
          <Text style={styles.detailText}>
            {(() => {
              const ms =
                new Date(event.endTime).getTime() -
                new Date(event.startTime).getTime();
              const totalMinutes = Math.round(ms / 60000);
              const hours = Math.floor(totalMinutes / 60);
              const minutes = totalMinutes % 60;
              if (hours === 0) return `${minutes}min`;
              if (minutes === 0) return `${hours}h`;
              return `${hours}h ${minutes}min`;
            })()}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons
            name="location-outline"
            size={16}
            color={tokenColors.inkSecondary}
          />
          <Text style={styles.detailText} numberOfLines={1}>
            {event.facility?.name || event.locationName || 'Location TBD'}
          </Text>
        </View>

        {event.rental && (
          <View style={styles.rentalIndicator}>
            <Ionicons name="calendar" size={14} color={tokenColors.cobalt} />
            <Text style={styles.rentalText} numberOfLines={1}>
              {event.rental.timeSlot.court.name}
            </Text>
          </View>
        )}

        {event.eligibility && (
          <View style={styles.detailRow}>
            <Ionicons
              name="shield-checkmark-outline"
              size={16}
              color={tokenColors.gold}
            />
            <Text style={styles.eligibilityText} numberOfLines={1}>
              {EventEligibilityService.getEligibilitySummary(
                event.eligibility,
                event.minPlayerRating
              ).join(', ')}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.price}>
          {event.price > 0 ? `${event.price.toFixed(2)}` : 'Free'}
        </Text>
        <View style={[styles.statusBadge, isFullyBooked && styles.fullBadge]}>
          <Text
            style={[styles.statusText, isFullyBooked && styles.fullStatusText]}
          >
            {isFullyBooked ? 'Full' : `${availableSpots} spots left`}
          </Text>
        </View>
      </View>

      {wasAutoOpened && (
        <View style={styles.autoOpenedBanner}>
          <Ionicons
            name="megaphone-outline"
            size={14}
            color={tokenColors.ink}
          />
          <Text style={styles.autoOpenedText}>
            Now open to public - was invite-only
          </Text>
        </View>
      )}
    </PressableCard>
  );
};

export const EventCard = React.memo(EventCardInner);

const styles = StyleSheet.create({
  container: {
    backgroundColor: tokenColors.surface,
    borderRadius: tokenRadius.lg,
    padding: tokenSpacing.lg,
    paddingRight: 90,
    marginVertical: 6,
    marginHorizontal: tokenSpacing.lg,
    position: 'relative' as const,
  },
  containerWithIndicator: {
    overflow: 'hidden' as const,
  },
  colorIndicatorStripe: {
    position: 'absolute' as const,
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: tokenRadius.lg,
    borderBottomLeftRadius: tokenRadius.lg,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: tokenSpacing.sm,
  },
  sportInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontFamily: tokenFontFamily.uiSemiBold,
    fontSize: 17,
    color: tokenColors.ink,
    marginLeft: tokenSpacing.sm,
    flex: 1,
  },
  participantsTracker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokenColors.cobaltLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: tokenRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: tokenSpacing.sm,
    borderWidth: 1,
    borderColor: tokenColors.cobalt + '40',
  },
  participantsText: {
    fontFamily: tokenFontFamily.uiSemiBold,
    fontSize: 13,
    color: tokenColors.cobalt,
    marginLeft: 6,
  },
  participantsFullText: {
    color: tokenColors.error,
  },
  inviteOnlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokenSpacing.sm,
    paddingVertical: tokenSpacing.xs,
    borderRadius: tokenRadius.md,
    backgroundColor: tokenColors.gold + '20',
    borderWidth: 1,
    borderColor: tokenColors.gold,
  },
  inviteOnlyText: {
    color: tokenColors.gold,
    fontFamily: tokenFontFamily.uiSemiBold,
    fontSize: 10,
    marginLeft: tokenSpacing.xs,
  },
  skillBadge: {
    paddingHorizontal: tokenSpacing.sm,
    paddingVertical: tokenSpacing.xs,
    borderRadius: tokenRadius.md,
  },
  skillText: {
    color: tokenColors.white,
    fontFamily: tokenFontFamily.uiSemiBold,
    fontSize: 10,
  },
  description: {
    fontFamily: tokenFontFamily.uiRegular,
    fontSize: 14,
    color: tokenColors.inkSecondary,
    lineHeight: 20,
    marginBottom: tokenSpacing.md,
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
    fontFamily: tokenFontFamily.uiRegular,
    fontSize: 14,
    color: tokenColors.inkSecondary,
    marginLeft: tokenSpacing.sm,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontFamily: tokenFontFamily.heading,
    fontSize: 18,
    color: tokenColors.cobalt,
  },
  statusBadge: {
    backgroundColor: tokenColors.successLight,
    paddingHorizontal: tokenSpacing.md,
    paddingVertical: 6,
    borderRadius: tokenRadius.lg,
  },
  fullBadge: {
    backgroundColor: tokenColors.errorLight,
  },
  statusText: {
    fontFamily: tokenFontFamily.uiSemiBold,
    fontSize: 12,
    color: tokenColors.success,
  },
  fullStatusText: {
    color: tokenColors.error,
  },
  eligibilityText: {
    fontFamily: tokenFontFamily.uiRegular,
    fontSize: 13,
    color: tokenColors.gold,
    marginLeft: tokenSpacing.sm,
    flex: 1,
  },
  rentalIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokenColors.cobalt + '10',
    paddingHorizontal: tokenSpacing.sm,
    paddingVertical: tokenSpacing.xs,
    borderRadius: tokenRadius.sm,
    marginTop: tokenSpacing.xs,
    borderWidth: 1,
    borderColor: tokenColors.cobalt + '30',
    alignSelf: 'flex-start',
  },
  rentalText: {
    fontFamily: tokenFontFamily.uiSemiBold,
    fontSize: 12,
    color: tokenColors.cobalt,
    marginLeft: 6,
  },
  autoOpenedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokenColors.background,
    paddingHorizontal: tokenSpacing.md,
    paddingVertical: 6,
    borderRadius: tokenRadius.sm,
    marginTop: tokenSpacing.sm,
  },
  autoOpenedText: {
    fontFamily: tokenFontFamily.uiRegular,
    fontSize: 12,
    color: tokenColors.ink,
    marginLeft: 6,
  },
  hostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokenColors.success,
    paddingHorizontal: tokenSpacing.sm,
    paddingVertical: 3,
    borderRadius: tokenRadius.pill,
    gap: tokenSpacing.xs,
  },
  hostBadgeText: {
    color: tokenColors.white,
    fontFamily: tokenFontFamily.uiSemiBold,
    fontSize: 10,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokenColors.goldLight,
    paddingHorizontal: tokenSpacing.sm,
    paddingVertical: 3,
    borderRadius: tokenRadius.pill,
    borderWidth: 1,
    borderColor: tokenColors.gold,
    gap: tokenSpacing.xs,
  },
  pendingBadgeText: {
    color: tokenColors.gold,
    fontFamily: tokenFontFamily.uiSemiBold,
    fontSize: 10,
  },
});
