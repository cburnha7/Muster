/**
 * DuesStatusBadge
 *
 * A small badge that shows whether a player or roster has paid their dues.
 * Uses brand colors: grass for paid, court for pending, track for unpaid.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme';
import { tokenColors } from '../../theme/tokens';

export type DuesStatus = 'paid' | 'pending' | 'unpaid';

interface DuesStatusBadgeProps {
  status: DuesStatus;
  compact?: boolean;
}

const statusConfig: Record<
  DuesStatus,
  { label: string; bg: string; color: string; icon: string }
> = {
  paid: {
    label: 'Paid',
    bg: tokenColors.successLight,
    color: colors.pine,
    icon: 'checkmark-circle',
  },
  pending: {
    label: 'Pending',
    bg: colors.goldLight + '30',
    color: colors.gold,
    icon: 'time',
  },
  unpaid: {
    label: 'Unpaid',
    bg: colors.heart + '18',
    color: colors.heart,
    icon: 'alert-circle',
  },
};

export function DuesStatusBadge({ status, compact }: DuesStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Ionicons
        name={config.icon as any}
        size={compact ? 12 : 14}
        color={config.color}
      />
      {!compact && (
        <Text style={[styles.label, { color: config.color }]}>
          {config.label}
        </Text>
      )}
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
