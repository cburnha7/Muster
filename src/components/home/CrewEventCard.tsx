import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, useTheme } from '../../theme';
import { Booking } from '../../types';

interface CrewEventCardProps {
  booking: Booking;
  crewColor: string;
  onPress: (booking: Booking) => void;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDay(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.floor((target.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** Lighten a hex color to ~15% opacity feel for card background */
function tintColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * 0.85);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

function CrewEventCardInner({
  booking,
  crewColor,
  onPress,
}: CrewEventCardProps) {
  const { colors: themeColors } = useTheme();
  const event = booking.event;
  if (!event) return null;

  const start = new Date(event.startTime);
  const bg = tintColor(crewColor);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: bg, borderLeftColor: crewColor }]}
      onPress={() => onPress(booking)}
      activeOpacity={0.85}
    >
      <View style={styles.row}>
        <View style={styles.info}>
          <Text
            style={[styles.title, { color: themeColors.textPrimary }]}
            numberOfLines={1}
          >
            {event.title}
          </Text>
          <Text style={[styles.meta, { color: themeColors.textSecondary }]}>
            {formatDay(start)} · {formatTime(start)}
          </Text>
          {(event.facility?.name || event.locationName) && (
            <View style={styles.locRow}>
              <Ionicons
                name="location-outline"
                size={12}
                color={colors.inkSoft}
              />
              <Text style={styles.locText} numberOfLines={1}>
                {event.facility?.name || event.locationName}
              </Text>
            </View>
          )}
        </View>
        <View style={[styles.dot, { backgroundColor: crewColor }]} />
      </View>
    </TouchableOpacity>
  );
}

export const CrewEventCard = React.memo(CrewEventCardInner);

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  info: { flex: 1, gap: 3 },
  title: {
    fontFamily: fonts.headingSemi || fonts.heading,
    fontSize: 15,
    color: colors.ink,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkSoft,
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 1,
  },
  locText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkSoft,
    flex: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 10,
  },
});
