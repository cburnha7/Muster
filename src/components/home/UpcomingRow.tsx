import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, useTheme } from '../../theme';
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
  const { colors } = useTheme();
  if (bookings.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.ink }]}>Coming Up</Text>
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
              style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.ink }, isToday && styles.cardToday, isToday && { backgroundColor: colors.cobaltLight }]}
              onPress={() => onPress(booking)}
              activeOpacity={0.85}
            >
              {/* Date chip */}
              <View style={[styles.dateChip, { backgroundColor: colors.border }, isToday && styles.dateChipToday, isToday && { backgroundColor: colors.cobalt }]}>
                <Text
                  style={[styles.dateWeekday, { color: colors.inkSecondary }, isToday && styles.dateTextToday, isToday && { color: colors.white }]}
                >
                  {weekday}
                </Text>
                <Text style={[styles.dateDay, { color: colors.ink }, isToday && styles.dateTextToday, isToday && { color: colors.white }]}>
                  {day}
                </Text>
              </View>

              {/* Event info */}
              <Text style={[styles.eventTitle, { color: colors.ink }]} numberOfLines={2}>
                {event.title}
              </Text>
              <Text style={[styles.eventTime, { color: colors.inkSecondary }]}>{formatTime(startDate)}</Text>

              {(event.facility?.name || event.locationName) && (
                <View style={styles.locationRow}>
                  <Ionicons
                    name="location-outline"
                    size={12}
                    color={colors.inkSecondary}
                  />
                  <Text style={[styles.locationText, { color: colors.inkSecondary }]} numberOfLines={1}>
                    {event.facility?.name || event.locationName}
                  </Text>
                </View>
              )}

              {/* You're in badge */}
              <View style={styles.youreInBadge}>
                <Ionicons
                  name="checkmark-circle"
                  size={12}
                  color={colors.pine}
                />
                <Text style={[styles.youreInText, { color: colors.pine }]}>You're in</Text>
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
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  scrollContent: {
    gap: 10,
    paddingRight: 4,
  },
  card: {
    borderRadius: 16,
    padding: 14,
    width: 150,
    gap: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardToday: {},
  dateChip: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dateChipToday: {},
  dateWeekday: {
    fontFamily: fonts.label,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  dateDay: {
    fontFamily: fonts.heading,
    fontSize: 16,
    marginTop: -2,
  },
  dateTextToday: {},
  eventTitle: {
    fontFamily: fonts.headingSemi,
    fontSize: 14,
    letterSpacing: -0.1,
    lineHeight: 18,
  },
  eventTime: {
    fontFamily: fonts.body,
    fontSize: 13,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  locationText: {
    fontFamily: fonts.body,
    fontSize: 12,
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
  },
});
