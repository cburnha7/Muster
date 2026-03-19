/**
 * BalanceStatusBadge
 *
 * Displays a roster's balance status: funded, low, or blocked.
 * Uses brand colors: grass for funded, court for low, track for blocked.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme';

export type BalanceStatus = 'funded' | 'low' | 'blocked';

interface BalanceStatusBadgeProps {
  status: BalanceStatus;
  compact?: boolean;
}

const statusConfig: Record<BalanceStatus, { label: string; bg: string; color: string; icon: string }> = {
  funded: {
    label: 'Funded',
    bg: '#EDF7F0',
    color: colors.pine,
    icon: 'checkmark-circle',
  },
  low: {
    label: 'Low',
    bg: colors.courtLight + '30',
    color: colors.court,
    icon: 'warning',
  },
  blocked: {
    label: 'Blocked',
    bg: colors.heart + '18',
    color: colors.heart,
    icon: 'close-circle',
  },
};

export function BalanceStatusBadge({ status, compact }: BalanceStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <View
      style={[styles.badge, { backgroundColor: config.bg }]}
      accessibilityRole="text"
      accessibilityLabel={`Balance status: ${config.label}`}
    >
      <Ionicons name={config.icon as any} size={compact ? 12 : 14} color={config.color} />
      {!compact && <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  label: {
    fontFamily: fonts.label,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
