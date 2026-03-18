import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { selectUser } from '../../store/slices/authSlice';
import { colors, fonts, Spacing } from '../../theme';
import { publicEventService, PublicEventResponse } from '../../services/api/PublicEventService';

type PublicEventDetailRouteProp = RouteProp<{ PublicEventDetail: { bookingId: string } }, 'PublicEventDetail'>;

export const PublicEventDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<PublicEventDetailRouteProp>();
  const user = useSelector(selectUser);
  const { bookingId } = route.params;

  const [event, setEvent] = useState<PublicEventResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await publicEventService.getEvent(bookingId);
      setEvent(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load event');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  const isAlreadyRegistered = event?.participants.some(
    (p) => p.rosterId === user?.id && p.role === 'participant',
  );

  const isHost = event?.participants.some(
    (p) => p.rosterId === user?.id && p.role === 'host',
  );

  const attendeeCount = event?.participants.filter((p) => p.role === 'participant').length ?? 0;

  const handleJoinUp = async () => {
    if (!user?.id || !event) return;

    Alert.alert(
      'Join',
      `You'll be charged $${(event.perPersonPrice ?? 0).toFixed(2)} to join this event. Funds are held until the event is confirmed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Join',
          onPress: async () => {
            try {
              setRegistering(true);
              await publicEventService.registerForEvent(bookingId, { userId: user.id });
              Alert.alert('Joined!', 'You have successfully joined this event.');
              fetchEvent();
            } catch (err: any) {
              const message = err.response?.data?.error || err.message || 'Failed to join event';
              Alert.alert('Error', message);
            } finally {
              setRegistering(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Event Details" showBack onBackPress={() => navigation.goBack()} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.grass} />
        </View>
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Event Details" showBack onBackPress={() => navigation.goBack()} />
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.track} />
          <Text style={styles.errorText}>{error || 'Event not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchEvent}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const canJoinUp = !isAlreadyRegistered && !isHost && event.status === 'pending';
  const isFacilityCancelled = event.status === 'facility_cancelled';

  return (
    <View style={styles.container}>
      <ScreenHeader title="Event Details" showBack onBackPress={() => navigation.goBack()} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {isFacilityCancelled && (
          <View style={styles.cancelledBanner}>
            <Ionicons name="close-circle" size={20} color={colors.track} />
            <Text style={styles.cancelledBannerText}>
              This event was cancelled by the facility. All attendees have been refunded in full.
            </Text>
          </View>
        )}
        <View style={styles.card}>
          <Text style={styles.heading}>{event.facility?.name}</Text>
          <Text style={styles.subheading}>{event.court?.name} — {event.court?.sportType}</Text>

          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={18} color={colors.inkFaint} />
            <Text style={styles.detailText}>
              {event.facility?.street}, {event.facility?.city}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>${(event.perPersonPrice ?? 0).toFixed(2)}</Text>
              <Text style={styles.statLabel}>Per Person</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{attendeeCount}</Text>
              <Text style={styles.statLabel}>Joined</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{event.minAttendeeCount ?? 0}</Text>
              <Text style={styles.statLabel}>Min Needed</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.statusRow}>
            <View style={[
              styles.statusBadge,
              event.status === 'pending' ? styles.statusPending :
              isFacilityCancelled ? styles.statusCancelled :
              styles.statusConfirmed,
            ]}>
              <Text style={styles.statusText}>
                {event.status === 'pending' ? 'Awaiting Players' :
                 isFacilityCancelled ? 'Cancelled by Facility' :
                 event.status}
              </Text>
            </View>
            {isAlreadyRegistered && (
              <View style={[styles.statusBadge, styles.statusJoined]}>
                <Text style={styles.statusText}>Joined</Text>
              </View>
            )}
            {isHost && (
              <View style={[styles.statusBadge, styles.statusHost]}>
                <Text style={styles.statusText}>Host</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.rosterLabel}>Hosted by {event.roster?.name}</Text>
      </ScrollView>

      {canJoinUp && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.joinButton, registering && styles.joinButtonDisabled]}
            onPress={handleJoinUp}
            disabled={registering}
            accessibilityRole="button"
            accessibilityLabel="Join for this event"
          >
            {registering ? (
              <ActivityIndicator size="small" color={colors.chalk} />
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={20} color={colors.chalk} />
                <Text style={styles.joinButtonText}>Join</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.chalkWarm,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  heading: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.ink,
    marginBottom: 4,
  },
  subheading: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.inkFaint,
    marginBottom: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.xs,
  },
  detailText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
  },
  divider: {
    height: 1,
    backgroundColor: colors.chalkWarm,
    marginVertical: Spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.ink,
  },
  statLabel: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPending: {
    backgroundColor: colors.court + '20',
  },
  statusConfirmed: {
    backgroundColor: colors.grass + '20',
  },
  statusCancelled: {
    backgroundColor: colors.track + '20',
  },
  statusJoined: {
    backgroundColor: colors.grass + '20',
  },
  statusHost: {
    backgroundColor: colors.sky + '20',
  },
  statusText: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  rosterLabel: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
    textAlign: 'center',
  },
  cancelledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.track + '15',
    borderRadius: 10,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  cancelledBannerText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.track,
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.track,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: colors.grass,
    borderRadius: 8,
  },
  retryButtonText: {
    fontFamily: fonts.ui,
    fontSize: 15,
    color: colors.chalk,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    backgroundColor: colors.chalkWarm,
    borderTopWidth: 1,
    borderTopColor: colors.chalk,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.grass,
    paddingVertical: 14,
    borderRadius: 10,
  },
  joinButtonDisabled: {
    opacity: 0.6,
  },
  joinButtonText: {
    fontFamily: fonts.ui,
    fontSize: 17,
    color: colors.chalk,
  },
});
