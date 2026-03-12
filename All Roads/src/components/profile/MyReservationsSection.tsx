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
import { colors, Spacing, TextStyles } from '../../theme';
import { RootStackParamList } from '../../navigation/types';
import { CancelReservationModal } from '../facilities/CancelReservationModal';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Reservation {
  id: string;
  status: string;
  totalPrice: number;
  usedForEventId: string | null;
  cancellationStatus: string | null;
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
  const [isExpanded, setIsExpanded] = useState(true);
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
        <ActivityIndicator size="small" color={colors.grass} />
      </View>
    );
  }

  if (unusedReservations.length === 0) {
    return null; // Don't show section if no unused reservations
  }

  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <View style={styles.sectionHeaderLeft}>
          <Ionicons name="calendar" size={20} color={colors.grass} />
          <Text style={styles.sectionTitle}>My Reservations</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{unusedReservations.length}</Text>
          </View>
        </View>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={24}
          color={colors.soft}
        />
      </TouchableOpacity>

      {isExpanded && (
        <>
          {unusedReservations.map((reservation) => (
            <View key={reservation.id} style={styles.reservationRow}>
              <View style={styles.compactCard}>
                <TouchableOpacity
                  style={styles.compactCardTouchable}
                  onPress={() => {
                    // Navigate to facility details
                    (navigation as any).navigate('FacilityDetails', {
                      facilityId: reservation.timeSlot.court.facility.id,
                    });
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.compactCardContent}>
                    <View style={styles.compactCardHeader}>
                      <Ionicons name="location" size={20} color={colors.grass} />
                      <Text style={styles.compactCardTitle} numberOfLines={1}>
                        {reservation.timeSlot.court.facility.name}
                      </Text>
                    </View>
                    <Text style={styles.compactCardSubtitle} numberOfLines={1}>
                      {reservation.timeSlot.court.name} • {formatDate(reservation.timeSlot.date)}
                    </Text>
                    <View style={styles.timeContainer}>
                      <Ionicons name="time-outline" size={14} color={colors.soft} />
                      <Text style={styles.timeText}>
                        {formatTime(reservation.timeSlot.startTime)} - {formatTime(reservation.timeSlot.endTime)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
                
                {reservation.cancellationStatus === 'pending_cancellation' ? (
                  <View style={styles.pendingBadge}>
                    <Ionicons name="time-outline" size={16} color={colors.court} />
                    <Text style={styles.pendingText}>Pending{'\n'}Cancellation</Text>
                  </View>
                ) : (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.createEventButton}
                      onPress={() => handleCreateEvent(reservation)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add-circle" size={20} color={colors.grass} />
                      <Text style={styles.createEventText}>Create</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => handleCancelReservation(reservation)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close-circle" size={20} color={colors.track} />
                      <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          ))}
        </>
      )}

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

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.background,
    marginBottom: Spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: colors.chalk,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionTitle: {
    ...TextStyles.bodyLarge,
    fontWeight: '600',
    color: colors.ink,
    marginLeft: Spacing.sm,
  },
  countBadge: {
    backgroundColor: colors.grass + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: Spacing.sm,
  },
  countBadgeText: {
    ...TextStyles.caption,
    color: colors.grass,
    fontWeight: '700',
    fontSize: 11,
  },
  loadingContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  reservationRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: colors.background,
  },
  compactCardTouchable: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  compactCardContent: {
    flex: 1,
  },
  compactCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  compactCardTitle: {
    ...TextStyles.bodyLarge,
    fontWeight: '600',
    color: colors.ink,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  compactCardSubtitle: {
    ...TextStyles.body,
    color: colors.soft,
    marginBottom: Spacing.xs,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.xs,
  },
  timeText: {
    ...TextStyles.caption,
    color: colors.soft,
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  createEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    backgroundColor: colors.grass + '10',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.grass + '30',
    minWidth: 80,
  },
  createEventText: {
    ...TextStyles.caption,
    color: colors.grass,
    fontWeight: '600',
    marginLeft: 4,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    backgroundColor: colors.track + '10',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.track + '30',
    minWidth: 80,
  },
  cancelText: {
    ...TextStyles.caption,
    color: colors.track,
    fontWeight: '600',
    marginLeft: 4,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: colors.court + '15',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.court + '40',
    minWidth: 100,
  },
  pendingText: {
    ...TextStyles.caption,
    color: colors.court,
    fontWeight: '700',
    marginLeft: 6,
    textAlign: 'center',
    lineHeight: 14,
  },
});
