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
import { colors, Spacing, TextStyles, ComponentStyles } from '../../theme';
import { CancellationPolicyDisplay } from './CancellationPolicyDisplay';
import type { PenaltyDestination } from '../../types';
import { formatTime12, parseCalendarDate, calculateDuration, formatDuration } from '../../utils/calendarUtils';

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
        <View style={styles.modalContainer}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Ionicons name="calendar-outline" size={32} color={colors.pine} />
              </View>
              <Text style={styles.title}>
                Confirm {slotCount > 1 ? `${slotCount} Rentals` : 'Rental'}
              </Text>
              <Text style={styles.subtitle}>Please review your booking details</Text>
            </View>

            {/* Booking Details */}
            <View style={styles.detailsContainer}>
              {/* Facility */}
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons name="location" size={20} color={colors.pine} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Facility</Text>
                  <Text style={styles.detailValue}>{facilityName}</Text>
                </View>
              </View>

              {/* Court */}
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons name="basketball" size={20} color={colors.pine} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Court</Text>
                  <Text style={styles.detailValue}>{courtName}</Text>
                </View>
              </View>

              {/* Date */}
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons name="calendar-outline" size={20} color={colors.pine} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>{formattedDate}</Text>
                </View>
              </View>

              {/* Time */}
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons name="time-outline" size={20} color={colors.pine} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Time</Text>
                  <Text style={styles.detailValue}>
                    {formatTime12(startTime)} - {formatTime12(endTime)}
                  </Text>
                  {slotCount > 1 && (
                    <Text style={styles.detailSubvalue}>{slotCount} consecutive time slots</Text>
                  )}
                  <Text style={styles.detailSubvalue}>Duration: {formattedDuration}</Text>
                </View>
              </View>

              {/* Price */}
              <View style={[styles.detailRow, styles.priceRow]}>
                <View style={styles.detailIcon}>
                  <Ionicons name="cash-outline" size={20} color={colors.pine} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Total Price</Text>
                  <Text style={styles.priceValue}>
                    ${price.toFixed(2)}
                  </Text>
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
                      styles.checkbox,
                      policyAcknowledged && styles.checkboxChecked,
                    ]}
                  >
                    {policyAcknowledged && (
                      <Ionicons name="checkmark" size={14} color={colors.surface} />
                    )}
                  </View>
                  <Text style={styles.acknowledgementText}>
                    I acknowledge and accept the facility's cancellation policy
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.noticeContainer}>
                <Ionicons name="information-circle" size={20} color={colors.gold} />
                <Text style={styles.noticeText}>
                  Cancellations must be made at least 2 hours before the start time for a full refund.
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  isConfirmDisabled && styles.confirmButtonDisabled,
                ]}
                onPress={handleConfirm}
                disabled={isConfirmDisabled}
                testID="confirm-booking-button"
              >
                <Text
                  style={[
                    styles.confirmButtonText,
                    isConfirmDisabled && styles.confirmButtonTextDisabled,
                  ]}
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
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    padding: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    ...TextStyles.h2,
    color: colors.ink,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...TextStyles.body,
    color: colors.soft,
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
    backgroundColor: colors.surface,
    padding: Spacing.md,
    borderRadius: 12,
    marginTop: Spacing.sm,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    ...TextStyles.caption,
    color: colors.soft,
    marginBottom: 2,
  },
  detailValue: {
    ...TextStyles.bodyLarge,
    fontWeight: '600',
    color: colors.ink,
  },
  detailSubvalue: {
    ...TextStyles.caption,
    color: colors.soft,
    marginTop: 2,
  },
  priceValue: {
    ...TextStyles.h3,
    color: colors.pine,
    fontWeight: '700',
  },
  noticeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: colors.surface,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.gold,
  },
  policyContainer: {
    marginHorizontal: Spacing.lg,
  },
  noticeText: {
    flex: 1,
    ...TextStyles.caption,
    color: colors.ink,
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
    color: colors.pine,
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
    color: colors.surface,
  },
  confirmButtonDisabled: {
    backgroundColor: colors.inkFaint,
    opacity: 0.6,
  },
  confirmButtonTextDisabled: {
    color: colors.surface,
  },
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
    borderColor: colors.inkFaint,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: colors.pine,
    borderColor: colors.pine,
  },
  acknowledgementText: {
    ...TextStyles.caption,
    color: colors.ink,
    flex: 1,
    lineHeight: 18,
  },
});
