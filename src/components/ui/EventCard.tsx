import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Event, SportType, SkillLevel } from '../../types';
import { EventEligibilityService } from '../../services/events/EventEligibilityService';
import { colors } from '../../theme';

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
    if (rating >= 50) return colors.court;
    return colors.pine;
  };

  const availableSpots = event.maxParticipants - event.currentParticipants;
  const isFullyBooked = availableSpots <= 0;
  const isInviteOnly = event.eligibility?.isInviteOnly && !event.eligibility?.wasAutoOpenedToPublic;
  const wasAutoOpened = event.eligibility?.wasAutoOpenedToPublic;

  return (
    <TouchableOpacity
      style={[styles.container, colorIndicator ? styles.containerWithIndicator : undefined, style]}
      onPress={() => onPress?.(event)}
      activeOpacity={0.7}
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
        {isHost && (
          <View style={styles.hostBadge}>
            <Ionicons name="star" size={10} color="#FFFFFF" />
            <Text style={styles.hostBadgeText}>Host</Text>
          </View>
        )}
        {isInviteOnly && (
          <View style={styles.inviteOnlyBadge}>
            <Ionicons name="lock-closed" size={12} color={colors.court} />
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
            color="#007AFF"
          />
          <Text style={styles.title} numberOfLines={1}>
            {event.title}
          </Text>
        </View>
      </View>

      <View style={[
        styles.participantsTracker,
        isFullyBooked && {
          backgroundColor: colors.heart + '15',
          borderColor: colors.heart + '30',
        }
      ]}>
        <Ionicons 
          name="people" 
          size={16} 
          color={isFullyBooked ? colors.heart : colors.pine} 
        />
        <Text style={[
          styles.participantsText,
          isFullyBooked && styles.participantsFullText
        ]}>
          {event.currentParticipants}/{event.maxParticipants} players
        </Text>
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {event.description}
      </Text>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color="#666" />
          <Text style={styles.detailText}>
            {formatDate(event.startTime)} at {formatTime(event.startTime)}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="hourglass-outline" size={16} color="#666" />
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
          <Ionicons name="location-outline" size={16} color="#666" />
          <Text style={styles.detailText} numberOfLines={1}>
            {event.facility?.name || 'Location TBD'}
          </Text>
        </View>

        {event.rental && (
          <View style={styles.rentalIndicator}>
            <Ionicons name="calendar" size={14} color={colors.pine} />
            <Text style={styles.rentalText} numberOfLines={1}>
              {event.rental.timeSlot.court.name}
            </Text>
          </View>
        )}

        {event.eligibility && (
          <View style={styles.detailRow}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#FF9500" />
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
          <Ionicons name="megaphone-outline" size={14} color={colors.navy} />
          <Text style={styles.autoOpenedText}>
            Now open to public - was invite-only
          </Text>
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
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
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
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
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  participantsTracker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.pine + '15',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.pine + '30',
  },
  participantsText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.pine,
    marginLeft: 6,
  },
  participantsFullText: {
    color: colors.heart,
  },
  inviteOnlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.court + '20',
    borderWidth: 1,
    borderColor: colors.court,
  },
  inviteOnlyText: {
    color: colors.court,
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  skillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  skillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#666',
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
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  fullText: {
    color: '#FF3B30',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
  },
  statusBadge: {
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  fullBadge: {
    backgroundColor: '#FFE8E8',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#34C759',
  },
  fullStatusText: {
    color: '#FF3B30',
  },
  eligibilityText: {
    fontSize: 13,
    color: '#FF9500',
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  rentalIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.pine + '10',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.pine + '30',
    alignSelf: 'flex-start',
  },
  rentalText: {
    fontSize: 12,
    color: colors.pine,
    marginLeft: 6,
    fontWeight: '600',
  },
  autoOpenedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.navy + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.navy + '30',
  },
  autoOpenedText: {
    fontSize: 12,
    color: colors.navy,
    marginLeft: 6,
    fontWeight: '600',
  },
  hostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8A030',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  hostBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
