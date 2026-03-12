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
}

export const EventCard: React.FC<EventCardProps> = ({ event, onPress, style, compact = false }) => {
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
        return 'tennisball-outline';
      case SportType.VOLLEYBALL:
        return 'american-football-outline';
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

  const availableSpots = event.maxParticipants - event.currentParticipants;
  const isFullyBooked = availableSpots <= 0;

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={() => onPress?.(event)}
      activeOpacity={0.7}
    >
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
        <View
          style={[
            styles.skillBadge,
            { backgroundColor: getSkillLevelColor(event.skillLevel) },
          ]}
        >
          <Text style={styles.skillText}>
            {event.skillLevel.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
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
          <Ionicons name="location-outline" size={16} color="#666" />
          <Text style={styles.detailText} numberOfLines={1}>
            {event.facility?.name || 'Location TBD'}
          </Text>
        </View>

        {event.rental && (
          <View style={styles.rentalIndicator}>
            <Ionicons name="calendar" size={14} color={colors.grass} />
            <Text style={styles.rentalText} numberOfLines={1}>
              {event.rental.timeSlot.court.name}
            </Text>
          </View>
        )}

        <View style={styles.detailRow}>
          <Ionicons name="people-outline" size={16} color="#666" />
          <Text style={[styles.detailText, isFullyBooked && styles.fullText]}>
            {event.currentParticipants}/{event.maxParticipants} participants
          </Text>
        </View>

        {event.eligibility && (
          <View style={styles.detailRow}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#FF9500" />
            <Text style={styles.eligibilityText} numberOfLines={1}>
              {EventEligibilityService.getEligibilitySummary(event.eligibility).join(', ')}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.price}>
          {event.price > 0 ? `$${event.price}` : 'Free'}
        </Text>
        <View style={[styles.statusBadge, isFullyBooked && styles.fullBadge]}>
          <Text style={[styles.statusText, isFullyBooked && styles.fullStatusText]}>
            {isFullyBooked ? 'Full' : `${availableSpots} spots left`}
          </Text>
        </View>
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
    alignItems: 'center',
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
    backgroundColor: colors.grass + '10',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.grass + '30',
    alignSelf: 'flex-start',
  },
  rentalText: {
    fontSize: 12,
    color: colors.grass,
    marginLeft: 6,
    fontWeight: '600',
  },
});