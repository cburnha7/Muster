import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../theme';

type StatusKey = 'open' | 'few' | 'full' | 'closed' | 'league';

interface StatusBadgeProps {
  status: StatusKey;
}
interface SportBadgeProps {
  sport: string;
  variant?: 'solid' | 'soft';
}

const STATUS_LABELS: Record<StatusKey, string> = {
  open: 'Open',
  few: 'Few Spots',
  full: 'Full',
  closed: 'Closed',
  league: 'League',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const { status: st, type, radius, spacing } = useTheme();
  const token = st[status];
  return (
    <View
      style={{
        backgroundColor: token.bg,
        borderRadius: radius.full,
        paddingHorizontal: spacing.sm + 2,
        paddingVertical: 3,
        alignSelf: 'flex-start' as const,
      }}
    >
      <Text style={{ ...type.labelSm, color: token.text }}>
        {STATUS_LABELS[status]}
      </Text>
    </View>
  );
}

export function SportBadge({ sport, variant = 'solid' }: SportBadgeProps) {
  const { sport: sp, type, radius, spacing } = useTheme();
  const key = sport.toLowerCase().replace(/ /g, '_') as keyof typeof sp;
  const token = sp[key] ?? sp.other;
  const bg = variant === 'solid' ? token.solid : token.soft;
  const text = variant === 'solid' ? token.solidText : token.softText;
  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: radius.full,
        paddingHorizontal: spacing.sm + 4,
        paddingVertical: 4,
        alignSelf: 'flex-start' as const,
      }}
    >
      <Text style={{ ...type.label, color: text }}>{sport}</Text>
    </View>
  );
}
