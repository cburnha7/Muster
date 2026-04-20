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
import { tokenColors } from '../../theme/tokens';
import { API_BASE_URL } from '../../services/api/config';

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
  const [selectedReservation, setSelectedReservation] =
    useState<Reservation | null>(null);

  useEffect(() => {
    loadReservations();
  }, [userId]);

  useFocusEffect(
    React.useCallback(() => {
      loadReservations();
    }, [userId])
  );

  const loadReservations = async () => {
    try {
      setLoading(true);
      const url = `${API_BASE_URL}/rentals/my-rentals?userId=${userId}&upcoming=true`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to load reservations');
      const data = await response.json();
      setReservations(data);
    } catch (error) {
      console.error('Load reservations error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = (reservation: Reservation) => {
    (navigation as any).navigate('Home', {
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

  const handleViewEvent = (eventId: string) => {
    (navigation as any).navigate('Home', {
      screen: 'EventDetails',
      params: { eventId },
    });
  };

  const handleCancelReservation = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setShowCancelModal(true);
  };

  const handleConfirmCancellation = async (reason: string) => {
    if (!selectedReservation) return;
    try {
      const url = `${API_BASE_URL}/rentals/${selectedReservation.id}/request-cancellation`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, cancellationReason: reason }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to request cancellation');
      }
      await loadReservations();
      Alert.alert(
        'Cancellation Requested',
        'Your cancellation request has been submitted to the facility owner for approval.'
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
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  };

  const formatTime = (time: string | undefined) => {
    if (!time) return 'N/A';
    const [hours, minutes] = time.split(':');
    if (!hours || !minutes) return 'N/A';
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${hour % 12 || 12}:${minutes} ${ampm}`;
  };

  // Filter to upcoming confirmed reservations (include used ones for event link)
  const upcomingReservations = reservations
    .filter(r => {
      if (r.status !== 'confirmed') return false;

      // Parse the slot date as local (YYYY-MM-DD → year, month, day)
      const parts = r.timeSlot.date.split('T')[0]!.split('-');
      const slotYear = parseInt(parts[0]!, 10);
      const slotMonth = parseInt(parts[1]!, 10) - 1;
      const slotDay = parseInt(parts[2]!, 10);

      const now = new Date();
      const todayYear = now.getFullYear();
      const todayMonth = now.getMonth();
      const todayDay = now.getDate();

      // Compare as local calendar dates
      const slotDateNum = slotYear * 10000 + slotMonth * 100 + slotDay;
      const todayDateNum = todayYear * 10000 + todayMonth * 100 + todayDay;

      if (slotDateNum < todayDateNum) return false;

      // For today's slots, check if the end time has already passed
      if (slotDateNum === todayDateNum && r.timeSlot.endTime) {
        const [h, m] = r.timeSlot.endTime.split(':').map(Number);
        const endMinutes = (h || 0) * 60 + (m || 0);
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        if (endMinutes <= nowMinutes) return false;
      }

      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.timeSlot.date).getTime();
      const dateB = new Date(b.timeSlot.date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return a.timeSlot.startTime.localeCompare(b.timeSlot.startTime);
    });

  // Group by facility
  const facilityGroups = new Map<
    string,
    { name: string; id: string; items: Reservation[] }
  >();
  for (const r of upcomingReservations) {
    const fId = r.timeSlot.court.facility.id;
    const existing = facilityGroups.get(fId);
    if (existing) {
      existing.items.push(r);
    } else {
      facilityGroups.set(fId, {
        name: r.timeSlot.court.facility.name,
        id: fId,
        items: [r],
      });
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.cobalt} />
      </View>
    );
  }

  if (upcomingReservations.length === 0) return null;

  return (
    <View>
      <CollapsibleSection
        title="My Reservations"
        count={upcomingReservations.length}
      >
        <View style={styles.sectionInner}>
          {Array.from(facilityGroups.values()).map(group => (
            <View key={group.id} style={styles.facilityGroup}>
              <TouchableOpacity
                style={styles.facilityHeader}
                onPress={() =>
                  (navigation as any).navigate('FacilityDetails', {
                    facilityId: group.id,
                  })
                }
                activeOpacity={0.7}
              >
                <Text style={styles.facilityName} numberOfLines={1}>
                  {group.name}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.inkFaint}
                />
              </TouchableOpacity>
              {group.items.map(r => (
                <View key={r.id} style={styles.slotRow}>
                  <View style={styles.slotInfo}>
                    <Text style={styles.slotCourt}>
                      {r.timeSlot.court.name}
                    </Text>
                    <Text style={styles.slotDateTime}>
                      {formatDate(r.timeSlot.date)} ·{' '}
                      {formatTime(r.timeSlot.startTime)} –{' '}
                      {formatTime(r.timeSlot.endTime)}
                    </Text>
                  </View>
                  {r.cancellationStatus === 'pending_cancellation' ? (
                    <View style={styles.pendingBadge}>
                      <Ionicons
                        name="time-outline"
                        size={14}
                        color={tokenColors.warning}
                      />
                      <Text style={styles.pendingText}>Pending</Text>
                    </View>
                  ) : r.usedForEventId ? (
                    <TouchableOpacity
                      style={styles.viewEventButton}
                      onPress={() => handleViewEvent(r.usedForEventId!)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="calendar" size={16} color={colors.ink} />
                      <Text style={styles.viewEventText}>View Event</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.slotActions}>
                      <TouchableOpacity
                        style={styles.createButton}
                        onPress={() => handleCreateEvent(r)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="add-circle"
                          size={16}
                          color={colors.cobalt}
                        />
                        <Text style={styles.createButtonText}>
                          Create Event
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => handleCancelReservation(r)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="close-circle"
                          size={16}
                          color={colors.heart}
                        />
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </View>
          ))}
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
            : { facilityName: '', courtName: '', date: '', time: '' }
        }
      />
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
  facilityGroup: {
    backgroundColor: tokenColors.surface,
    borderRadius: 12,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
    overflow: 'hidden',
  },
  facilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    gap: 6,
  },
  facilityName: {
    fontFamily: fonts.label,
    fontSize: 14,
    color: colors.ink,
    flex: 1,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: `${colors.inkFaint}20`,
  },
  slotInfo: {
    flex: 1,
    marginRight: 8,
  },
  slotCourt: {
    fontFamily: fonts.label,
    fontSize: 13,
    color: colors.ink,
  },
  slotDateTime: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
    marginTop: 2,
  },
  slotActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: `${colors.cobalt}10`,
    gap: 4,
  },
  createButtonText: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: colors.cobalt,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: `${colors.heart}10`,
    gap: 4,
  },
  cancelButtonText: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: colors.heart,
  },
  viewEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: `${colors.ink}10`,
    gap: 4,
  },
  viewEventText: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: colors.ink,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: `${tokenColors.warning}15`,
    borderRadius: 6,
    gap: 4,
  },
  pendingText: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: tokenColors.warning,
  },
});
