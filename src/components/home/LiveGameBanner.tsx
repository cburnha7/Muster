import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { fonts, useTheme } from '../../theme';
import { getSportEmoji } from '../../constants/sports';
import type { Booking } from '../../types';

interface LiveGameBannerProps {
  booking: Booking;
  onPress: (booking: Booking) => void;
}

function minutesAgo(startTime: Date): number {
  return Math.floor((Date.now() - new Date(startTime).getTime()) / 60000);
}

export function LiveGameBanner({ booking, onPress }: LiveGameBannerProps) {
  const { colors } = useTheme();
  const pulseAnim = useRef(new Animated.Value(0.3)).current;
  const event = booking.event;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  if (!event) return null;

  const mins = minutesAgo(event.startTime);
  const emoji = getSportEmoji(event.sportType);

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.errorLight, borderColor: colors.error }]}
      onPress={() => onPress(booking)}
      activeOpacity={0.85}
    >
      <View style={[styles.liveLabel, { backgroundColor: colors.error }]}>
        <Animated.View style={[styles.liveDot, { backgroundColor: colors.white }, { opacity: pulseAnim }]} />
        <Text style={[styles.liveText, { color: colors.white }]}>LIVE</Text>
      </View>
      <View style={styles.info}>
        <Text
          style={[styles.title, { color: colors.ink }, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {emoji} {event.title}
        </Text>
        <Text
          style={[styles.meta, { color: colors.inkSecondary }, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {event.facility?.name || event.locationName || 'Game'} Â· Started{' '}
          {mins}m ago
        </Text>
      </View>
      <Text style={[styles.arrow, { color: colors.inkSecondary }]}>â†’</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 10,
    borderWidth: 1,
  },
  liveLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveText: {
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 1,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: fonts.headingSemi,
    fontSize: 14,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 12,
  },
  arrow: {
    fontFamily: fonts.body,
    fontSize: 18,
  },
});
