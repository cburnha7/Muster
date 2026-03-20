import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/types';
import { CancelReservationModal } from '../facilities/CancelReservationModal';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { colors, fonts, Spacing } from '../../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Reservation {
  id: string;
  status: string;
  totalPrice: number;
  usedForEventId: string | null;
  cancellationStatus: string | null;
  bookingSessionId: string | null;
  recurringGroupId: string | null;
  timeSlot: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    court: {
      id: string;
      name: string;
      sportType: string;
      facility: {
        id: string;
        name: string;
      };
    };
  };
}

interface MyReservationsSectionProps {
  userId: string;
}

export function MyReservationsSection({ userId }: MyReservationsSectionProps) {
  const navigation = useNavigation<NavigationProp>();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

  useEffect(() => {
    loadReservations();
  }, [userId]);

  // Reload reservations when parent screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 MyReservationsSection - reloading reservations on focus');
      loadReservations();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId])
  );

  const loadReservations = async () => {
    try {
      setLoading(true);
      // Remove pagination - fetch all reservations
      const url = `${process.env.EXPO_PUBLIC_API_URL}/rentals/my-rentals?userId=${userId}&upcoming=true`;
      console.log('MyReservationsSection: Fetching from:', url);
      
      const response = await fetch(url);

      console.log('MyReservationsSection: Response status:', response.status);
      
      if (!response.ok) {
        throw new Error('Failed to load reservations');
      }

      const data = await response.json();
      console.log('MyReservationsSection: Received data:', data);
      console.log('MyReservationsSection: Data length:', data.length);
      setReservations(data);
    } catch (error) {
      console.error('Load reservations error:', error);
      Alert.alert('Error', 'Failed to load reservations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = (reservation: Reservation) => {
    // Navigate to Events stack, then to CreateEvent screen
    (navigation as any).navigate('Events', {
      screen: 'CreateEvent',
      params: {
        fromReservation: true,
        facilityId: reservation.timeSlot.court.facility.id,
        facilityName: reservation.timeSlot.court.facility.name,
        courtId: reservation.timeSlot.court.id,
        courtName: reservation.timeSlot.court.name,
        courtSportType: reservation.timeSlot.court.sportType,
        timeSlotId: reservation.timeSlot.id,
        rentalId: reservation.id,
        reservedDate: reservation.timeSlot.date,
        reservedStartTime: reservation.timeSlot.startTime,
        reservedEndTime: reservation.timeSlot.endTime,
      },
    });
  };

  const handleCancelReservation = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setShowCancelModal(true);
  };

  const handleConfirmCancellation = async (reason: string) => {
    if (!selectedReservation) return;

    try {
      const url = `${process.env.EXPO_PUBLIC_API_URL}/rentals/${selectedReservation.id}/request-cancellation`;
      console.log('Requesting cancellation:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          cancellationReason: reason,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to request cancellation');
      }

      const data = await response.json();
      console.log('Cancellation requested:', data);

      // Reload reservations to reflect the change
      await loadReservations();

      Alert.alert(
        'Cancellation Requested',
        'Your cancellation request has been submitted to the facility owner for approval. You will be notified once it is processed.'
      );
    } catch (error) {
      console.error('Cancel reservation error:', error);
      throw error;
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (time: string | undefined) => {
    if (!time) return 'N/A';
    const timeParts = time.split(':');
    const hours = timeParts[0];
    const minutes = timeParts[1];
    if (!hours || !minutes) return 'N/A';
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const unusedReservations = reservations
    .filter((r) => {
      // Parse slot date and normalize to midnight UTC
      const slotDate = new Date(r.timeSlot.date);
      const slotDateOnly = Date.UTC(
        slotDate.getUTCFullYear(),
        slotDate.getUTCMonth(),
        slotDate.getUTCDate()
      );
      
      // Get today's date normalized to midnight UTC
      const now = new Date();
      const todayDateOnly = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate()
      );
      
      const isUpcoming = slotDateOnly >= todayDateOnly;
      const isConfirmed = r.status === 'confirmed';
      const isUnused = !r.usedForEventId;
      
      console.log('MyReservationsSection: Filtering reservation:', {
        id: r.id,
        originalDate: r.timeSlot.date,
        slotDateOnly: new Date(slotDateOnly).toISOString(),
        todayDateOnly: new Date(todayDateOnly).toISOString(),
        isUpcoming,
        isConfirmed,
        isUnused,
        passes: isUpcoming && isConfirmed && isUnused,
      });
      
      return isUpcoming && isConfirmed && isUnused;
    })
    .sort((a, b) => {
      // Sort by date first (soonest to latest)
      const dateA = new Date(a.timeSlot.date).getTime();
      const dateB = new Date(b.timeSlot.date).getTime();
      
      if (dateA !== dateB) {
        return dateA - dateB;
      }
      
      // If same date, sort by start time (earliest to latest)
      const timeA = a.timeSlot.startTime;
      const timeB = b.timeSlot.startTime;
      return timeA.localeCompare(timeB);
    });

  console.log('MyReservationsSection: Total reservations:', reservations.length);
  console.log('MyReservationsSection: Unused reservations:', unusedReservations.length);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.pine} />
      </View>
    );
  }

  if (unusedReservations.length === 0) {
    return null; // Don't show section if no unused reservations
  }

  return (
    <View>
      <CollapsibleSection title="My Reservations" count={unusedReservations.length}>
        <View style={styles.sectionInner}>
          {(() => {
            // Group by recurringGroupId first, then bookingSessionId, then singles
            const groups: { key: string; type: 'recurring' | 'session' | 'single'; items: typeof unusedReservations }[] = [];
            const recurringMap = new Map<string, typeof unusedReservations>();
            const sessionMap = new Map<string, typeof unusedReservations>();
            const singles: typeof unusedReservations = [];

            for (const r of unusedReservations) {
              if (r.recurringGroupId) {
                const existing = recurringMap.get(r.recurringGroupId) || [];
                existing.push(r);
                recurringMap.set(r.recurringGroupId, existing);
              } else if (r.bookingSessionId) {
                const existing = sessionMap.get(r.bookingSessionId) || [];
                existing.push(r);
                sessionMap.set(r.bookingSessionId, existing);
              } else {
                singles.push(r);
              }
            }

            // Add recurring groups
            for (const [groupId, items] of recurringMap) {
              groups.push({ key: groupId, type: 'recurring', items });
            }
            // Add session groups
            for (const [sessionId, items] of sessionMap) {
              groups.push({ key: sessionId, type: 'session', items });
            }
            // Add singles
            for (const r of singles) {
              groups.push({ key: r.id, type: 'single', items: [r] });
            }

            return groups.map((group) => {
              if (group.type === 'recurring') {
                return (
                  <RecurringSeriesGroup
                    key={group.key}
                    groupId={group.key}
                    reservations={group.items}
                    userId={userId}
                    navigation={navigation}
                    formatDate={formatDate}
                    formatTime={formatTime}
                    onCreateEvent={handleCreateEvent}
                    onCancelReservation={handleCancelReservation}
                    onSeriesCancelled={loadReservations}
                  />
                );
              }
              if (group.items.length > 1) {
                return (
                  <SessionGroup
                    key={group.key}
                    sessionId={group.key}
                    reservations={group.items}
                    navigation={navigation}
                    formatDate={formatDate}
                    formatTime={formatTime}
                    onCreateEvent={handleCreateEvent}
                    onCancelReservation={handleCancelReservation}
                  />
                );
              }
              return (
                <ReservationRow
                  key={group.key}
                  reservation={group.items[0]!}
                  navigation={navigation}
                  formatDate={formatDate}
                  formatTime={formatTime}
                  onCreateEvent={handleCreateEvent}
                  onCancelReservation={handleCancelReservation}
                />
              );
            });
          })()}
        </View>
      </CollapsibleSection>

      <CancelReservationModal
        visible={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setSelectedReservation(null);
        }}
        onConfirm={handleConfirmCancellation}
        reservationDetails={
          selectedReservation
            ? {
                facilityName: selectedReservation.timeSlot.court.facility.name,
                courtName: selectedReservation.timeSlot.court.name,
                date: formatDate(selectedReservation.timeSlot.date),
                time: `${formatTime(selectedReservation.timeSlot.startTime)} - ${formatTime(selectedReservation.timeSlot.endTime)}`,
              }
            : {
                facilityName: '',
                courtName: '',
                date: '',
                time: '',
              }
        }
      />
    </View>
  );
}

