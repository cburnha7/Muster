import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts } from '../../theme';
import { Booking } from '../../types';

interface NextUpCardProps {
  booking: Booking;
  onPress: (booking: Booking) => void;
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (diff < 0) return 'Happening now';
  if (mins < 1) return 'Starting now';
  if (mins < 60) return `In ${mins} min`;
  if (hours < 24) return `In ${hours}h ${mins % 60 > 0 ? `${mins % 60}m` : ''}`.trim();
  if (days === 1) return 'Tomorrow';
  if (days < 7) {
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    return dayName;
  }
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getTimeString(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function isLive(booking: Booking): boolean {
  if (!booking.event?.startTime || !booking.event?.endTime) return false;
  const now = new Date();
  return new Date(booking.event.startTime) <= now && now <= new Date(booking.event.endTime);
}

export function NextUpCard({ booking, onPress }: NextUpCardProps) {
  const event = booking.event;
  if (!event) return null;

  const startDate = new Date(event.startTime);
  const live = isLive(booking);
  const relativeTime = live ? 'Happening now' : getRelativeTime(startDate);
  const timeStr = getTimeString(startDate);
  const spotsLeft = event.maxParticipants - event.currentParticipants;

  return (
    <TouchableOpacity onPress={() => onPress(booking)} activeOpacity={0.9}>
      <LinearGradient
        colors={live ? ['#006D32', '#004D23'] : ['#0052FF', '#003EC7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Top row: badge + relative time */}
        <View style={styles.topRow}>
          <View style={styles.badge}>
            {live && <View style={styles.liveDot} />}
            <Text style={styles.badgeText}>
              {live ? 'LIVE' : 'NEXT UP'}
            </Text>
          </View>
          <Text style={styles.relativeTime}>{relativeTime}</Text>
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>{event.title}</Text>

        {/* Details row */}
        <View style={styles.detailsRow}>
          {event.facility?.name && (
            <View style={styles.detail}>
              <Ionicons name="location-outline" size={15} color="rgba(255,255,255,0.7)" />
              <Text style={styles.detailText} numberOfLines={1}>{event.facility.name}</Text>
            </View>
          )}
          <View style={styles.detail}>
            <Ionicons name="time-outline" size={15} color="rgba(255,255,255,0.7)" />
            <Text style={styles.detailText}>{timeStr}</Text>
          </View>
        </View>

        {/* Bottom row: participants + arrow */}
        <View style={styles.bottomRow}>
          <View style={styles.participantInfo}>
            <Ionicons name="people-outline" size={15} color="rgba(255,255,255,0.7)" />
            <Text style={styles.participantText}>
              {event.currentParticipants}/{event.maxParticipants} players
              {spotsLeft > 0 && spotsLeft <= 3 && (
                <Text style={styles.spotsText}> ({spotsLeft} left)</Text>
              )}
            </Text>
          </View>
          <View style={styles.arrowCircle}>
            <Ionicons name="arrow-forward" size={16} color={live ? '#006D32' : '#0052FF'} />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    gap: 14,
  },

  // Top
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#55FD8C',
  },
  badgeText: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  relativeTime: {
    fontFamily: fonts.headingSemi,
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },

  // Title
  title: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },

  // Details
  detailsRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  detailText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    flexShrink: 1,
  },

  // Bottom
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  participantText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  spotsText: {
    color: '#55FD8C',
  },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
