import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { colors, fonts, Spacing } from '../../theme';
import { API_BASE_URL } from '../../services/api/config';

interface OwnerRental {
  id: string;
  status: string;
  totalPrice: number;
  usedForEventId: string | null;
  cancellationStatus: string | null;
  timeSlot: {
    date: string;
    startTime: string;
    endTime: string;
    court: {
      id: string;
      name: string;
      sportType: string;
    };
  };
  user: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface OwnerReservationsSectionProps {
  facilityId: string;
}

export function OwnerReservationsSection({ facilityId }: OwnerReservationsSectionProps) {
  const navigation = useNavigation();
  const [rentals, setRentals] = useState<OwnerRental[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRentals = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const url = `${API_BASE_URL}/rentals/facilities/${facilityId}/rentals?status=confirmed&startDate=${today}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to load reservations');
      const data: OwnerRental[] = await response.json();

      // Filter to truly upcoming (today's past slots excluded)
      const now = new Date();
      const upcoming = data.filter((r) => {
        const parts = r.timeSlot.date.split('T')[0]!.split('-');
        const slotYear = parseInt(parts[0]!, 10);
        const slotMonth = parseInt(parts[1]!, 10) - 1;
        const slotDay = parseInt(parts[2]!, 10);

        const todayNum = now.getFullYear() * 10000 + now.getMonth() * 100 + now.getDate();
        const slotNum = slotYear * 10000 + slotMonth * 100 + slotDay;

        if (slotNum < todayNum) return false;
        if (slotNum === todayNum && r.timeSlot.endTime) {
          const [h, m] = r.timeSlot.endTime.split(':').map(Number);
          if ((h || 0) * 60 + (m || 0) <= now.getHours() * 60 + now.getMinutes()) return false;
        }
        return true;
      });

      upcoming.sort((a, b) => {
        const da = new Date(a.timeSlot.date).getTime();
        const db = new Date(b.timeSlot.date).getTime();
        if (da !== db) return da - db;
        return a.timeSlot.startTime.localeCompare(b.timeSlot.startTime);
      });

      setRentals(upcoming);
    } catch (err) {
      console.error('Load owner reservations error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRentals(); }, [facilityId]);
  useFocusEffect(React.useCallback(() => { loadRentals(); }, [facilityId]));

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    if (!hours || !minutes) return time;
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${hour % 12 || 12}:${minutes} ${ampm}`;
  };

  const handleViewEvent = (eventId: string) => {
    (navigation as any).navigate('Home', {
      screen: 'EventDetails',
      params: { eventId },
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.cobalt} />
      </View>
    );
  }

  if (rentals.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <CollapsibleSection title="Upcoming Reservations" count={rentals.length}>
        <View style={styles.sectionInner}>
          {rentals.map((r) => (
            <View key={r.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.courtName} numberOfLines={1}>
                  {r.timeSlot.court.name}
                </Text>
                <Text style={styles.price}>${r.totalPrice.toFixed(2)}</Text>
              </View>
              <Text style={styles.dateTime}>
                {formatDate(r.timeSlot.date)} · {formatTime(r.timeSlot.startTime)} – {formatTime(r.timeSlot.endTime)}
              </Text>
              <Text style={styles.playerName}>
                {r.user.firstName} {r.user.lastName}
              </Text>
              {r.usedForEventId ? (
                <TouchableOpacity
                  style={styles.eventBadge}
                  onPress={() => handleViewEvent(r.usedForEventId!)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="calendar" size={14} color={colors.ink} />
                  <Text style={styles.eventBadgeText}>Event Linked</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.noEventBadge}>
                  <Ionicons name="calendar-outline" size={14} color={colors.inkFaint} />
                  <Text style={styles.noEventBadgeText}>No Event</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </CollapsibleSection>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: Spacing.sm,
    marginHorizontal: 16,
  },
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  courtName: {
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
  dateTime: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkFaint,
    marginBottom: 2,
  },
  playerName: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkFaint,
    marginBottom: 8,
  },
  eventBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.ink + '15',
    gap: 4,
  },
  eventBadgeText: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.ink,
  },
  noEventBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.inkFaint + '15',
    gap: 4,
  },
  noEventBadgeText: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.inkFaint,
  },
});
