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
import { colors, fonts, typeScale, Spacing, ComponentStyles } from '../../theme';
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
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Unknown';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <View style={styles.iconWrap}>
                <Ionicons name="warning" size={28} color={colors.gold} />
              </View>
              <Text style={styles.title}>Some Slots Unavailable</Text>
              <Text style={styles.subtitle}>
                {conflicts.length} slot{conflicts.length !== 1 ? 's' : ''} became unavailable since you selected {conflicts.length !== 1 ? 'them' : 'it'}.
              </Text>
            </View>

            <View style={styles.body}>
              {conflicts.map((c) => (
                <View key={c.slotId} style={styles.conflictRow}>
                  <Ionicons name="close-circle" size={18} color={colors.heart} />
                  <View style={styles.conflictInfo}>
                    <Text style={styles.conflictCourt}>{c.courtName}</Text>
                    <Text style={styles.conflictDetail}>
                      {formatDate(c.date)}
                      {c.startTime && c.endTime ? ` · ${formatTime12(c.startTime)} – ${formatTime12(c.endTime)}` : ''}
                    </Text>
                    <Text style={styles.conflictReason}>
                      {c.reason === 'rented' ? 'Already rented' : c.reason === 'blocked' ? 'Blocked' : c.reason}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {availableCount > 0 && (
              <View style={styles.availableNote}>
                <Ionicons name="checkmark-circle" size={18} color={colors.pine} />
                <Text style={styles.availableText}>
                  {availableCount} slot{availableCount !== 1 ? 's are' : ' is'} still available
                </Text>
              </View>
            )}

            <View style={styles.buttons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              {availableCount > 0 && (
                <TouchableOpacity
                  style={[styles.bookBtn, loading && { opacity: 0.6 }]}
                  onPress={onBookAvailable}
                  disabled={loading}
                >
                  <Text style={styles.bookBtnText}>
                    {loading ? 'Booking...' : `Book ${availableCount} Available`}
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
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: Spacing.xl,
  },
  header: { alignItems: 'center', padding: Spacing.xl, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  iconWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: `${colors.gold}15`, alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: fonts.heading, ...typeScale.h2, color: colors.ink, marginTop: Spacing.sm },
  subtitle: { fontFamily: fonts.body, ...typeScale.bodySm, color: colors.inkFaint, marginTop: 4, textAlign: 'center' },
  body: { padding: Spacing.lg, gap: Spacing.sm },
  conflictRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6 },
  conflictInfo: { flex: 1 },
  conflictCourt: { fontFamily: fonts.semibold, ...typeScale.body, color: colors.ink },
  conflictDetail: { fontFamily: fonts.body, ...typeScale.bodySm, color: colors.inkFaint, marginTop: 1 },
  conflictReason: { fontFamily: fonts.label, fontSize: 10, color: colors.heart, textTransform: 'uppercase', marginTop: 2 },
  availableNote: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.lg,
    padding: Spacing.sm, backgroundColor: `${colors.pine}10`, borderRadius: 8,
  },
  availableText: { fontFamily: fonts.body, ...typeScale.bodySm, color: colors.pine },
  buttons: { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.lg },
  cancelBtn: { flex: 1, ...ComponentStyles.button.secondary, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontFamily: fonts.ui, fontSize: 15, color: colors.pine },
  bookBtn: {
    flex: 2, ...ComponentStyles.button.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  bookBtnText: { fontFamily: fonts.ui, fontSize: 15, color: colors.surface },
});
