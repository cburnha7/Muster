import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { FormInput } from '../forms/FormInput';
import { FormSelect } from '../forms/FormSelect';
import { FormButton } from '../forms/FormButton';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { facilityService } from '../../services/api/FacilityService';
import { fonts, Spacing, useTheme } from '../../theme';
import type { PenaltyDestination } from '../../types';

interface CancellationPolicyFormProps {
  facilityId: string;
  onSaved?: () => void;
}

interface FormErrors {
  noticeWindowHours?: string;
  teamPenaltyPct?: string;
  penaltyDestination?: string;
}

const PENALTY_DESTINATION_OPTIONS = [
  { label: 'Facility keeps penalty', value: 'facility' },
  { label: 'Opposing roster receives penalty', value: 'opposing_team' },
  { label: 'Split between facility and opposing roster', value: 'split' },
];

export function CancellationPolicyForm({
  facilityId,
  onSaved,
}: CancellationPolicyFormProps) {
  const { colors } = useTheme();
  const [noticeWindowHours, setNoticeWindowHours] = useState('');
  const [teamPenaltyPct, setTeamPenaltyPct] = useState('');
  const [penaltyDestination, setPenaltyDestination] = useState<
    PenaltyDestination | ''
  >('');
  const [policyVersion, setPolicyVersion] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPolicy();
  }, [facilityId]);

  const loadPolicy = async () => {
    try {
      setLoading(true);
      const policy = await facilityService.getCancellationPolicy(facilityId);
      if (policy.hasPolicy) {
        setNoticeWindowHours(String(policy.noticeWindowHours));
        setTeamPenaltyPct(String(policy.teamPenaltyPct));
        setPenaltyDestination(policy.penaltyDestination);
        setPolicyVersion(policy.policyVersion);
      }
    } catch (error) {
      console.error('Failed to load cancellation policy:', error);
    } finally {
      setLoading(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!noticeWindowHours.trim()) {
      newErrors.noticeWindowHours = 'Notice window is required';
    } else {
      const hours = parseInt(noticeWindowHours, 10);
      if (isNaN(hours) || hours < 0 || !Number.isInteger(hours)) {
        newErrors.noticeWindowHours = 'Must be a non-negative whole number';
      }
    }

    if (!teamPenaltyPct.trim()) {
      newErrors.teamPenaltyPct = 'Penalty percentage is required';
    } else {
      const pct = parseInt(teamPenaltyPct, 10);
      if (isNaN(pct) || pct < 0 || pct > 100 || !Number.isInteger(pct)) {
        newErrors.teamPenaltyPct = 'Must be a whole number between 0 and 100';
      }
    }

    if (!penaltyDestination) {
      newErrors.penaltyDestination = 'Penalty destination is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      setSaving(true);
      const result = await facilityService.updateCancellationPolicy(
        facilityId,
        {
          noticeWindowHours: parseInt(noticeWindowHours, 10),
          teamPenaltyPct: parseInt(teamPenaltyPct, 10),
          penaltyDestination: penaltyDestination as PenaltyDestination,
        }
      );
      setPolicyVersion(result.policyVersion);
      Alert.alert(
        'Saved',
        'Cancellation policy updated. This applies to future bookings only.'
      );
      onSaved?.();
    } catch (error) {
      console.error('Failed to save cancellation policy:', error);
      Alert.alert(
        'Error',
        'Failed to save cancellation policy. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Info banner */}
        <View style={styles.infoBanner}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={colors.ink}
          />
          <Text style={styles.infoText}>
            Your cancellation policy is required before your facility can appear
            in booking flows. Changes only apply to future bookings.
          </Text>
        </View>

        <FormInput
          label="Notice Window (hours)"
          placeholder="e.g. 24"
          value={noticeWindowHours}
          onChangeText={setNoticeWindowHours}
          keyboardType="number-pad"
          error={errors.noticeWindowHours}
          required
        />
        <Text style={styles.fieldHint}>
          Hours before game start that a roster can cancel without penalty.
        </Text>

        <FormInput
          label="Penalty Percentage"
          placeholder="e.g. 50"
          value={teamPenaltyPct}
          onChangeText={setTeamPenaltyPct}
          keyboardType="number-pad"
          error={errors.teamPenaltyPct}
          required
        />
        <Text style={styles.fieldHint}>
          Percentage (0Ã¢â‚¬â€œ100) of the cancelling roster's escrow that is forfeited
          for late cancellations.
        </Text>

        <FormSelect
          label="Penalty Destination"
          placeholder="Where does the penalty go?"
          value={penaltyDestination}
          options={PENALTY_DESTINATION_OPTIONS}
          onValueChange={val =>
            setPenaltyDestination(val as PenaltyDestination)
          }
          error={errors.penaltyDestination}
          required
        />
        <Text style={styles.fieldHint}>
          Who receives the forfeited amount when a roster cancels late.
        </Text>

        {policyVersion && (
          <Text style={styles.versionText}>
            Last updated: {new Date(policyVersion).toLocaleDateString()}
          </Text>
        )}

        <FormButton
          title={saving ? 'Saving...' : 'Save Policy'}
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          variant="primary"
          size="large"
          style={styles.saveButton}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.massive,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: colors.cobaltLight,
    borderRadius: 8,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.ink,
    lineHeight: 20,
  },
  fieldHint: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.inkFaint,
    marginTop: -8,
    marginBottom: Spacing.lg,
    paddingHorizontal: 2,
  },
  versionText: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.inkFaint,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  saveButton: {
    marginTop: Spacing.md,
  },
});
