/**
 * EscrowTransactionsScreen — audit log of escrow payment events
 * for a facility's rentals. Two-panel layout: rental list with
 * inline-expandable transaction detail.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { fonts, Spacing, useTheme } from '../../theme';
import { FacilitiesStackParamList } from '../../navigation/types';
import { formatTime12 } from '../../utils/calendarUtils';
import { API_BASE_URL } from '../../services/api/config';
import TokenStorage from '../../services/auth/TokenStorage';

type Nav = NativeStackNavigationProp<
  FacilitiesStackParamList,
  'EscrowTransactions'
>;
type ScreenRoute = RouteProp<FacilitiesStackParamList, 'EscrowTransactions'>;

// ── Types ────────────────────────────────────────────────────────────────────

interface EscrowTransaction {
  id: string;
  type:
    | 'authorization'
    | 'capture'
    | 'surplus_payout'
    | 'shortfall_charge'
    | 'refund';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  stripePaymentIntentId: string | null;
  createdAt: string;
}

interface RentalItem {
  id: string;
  status: string;
  totalPrice: number;
  paymentStatus: string;
  createdAt: string;
  timeSlot: {
    date: string;
    startTime: string;
    endTime: string;
    court: { name: string; sportType: string };
  };
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }) +
    ' ' +
    d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  );
}

function humanizeType(type: string): string {
  return type
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ── Component ────────────────────────────────────────────────────────────────

export function EscrowTransactionsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<ScreenRoute>();
  const { facilityId, facilityName } = route.params ?? {};

  const [rentals, setRentals] = useState<RentalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedRentalId, setExpandedRentalId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<
    Record<string, EscrowTransaction[]>
  >({});
  const [loadingTransactions, setLoadingTransactions] = useState<
    Record<string, boolean>
  >({});

  // ── Fetch rentals ────────────────────────────────────────────────────────

  const loadRentals = useCallback(async () => {
    try {
      const token = await TokenStorage.getAccessToken();
      const res = await fetch(
        `${API_BASE_URL}/rentals/facilities/${facilityId}/rentals`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        const list: RentalItem[] = Array.isArray(data)
          ? data
          : (data.rentals ?? []);
        // Most recent first
        list.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setRentals(list);
      }
    } catch {
      // silent — empty state will show
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [facilityId]);

  useEffect(() => {
    loadRentals();
  }, [loadRentals]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadRentals();
  }, [loadRentals]);

  // ── Fetch transactions for a rental ──────────────────────────────────────

  const handleToggleRental = useCallback(
    async (rentalId: string) => {
      if (expandedRentalId === rentalId) {
        setExpandedRentalId(null);
        return;
      }
      setExpandedRentalId(rentalId);

      if (transactions[rentalId]) return; // already loaded

      setLoadingTransactions(prev => ({ ...prev, [rentalId]: true }));
      try {
        const token = await TokenStorage.getAccessToken();
        const res = await fetch(
          `${API_BASE_URL}/escrow-transactions?rentalId=${rentalId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          setTransactions(prev => ({ ...prev, [rentalId]: data }));
        }
      } finally {
        setLoadingTransactions(prev => ({ ...prev, [rentalId]: false }));
      }
    },
    [expandedRentalId, transactions]
  );

  // ── Payment status color ─────────────────────────────────────────────────

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
      case 'captured':
        return colors.pine;
      case 'pending':
      case 'authorized':
        return colors.gold;
      case 'failed':
      case 'refunded':
        return colors.heart;
      default:
        return colors.inkFaint;
    }
  };

  // ── Transaction icon + color ─────────────────────────────────────────────

  const getTransactionIcon = (
    type: EscrowTransaction['type']
  ): { name: keyof typeof Ionicons.glyphMap; color: string } => {
    switch (type) {
      case 'authorization':
        return { name: 'lock-closed-outline', color: colors.cobalt };
      case 'capture':
        return { name: 'checkmark-circle-outline', color: colors.pine };
      case 'surplus_payout':
        return { name: 'arrow-up-circle-outline', color: colors.cobalt };
      case 'shortfall_charge':
        return { name: 'alert-circle-outline', color: colors.gold };
      case 'refund':
        return { name: 'return-down-back-outline', color: colors.inkSecondary };
      default:
        return { name: 'help-circle-outline', color: colors.inkFaint };
    }
  };

  const getTransactionStatusColor = (status: EscrowTransaction['status']) => {
    switch (status) {
      case 'completed':
        return colors.pine;
      case 'failed':
        return colors.heart;
      case 'pending':
        return colors.gold;
      default:
        return colors.inkFaint;
    }
  };

  // ── Render a single transaction row ──────────────────────────────────────

  const renderTransaction = (tx: EscrowTransaction) => {
    const icon = getTransactionIcon(tx.type);
    const statusColor = getTransactionStatusColor(tx.status);

    return (
      <View
        key={tx.id}
        style={[styles.txRow, { borderTopColor: colors.border }]}
      >
        <Ionicons name={icon.name} size={20} color={icon.color} />
        <View style={styles.txContent}>
          <View style={styles.txHeader}>
            <Text style={[styles.txType, { color: colors.ink }]}>
              {humanizeType(tx.type)}
            </Text>
            <Text style={[styles.txAmount, { color: colors.ink }]}>
              ${tx.amount.toFixed(2)}
            </Text>
          </View>
          <View style={styles.txFooter}>
            <View
              style={[styles.txStatusPill, { backgroundColor: statusColor }]}
            >
              <Text style={[styles.txStatusText, { color: colors.white }]}>
                {tx.status.toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.txTimestamp, { color: colors.inkFaint }]}>
              {formatTimestamp(tx.createdAt)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // ── Render a rental card ─────────────────────────────────────────────────

  const renderRental = ({ item }: { item: RentalItem }) => {
    const isExpanded = expandedRentalId === item.id;
    const isLoadingTx = loadingTransactions[item.id];
    const txList = transactions[item.id];
    const paymentColor = getPaymentStatusColor(item.paymentStatus);
    const slotDate = item.timeSlot.date?.split('T')[0] ?? item.timeSlot.date;

    return (
      <View
        style={[
          styles.rentalCard,
          { backgroundColor: colors.bgCard, borderColor: colors.border },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleToggleRental(item.id)}
        >
          {/* Header row */}
          <View style={styles.rentalHeader}>
            <View style={styles.rentalHeaderLeft}>
              <Text style={[styles.rentalDate, { color: colors.ink }]}>
                {formatDate(slotDate)}
              </Text>
              <Text
                style={[styles.rentalCourt, { color: colors.inkSecondary }]}
              >
                {item.timeSlot.court.name}
              </Text>
            </View>
            <Ionicons
              name={isExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
              size={20}
              color={colors.inkFaint}
            />
          </View>

          {/* Renter + time */}
          <Text style={[styles.rentalRenter, { color: colors.ink }]}>
            {item.user.firstName} {item.user.lastName}
          </Text>
          <Text style={[styles.rentalTime, { color: colors.inkSecondary }]}>
            {formatTime12(item.timeSlot.startTime)} –{' '}
            {formatTime12(item.timeSlot.endTime)}
          </Text>

          {/* Price + status */}
          <View style={styles.rentalFooter}>
            <Text style={[styles.rentalPrice, { color: colors.cobalt }]}>
              ${item.totalPrice.toFixed(2)}
            </Text>
            <View
              style={[styles.paymentBadge, { backgroundColor: paymentColor }]}
            >
              <Text style={[styles.paymentBadgeText, { color: colors.white }]}>
                {item.paymentStatus.toUpperCase()}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Expanded transaction detail */}
        {isExpanded && (
          <View style={[styles.txSection, { borderTopColor: colors.border }]}>
            {isLoadingTx ? (
              <ActivityIndicator
                size="small"
                color={colors.cobalt}
                style={styles.txLoader}
              />
            ) : txList && txList.length > 0 ? (
              txList.map(renderTransaction)
            ) : (
              <Text style={[styles.txEmpty, { color: colors.inkFaint }]}>
                No escrow transactions recorded
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  // ── Loading state ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgScreen }]}>
        <ScreenHeader
          title="Escrow Log"
          leftIcon="arrow-back"
          onLeftPress={() => navigation.goBack()}
        />
        <LoadingSpinner />
      </View>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: colors.bgScreen }]}>
      <ScreenHeader
        title="Escrow Log"
        leftIcon="arrow-back"
        onLeftPress={() => navigation.goBack()}
        subtitle={facilityName}
      />

      {rentals.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon="receipt-outline"
            title="No rentals found"
            subtitle="Escrow transactions will appear here once rentals are made."
          />
        </View>
      ) : (
        <FlatList
          data={rentals}
          keyExtractor={item => item.id}
          renderItem={renderRental}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.cobalt}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: Spacing.md, paddingBottom: 40 },

  // ── Rental card ──────────────────────────────────────────────────────────
  rentalCard: {
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
  },
  rentalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  rentalHeaderLeft: { flex: 1 },
  rentalDate: {
    fontFamily: fonts.heading,
    fontSize: 15,
  },
  rentalCourt: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: 2,
  },
  rentalRenter: {
    fontFamily: fonts.headingSemi || fonts.heading,
    fontSize: 15,
    marginBottom: 2,
  },
  rentalTime: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginBottom: 8,
  },
  rentalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rentalPrice: {
    fontFamily: fonts.heading,
    fontSize: 17,
  },
  paymentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  paymentBadgeText: {
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 0.5,
  },

  // ── Transaction section ──────────────────────────────────────────────────
  txSection: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  txLoader: { paddingVertical: Spacing.md },
  txEmpty: {
    fontFamily: fonts.body,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },

  // ── Transaction row ──────────────────────────────────────────────────────
  txRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  txContent: { flex: 1 },
  txHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  txType: {
    fontFamily: fonts.headingSemi || fonts.heading,
    fontSize: 14,
  },
  txAmount: {
    fontFamily: fonts.heading,
    fontSize: 14,
  },
  txFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  txStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  txStatusText: {
    fontFamily: fonts.label,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  txTimestamp: {
    fontFamily: fonts.body,
    fontSize: 12,
  },
});
