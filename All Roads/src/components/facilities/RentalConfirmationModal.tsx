import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, Spacing, TextStyles, ComponentStyles } from '../../theme';
import { formatTime12, parseCalendarDate, calculateDuration, formatDuration } from '../../utils/calendarUtils';

interface RentalConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  facilityName: string;
  courtName: string;
  date: string;
  startTime: string;
  endTime: string;
  price: number;
  slotCount?: number;
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
                <Ionicons name="calendar-outline" size={32} color={colors.grass} />
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
                  <Ionicons name="location" size={20} color={colors.grass} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Facility</Text>
                  <Text style={styles.detailValue}>{facilityName}</Text>
                </View>
              </View>

              {/* Court */}
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons name="basketball" size={20} color={colors.grass} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Court</Text>
                  <Text style={styles.detailValue}>{courtName}</Text>
                </View>
              </View>

              {/* Date */}
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons name="calendar-outline" size={20} color={colors.grass} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>{formattedDate}</Text>
                </View>
              </View>

              {/* Time */}
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons name="time-outline" size={20} color={colors.grass} />
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
                  <Ionicons name="cash-outline" size={20} color={colors.grass} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Total Price</Text>
                  <Text style={styles.priceValue}>
                    ${price.toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Important Notice */}
            <View style={styles.noticeContainer}>
              <Ionicons name="information-circle" size={20} color={colors.court} />
              <Text style={styles.noticeText}>
                Cancellations must be made at least 2 hours before the start time for a full refund.
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmButton}
                onPress={onConfirm}
              >
                <Text style={styles.confirmButtonText}>
                  Confirm {slotCount > 1 ? `${slotCount} Bookings` : 'Booking'}
                </Text>
                <Ionicons name="checkmark-circle" size={20} color={colors.chalk} />
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
    backgroundColor: colors.chalk,
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
    backgroundColor: colors.chalk,
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
    backgroundColor: colors.chalk,
    padding: Spacing.md,
    borderRadius: 12,
    marginTop: Spacing.sm,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.chalk,
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
    color: colors.grass,
    fontWeight: '700',
  },
  noticeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: colors.chalk,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.court,
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
    color: colors.grass,
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
    color: colors.chalk,
  },
});
