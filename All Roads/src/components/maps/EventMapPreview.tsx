import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Event, SportType } from '../../types';
import { colors, Spacing, TextStyles } from '../../theme';

interface EventMapPreviewProps {
  event: Event;
  onPress: () => void;
  onClose: () => void;
}

export function EventMapPreview({ event, onPress, onClose }: EventMapPreviewProps) {
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

  const formatDateTime = (date: Date) => {
    const eventDate = new Date(date);
    return {
      date: eventDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      time: eventDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
    };
  };

  const dateTime = formatDateTime(event.startTime);

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Ionicons name="close" size={24} color={colors.soft} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.content} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.header}>
          <Ionicons
            name={getSportIcon(event.sportType) as any}
            size={24}
            color={colors.grass}
          />
          <Text style={styles.title} numberOfLines={1}>
            {event.title}
          </Text>
        </View>

        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.soft} />
            <Text style={styles.detailText}>
              {dateTime.date} at {dateTime.time}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color={colors.soft} />
            <Text style={styles.detailText} numberOfLines={1}>
              {event.facility?.name || 'Location TBD'}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.viewButton}>View Details →</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: colors.background,
    borderRadius: 12,
    shadowColor: colors.ink,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
    padding: 4,
  },
  content: {
    padding: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingRight: 32,
  },
  title: {
    ...TextStyles.h4,
    color: colors.ink,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  details: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  detailText: {
    ...TextStyles.body,
    color: colors.soft,
    flex: 1,
  },
  footer: {
    alignItems: 'flex-end',
  },
  viewButton: {
    ...TextStyles.bodyLarge,
    color: colors.grass,
    fontWeight: '600',
  },
});
