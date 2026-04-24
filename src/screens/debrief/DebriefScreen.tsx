import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, useTheme } from '../../theme';
import { salute as saluteConstants } from '../../theme/brand';
import {
  debriefService,
  DebriefParticipant,
  DebriefDetails,
} from '../../services/api/DebriefService';
import { useSelector } from 'react-redux';
import { selectUser } from '../../store/slices/authSlice';
import { eventService } from '../../services/api/EventService';
import { notificationsEventBus } from '../../utils/notificationsEventBus';

export function DebriefScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const user = useSelector(selectUser);
  const { eventId, readonly: readonlyParam } =
    (route.params as {
      eventId: string;
      readonly?: boolean;
    }) ?? {};

  const [details, setDetails] = useState<DebriefDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [salutedIds, setSalutedIds] = useState<Set<string>>(new Set());
  const [facilityRating, setFacilityRating] = useState<number>(0);
  const [isReadonly, setIsReadonly] = useState(readonlyParam ?? false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    loadDetails();
  }, [eventId]);

  const loadDetails = async () => {
    try {
      setLoading(true);
      const data = await debriefService.getDebriefDetails(eventId);

      // If the backend returned no participants, try loading them from the event API
      if ((!data.participants || data.participants.length === 0) && user?.id) {
        try {
          const eventParticipants = await eventService.getEventParticipants(
            eventId,
            true
          );
          const participants: DebriefParticipant[] = (
            eventParticipants.participants || []
          )
            .filter((p: any) => p.userId !== user.id)
            .map((p: any) => ({
              id: p.userId || p.user?.id || p.id,
              firstName: p.user?.firstName || p.firstName || '?',
              lastName: p.user?.lastName || p.lastName || '',
              profileImage: p.user?.profileImage || p.profileImage,
              saluted: (data.salutedUserIds || []).includes(
                p.userId || p.user?.id || p.id
              ),
            }));
          data.participants = participants;
        } catch {
          // Non-fatal — keep whatever the debrief endpoint returned
        }
      }

      setDetails(data);
      setSalutedIds(new Set(data.salutedUserIds || []));

      const endTime = new Date(data.event.endTime);
      const hoursSinceEnd = (Date.now() - endTime.getTime()) / (1000 * 60 * 60);
      if (
        readonlyParam ||
        data.debriefSubmitted ||
        hoursSinceEnd > saluteConstants.windowHours
      ) {
        setIsReadonly(true);
      }
      if (data.debriefSubmitted) {
        setHasSubmitted(true);
      }
      if (data.facilityRating != null) {
        setFacilityRating(data.facilityRating);
      }
    } catch {
      Alert.alert('Error', 'Failed to load debrief details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const toggleSalute = (userId: string) => {
    if (isReadonly) return;
    setSalutedIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        if (next.size >= saluteConstants.maxPerGame) return prev;
        next.add(userId);
      }
      return next;
    });
  };

  const minSalutes = details
    ? Math.min(saluteConstants.maxPerGame, details.participants.length)
    : saluteConstants.maxPerGame;

  const salutesNeeded = minSalutes - salutedIds.size;
  const canSubmit = !isReadonly && salutesNeeded <= 0;

  const handleSubmit = async () => {
    if (!details) return;
    if (salutedIds.size < minSalutes) {
      Alert.alert(
        'More Salutes Needed',
        `Please salute at least ${minSalutes} player${minSalutes === 1 ? '' : 's'} before submitting.`
      );
      return;
    }
    try {
      setSubmitting(true);
      await debriefService.submitDebrief(
        eventId,
        Array.from(salutedIds),
        facilityRating > 0 ? facilityRating : undefined
      );
      setHasSubmitted(true);
      setIsReadonly(true);
      notificationsEventBus.emit();
      Alert.alert('Debrief Submitted', 'Thanks for the feedback!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      const message =
        err?.details?.error || err?.message || 'Failed to submit debrief';
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.centered, { backgroundColor: colors.bgScreen }]}
      >
        <ActivityIndicator size="large" color={colors.pine} />
      </SafeAreaView>
    );
  }

  if (!details) return null;

  const getInitials = (p: DebriefParticipant) =>
    `${p.firstName?.[0] || ''}${p.lastName?.[0] || ''}`.toUpperCase();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bgScreen }]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.ink }]} numberOfLines={1}>
          {details.event.title}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Participants */}
        <Text style={[styles.sectionTitle, { color: colors.ink }]}>
          {isReadonly
            ? `Players (${salutedIds.size} saluted)`
            : `Salute your fellow players (${salutedIds.size}/${minSalutes} min)`}
        </Text>

        {details.participants.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={32} color={colors.inkFaint} />
            <Text style={[styles.emptyText, { color: colors.inkSoft }]}>
              No other players found for this event.
            </Text>
          </View>
        ) : (
          <View style={styles.participantsGrid}>
            {details.participants.map(p => {
              const isSaluted = salutedIds.has(p.id);
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.participantCard,
                    { borderColor: isSaluted ? colors.gold : colors.border },
                    isSaluted && { backgroundColor: colors.gold + '12' },
                  ]}
                  onPress={() => toggleSalute(p.id)}
                  activeOpacity={isReadonly ? 1 : 0.7}
                  disabled={isReadonly}
                >
                  {/* Photo fills the card */}
                  {p.profileImage ? (
                    <Image
                      source={{ uri: p.profileImage }}
                      style={styles.cardPhoto}
                    />
                  ) : (
                    <View
                      style={[
                        styles.cardPhoto,
                        styles.cardPhotoPlaceholder,
                        { backgroundColor: colors.cobalt },
                      ]}
                    >
                      <Text
                        style={[styles.cardInitials, { color: colors.white }]}
                      >
                        {getInitials(p)}
                      </Text>
                    </View>
                  )}

                  {/* Salute badge — large, bright, overlaid on photo */}
                  {isSaluted && (
                    <View style={styles.saluteBadge}>
                      <Text style={styles.saluteEmoji}>🫡</Text>
                    </View>
                  )}

                  {/* Name below photo */}
                  <Text
                    style={[styles.participantName, { color: colors.ink }]}
                    numberOfLines={1}
                  >
                    {p.firstName} {p.lastName?.[0]}.
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Facility Rating */}
        {details.event.facilityId && details.event.facility && (
          <View style={styles.ratingSection}>
            <Text style={[styles.sectionTitle, { color: colors.ink }]}>
              {isReadonly
                ? `${details.event.facility.name || 'the venue'}`
                : `Rate ${details.event.facility.name || 'the venue'}`}
            </Text>
            {!isReadonly && (
              <Text style={[styles.ratingHint, { color: colors.inkFaint }]}>
                Optional
              </Text>
            )}
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity
                  key={star}
                  onPress={() => {
                    if (!isReadonly)
                      setFacilityRating(star === facilityRating ? 0 : star);
                  }}
                  disabled={isReadonly}
                  activeOpacity={isReadonly ? 1 : 0.7}
                >
                  <Ionicons
                    name={star <= facilityRating ? 'star' : 'star-outline'}
                    size={36}
                    color={
                      star <= facilityRating ? colors.gold : colors.inkFaint
                    }
                  />
                </TouchableOpacity>
              ))}
            </View>
            {isReadonly && facilityRating === 0 && (
              <Text style={[styles.ratingHint, { color: colors.inkFaint }]}>
                No rating submitted
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Footer button */}
      {hasSubmitted ? (
        <View
          style={[
            styles.footer,
            { backgroundColor: colors.bgCard, borderTopColor: colors.border },
          ]}
        >
          <View
            style={[
              styles.submitButton,
              { backgroundColor: colors.pine },
              styles.submitButtonDisabled,
            ]}
          >
            <Text style={[styles.submitButtonText, { color: colors.white }]}>
              Submitted
            </Text>
          </View>
        </View>
      ) : !isReadonly ? (
        <View
          style={[
            styles.footer,
            { backgroundColor: colors.bgCard, borderTopColor: colors.border },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: canSubmit ? colors.cobalt : colors.inkFaint },
            ]}
            onPress={handleSubmit}
            disabled={submitting || !canSubmit}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={
              canSubmit
                ? 'Submit Debrief'
                : `Salute ${salutesNeeded} more players`
            }
          >
            {submitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={[styles.submitButtonText, { color: colors.white }]}>
                {canSubmit ? 'Submit Debrief' : `Salute ${salutesNeeded} more`}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 22,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 120 },
  sectionTitle: {
    fontFamily: fonts.headingSemi || fonts.heading,
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 40,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 15,
    textAlign: 'center',
  },
  participantsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 32,
  },
  participantCard: {
    width: '30%',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 2,
    overflow: 'hidden',
  },
  cardPhoto: {
    width: '100%',
    aspectRatio: 1,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  cardPhotoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInitials: {
    fontFamily: fonts.ui,
    fontSize: 24,
  },
  saluteBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 28, // leave room for name
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 160, 23, 0.25)',
  },
  saluteEmoji: {
    fontSize: 36,
  },
  participantName: {
    fontFamily: fonts.body,
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  ratingSection: { marginBottom: 32, alignItems: 'center' },
  ratingHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    borderTopWidth: 1,
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    fontFamily: fonts.ui,
    fontSize: 16,
  },
});
