import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { colors, fonts, useTheme } from '../../theme';
import { tokenColors } from '../../theme/tokens';
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
  const { colors: themeColors } = useTheme();
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
      style={styles.container}
      onPress={() => onPress(booking)}
      activeOpacity={0.85}
    >
      <View style={styles.liveLabel}>
        <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
        <Text style={styles.liveText}>LIVE</Text>
      </View>
      <View style={styles.info}>
        <Text
          style={[styles.title, { color: themeColors.textPrimary }]}
          numberOfLines={1}
        >
          {emoji} {event.title}
        </Text>
        <Text
          style={[styles.meta, { color: themeColors.textSecondary }]}
          numberOfLines={1}
        >
          {event.facility?.name || event.locationName || 'Game'} · Started{' '}
          {mins}m ago
        </Text>
      </View>
      <Text style={styles.arrow}>→</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokenColors.errorLight,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: tokenColors.error,
  },
  liveLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: tokenColors.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: tokenColors.white,
  },
  liveText: {
    fontFamily: fonts.label,
    fontSize: 10,
    color: tokenColors.white,
    letterSpacing: 1,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: fonts.headingSemi,
    fontSize: 14,
    color: colors.onSurface,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  arrow: {
    fontFamily: fonts.body,
    fontSize: 18,
    color: colors.onSurfaceVariant,
  },
});
