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

export interface ConflictSlot {
  slotId: string;
  courtId: string;
  courtName: string;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  reason: string;
}

interface BookingConflictModalProps {
  visible: boolean;
  onClose: () => void;
  onBookAvailable: () => void;
  conflicts: ConflictSlot[];
  availableCount: number;
  loading?: boolean;
}

export function BookingConflictModal({
  visible,
  onClose,
  onBookAvailable,
  conflicts,
  availableCount,
  loading = false,
}: BookingConflictModalProps) {
  const { colors } = useTheme();
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Unknown';
    const d = new Date(dateStr);
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
        <View style={[styles.modal, { backgroundColor: colors.surface }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <View style={[styles.iconWrap, { backgroundColor: `${colors.gold}15` }]}>
                <Ionicons name="warning" size={28} color={colors.gold} />
              </View>
              <Text style={[styles.title, { color: colors.ink }]}>Some Slots Unavailable</Text>
              <Text style={[styles.subtitle, { color: colors.inkFaint }]}>
                {conflicts.length} slot{conflicts.length !== 1 ? 's' : ''}{' '}
                became unavailable since you selected{' '}
                {conflicts.length !== 1 ? 'them' : 'it'}.
              </Text>
            </View>

            <View style={styles.body}>
              {conflicts.map(c => (
                <View key={c.slotId} style={styles.conflictRow}>
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={colors.heart}
                  />
                  <View style={styles.conflictInfo}>
                    <Text style={[styles.conflictCourt, { color: colors.ink }]}>{c.courtName}</Text>
                    <Text style={[styles.conflictDetail, { color: colors.inkFaint }]}>
                      {formatDate(c.date)}
                      {c.startTime && c.endTime
                        ? ` · ${formatTime12(c.startTime)} – ${formatTime12(c.endTime)}`
                        : ''}
                    </Text>
                    <Text style={[styles.conflictReason, { color: colors.heart }]}>
                      {c.reason === 'rented'
                        ? 'Already rented'
                        : c.reason === 'blocked'
                          ? 'Blocked'
                          : c.reason}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {availableCount > 0 && (
              <View style={[styles.availableNote, { backgroundColor: `${colors.cobalt}10` }]}>
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={colors.cobalt}
                />
                <Text style={[styles.availableText, { color: colors.cobalt }]}>
                  {availableCount} slot{availableCount !== 1 ? 's are' : ' is'}{' '}
                  still available
                </Text>
              </View>
            )}

            <View style={styles.buttons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onClose}
                disabled={loading}
              >
                <Text style={[styles.cancelBtnText, { color: colors.cobalt }]}>Cancel</Text>
              </TouchableOpacity>
              {availableCount > 0 && (
                <TouchableOpacity
                  style={[styles.bookBtn, loading && { opacity: 0.6 }]}
                  onPress={onBookAvailable}
                  disabled={loading}
                >
                  <Text style={[styles.bookBtnText, { color: colors.surface }]}>
                    {loading
                      ? 'Booking...'
                      : `Book ${availableCount} Available`}
                  </Text>
                </TouchableOpacity>
              )}
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    padding: Spacing.xl,
    borderBottomWidth: 1,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.heading,
    ...typeScale.h2,
    marginTop: Spacing.sm,
  },
  subtitle: {
    fontFamily: fonts.body,
    ...typeScale.bodySm,
    marginTop: 4,
    textAlign: 'center',
  },
  body: { padding: Spacing.lg, gap: Spacing.sm },
  conflictRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 6,
  },
  conflictInfo: { flex: 1 },
  conflictCourt: {
    fontFamily: fonts.semibold,
    ...typeScale.body,
  },
  conflictDetail: {
    fontFamily: fonts.body,
    ...typeScale.bodySm,
    marginTop: 1,
  },
  conflictReason: {
    fontFamily: fonts.label,
    fontSize: 10,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  availableNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.sm,
    borderRadius: 8,
  },
  availableText: {
    fontFamily: fonts.body,
    ...typeScale.bodySm,
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
  cancelBtnText: { fontFamily: fonts.ui, fontSize: 15 },
  bookBtn: {
    flex: 2,
    ...ComponentStyles.button.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookBtnText: { fontFamily: fonts.ui, fontSize: 15 },
});
