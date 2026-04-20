/**
 * DuesStatusBadge
 *
 * A small badge that shows whether a player or roster has paid their dues.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, fonts } from '../../theme';
import { SemanticColors } from '../../theme/tokens';

export type DuesStatus = 'paid' | 'pending' | 'unpaid';

interface DuesStatusBadgeProps {
  status: DuesStatus;
  compact?: boolean;
}

function getStatusConfig(colors: SemanticColors) {
  return {
    paid: {
      label: 'Paid',
      bg: colors.successLight,
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
}

export function DuesStatusBadge({ status, compact }: DuesStatusBadgeProps) {
  const { colors } = useTheme();
  const config = getStatusConfig(colors)[status];

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
