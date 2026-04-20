import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme';
import { tokenColors } from '../../theme/tokens';
import { Booking } from '../../types';

interface UpcomingRowProps {
  bookings: Booking[];
  onPress: (booking: Booking) => void;
}

function formatDay(date: Date): {
  day: string;
  weekday: string;
  isToday: boolean;
  isTomorrow: boolean;
} {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((target.getTime() - today.getTime()) / 86400000);

  return {
    day: date.getDate().toString(),
    weekday:
      diffDays === 0
        ? 'Today'
        : diffDays === 1
          ? 'Tmrw'
          : date.toLocaleDateString('en-US', { weekday: 'short' }),
    isToday: diffDays === 0,
    isTomorrow: diffDays === 1,
  };
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function UpcomingRow({ bookings, onPress }: UpcomingRowProps) {
  if (bookings.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Coming Up</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {bookings.map(booking => {
          const event = booking.event;
          if (!event) return null;
          const startDate = new Date(event.startTime);
          const { day, weekday, isToday } = formatDay(startDate);

          return (
            <TouchableOpacity
              key={booking.id}
              style={[styles.card, isToday && styles.cardToday]}
              onPress={() => onPress(booking)}
              activeOpacity={0.85}
            >
              {/* Date chip */}
              <View style={[styles.dateChip, isToday && styles.dateChipToday]}>
                <Text
                  style={[styles.dateWeekday, isToday && styles.dateTextToday]}
                >
                  {weekday}
                </Text>
                <Text style={[styles.dateDay, isToday && styles.dateTextToday]}>
                  {day}
                </Text>
              </View>

              {/* Event info */}
              <Text style={styles.eventTitle} numberOfLines={2}>
                {event.title}
              </Text>
              <Text style={styles.eventTime}>{formatTime(startDate)}</Text>

              {(event.facility?.name || event.locationName) && (
                <View style={styles.locationRow}>
                  <Ionicons
                    name="location-outline"
                    size={12}
                    color={colors.outline}
                  />
                  <Text style={styles.locationText} numberOfLines={1}>
                    {event.facility?.name || event.locationName}
                  </Text>
                </View>
              )}

              {/* You're in badge */}
              <View style={styles.youreInBadge}>
                <Ionicons
                  name="checkmark-circle"
                  size={12}
                  color={colors.secondary}
                />
                <Text style={styles.youreInText}>You're in</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.onSurface,
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  scrollContent: {
    gap: 10,
    paddingRight: 4,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 14,
    width: 150,
    gap: 8,
    shadowColor: tokenColors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardToday: {
    backgroundColor: colors.primaryFixed,
  },
  dateChip: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dateChipToday: {
    backgroundColor: colors.primary,
  },
  dateWeekday: {
    fontFamily: fonts.label,
    fontSize: 9,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.8,
  },
  dateDay: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.onSurface,
    marginTop: -2,
  },
  dateTextToday: {
    color: tokenColors.white,
  },
  eventTitle: {
    fontFamily: fonts.headingSemi,
    fontSize: 14,
    color: colors.onSurface,
    letterSpacing: -0.1,
    lineHeight: 18,
  },
  eventTime: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  locationText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.outline,
    flex: 1,
  },
  youreInBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  youreInText: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.secondary,
  },
});
