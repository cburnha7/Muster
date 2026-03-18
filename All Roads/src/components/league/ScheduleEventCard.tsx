import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScheduleEvent } from '../../store/slices/scheduleSlice';
import { RosterInfo } from '../../types/scheduling';
import { colors, fonts, Spacing, Shadows } from '../../theme';

export interface ScheduleEventCardProps {
  event: ScheduleEvent;
  rosters: RosterInfo[];
  onEdit: (event: ScheduleEvent) => void;
  onRemove: (eventId: string) => void;
}

const formatDate = (isoString: string): string => {
  return new Date(isoString).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

const formatTime = (isoString: string): string => {
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export const ScheduleEventCard: React.FC<ScheduleEventCardProps> = ({
  event,
  rosters,
  onEdit,
  onRemove,
}) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onEdit(event)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${event.homeRosterName} vs ${event.awayRosterName}, ${formatDate(event.scheduledAt)} at ${formatTime(event.scheduledAt)}`}
    >
      {/* Flag badge */}
      {event.flag && (
        <View style={styles.flagBadge}>
          <Text style={styles.flagText}>
            {event.flag === 'playoffs' ? 'Playoffs' : 'Tournament'}
          </Text>
        </View>
      )}

      {/* Roster matchup */}
      <View style={styles.matchup}>
        <Text style={styles.rosterName} numberOfLines={1}>
          {event.homeRosterName}
        </Text>
        <Text style={styles.vs}>vs</Text>
        <Text style={styles.rosterName} numberOfLines={1}>
          {event.awayRosterName}
        </Text>
      </View>

      {/* Date and time */}
      <View style={styles.dateTimeRow}>
        <View style={styles.dateTimeItem}>
          <Ionicons name="calendar-outline" size={14} color={colors.inkFaint} />
          <Text style={styles.dateTimeText}>{formatDate(event.scheduledAt)}</Text>
        </View>
        <View style={styles.dateTimeItem}>
          <Ionicons name="time-outline" size={14} color={colors.inkFaint} />
          <Text style={styles.dateTimeText}>{formatTime(event.scheduledAt)}</Text>
        </View>
      </View>

      {/* Remove button */}
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => onRemove(event.id)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Remove event"
      >
        <Ionicons name="trash-outline" size={18} color={colors.track} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};


const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: Spacing.lg,
    marginVertical: Spacing.sm,
    marginHorizontal: Spacing.lg,
    ...Shadows.md,
  },
  flagBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.court,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
    marginBottom: Spacing.md,
  },
  flagText: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  matchup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  rosterName: {
    fontFamily: fonts.ui,
    fontSize: 16,
    color: colors.ink,
    flex: 1,
  },
  vs: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkFaint,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  dateTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  dateTimeText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkFaint,
  },
  removeButton: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg,
  },
});
