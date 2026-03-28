/**
 * RecurringConflictsModal — shows which dates in a recurring series are unavailable
 * and lets the user skip conflicts or cancel the entire series.
 */

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
import { colors, fonts, typeScale } from '../../theme';
import { FormButton } from '../forms/FormButton';

interface Conflict {
  date: string;
  reason: string;
}

interface Props {
  visible: boolean;
  conflicts: Conflict[];
  availableCount: number;
  onSkipAndConfirm: () => void;
  onCancel: () => void;
}

export function RecurringConflictsModal({
  visible,
  conflicts,
  availableCount,
  onSkipAndConfirm,
  onCancel,
}: Props) {
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00Z');
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  };

  const reasonLabel = (reason: string) => {
    switch (reason) {
      case 'rented': return 'Already rented';
      case 'already_rented': return 'Already rented';
      case 'blocked': return 'Blocked';
      case 'no_slot': return 'No slot available';
      default: return 'Unavailable';
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onCancel} />
        <View style={styles.card}>
          <View style={styles.header}>
            <Ionicons name="alert-circle" size={28} color={colors.gold} />
            <Text style={styles.title}>Some Dates Unavailable</Text>
          </View>

          <Text style={styles.summary}>
            {conflicts.length} of {conflicts.length + availableCount} dates have conflicts.
            {availableCount > 0
              ? ` You can skip them and confirm the remaining ${availableCount}.`
              : ' No dates are available.'}
          </Text>

          <ScrollView style={styles.list} bounces={false}>
            {conflicts.map((c, i) => (
              <View key={i} style={styles.conflictRow}>
                <Ionicons name="close-circle" size={16} color={colors.heart} />
                <Text style={styles.conflictDate}>{formatDate(c.date)}</Text>
                <Text style={styles.conflictReason}>{reasonLabel(c.reason)}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.actions}>
            <FormButton title="Cancel" variant="outline" onPress={onCancel} style={styles.btn} />
            {availableCount > 0 && (
              <FormButton
                title={`Confirm ${availableCount} Dates`}
                variant="primary"
                onPress={onSkipAndConfirm}
                style={styles.btn}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: `${colors.ink}80`,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  title: {
    fontFamily: fonts.heading,
    ...typeScale.h3,
    color: colors.ink,
  },
  summary: {
    fontFamily: fonts.body,
    ...typeScale.body,
    color: colors.inkFaint,
    marginBottom: 16,
    lineHeight: 20,
  },
  list: {
    maxHeight: 200,
    marginBottom: 20,
  },
  conflictRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  conflictDate: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
    flex: 1,
  },
  conflictReason: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.heart,
    textTransform: 'uppercase',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
  },
});
