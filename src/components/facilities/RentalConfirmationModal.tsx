import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, TextStyles, ComponentStyles, useTheme } from '../../theme';
import { CancellationPolicyDisplay } from './CancellationPolicyDisplay';
import type { PenaltyDestination } from '../../types';
import {
  formatTime12,
  parseCalendarDate,
  calculateDuration,
  formatDuration,
} from '../../utils/calendarUtils';

interface RentalConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (policyAcknowledgedAt?: string) => void;
  facilityName: string;
  courtName: string;
  date: string;
  startTime: string;
  endTime: string;
  price: number;
  slotCount?: number;
  cancellationPolicy?: {
    noticeWindowHours: number;
    teamPenaltyPct: number;
    penaltyDestination: PenaltyDestination;
  };
}

export function RentalConfirmationModal({
  visible,
  onClose,
  onConfirm,
  facilityName,
  courtName,
  date,
  startTime,
  endTime,
  price,
  slotCount = 1,
  cancellationPolicy,
}: RentalConfirmationModalProps) {
  const { colors } = useTheme();
  const dateObj = parseCalendarDate(date);
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const duration = calculateDuration(startTime, endTime);
  const formattedDuration = formatDuration(duration);

  const [policyAcknowledged, setPolicyAcknowledged] = useState(false);

  const requiresAcknowledgement = !!cancellationPolicy;

  const handleConfirm = () => {
    if (requiresAcknowledgement) {
      onConfirm(new Date().toISOString());
    } else {
      onConfirm();
    }
  };

  const isConfirmDisabled = requiresAcknowledgement && !policyAcknowledged;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <View style={[styles.iconContainer, { backgroundColor: colors.surface }]}>
                <Ionicons
                  name="calendar-outline"
                  size={32}
                  color={colors.cobalt}
                />
              </View>
              <Text style={[styles.title, { color: colors.ink }]}>
                Confirm {slotCount > 1 ? `${slotCount} Rentals` : 'Rental'}
              </Text>
              <Text style={[styles.subtitle, { color: colors.inkFaint }]}>
                Please review your booking details
              </Text>
            </View>

            {/* Booking Details */}
            <View style={styles.detailsContainer}>
              {/* Facility */}
              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: colors.surface }]}>
                  <Ionicons name="location" size={20} color={colors.cobalt} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={[styles.detailLabel, { color: colors.inkFaint }]}>Facility</Text>
                  <Text style={[styles.detailValue, { color: colors.ink }]}>{facilityName}</Text>
                </View>
              </View>

              {/* Court */}
              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: colors.surface }]}>
                  <Ionicons name="basketball" size={20} color={colors.cobalt} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={[styles.detailLabel, { color: colors.inkFaint }]}>Court</Text>
                  <Text style={[styles.detailValue, { color: colors.ink }]}>{courtName}</Text>
                </View>
              </View>

              {/* Date */}
              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: colors.surface }]}>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={colors.cobalt}
                  />
                </View>
                <View style={styles.detailContent}>
                  <Text style={[styles.detailLabel, { color: colors.inkFaint }]}>Date</Text>
                  <Text style={[styles.detailValue, { color: colors.ink }]}>{formattedDate}</Text>
                </View>
              </View>

              {/* Time */}
              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: colors.surface }]}>
                  <Ionicons
                    name="time-outline"
                    size={20}
                    color={colors.cobalt}
                  />
                </View>
                <View style={styles.detailContent}>
                  <Text style={[styles.detailLabel, { color: colors.inkFaint }]}>Time</Text>
                  <Text style={[styles.detailValue, { color: colors.ink }]}>
                    {formatTime12(startTime)} - {formatTime12(endTime)}
                  </Text>
                  {slotCount > 1 && (
                    <Text style={[styles.detailSubvalue, { color: colors.inkFaint }]}>
                      {slotCount} consecutive time slots
                    </Text>
                  )}
                  <Text style={[styles.detailSubvalue, { color: colors.inkFaint }]}>
                    Duration: {formattedDuration}
                  </Text>
                </View>
              </View>

              {/* Price */}
              <View style={[styles.detailRow, styles.priceRow, { backgroundColor: colors.surface }]}>
                <View style={[styles.detailIcon, { backgroundColor: colors.surface }]}>
                  <Ionicons
                    name="cash-outline"
                    size={20}
                    color={colors.cobalt}
                  />
                </View>
                <View style={styles.detailContent}>
                  <Text style={[styles.detailLabel, { color: colors.inkFaint }]}>Total Price</Text>
                  <Text style={[styles.priceValue, { color: colors.cobalt }]}>${price.toFixed(2)}</Text>
                </View>
              </View>
            </View>

            {/* Cancellation Policy */}
            {cancellationPolicy ? (
              <View style={styles.policyContainer}>
                <CancellationPolicyDisplay
                  noticeWindowHours={cancellationPolicy.noticeWindowHours}
                  teamPenaltyPct={cancellationPolicy.teamPenaltyPct}
                  penaltyDestination={cancellationPolicy.penaltyDestination}
                />

                {/* Policy Acknowledgement */}
                <Pressable
                  style={styles.acknowledgementRow}
                  onPress={() => setPolicyAcknowledged(!policyAcknowledged)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: policyAcknowledged }}
                  accessibilityLabel="Acknowledge cancellation policy"
                  testID="policy-acknowledgement-checkbox"
                >
                  <View
                    style={[
                      styles.checkbox, { borderColor: colors.inkFaint },
                      policyAcknowledged && styles.checkboxChecked, policyAcknowledged && { backgroundColor: colors.cobalt, borderColor: colors.cobalt }]}
                  >
                    {policyAcknowledged && (
                      <Ionicons
                        name="checkmark"
                        size={14}
                        color={colors.surface}
                      />
                    )}
                  </View>
                  <Text style={[styles.acknowledgementText, { color: colors.ink }]}>
                    I acknowledge and accept the facility's cancellation policy
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={[styles.noticeContainer, { backgroundColor: colors.surface, borderLeftColor: colors.gold }]}>
                <Ionicons
                  name="information-circle"
                  size={20}
                  color={colors.gold}
                />
                <Text style={[styles.noticeText, { color: colors.ink }]}>
                  Cancellations must be made at least 2 hours before the start
                  time for a full refund.
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={[styles.cancelButtonText, { color: colors.cobalt }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  isConfirmDisabled && styles.confirmButtonDisabled, isConfirmDisabled && { backgroundColor: colors.inkFaint }]}
                onPress={handleConfirm}
                disabled={isConfirmDisabled}
                testID="confirm-booking-button"
              >
                <Text
                  style={[
                    styles.confirmButtonText, { color: colors.surface },
                    isConfirmDisabled && styles.confirmButtonTextDisabled, isConfirmDisabled && { color: colors.surface }]}
                >
                  Confirm {slotCount > 1 ? `${slotCount} Bookings` : 'Booking'}
                </Text>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={isConfirmDisabled ? colors.inkFaint : colors.surface}
                />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    padding: Spacing.xl,
    borderBottomWidth: 1,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    ...TextStyles.h2,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...TextStyles.body,
    textAlign: 'center',
  },
  detailsContainer: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  priceRow: {
    padding: Spacing.md,
    borderRadius: 12,
    marginTop: Spacing.sm,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    ...TextStyles.caption,
    marginBottom: 2,
  },
  detailValue: {
    ...TextStyles.bodyLarge,
    fontWeight: '600',
  },
  detailSubvalue: {
    ...TextStyles.caption,
    marginTop: 2,
  },
  priceValue: {
    ...TextStyles.h3,
    fontWeight: '700',
  },
  noticeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  policyContainer: {
    marginHorizontal: Spacing.lg,
  },
  noticeText: {
    flex: 1,
    ...TextStyles.caption,
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  cancelButton: {
    flex: 1,
    ...ComponentStyles.button.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    ...TextStyles.bodyLarge,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 2,
    ...ComponentStyles.button.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  confirmButtonText: {
    ...TextStyles.bodyLarge,
    fontWeight: '600',
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonTextDisabled: {},
  acknowledgementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {},
  acknowledgementText: {
    ...TextStyles.caption,
    flex: 1,
    lineHeight: 18,
  },
});
