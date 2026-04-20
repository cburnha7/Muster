import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, useTheme } from '../../theme';
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
  if (hours < 24)
    return `In ${hours}h ${mins % 60 > 0 ? `${mins % 60}m` : ''}`.trim();
  if (days === 1) return 'Tomorrow';
  if (days < 7) {
  const { colors } = useTheme();
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    return dayName;
  }
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function getTimeString(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function isLive(booking: Booking): boolean {
  if (!booking.event?.startTime || !booking.event?.endTime) return false;
  const now = new Date();
  return (
    new Date(booking.event.startTime) <= now &&
    now <= new Date(booking.event.endTime)
  );
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
        colors={
          live
            ? [colors.pine, '#004D23']
            : [colors.cobalt, colors.cobaltMid]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Top row: badge + relative time */}
        <View style={styles.topRow}>
          <View style={styles.badge}>
            {live && <View style={[styles.liveDot, { backgroundColor: colors.successLight }]} />}
            <Text style={[styles.badgeText, { color: colors.white }]}>{live ? 'LIVE' : 'NEXT UP'}</Text>
          </View>
          <Text style={styles.relativeTime}>{relativeTime}</Text>
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: colors.white }]} numberOfLines={2}>
          {event.title}
        </Text>

        {/* Details row */}
        <View style={styles.detailsRow}>
          {(event.facility?.name || event.locationName) && (
            <View style={styles.detail}>
              <Ionicons
                name="location-outline"
                size={15}
                color="rgba(255,255,255,0.7)"
              />
              <Text style={styles.detailText} numberOfLines={1}>
                {event.facility?.name || event.locationName}
              </Text>
            </View>
          )}
          <View style={styles.detail}>
            <Ionicons
              name="time-outline"
              size={15}
              color="rgba(255,255,255,0.7)"
            />
            <Text style={styles.detailText}>{timeStr}</Text>
          </View>
        </View>

        {/* Bottom row: participants + avatars + arrow */}
        <View style={styles.bottomRow}>
          <View style={styles.participantCol}>
            <View style={styles.participantInfo}>
              <Ionicons
                name="people-outline"
                size={15}
                color="rgba(255,255,255,0.7)"
              />
              <Text style={styles.participantText}>
                {event.currentParticipants}/{event.maxParticipants} players
              </Text>
            </View>
            {/* Avatar stack */}
            {event.participants && event.participants.length > 0 && (
              <View style={styles.avatarRow}>
                {event.participants.slice(0, 4).map((p, i) => (
                  <View
                    key={p.userId}
                    style={[styles.avatarCircle, i > 0 && { marginLeft: -6 }]}
                  >
                    {p.user?.profileImage ? (
                      <Image
                        source={{ uri: p.user.profileImage }}
                        style={styles.avatarImg}
                      />
                    ) : (
                      <Text style={[styles.avatarInitial, { color: colors.white }]}>
                        {p.user?.firstName?.charAt(0) ?? '?'}
                      </Text>
                    )}
                  </View>
                ))}
                {event.participants.length > 4 && (
                  <View
                    style={[
                      styles.avatarCircle,
                      {
                        marginLeft: -6,
                        backgroundColor: 'rgba(255,255,255,0.3)',
                      },
                    ]}
                  >
                    <Text style={[styles.avatarInitial, { color: colors.white }]}>
                      +{event.participants.length - 4}
                    </Text>
                  </View>
                )}
              </View>
            )}
            {spotsLeft > 0 && spotsLeft <= 3 && (
              <Text style={styles.fillingFast}>
                Filling fast Ã¢â‚¬â€ {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left
              </Text>
            )}
          </View>
          <View style={[styles.arrowCircle, { backgroundColor: colors.white }]}>
            <Ionicons
              name="arrow-forward"
              size={16}
              color={live ? colors.pine : colors.cobalt}
            />
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
  },
  badgeText: {
    fontFamily: fonts.label,
    fontSize: 11,
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
    alignItems: 'flex-end',
    marginTop: 2,
  },
  participantCol: {
    gap: 6,
    flex: 1,
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
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  avatarImg: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  avatarInitial: {
    fontFamily: fonts.label,
    fontSize: 9,
  },
  fillingFast: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: '#FCD34D',
    letterSpacing: 0.2,
  },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
