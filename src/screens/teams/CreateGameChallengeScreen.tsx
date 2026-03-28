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
import { gameChallengeService } from '../../services/api/GameChallengeService';
import { TeamsStackParamList } from '../../navigation/types';

type CreateGameChallengeRouteProp = RouteProp<
  TeamsStackParamList,
  'CreateGameChallenge'
>;

interface RosterOption {
  id: string;
  name: string;
  sportType: string;
  imageUrl?: string | null;
}

interface FacilityOption {
  id: string;
  name: string;
  street: string;
  city: string;
}

interface CourtOption {
  id: string;
  name: string;
  sportType: string;
}

interface TimeSlotOption {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  price: number;
}

type Step = 'opponent' | 'facility' | 'court' | 'timeslot' | 'review';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

export const CreateGameChallengeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<CreateGameChallengeRouteProp>();
  const user = useSelector(selectUser);
  const { challengerRosterId } = route.params;

  const [step, setStep] = useState<Step>('opponent');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Selection state
  const [rosters, setRosters] = useState<RosterOption[]>([]);
  const [facilities, setFacilities] = useState<FacilityOption[]>([]);
  const [courts, setCourts] = useState<CourtOption[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlotOption[]>([]);

  const [selectedOpponent, setSelectedOpponent] = useState<RosterOption | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<FacilityOption | null>(null);
  const [selectedCourt, setSelectedCourt] = useState<CourtOption | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlotOption | null>(null);

  // Load rosters (excluding the challenger's own roster)
  const loadRosters = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/teams?limit=100`);
      const json = await res.json();
      const allRosters: RosterOption[] = (json.data || json || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        sportType: t.sportType,
        imageUrl: t.imageUrl,
      }));
      setRosters(allRosters.filter((r) => r.id !== challengerRosterId));
    } catch {
      Alert.alert('Error', 'Failed to load rosters');
    } finally {
      setLoading(false);
    }
  }, [challengerRosterId]);

  // Load facilities with Stripe Connect onboarding
  const loadFacilities = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/facilities?limit=100`);
      const json = await res.json();
      const allFacilities: FacilityOption[] = (json.data || json || [])
        .filter((f: any) => f.stripeConnectAccountId)
        .map((f: any) => ({
          id: f.id,
          name: f.name,
          street: f.street,
          city: f.city,
        }));
      setFacilities(allFacilities);
    } catch {
      Alert.alert('Error', 'Failed to load facilities');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load courts for selected facility
  const loadCourts = useCallback(async (facilityId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/facilities/${facilityId}/courts`);
      const json = await res.json();
      const activeCourts: CourtOption[] = (json.data || json || [])
        .filter((c: any) => c.isActive)
        .map((c: any) => ({
          id: c.id,
          name: c.name,
          sportType: c.sportType,
        }));
      setCourts(activeCourts);
    } catch {
      Alert.alert('Error', 'Failed to load courts');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load available time slots for selected court
  const loadTimeSlots = useCallback(async (courtId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/courts/${courtId}/timeslots?status=available&upcoming=true`);
      const json = await res.json();
      const slots: TimeSlotOption[] = (json.data || json || []).map((s: any) => ({
        id: s.id,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        price: s.price,
      }));
      setTimeSlots(slots);
    } catch {
      Alert.alert('Error', 'Failed to load time slots');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (step === 'opponent') loadRosters();
  }, [step, loadRosters]);

  useEffect(() => {
    if (step === 'facility') loadFacilities();
  }, [step, loadFacilities]);

  useEffect(() => {
    if (step === 'court' && selectedFacility) loadCourts(selectedFacility.id);
  }, [step, selectedFacility, loadCourts]);

  useEffect(() => {
    if (step === 'timeslot' && selectedCourt) loadTimeSlots(selectedCourt.id);
  }, [step, selectedCourt, loadTimeSlots]);

  const handleNext = () => {
    const steps: Step[] = ['opponent', 'facility', 'court', 'timeslot', 'review'];
    const idx = steps.indexOf(step);
    const next = steps[idx + 1];
    if (idx < steps.length - 1 && next) setStep(next);
  };

  const handleBack = () => {
    const steps: Step[] = ['opponent', 'facility', 'court', 'timeslot', 'review'];
    const idx = steps.indexOf(step);
    const prev = steps[idx - 1];
    if (idx > 0 && prev) {
      setStep(prev);
    } else {
      navigation.goBack();
    }
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 'opponent': return !!selectedOpponent;
      case 'facility': return !!selectedFacility;
      case 'court': return !!selectedCourt;
      case 'timeslot': return !!selectedTimeSlot;
      case 'review': return true;
      default: return false;
    }
  };

  const handleSubmit = async () => {
    if (!user?.id || !selectedOpponent || !selectedFacility || !selectedCourt || !selectedTimeSlot) return;

    setSubmitting(true);
    try {
      await gameChallengeService.createChallenge({
        userId: user.id,
        challengerRosterId,
        opponentRosterId: selectedOpponent.id,
        facilityId: selectedFacility.id,
        courtId: selectedCourt.id,
        timeSlotId: selectedTimeSlot.id,
      });
      Alert.alert('Challenge Sent', `Your game challenge has been sent to ${selectedOpponent.name}. They have 48 hours to respond.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create game challenge.';
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (time: string) => {
    const parts = time.split(':');
    const h = parseInt(parts[0] ?? '0', 10);
    const minutes = parts[1] ?? '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const stepTitle = (): string => {
    switch (step) {
      case 'opponent': return 'Select Opponent Roster';
      case 'facility': return 'Select Facility';
      case 'court': return 'Select Court';
      case 'timeslot': return 'Select Time Slot';
      case 'review': return 'Review Challenge';
      default: return 'Game Challenge';
    }
  };

  const renderStepIndicator = () => {
    const steps: Step[] = ['opponent', 'facility', 'court', 'timeslot', 'review'];
    const currentIdx = steps.indexOf(step);
    return (
      <View style={styles.stepIndicator}>
        {steps.map((s, i) => (
          <View
            key={s}
            style={[
              styles.stepDot,
              i <= currentIdx && styles.stepDotActive,
            ]}
          />
        ))}
      </View>
    );
  };

  const renderSelectionCard = (
    item: { id: string; primary: string; secondary?: string },
    isSelected: boolean,
    onPress: () => void,
  ) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.selectionCard, isSelected && styles.selectionCardSelected]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={item.primary}
    >
      <View style={styles.selectionCardHeader}>
        <Ionicons
          name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={isSelected ? colors.pine : colors.inkFaint}
        />
        <Text style={styles.selectionPrimary}>{item.primary}</Text>
      </View>
      {item.secondary ? (
        <Text style={styles.selectionSecondary}>{item.secondary}</Text>
      ) : null}
    </TouchableOpacity>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.pine} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      );
    }

    switch (step) {
      case 'opponent':
        return rosters.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={40} color={colors.inkFaint} />
            <Text style={styles.emptyText}>No rosters available</Text>
          </View>
        ) : (
          rosters.map((r) =>
            renderSelectionCard(
              { id: r.id, primary: r.name, secondary: r.sportType },
              selectedOpponent?.id === r.id,
              () => setSelectedOpponent(r),
            ),
          )
        );

      case 'facility':
        return facilities.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="location-outline" size={40} color={colors.inkFaint} />
            <Text style={styles.emptyText}>No facilities available</Text>
            <Text style={styles.emptySubtext}>
              Facilities must complete Stripe onboarding to be available for challenges.
            </Text>
          </View>
        ) : (
          facilities.map((f) =>
            renderSelectionCard(
              { id: f.id, primary: f.name, secondary: `${f.street}, ${f.city}` },
              selectedFacility?.id === f.id,
              () => {
                setSelectedFacility(f);
                setSelectedCourt(null);
                setSelectedTimeSlot(null);
              },
            ),
          )
        );

      case 'court':
        return courts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="grid-outline" size={40} color={colors.inkFaint} />
            <Text style={styles.emptyText}>No courts available</Text>
          </View>
        ) : (
          courts.map((c) =>
            renderSelectionCard(
              { id: c.id, primary: c.name, secondary: c.sportType },
              selectedCourt?.id === c.id,
              () => {
                setSelectedCourt(c);
                setSelectedTimeSlot(null);
              },
            ),
          )
        );

      case 'timeslot':
        return timeSlots.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={40} color={colors.inkFaint} />
            <Text style={styles.emptyText}>No available time slots</Text>
          </View>
        ) : (
          timeSlots.map((s) =>
            renderSelectionCard(
              {
                id: s.id,
                primary: `${formatDate(s.date)} · ${formatTime(s.startTime)} – ${formatTime(s.endTime)}`,
                secondary: `$${s.price.toFixed(2)} total · $${(s.price / 2).toFixed(2)} per roster`,
              },
              selectedTimeSlot?.id === s.id,
              () => setSelectedTimeSlot(s),
            ),
          )
        );

      case 'review':
        return (
          <View style={styles.reviewContainer}>
            <ReviewRow label="OPPONENT ROSTER" value={selectedOpponent?.name ?? ''} />
            <ReviewRow label="FACILITY" value={selectedFacility?.name ?? ''} />
            <ReviewRow label="COURT" value={selectedCourt?.name ?? ''} />
            <ReviewRow
              label="TIME SLOT"
              value={
                selectedTimeSlot
                  ? `${formatDate(selectedTimeSlot.date)} · ${formatTime(selectedTimeSlot.startTime)} – ${formatTime(selectedTimeSlot.endTime)}`
                  : ''
              }
            />
            <ReviewRow
              label="COURT COST"
              value={selectedTimeSlot ? `$${selectedTimeSlot.price.toFixed(2)}` : ''}
            />
            <ReviewRow
              label="YOUR SHARE (50%)"
              value={selectedTimeSlot ? `$${(selectedTimeSlot.price / 2).toFixed(2)}` : ''}
              highlight
            />
            <Text style={styles.reviewNote}>
              The opponent roster manager will have 48 hours to accept this challenge.
              Both rosters will be charged 50% of the court cost upon acceptance.
            </Text>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={stepTitle()}
        leftIcon="arrow-back"
        onLeftPress={handleBack}
      />
      {renderStepIndicator()}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {renderContent()}
      </ScrollView>
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleBack}
          accessibilityRole="button"
        >
          <Text style={styles.cancelButtonText}>
            {step === 'opponent' ? 'Cancel' : 'Back'}
          </Text>
        </TouchableOpacity>
        {step === 'review' ? (
          <TouchableOpacity
            style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            testID="submit-challenge"
            accessibilityRole="button"
            accessibilityState={{ disabled: submitting }}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Send Challenge</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.primaryButton, !canProceed() && styles.primaryButtonDisabled]}
            onPress={handleNext}
            disabled={!canProceed()}
            testID="next-step"
            accessibilityRole="button"
            accessibilityState={{ disabled: !canProceed() }}
          >
            <Text style={styles.primaryButtonText}>Next</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const ReviewRow: React.FC<{ label: string; value: string; highlight?: boolean }> = ({
  label,
  value,
  highlight,
}) => (
  <View style={styles.reviewRow}>
    <Text style={styles.reviewLabel}>{label}</Text>
    <Text style={[styles.reviewValue, highlight && styles.reviewValueHighlight]}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.inkFaint,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.inkFaint,
    opacity: 0.3,
  },
  stepDotActive: {
    backgroundColor: colors.pine,
    opacity: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  emptyText: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    color: colors.ink,
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.inkFaint,
    textAlign: 'center',
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.xxl,
  },
  selectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectionCardSelected: {
    borderColor: colors.pine,
  },
  selectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectionPrimary: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    color: colors.ink,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  selectionSecondary: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkFaint,
    marginLeft: Spacing.xxxl,
    marginTop: Spacing.xs,
  },
  reviewContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: Spacing.lg,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  reviewLabel: {
    fontFamily: fonts.label,
    fontSize: 11,
    letterSpacing: 1.6,
    color: colors.inkFaint,
    textTransform: 'uppercase',
  },
  reviewValue: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.ink,
    textAlign: 'right',
    flex: 1,
    marginLeft: Spacing.md,
  },
  reviewValueHighlight: {
    color: colors.pine,
  },
  reviewNote: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkFaint,
    marginTop: Spacing.lg,
    lineHeight: 20,
  },
  bottomBar: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    marginRight: Spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.inkFaint,
  },
  cancelButtonText: {
    fontFamily: fonts.ui,
    fontSize: 15,
    color: colors.ink,
  },
  primaryButton: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: 8,
    backgroundColor: colors.pine,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontFamily: fonts.ui,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
