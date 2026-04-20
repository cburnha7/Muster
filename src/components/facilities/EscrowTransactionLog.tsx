import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, Spacing, useTheme } from '../../theme';
import { useGetEscrowTransactionsQuery } from '../../store/api/insuranceDocumentsApi';

export interface EscrowTransactionLogProps {
  rentalId: string;
}

type TransactionType =
  | 'authorization'
  | 'capture'
  | 'surplus_payout'
  | 'shortfall_charge'
  | 'refund';

type TransactionStatus = 'pending' | 'completed' | 'failed';

interface EscrowTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  createdAt: string;
}

const TYPE_CONFIG: Record<
  TransactionType,
  { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  authorization: {
    label: 'Authorization',
    icon: 'card-outline',
    color: colors.ink,
  },
  capture: {
    label: 'Capture',
    icon: 'checkmark-circle-outline',
    color: colors.cobalt,
  },
  surplus_payout: {
    label: 'Surplus Payout',
    icon: 'arrow-up-outline',
    color: colors.cobalt,
  },
  shortfall_charge: {
    label: 'Shortfall Charge',
    icon: 'arrow-down-outline',
    color: colors.heart,
  },
  refund: {
    label: 'Refund',
    icon: 'return-down-back-outline',
    color: colors.gold,
  },
};

const STATUS_COLOR: Record<TransactionStatus, string> = {
  pending: colors.gold,
  completed: colors.cobalt,
  failed: colors.heart,
};

function formatCents(cents: number): string {
  const dollars = Math.abs(cents) / 100;
  return `$${dollars.toFixed(2)}`;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const month = months[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  const mins = String(m).padStart(2, '0');
  return `${month} ${day}, ${year} Ã¢â‚¬Â¢ ${hour12}:${mins} ${period}`;
}

export function EscrowTransactionLog({ rentalId }: EscrowTransactionLogProps) {
  const { colors } = useTheme();
  const { data: transactions = [], isLoading } = useGetEscrowTransactionsQuery({
    rentalId,
  });

  return (
    <View style={[styles.section, { backgroundColor: colors.white, borderColor: colors.white }]}>
      <Text style={[styles.sectionTitle, { color: colors.ink }]}>Escrow Transactions</Text>

      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={colors.cobalt}
          style={styles.loader}
        />
      ) : transactions.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.inkFaint }]}>No transactions</Text>
      ) : (
        transactions.map((tx: EscrowTransaction) => {
          const config = TYPE_CONFIG[tx.type] ?? TYPE_CONFIG.authorization;
          const statusColor = STATUS_COLOR[tx.status] ?? colors.gold;

          return (
            <View
              key={tx.id}
              style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.white }]}
              accessibilityRole="summary"
              accessibilityLabel={`${config.label}, ${formatCents(tx.amount)}, ${tx.status}`}
            >
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: config.color + '1A' },
                ]}
              >
                <Ionicons name={config.icon} size={20} color={config.color} />
              </View>

              <View style={styles.rowContent}>
                <Text style={[styles.typeLabel, { color: colors.ink }]}>{config.label}</Text>
                <Text style={[styles.timestamp, { color: colors.inkFaint }]}>
                  {formatTimestamp(tx.createdAt)}
                </Text>
              </View>

              <View style={styles.rowRight}>
                <Text style={[styles.amount, { color: colors.ink }]}>{formatCents(tx.amount)}</Text>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: statusColor + '1A' },
                  ]}
                >
                  <Text style={[styles.badgeText, { color: statusColor }]}>
                    {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                  </Text>
                </View>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderRadius: 12,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  sectionTitle: {
    fontFamily: fonts.label,
    fontSize: 14,
    marginBottom: Spacing.md,
  },
  loader: {
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.sm,
    borderWidth: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  rowContent: {
    flex: 1,
  },
  typeLabel: {
    fontFamily: fonts.label,
    fontSize: 13,
  },
  timestamp: {
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  amount: {
    fontFamily: fonts.body,
    fontSize: 15,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  badgeText: {
    fontFamily: fonts.label,
    fontSize: 10,
    textTransform: 'uppercase',
  },
});
