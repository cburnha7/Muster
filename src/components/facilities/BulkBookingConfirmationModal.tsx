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
import {
  fonts,
  typeScale,
  Spacing,
  ComponentStyles,
  useTheme,
} from '../../theme';
import { formatTime12 } from '../../utils/calendarUtils';

export interface CartSlot {
  slotId: string;
  facilityId: string;
  courtId: string;
  courtName: string;
  date: string;
  startTime: string;
  endTime: string;
  price: number;
}

interface BulkBookingConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  facilityName: string;
  cartSlots: CartSlot[];
  loading?: boolean;
  insuranceContent?: React.ReactNode;
  confirmDisabled?: boolean;
  confirmLabel?: string;
}

export function BulkBookingConfirmationModal({
  visible,
  onClose,
  onConfirm,
  facilityName,
  cartSlots,
  loading = false,
  insuranceContent,
  confirmDisabled = false,
  confirmLabel,
}: BulkBookingConfirmationModalProps) {
  const { colors } = useTheme();
  // Group by court, then by date
  const grouped = new Map<string, Map<string, CartSlot[]>>();
  for (const slot of cartSlots) {
    if (!grouped.has(slot.courtId)) {
      grouped.set(slot.courtId, new Map());
    }
    const courtGroup = grouped.get(slot.courtId)!;
    if (!courtGroup.has(slot.date)) {
      courtGroup.set(slot.date, []);
    }
    courtGroup.get(slot.date)!.push(slot);
  }

  const totalPrice = cartSlots.reduce((sum, s) => sum + s.price, 0);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <Ionicons name="cart" size={28} color={colors.cobalt} />
              <Text style={styles.title}>Confirm Booking</Text>
              <Text style={styles.subtitle}>
                {cartSlots.length} slot{cartSlots.length !== 1 ? 's' : ''} at{' '}
                {facilityName}
              </Text>
            </View>

            <View style={styles.body}>
              {Array.from(grouped.entries()).map(([courtId, dateMap]) => {
                const courtName =
                  dateMap.values().next().value?.[0]?.courtName ?? '';
                return (
                  <View key={courtId} style={styles.courtGroup}>
                    <View style={styles.courtHeader}>
                      <Ionicons
                        name="basketball"
                        size={16}
                        color={colors.cobalt}
                      />
                      <Text style={styles.courtName}>{courtName}</Text>
                    </View>
                    {Array.from(dateMap.entries()).map(([date, slots]) => (
                      <View key={date} style={styles.dateGroup}>
                        <Text style={styles.dateLabel}>{formatDate(date)}</Text>
                        {slots
                          .sort((a, b) =>
                            a.startTime.localeCompare(b.startTime)
                          )
                          .map(slot => (
                            <View key={slot.slotId} style={styles.slotRow}>
                              <Text style={styles.slotTime}>
                                {formatTime12(slot.startTime)} –{' '}
                                {formatTime12(slot.endTime)}
                              </Text>
                              <Text style={styles.slotPrice}>
                                ${slot.price.toFixed(2)}
                              </Text>
                            </View>
                          ))}
                      </View>
                    ))}
                  </View>
                );
              })}
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalPrice}>${totalPrice.toFixed(2)}</Text>
            </View>

            {insuranceContent && (
              <View style={styles.insuranceSection}>{insuranceContent}</View>
            )}

            <View style={styles.notice}>
              <Ionicons
                name="information-circle"
                size={18}
                color={colors.gold}
              />
              <Text style={styles.noticeText}>
                Cancellations must be made at least 2 hours before start time.
              </Text>
            </View>

            <View style={styles.buttons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onClose}
                disabled={loading}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  (loading || confirmDisabled) && { opacity: 0.6 },
                ]}
                onPress={onConfirm}
                disabled={loading || confirmDisabled}
              >
                <Text style={styles.confirmBtnText}>
                  {loading
                    ? 'Booking...'
                    : confirmLabel ||
                      `Confirm ${cartSlots.length} Slot${cartSlots.length !== 1 ? 's' : ''}`}
                </Text>
                {!loading && (
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={colors.surface}
                  />
                )}
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    padding: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontFamily: fonts.heading,
    ...typeScale.h2,
    color: colors.ink,
    marginTop: Spacing.sm,
  },
  subtitle: {
    fontFamily: fonts.body,
    ...typeScale.bodySm,
    color: colors.inkFaint,
    marginTop: 4,
  },
  body: { padding: Spacing.lg },
  courtGroup: { marginBottom: Spacing.lg },
  courtHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  courtName: {
    fontFamily: fonts.semibold,
    ...typeScale.body,
    color: colors.ink,
  },
  dateGroup: { marginLeft: 22, marginBottom: Spacing.sm },
  dateLabel: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.inkFaint,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  slotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  slotTime: { fontFamily: fonts.body, ...typeScale.body, color: colors.ink },
  slotPrice: {
    fontFamily: fonts.semibold,
    ...typeScale.body,
    color: colors.cobalt,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: `${colors.cobalt}10`,
    borderRadius: 12,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  totalLabel: {
    fontFamily: fonts.semibold,
    ...typeScale.h3,
    color: colors.ink,
  },
  totalPrice: {
    fontFamily: fonts.heading,
    ...typeScale.h2,
    color: colors.cobalt,
  },
  insuranceSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.gold,
    backgroundColor: `${colors.gold}10`,
    borderRadius: 8,
  },
  noticeText: {
    flex: 1,
    fontFamily: fonts.body,
    ...typeScale.bodySm,
    color: colors.ink,
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  cancelBtn: {
    flex: 1,
    ...ComponentStyles.button.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { fontFamily: fonts.ui, fontSize: 15, color: colors.cobalt },
  confirmBtn: {
    flex: 2,
    ...ComponentStyles.button.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  confirmBtnText: { fontFamily: fonts.ui, fontSize: 15, color: colors.surface },
});
