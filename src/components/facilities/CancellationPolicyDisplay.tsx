import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, Spacing } from '../../theme';
import type { PenaltyDestination } from '../../types';

export interface CancellationPolicyDisplayProps {
  noticeWindowHours: number;
  teamPenaltyPct: number;
  penaltyDestination: PenaltyDestination;
}

function formatPenaltyDestination(destination: PenaltyDestination): string {
  switch (destination) {
    case 'facility':
      return 'the facility';
    case 'opposing_team':
      return 'the opposing roster';
    case 'split':
      return 'split between facility and opposing roster';
    default:
      return destination;
  }
}

export function CancellationPolicyDisplay({
  noticeWindowHours,
  teamPenaltyPct,
  penaltyDestination,
}: CancellationPolicyDisplayProps) {
  const refundLine =
    noticeWindowHours === 0
      ? 'Cancel any time before game start for a full refund.'
      : `Cancel at least ${noticeWindowHours} hour${noticeWindowHours !== 1 ? 's' : ''} before game time for a full refund.`;

  let penaltyLine: string;
  if (teamPenaltyPct === 0) {
    penaltyLine = 'No penalty for late cancellations.';
  } else if (teamPenaltyPct === 100) {
    penaltyLine = 'Late cancellations forfeit your full escrow.';
  } else {
    penaltyLine = `Late cancellations forfeit ${teamPenaltyPct}% of your escrow.`;
  }

  const showDestination = teamPenaltyPct > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="shield-checkmark-outline" size={20} color={colors.sky} />
        <Text style={styles.title}>Cancellation Policy</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.row}>
          <Ionicons name="time-outline" size={16} color={colors.grass} />
          <Text style={styles.text}>{refundLine}</Text>
        </View>

        <View style={styles.row}>
          <Ionicons
            name={teamPenaltyPct === 0 ? 'checkmark-circle-outline' : 'alert-circle-outline'}
            size={16}
            color={teamPenaltyPct === 0 ? colors.grass : colors.court}
          />
          <Text style={styles.text}>{penaltyLine}</Text>
        </View>

        {showDestination && (
          <View style={styles.row}>
            <Ionicons name="arrow-forward-circle-outline" size={16} color={colors.inkFaint} />
            <Text style={styles.text}>
              Penalty goes to: {formatPenaltyDestination(penaltyDestination)}.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.chalk,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.sky + '30',
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: fonts.label,
    fontSize: 14,
    color: colors.ink,
  },
  body: {
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  text: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
    lineHeight: 20,
  },
});