// --- Helper components for grouped display ---

interface RowProps {
  reservation: Reservation;
  navigation: any;
  formatDate: (d: string | undefined) => string;
  formatTime: (t: string | undefined) => string;
  onCreateEvent: (r: Reservation) => void;
  onCancelReservation: (r: Reservation) => void;
}

function ReservationRow({ reservation, navigation, formatDate, formatTime, onCreateEvent, onCancelReservation }: RowProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => (navigation as any).navigate('FacilityDetails', { facilityId: reservation.timeSlot.court.facility.id })}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>{reservation.timeSlot.court.facility.name}</Text>
      </View>
      <Text style={styles.cardSubtitle} numberOfLines={1}>
        {reservation.timeSlot.court.name} · {formatDate(reservation.timeSlot.date)}
      </Text>
      <View style={styles.cardTimeRow}>
        <Ionicons name="time-outline" size={14} color={colors.inkFaint} />
        <Text style={styles.cardTimeText}>
          {formatTime(reservation.timeSlot.startTime)} – {formatTime(reservation.timeSlot.endTime)}
        </Text>
      </View>
      {reservation.cancellationStatus === 'pending_cancellation' ? (
        <View style={styles.pendingBadge}>
          <Ionicons name="time-outline" size={14} color="#E8A030" />
          <Text style={styles.pendingText}>Pending Cancellation</Text>
        </View>
      ) : (
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.createEventButton} onPress={() => onCreateEvent(reservation)} activeOpacity={0.7}>
            <Ionicons name="add-circle" size={18} color={colors.pine} />
            <Text style={styles.createEventText}>Create Event</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={() => onCancelReservation(reservation)} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={18} color={colors.heart} />
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

interface SessionGroupProps {
  sessionId: string;
  reservations: Reservation[];
  navigation: any;
  formatDate: (d: string | undefined) => string;
  formatTime: (t: string | undefined) => string;
  onCreateEvent: (r: Reservation) => void;
  onCancelReservation: (r: Reservation) => void;
}

function SessionGroup({ sessionId, reservations, navigation, formatDate, formatTime, onCreateEvent, onCancelReservation }: SessionGroupProps) {
  const [expanded, setExpanded] = React.useState(false);
  const totalPrice = reservations.reduce((sum, r) => sum + r.totalPrice, 0);

  return (
    <View style={styles.groupCard}>
      <TouchableOpacity style={styles.groupHeader} onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
        <Ionicons name="layers" size={18} color={colors.pine} />
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.groupTitle}>Bulk Booking · {reservations.length} slots</Text>
          <Text style={styles.groupSubtitle}>${totalPrice.toFixed(2)} total</Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.inkFaint} />
      </TouchableOpacity>
      {expanded && reservations.map((r) => (
        <ReservationRow
          key={r.id}
          reservation={r}
          navigation={navigation}
          formatDate={formatDate}
          formatTime={formatTime}
          onCreateEvent={onCreateEvent}
          onCancelReservation={onCancelReservation}
        />
      ))}
    </View>
  );
}

