import React from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Switch,
  StyleSheet,
} from 'react-native';
import { CancellationPolicyPicker } from '../../../components/facilities/CancellationPolicyPicker';
import { useCreateFacility } from './CreateFacilityContext';
import { colors, fonts, Spacing } from '../../../theme';

export function Step5Policies() {
  const { state, dispatch } = useCreateFacility();

  const setField = (field: string, value: any) =>
    dispatch({ type: 'SET_FIELD', field, value });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.heading}>Policies and waivers</Text>

      {/* Cancellation Policy */}
      <CancellationPolicyPicker
        value={state.cancellationPolicyHours}
        onChange={(v) => setField('cancellationPolicyHours', v)}
      />

      {/* Booking Confirmation */}
      <View style={styles.toggleSection}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>Requires Booking Confirmation</Text>
            <Text style={styles.toggleDescription}>
              All reservation requests must be approved before they are confirmed
            </Text>
          </View>
          <Switch
            value={state.requiresBookingConfirmation}
            onValueChange={(v) => {
              setField('requiresBookingConfirmation', v);
              if (!v) setField('requiresInsurance', false);
            }}
            trackColor={{ false: colors.surface, true: colors.cobalt }}
            thumbColor={colors.white}
          />
        </View>
      </View>

      {/* Insurance — only when confirmation is on */}
      {state.requiresBookingConfirmation && (
        <View style={styles.toggleSection}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Requires Proof of Insurance</Text>
              <Text style={styles.toggleDescription}>
                Renters must attach a valid insurance document when reserving a court
              </Text>
            </View>
            <Switch
              value={state.requiresInsurance}
              onValueChange={(v) => setField('requiresInsurance', v)}
              trackColor={{ false: colors.surface, true: colors.cobalt }}
              thumbColor={colors.white}
            />
          </View>
        </View>
      )}

      {/* Waiver */}
      <View style={styles.toggleSection}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>Waiver Requirement</Text>
            <Text style={styles.toggleDescription}>
              Require players to accept a waiver before booking
            </Text>
          </View>
          <Switch
            value={state.waiverRequired}
            onValueChange={(v) => {
              setField('waiverRequired', v);
              if (!v) setField('waiverText', '');
            }}
            trackColor={{ false: colors.surface, true: colors.cobalt }}
            thumbColor={colors.white}
          />
        </View>
      </View>

      {state.waiverRequired && (
        <TextInput
          style={styles.waiverInput}
          value={state.waiverText}
          onChangeText={(v) => setField('waiverText', v)}
          placeholder="Enter waiver text..."
          placeholderTextColor={colors.inkSoft}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  heading: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: colors.ink,
    marginBottom: 24,
  },
  toggleSection: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 14,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: { flex: 1, marginRight: 12 },
  toggleLabel: {
    fontFamily: fonts.label,
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
    marginBottom: 2,
  },
  toggleDescription: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkSoft,
  },
  waiverInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.ink,
    backgroundColor: colors.white,
    minHeight: 120,
    marginTop: 4,
  },
});
