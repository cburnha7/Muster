import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, Spacing } from '../../theme';
import { salute as saluteConstants } from '../../theme/brand';
import { debriefService, DebriefParticipant, DebriefDetails } from '../../services/api/DebriefService';
import { SaluteOverlay } from '../../components/SaluteOverlay';

export function DebriefScreen(): JSX.Element {
  const navigation = useNavigation();
  const route = useRoute();
  const { eventId, readonly: readonlyParam } = route.params as {
    eventId: string;
    readonly?: boolean;
  };

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
      setDetails(data);
      setSalutedIds(new Set(data.salutedUserIds));

      // Auto-detect readonly: already submitted OR past 24h window
      const endTime = new Date(data.event.endTime);
      const hoursSinceEnd = (Date.now() - endTime.getTime()) / (1000 * 60 * 60);
      if (readonlyParam || data.debriefSubmitted || hoursSinceEnd > saluteConstants.windowHours) {
        setIsReadonly(true);
      }
      if (data.debriefSubmitted) {
        setHasSubmitted(true);
      }

      // Pre-fill facility rating from server if already submitted
      if (data.facilityRating != null) {
        setFacilityRating(data.facilityRating);
      }
    } catch (err) {
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

    // Guard: give clear feedback if minimum salutes not met
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
      Alert.alert('Debrief Submitted', 'Thanks for the feedback!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      const message =
        err?.details?.error ||
        err?.message ||
        'Failed to submit debrief';
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.cobalt} />
      </View>
    );
  }

  if (!details) return null;

  const getInitials = (p: DebriefParticipant) =>
    `${p.firstName?.[0] || ''}${p.lastName?.[0] || ''}`.toUpperCase();

  const salutedCount = salutedIds.size;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>
            {isReadonly ? 'Debrief Summary' : 'Debrief'}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>{details.event.title}</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Participants */}
        <Text style={styles.sectionTitle}>
          {isReadonly
            ? `Players (${salutedCount} saluted)`
            : `Salute your fellow players (${salutedCount}/${minSalutes} min)`}
        </Text>
        <View style={styles.participantsGrid}>
          {details.participants.map((p) => {
            const isSaluted = salutedIds.has(p.id);
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.participantCard, isSaluted && styles.participantCardSaluted]}
                onPress={() => toggleSalute(p.id)}
                activeOpacity={isReadonly ? 1 : 0.7}
                disabled={isReadonly}
              >
                <SaluteOverlay saluted={isSaluted} size={56}>
                  {p.profileImage ? (
                    <Image source={{ uri: p.profileImage }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarInitials}>{getInitials(p)}</Text>
                    </View>
                  )}
                </SaluteOverlay>
                <Text style={styles.participantName} numberOfLines={1}>
                  {p.firstName} {p.lastName?.[0]}.
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Facility Rating */}
        {details.event.facilityId && details.event.facility && (
          <View style={styles.ratingSection}>
            <Text style={styles.sectionTitle}>
              {isReadonly
                ? `${details.event.facility?.name || 'the venue'}`
                : `Rate ${details.event.facility?.name || 'the venue'}`}
            </Text>
            {!isReadonly && <Text style={styles.ratingHint}>Optional</Text>}
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => {
                    if (!isReadonly) {
                      setFacilityRating(star === facilityRating ? 0 : star);
                    }
                  }}
                  disabled={isReadonly}
                  activeOpacity={isReadonly ? 1 : 0.7}
                >
                  <Ionicons
                    name={star <= facilityRating ? 'star' : 'star-outline'}
                    size={36}
                    color={star <= facilityRating ? colors.gold : colors.inkFaint}
                  />
                </TouchableOpacity>
              ))}
            </View>
            {isReadonly && facilityRating === 0 && (
              <Text style={styles.ratingHint}>No rating submitted</Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Footer button */}
      {hasSubmitted ? (
        <View style={styles.footer}>
          <View style={[styles.submitButton, styles.submitButtonDisabled]}>
            <Text style={styles.submitButtonText}>Submitted</Text>
          </View>
        </View>
      ) : !isReadonly ? (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={canSubmit ? 'Submit Debrief' : `Salute ${salutesNeeded} more players`}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>
                {canSubmit ? 'Submit Debrief' : `Salute ${salutesNeeded} more`}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  backButton: { marginRight: Spacing.md },
  headerText: { flex: 1 },
  title: { fontSize: 20, fontWeight: '700', color: colors.ink },
  subtitle: { fontSize: 14, color: colors.inkFaint, marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, paddingBottom: 100, alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.ink, marginBottom: Spacing.md, textAlign: 'center', alignSelf: 'stretch' },
  participantsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  participantCard: {
    width: '30%',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  participantCardSaluted: {
    borderColor: colors.gold,
    backgroundColor: colors.gold + '10',
  },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.cobalt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  participantName: { fontSize: 13, color: colors.ink, textAlign: 'center', marginTop: Spacing.sm },
  ratingSection: { marginBottom: Spacing.xl, alignItems: 'center', alignSelf: 'stretch' },
  ratingHint: { fontSize: 13, color: colors.inkFaint, marginBottom: Spacing.md, textAlign: 'center' },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: colors.cobalt,
    borderRadius: 12,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  submitButtonDisabled: { backgroundColor: colors.inkFaint },
  submitButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
