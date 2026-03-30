import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Event, SportType, SkillLevel } from '../../types';
import { EventEligibilityService } from '../../services/events/EventEligibilityService';
import { colors, fonts } from '../../theme';

interface EventCardProps {
  event: Event;
  onPress?: (event: Event) => void;
  style?: any;
  compact?: boolean;
  isHost?: boolean | undefined;
  colorIndicator?: string;
}


export const EventCard: React.FC<EventCardProps> = ({ event, onPress, style, compact = false, isHost, colorIndicator }) => {
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
      case SportType.BASKETBALL: return 'basketball-outline';
      case SportType.SOCCER: return 'football-outline';
      case SportType.TENNIS:
      case SportType.PICKLEBALL: return 'tennisball-outline';
      case SportType.VOLLEYBALL: return 'american-football-outline';
      case SportType.SOFTBALL:
      case SportType.BASEBALL: return 'baseball-outline';
      case SportType.FLAG_FOOTBALL: return 'flag-outline';
      case SportType.KICKBALL: return 'football-outline';
      default: return 'fitness-outline';
    }
  };

  const getSkillLevelColor = (skillLevel: SkillLevel) => {
    switch (skillLevel) {
      case SkillLevel.BEGINNER: return '#34C759';
      case SkillLevel.INTERMEDIATE: return colors.gold;
      case SkillLevel.ADVANCED: return colors.error;
      default: return colors.primary;
    }
  };

  const getRatingBadgeColor = (rating: number) => {
    if (rating >= 80) return colors.heart;
    if (rating >= 50) return colors.gold;
    return colors.primary;
  };

  const availableSpots = event.maxParticipants - event.currentParticipants;
  const isFullyBooked = availableSpots <= 0;
  const isInviteOnly = event.eligibility?.isInviteOnly && !event.eligibility?.wasAutoOpenedToPublic;
  const wasAutoOpened = event.eligibility?.wasAutoOpenedToPublic;

  return (
    <TouchableOpacity
      style={[styles.container, colorIndicator ? styles.containerWithIndicator : undefined, style]}
      onPress={() => onPress?.(event)}
      activeOpacity={0.85}
    >
      {colorIndicator && (
        <View style={[styles.colorIndicatorStripe, { backgroundColor: colorIndicator }]} />
      )}
      {/* Bubble stack — top-right, vertical */}
      <View style={styles.bubbleStack}>
        {isHost && (
          <View style={styles.hostBadge}>
            <Ionicons name="star" size={10} color="#FFFFFF" />
            <Text style={styles.hostBadgeText}>Host</Text>
          </View>
        )}
        {isInviteOnly && (
          <View style={styles.inviteOnlyBadge}>
            <Ionicons name="lock-closed" size={12} color={colors.gold} />
            <Text style={styles.inviteOnlyText}>Invite Only</Text>
          </View>
        )}
        {event.minPlayerRating != null && event.minPlayerRating > 0 && (
          <View style={[styles.skillBadge, { backgroundColor: getRatingBadgeColor(event.minPlayerRating) }]}>
            <Text style={styles.skillText}>{event.minPlayerRating}+ RATING</Text>
          </View>
        )}
      </View>

      <View style={styles.header}>
        <View style={styles.sportInfo}>
          <Ionicons name={getSportIcon(event.sportType) as any} size={24} color={colors.primary} />
          <Text style={styles.title} numberOfLines={1}>{event.title}</Text>
        </View>
      </View>

      <View style={[
        styles.participantsTracker,
        isFullyBooked && { backgroundColor: colors.error + '15', borderColor: colors.error + '30' }
      ]}>
        <Ionicons name="people" size={16} color={isFullyBooked ? colors.error : colors.primary} />
        <Text style={[styles.participantsText, isFullyBooked && styles.participantsFullText]}>
          {event.currentParticipants}/{event.maxParticipants} players
        </Text>
      </View>

      <Text style={styles.description} numberOfLines={2}>{event.description}</Text>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color={colors.onSurfaceVariant} />
          <Text style={styles.detailText}>
            {formatDate(event.startTime)} at {formatTime(event.startTime)}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="hourglass-outline" size={16} color={colors.onSurfaceVariant} />
          <Text style={styles.detailText}>
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

        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={16} color={colors.onSurfaceVariant} />
          <Text style={styles.detailText} numberOfLines={1}>
            {event.facility?.name || 'Location TBD'}
          </Text>
        </View>

        {event.rental && (
          <View style={styles.rentalIndicator}>
            <Ionicons name="calendar" size={14} color={colors.primary} />
            <Text style={styles.rentalText} numberOfLines={1}>{event.rental.timeSlot.court.name}</Text>
          </View>
        )}

        {event.eligibility && (
          <View style={styles.detailRow}>
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.gold} />
            <Text style={styles.eligibilityText} numberOfLines={1}>
              {EventEligibilityService.getEligibilitySummary(event.eligibility, event.minPlayerRating).join(', ')}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.price}>
          {event.price > 0 ? `$${event.price.toFixed(2)}` : 'Free'}
        </Text>
        <View style={[styles.statusBadge, isFullyBooked && styles.fullBadge]}>
          <Text style={[styles.statusText, isFullyBooked && styles.fullStatusText]}>
            {isFullyBooked ? 'Full' : `${availableSpots} spots left`}
          </Text>
        </View>
      </View>

      {wasAutoOpened && (
        <View style={styles.autoOpenedBanner}>
          <Ionicons name="megaphone-outline" size={14} color={colors.onSurface} />
          <Text style={styles.autoOpenedText}>Now open to public - was invite-only</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    paddingRight: 90,
    marginVertical: 6,
    marginHorizontal: 16,
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
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  sportInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontFamily: fonts.headingSemi,
    fontSize: 17,
    color: colors.onSurface,
    marginLeft: 8,
    flex: 1,
  },
  participantsTracker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  participantsText: {
    fontFamily: fonts.label,
    fontSize: 13,
    color: colors.primary,
    marginLeft: 6,
  },
  participantsFullText: {
    color: colors.error,
  },
  inviteOnlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.gold + '20',
    borderWidth: 1,
    borderColor: colors.gold,
  },
  inviteOnlyText: {
    color: colors.gold,
    fontFamily: fonts.label,
    fontSize: 10,
    marginLeft: 4,
  },
  skillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  skillText: {
    color: '#FFFFFF',
    fontFamily: fonts.label,
    fontSize: 10,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: 12,
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
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.primary,
  },
  statusBadge: {
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  fullBadge: {
    backgroundColor: colors.error + '15',
  },
  statusText: {
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.secondary,
  },
  fullStatusText: {
    color: colors.error,
  },
  eligibilityText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.gold,
    marginLeft: 8,
    flex: 1,
  },
  rentalIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    alignSelf: 'flex-start',
  },
  rentalText: {
    fontFamily: fonts.label,
    fontSize: 12,
    color: colors.primary,
    marginLeft: 6,
  },
  autoOpenedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
  },
  autoOpenedText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.onSurface,
    marginLeft: 6,
  },
  hostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    gap: 4,
  },
  hostBadgeText: {
    color: '#FFFFFF',
    fontFamily: fonts.label,
    fontSize: 10,
  },
});
