import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme';
import { leagueService } from '../../services/api/LeagueService';
import { LeagueTransaction } from '../../types/league';

interface LeagueLedgerProps {
  leagueId: string;
  seasonId: string;
}

function getTypeLabel(type: string): string {
  switch (type) {
    case 'dues_received': return 'Dues Received';
    case 'court_cost': return 'Court Cost';
    case 'refund': return 'Refund';
    default: return type;
  }
}

function getTypeIcon(type: string): string {
  switch (type) {
    case 'dues_received': return 'arrow-down-circle';
    case 'court_cost': return 'arrow-up-circle';
    case 'refund': return 'refresh-circle';
    default: return 'ellipse';
  }
}

function getTypeColor(type: string): string {
  switch (type) {
    case 'dues_received': return colors.pine;
    case 'court_cost': return colors.heart;
    case 'refund': return colors.gold;
    default: return colors.inkFaint;
  }
}

function formatCurrency(cents: number): string {
  const abs = Math.abs(cents);
  const dollars = (abs / 100).toFixed(2);
  return cents < 0 ? `-$${dollars}` : `$${dollars}`;
}

function formatDate(dateStr: string | Date): string {
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function TransactionRow({ item }: { item: LeagueTransaction }) {
  const typeColor = getTypeColor(item.type);
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Ionicons
          name={getTypeIcon(item.type) as any}
          size={22}
          color={typeColor}
          style={styles.icon}
        />
        <View style={styles.rowInfo}>
          <Text style={styles.typeLabel}>{getTypeLabel(item.type)}</Text>
          <Text style={styles.description} numberOfLines={1}>
            {item.description}
          </Text>
          <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
        </View>
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.amount, { color: typeColor }]}>
          {formatCurrency(item.amount)}
        </Text>
        <Text style={styles.balance}>
          Bal: {formatCurrency(item.balanceAfter)}
        </Text>
      </View>
    </View>
  );
}

export function LeagueLedger({ leagueId, seasonId }: LeagueLedgerProps) {
  const [transactions, setTransactions] = useState<LeagueTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLedger = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await leagueService.getLedger(leagueId, seasonId);
      setTransactions(result.transactions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ledger');
    } finally {
      setLoading(false);
    }
  }, [leagueId, seasonId]);

  useFocusEffect(useCallback(() => { loadLedger(); }, [loadLedger]));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color={colors.pine} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={24} color={colors.heart} />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (transactions.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="receipt-outline" size={32} color={colors.inkFaint} />
        <Text style={styles.emptyText}>No transactions yet</Text>
      </View>
    );
  }

  const currentBalance = transactions[transactions.length - 1]?.balanceAfter ?? 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Season Ledger</Text>
        <View style={styles.balanceBadge}>
          <Text style={styles.balanceLabel}>BALANCE</Text>
          <Text style={[
            styles.balanceValue,
            { color: currentBalance >= 0 ? colors.pine : colors.heart },
          ]}>
            {formatCurrency(currentBalance)}
          </Text>
        </View>
      </View>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TransactionRow item={item} />}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 16 },
  center: { alignItems: 'center', paddingVertical: 32 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.ink,
  },
  balanceBadge: { alignItems: 'flex-end' },
  balanceLabel: {
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.inkFaint,
    textTransform: 'uppercase',
  },
  balanceValue: {
    fontFamily: fonts.semibold,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  icon: { marginRight: 10 },
  rowInfo: { flex: 1 },
  typeLabel: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.ink,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkFaint,
    marginTop: 1,
  },
  date: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkFaint,
    marginTop: 2,
  },
  rowRight: { alignItems: 'flex-end', marginLeft: 12 },
  amount: {
    fontFamily: fonts.semibold,
    fontSize: 15,
  },
  balance: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkFaint,
    marginTop: 2,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.inkFaint,
    opacity: 0.3,
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.heart,
    marginTop: 8,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
    marginTop: 8,
  },
});