interface RecurringSeriesGroupProps {
  groupId: string;
  reservations: Reservation[];
  userId: string;
  navigation: any;
  formatDate: (d: string | undefined) => string;
  formatTime: (t: string | undefined) => string;
  onCreateEvent: (r: Reservation) => void;
  onCancelReservation: (r: Reservation) => void;
  onSeriesCancelled: () => void;
}

function RecurringSeriesGroup({
  groupId,
  reservations,
  userId,
  navigation,
  formatDate,
  formatTime,
  onCreateEvent,
  onCancelReservation,
  onSeriesCancelled,
}: RecurringSeriesGroupProps) {
  const [expanded, setExpanded] = React.useState(false);
  const [cancelling, setCancelling] = React.useState(false);
  const totalPrice = reservations.reduce((sum, r) => sum + r.totalPrice, 0);

  const handleCancelSeries = () => {
    Alert.alert(
      'Cancel Recurring Series',
      `Cancel all ${reservations.length} remaining reservations in this series?`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Series',
          style: 'destructive',
          onPress: async () => {
            try {
              setCancelling(true);
              const url = `${process.env.EXPO_PUBLIC_API_URL}/rentals/recurring/${groupId}`;
              const response = await fetch(url, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
              });
              if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to cancel series');
              }
              const data = await response.json();
              Alert.alert('Series Cancelled', data.message);
              onSeriesCancelled();
            } catch (error) {
              const msg = error instanceof Error ? error.message : 'Failed to cancel series';
              Alert.alert('Error', msg);
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.groupCard}>
      <TouchableOpacity style={styles.groupHeader} onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
        <Ionicons name="repeat" size={18} color={colors.pine} />
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.groupTitle}>Recurring · {reservations.length} slots</Text>
          <Text style={styles.groupSubtitle}>${totalPrice.toFixed(2)} total</Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.inkFaint} />
      </TouchableOpacity>
      {expanded && (
        <>
          {reservations.map((r) => (
            <ReservationRow
              key={r.id}
              reservation={r}
              navigation={navigation}
              formatDate={formatDate}
              formatTime={formatTime}
              onCreateEvent={onCreateEvent}
              onCancelReservation={onCancelReservation}
            />
          ))}
          <TouchableOpacity
            style={styles.cancelSeriesButton}
            onPress={handleCancelSeries}
            activeOpacity={0.7}
            disabled={cancelling}
          >
            <Ionicons name="close-circle" size={16} color={colors.heart} />
            <Text style={styles.cancelSeriesText}>
              {cancelling ? 'Cancelling...' : 'Cancel Entire Series'}
            </Text>
          </TouchableOpacity>
        </>
      )}
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
  // Individual reservation card
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
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontFamily: fonts.label,
    fontSize: 15,
    color: colors.ink,
    flex: 1,
  },
  cardSubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkFaint,
    marginBottom: 4,
  },
  cardTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  cardTimeText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkFaint,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  createEventButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: `${colors.pine}10`,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${colors.pine}30`,
    gap: 6,
  },
  createEventText: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: colors.pine,
  },
  cancelButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: `${colors.heart}10`,
    borderWidth: 1,
    borderColor: `${colors.heart}30`,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#E8A03015',
    borderRadius: 6,
    gap: 4,
  },
  pendingText: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: '#E8A030',
  },
  // Group cards (session / recurring)
  groupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: colors.chalk,
  },
  groupTitle: {
    fontFamily: fonts.label,
    fontSize: 14,
    color: colors.ink,
  },
  groupSubtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.pine,
    marginTop: 1,
  },
  cancelSeriesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: `${colors.inkFaint}20`,
    gap: 6,
  },
  cancelSeriesText: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: colors.heart,
  },
});
