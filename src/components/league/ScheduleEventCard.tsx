import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScheduleEvent } from '../../store/slices/scheduleSlice';
import { RosterInfo } from '../../types/scheduling';
import { fonts, Spacing, Shadows, useTheme } from '../../theme';

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
    timeZone: 'UTC',
  });
};

const formatTime = (isoString: string): string => {
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  });
};

export const ScheduleEventCard: React.FC<ScheduleEventCardProps> = ({
  event,
  rosters,
  onEdit,
  onRemove,
}) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.surface }]}
      onPress={() => onEdit(event)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${event.homeRosterName} vs ${event.awayRosterName}, ${formatDate(event.scheduledAt)} at ${formatTime(event.scheduledAt)}`}
    >
      {/* Flag badge */}
      {event.flag && (
        <View style={[styles.flagBadge, { backgroundColor: colors.gold }]}>
          <Text style={[styles.flagText, { color: colors.white }]}>
            {event.flag === 'playoffs' ? 'Playoffs' : 'Tournament'}
          </Text>
        </View>
      )}

      {/* Roster matchup */}
      <View style={styles.matchup}>
        <Text style={[styles.rosterName, { color: colors.ink }]} numberOfLines={1}>
          {event.homeRosterName}
        </Text>
        <Text style={[styles.vs, { color: colors.inkFaint }]}>vs</Text>
        <Text style={[styles.rosterName, { color: colors.ink }]} numberOfLines={1}>
          {event.awayRosterName}
        </Text>
      </View>

      {/* Date and time */}
      <View style={styles.dateTimeRow}>
        <View style={styles.dateTimeItem}>
          <Ionicons name="calendar-outline" size={14} color={colors.inkFaint} />
          <Text style={[styles.dateTimeText, { color: colors.inkFaint }]}>
            {formatDate(event.scheduledAt)}
          </Text>
        </View>
        <View style={styles.dateTimeItem}>
          <Ionicons name="time-outline" size={14} color={colors.inkFaint} />
          <Text style={[styles.dateTimeText, { color: colors.inkFaint }]}>
            {formatTime(event.scheduledAt)}
          </Text>
        </View>
      </View>

      {/* Remove button */}
      <TouchableOpacity
        style={[styles.removeButton, { backgroundColor: colors.heart + '12' }]}
        onPress={() => onRemove(event.id)}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        accessibilityRole="button"
        accessibilityLabel="Remove event"
      >
        <Ionicons name="trash-outline" size={22} color={colors.heart} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: Spacing.lg,
    marginVertical: Spacing.sm,
    marginHorizontal: Spacing.lg,
    ...Shadows.md,
  },
  flagBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
    marginBottom: Spacing.md,
  },
  flagText: {
    fontFamily: fonts.label,
    fontSize: 11,
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
    flex: 1,
  },
  vs: {
    fontFamily: fonts.body,
    fontSize: 13,
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
  },
  removeButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
