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

  const canSubmit = !isReadonly && salutedIds.size >= minSalutes;

  const handleSubmit = async () => {
    if (!details || !canSubmit) return;
    try {
      setSubmitting(true);
      await debriefService.submitDebrief(
        eventId,
        Array.from(salutedIds),
        facilityRating > 0 ? facilityRating : undefined
      );
      Alert.alert('Debrief Submitted', 'Thanks for the feedback!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit debrief');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.grass} />
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
                {p.profileImage ? (
                  <Image source={{ uri: p.profileImage }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitials}>{getInitials(p)}</Text>
                  </View>
                )}
                <Text style={styles.participantName} numberOfLines={1}>
                  {isSaluted ? '🫡 ' : ''}{p.firstName} {p.lastName?.[0]}.
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
                ? `${details.event.facility.name}`
                : `Rate ${details.event.facility.name}`}
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
                    color={star <= facilityRating ? colors.court : colors.inkFaint}
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

      {/* Submit Button — only in interactive mode */}
      {!isReadonly && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>
                {canSubmit ? 'Submit Debrief' : `Salute ${minSalutes - salutedIds.size} more`}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.chalk },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.chalk },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.chalk,
  },
  backButton: { marginRight: Spacing.md },
  headerText: { flex: 1 },
  title: { fontSize: 20, fontWeight: '700', color: colors.ink },
  subtitle: { fontSize: 14, color: colors.inkFaint, marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, paddingBottom: 100 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.ink, marginBottom: Spacing.md },
  participantsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    borderColor: colors.court,
    backgroundColor: colors.court + '10',
  },
  avatar: { width: 56, height: 56, borderRadius: 28, marginBottom: Spacing.sm },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.grass,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  avatarInitials: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  participantName: { fontSize: 13, color: colors.ink, textAlign: 'center' },
  ratingSection: { marginBottom: Spacing.xl },
  ratingHint: { fontSize: 13, color: colors.inkFaint, marginBottom: Spacing.md },
  starsRow: { flexDirection: 'row', gap: Spacing.sm },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    backgroundColor: colors.chalk,
    borderTopWidth: 1,
    borderTopColor: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: colors.grass,
    borderRadius: 12,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  submitButtonDisabled: { backgroundColor: colors.inkFaint },
  submitButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
