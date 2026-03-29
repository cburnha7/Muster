import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { colors, fonts, Spacing } from '../../theme';

interface PastReservation {
  id: string;
  status: string;
  totalPrice: number;
  usedForEventId: string | null;
  cancellationStatus: string | null;
  createdAt: string;
  timeSlot: {
    date: string;
    startTime: string;
    endTime: string;
    court: {
      name: string;
      sportType: string;
      facility: {
        name: string;
      };
    };
  };
}

interface PurchaseHistorySectionProps {
  userId: string;
}

export function PurchaseHistorySection({ userId }: PurchaseHistorySectionProps) {
  const [purchases, setPurchases] = useState<PastReservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPurchases();
  }, [userId]);

  useFocusEffect(
    React.useCallback(() => {
      loadPurchases();
    }, [userId])
  );

  const loadPurchases = async () => {
    try {
      setLoading(true);
      const url = `${process.env.EXPO_PUBLIC_API_URL}/rentals/my-rentals?userId=${userId}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to load purchase history');
      const data: PastReservation[] = await response.json();

      // Filter to past or cancelled/used reservations
      const now = new Date();
      const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

      const past = data.filter((r) => {
        const slotDate = new Date(r.timeSlot.date);
        const slotUTC = Date.UTC(slotDate.getUTCFullYear(), slotDate.getUTCMonth(), slotDate.getUTCDate());
        const isPast = slotUTC < todayUTC;
        const isCancelled = r.status === 'cancelled';
        const isUsed = !!r.usedForEventId;
        return isPast || isCancelled || isUsed;
      });

      // Sort newest first
      past.sort((a, b) => new Date(b.timeSlot.date).getTime() - new Date(a.timeSlot.date).getTime());
      setPurchases(past);
    } catch (error) {
      console.error('Load purchase history error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    if (!hours || !minutes) return time;
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${hour % 12 || 12}:${minutes} ${ampm}`;
  };

  const getStatusInfo = (r: PastReservation): { label: string; color: string; icon: keyof typeof Ionicons.glyphMap } => {
    if (r.status === 'cancelled' || r.cancellationStatus === 'approved') {
      return { label: 'Cancelled', color: '#FF3B30', icon: 'close-circle' };
    }
    if (r.cancellationStatus === 'pending_cancellation') {
      return { label: 'Pending Cancellation', color: '#E8A030', icon: 'time-outline' };
    }
    if (r.usedForEventId) {
      return { label: 'Used for Event', color: colors.cobalt, icon: 'checkmark-circle' };
    }
    return { label: 'Completed', color: colors.ink, icon: 'checkmark-done-circle' };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.cobalt} />
      </View>
    );
  }

  if (purchases.length === 0) return null;

  return (
    <View>
      <CollapsibleSection title="Purchase History" count={purchases.length} defaultExpanded={false}>
        <View style={styles.sectionInner}>
          {purchases.map((purchase) => {
            const status = getStatusInfo(purchase);
            return (
              <View key={purchase.id} style={styles.card}>
                <View style={styles.purchaseHeader}>
                  <Text style={styles.facilityName} numberOfLines={1}>
                    {purchase.timeSlot.court.facility.name}
                  </Text>
                  <Text style={styles.price}>${purchase.totalPrice.toFixed(2)}</Text>
                </View>
                <Text style={styles.courtName}>
                  {purchase.timeSlot.court.name} · {formatDate(purchase.timeSlot.date)}
                </Text>
                <Text style={styles.timeText}>
                  {formatTime(purchase.timeSlot.startTime)} – {formatTime(purchase.timeSlot.endTime)}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: status.color + '15' }]}>
                  <Ionicons name={status.icon} size={14} color={status.color} />
                  <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </CollapsibleSection>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionInner: {
    paddingHorizontal: Spacing.lg,
    gap: 8,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  purchaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  facilityName: {
    fontFamily: fonts.label,
    fontSize: 15,
    color: colors.ink,
    flex: 1,
    marginRight: 8,
  },
  price: {
    fontFamily: fonts.ui,
    fontSize: 15,
    color: colors.cobalt,
  },
  courtName: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkFaint,
    marginBottom: 2,
  },
  timeText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkFaint,
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    fontFamily: fonts.label,
    fontSize: 11,
  },
});
