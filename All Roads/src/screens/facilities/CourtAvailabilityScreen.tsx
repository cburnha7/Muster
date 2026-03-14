import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Calendar, DateData } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { colors, Spacing, TextStyles, ComponentStyles } from '../../theme';
import { FacilitiesStackParamList } from '../../navigation/types';
import {
  calendarTheme,
  formatDateForCalendar,
  formatTime12,
  createMarkedDates,
} from '../../utils/calendarUtils';
import { TimeSlotGrid, RentalConfirmationModal } from '../../components/facilities';
import type { TimeSlot } from '../../components/facilities/TimeSlotGrid';
import { useAuth } from '../../context/AuthContext';

type CourtAvailabilityScreenNavigationProp = NativeStackNavigationProp<
  FacilitiesStackParamList,
  'CourtAvailability'
>;
type CourtAvailabilityScreenRouteProp = RouteProp<FacilitiesStackParamList, 'CourtAvailability'>;

interface Court {
  id: string;
  name: string;
  sportType: string;
  capacity: number;
  isIndoor: boolean;
  pricePerHour: number | null;
}

interface AvailabilityData {
  date: Date;
  courtId: string;
  courtName: string;
  totalSlots: number;
  availableSlots: number;
  slots: TimeSlot[];
}

export function CourtAvailabilityScreen() {
  const navigation = useNavigation<CourtAvailabilityScreenNavigationProp>();
  const route = useRoute<CourtAvailabilityScreenRouteProp>();
  const { user } = useAuth();

  const { facilityId, facilityName, courtId } = route.params;

  const [selectedDate, setSelectedDate] = useState<string>(formatDateForCalendar(new Date()));
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [availabilityData, setAvailabilityData] = useState<AvailabilityData | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [markedDates, setMarkedDates] = useState<any>({});

  // Load courts on mount
  useEffect(() => {
    loadCourts();
  }, [facilityId]);

  // Load availability when court or date changes
  useEffect(() => {
    if (selectedCourt) {
      loadAvailability(selectedCourt.id, selectedDate);
    }
  }, [selectedCourt, selectedDate]);

  const loadCourts = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/facilities/${facilityId}/courts`
      );

      if (!response.ok) {
        throw new Error('Failed to load courts');
      }

      const data = await response.json();
      setCourts(data);

      // Select the court from params or first court
      if (courtId) {
        const court = data.find((c: Court) => c.id === courtId);
        setSelectedCourt(court || data[0]);
      } else {
        setSelectedCourt(data[0]);
      }
    } catch (error) {
      console.error('Load courts error:', error);
      Alert.alert('Error', 'Failed to load courts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailability = async (courtId: string, date: string) => {
    try {
      setLoadingSlots(true);
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/facilities/${facilityId}/courts/${courtId}/availability?date=${date}`
      );

      if (!response.ok) {
        throw new Error('Failed to load availability');
      }

      const data: AvailabilityData = await response.json();
      setAvailabilityData(data);

      // Update marked dates for calendar
      updateMarkedDates(data.slots);
    } catch (error) {
      console.error('Load availability error:', error);
      Alert.alert('Error', 'Failed to load availability. Please try again.');
    } finally {
      setLoadingSlots(false);
    }
  };

  const updateMarkedDates = (_timeSlots: TimeSlot[]) => {
    // For now, just mark the selected date
    // In a full implementation, we would fetch availability for the entire month
    const marked = createMarkedDates([], [], [], selectedDate);
    setMarkedDates(marked);
  };

  const handleDateSelect = (day: DateData) => {
    setSelectedDate(day.dateString);
    setSelectedSlots([]);
  };

  const handleCourtSelect = (court: Court) => {
    setSelectedCourt(court);
    setSelectedSlots([]);
  };

  const handleSlotPress = (slot: TimeSlot) => {
    if (slot.status === 'available') {
      // Toggle slot selection
      setSelectedSlots(prev => {
        const isSelected = prev.some(s => s.id === slot.id);
        if (isSelected) {
          return prev.filter(s => s.id !== slot.id);
        } else {
          return [...prev, slot];
        }
      });
    } else {
      Alert.alert(
        'Unavailable',
        slot.status === 'blocked'
          ? `This time slot is blocked${slot.blockReason ? `: ${slot.blockReason}` : '.'}`
          : 'This time slot is already rented.'
      );
    }
  };

  const handleBookRental = () => {
    if (selectedSlots.length === 0 || !selectedCourt) {
      return;
    }
    setShowConfirmationModal(true);
  };

  const handleConfirmRental = async () => {
    if (selectedSlots.length === 0 || !selectedCourt) {
      return;
    }

    if (!user) {
      Alert.alert('Authentication Required', 'Please log in to book a time slot.');
      return;
    }

    try {
      // Book all selected slots
      const bookingPromises = selectedSlots.map(slot =>
        fetch(
          `${process.env.EXPO_PUBLIC_API_URL}/facilities/${facilityId}/courts/${selectedCourt.id}/slots/${slot.id}/rent`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId: user.id }),
          }
        )
      );

      const responses = await Promise.all(bookingPromises);

      // Check if all bookings succeeded
      const failedBookings = responses.filter(r => !r.ok);
      if (failedBookings.length > 0) {
        const firstFailed = failedBookings[0];
        if (firstFailed) {
          const errorResponse = await firstFailed.json();
          throw new Error(errorResponse.error || 'Failed to book some time slots');
        }
        throw new Error('Failed to book some time slots');
      }

      setShowConfirmationModal(false);

      const slotCount = selectedSlots.length;
      const firstSlot = selectedSlots[0];
      const lastSlot = selectedSlots[slotCount - 1];
      
      if (!firstSlot || !lastSlot) {
        throw new Error('Invalid slot selection');
      }

      const timeRange = slotCount === 1
        ? `${formatTime12(firstSlot.startTime)} - ${formatTime12(firstSlot.endTime)}`
        : `${formatTime12(firstSlot.startTime)} - ${formatTime12(lastSlot.endTime)}`;

      // Reload availability to show updated slots
      if (selectedCourt) {
        await loadAvailability(selectedCourt.id, selectedDate);
      }
      setSelectedSlots([]);

      Alert.alert(
        'Booking Confirmed!',
        `Your ${slotCount} time slot${slotCount > 1 ? 's have' : ' has'} been reserved for ${timeRange} on ${selectedDate}.`,
        [
          {
            text: 'View My Rentals',
            onPress: () => {
              navigation.navigate('MyRentals');
            },
          },
          {
            text: 'Continue Booking',
            style: 'cancel',
          },
        ]
      );
    } catch (error: any) {
      console.error('Book rental error:', error);
      Alert.alert('Booking Failed', error.message || 'Failed to book rental. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.grass} />
        <Text style={styles.loadingText}>Loading courts...</Text>
      </View>
    );
  }

  if (courts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="basketball-outline" size={64} color={colors.soft} />
        <Text style={styles.emptyTitle}>No Courts Available</Text>
        <Text style={styles.emptySubtitle}>
          This facility doesn't have any courts set up yet.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.facilityName}>{facilityName}</Text>
          <Text style={styles.subtitle}>Select a date and time to book</Text>
        </View>

        {/* Court Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Court</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.courtList}>
            {courts.map((court) => (
              <TouchableOpacity
                key={court.id}
                style={[
                  styles.courtCard,
                  selectedCourt?.id === court.id && styles.courtCardSelected,
                ]}
                onPress={() => handleCourtSelect(court)}
              >
                <View style={styles.courtCardHeader}>
                  <Ionicons
                    name={court.isIndoor ? 'home' : 'sunny'}
                    size={20}
                    color={selectedCourt?.id === court.id ? colors.grass : colors.soft}
                  />
                  <Text
                    style={[
                      styles.courtName,
                      selectedCourt?.id === court.id && styles.courtNameSelected,
                    ]}
                  >
                    {court.name}
                  </Text>
                </View>
                <Text style={styles.courtSportType}>{court.sportType}</Text>
                {court.pricePerHour && (
                  <Text style={styles.courtPrice}>${court.pricePerHour}/hr</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Calendar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Date</Text>
          <Calendar
            current={selectedDate}
            onDayPress={handleDateSelect}
            markedDates={markedDates}
            minDate={formatDateForCalendar(new Date())}
            theme={calendarTheme}
            style={styles.calendar}
          />
        </View>

        {/* Time Slots */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Available Time Slots</Text>
            {availabilityData && (
              <Text style={styles.availabilityCount}>
                {availabilityData.availableSlots} of {availabilityData.totalSlots} available
              </Text>
            )}
          </View>

          {loadingSlots ? (
            <View style={styles.loadingSlotsContainer}>
              <ActivityIndicator size="small" color={colors.grass} />
              <Text style={styles.loadingSlotsText}>Loading time slots...</Text>
            </View>
          ) : availabilityData && availabilityData.slots.length > 0 ? (
            <TimeSlotGrid
              timeSlots={availabilityData.slots}
              onSlotPress={handleSlotPress}
              selectable={true}
              selectedSlots={selectedSlots.map(s => s.id!)}
              currentUserId={user?.id}
            />
          ) : (
            <View style={styles.noSlotsContainer}>
              <Ionicons name="calendar-outline" size={48} color={colors.soft} />
              <Text style={styles.noSlotsText}>No time slots available for this date</Text>
            </View>
          )}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Legend</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.grass }]} />
              <Text style={styles.legendText}>Available</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.sky }]} />
              <Text style={styles.legendText}>Reserved</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.track }]} />
              <Text style={styles.legendText}>Blocked</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Book Button */}
      {selectedSlots.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.selectedSlotInfo}>
            <Text style={styles.selectedSlotLabel}>
              Selected: {selectedSlots.length} time slot{selectedSlots.length > 1 ? 's' : ''}
            </Text>
            {(() => {
              const firstSlot = selectedSlots[0];
              const lastSlot = selectedSlots[selectedSlots.length - 1];
              if (!firstSlot || !lastSlot) return null;
              
              return selectedSlots.length === 1 ? (
                <Text style={styles.selectedSlotTime}>
                  {formatTime12(firstSlot.startTime)} - {formatTime12(firstSlot.endTime)}
                </Text>
              ) : (
                <Text style={styles.selectedSlotTime}>
                  {formatTime12(firstSlot.startTime)} - {formatTime12(lastSlot.endTime)}
                </Text>
              );
            })()}
            <Text style={styles.selectedSlotPrice}>
              Total: ${selectedSlots.reduce((sum, slot) => sum + (slot.price || 0), 0).toFixed(2)}
            </Text>
          </View>
          <TouchableOpacity style={styles.bookButton} onPress={handleBookRental}>
            <Text style={styles.bookButtonText}>
              Book {selectedSlots.length} Slot{selectedSlots.length > 1 ? 's' : ''}
            </Text>
            <Ionicons name="arrow-forward" size={20} color={colors.chalk} />
          </TouchableOpacity>
        </View>
      )}

      {/* Confirmation Modal */}
      {(() => {
        const firstSlot = selectedSlots[0];
        const lastSlot = selectedSlots[selectedSlots.length - 1];
        if (!firstSlot || !lastSlot || !selectedCourt) return null;
        
        return (
          <RentalConfirmationModal
            visible={showConfirmationModal}
            onClose={() => setShowConfirmationModal(false)}
            onConfirm={handleConfirmRental}
            facilityName={facilityName}
            courtName={selectedCourt.name}
            date={selectedDate}
            startTime={firstSlot.startTime}
            endTime={lastSlot.endTime}
            price={selectedSlots.reduce((sum, slot) => sum + (slot.price || selectedCourt.pricePerHour || 0), 0)}
            slotCount={selectedSlots.length}
          />
        );
      })()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: Spacing.md,
    ...TextStyles.body,
    color: colors.soft,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: Spacing.xxl,
  },
  emptyTitle: {
    ...TextStyles.h3,
    color: colors.ink,
    marginTop: Spacing.lg,
  },
  emptySubtitle: {
    ...TextStyles.body,
    color: colors.soft,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  header: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  facilityName: {
    ...TextStyles.h2,
    color: colors.ink,
  },
  subtitle: {
    ...TextStyles.body,
    color: colors.soft,
    marginTop: Spacing.xs,
  },
  section: {
    padding: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...TextStyles.h4,
    color: colors.ink,
    marginBottom: Spacing.md,
  },
  availabilityCount: {
    ...TextStyles.caption,
    color: colors.grass,
    fontWeight: '600',
  },
  courtList: {
    flexDirection: 'row',
  },
  courtCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    marginRight: Spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    minWidth: 140,
  },
  courtCardSelected: {
    borderColor: colors.grass,
    backgroundColor: colors.chalk,
  },
  courtCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  courtName: {
    ...TextStyles.bodyLarge,
    fontWeight: '600',
    color: colors.ink,
  },
  courtNameSelected: {
    color: colors.grass,
  },
  courtSportType: {
    ...TextStyles.caption,
    color: colors.soft,
    marginTop: Spacing.xs,
  },
  courtPrice: {
    ...TextStyles.body,
    color: colors.grass,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },
  calendar: {
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  loadingSlotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  loadingSlotsText: {
    ...TextStyles.body,
    color: colors.soft,
  },
  noSlotsContainer: {
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  noSlotsText: {
    ...TextStyles.body,
    color: colors.soft,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  legend: {
    padding: Spacing.lg,
    backgroundColor: colors.surface,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: 12,
  },
  legendTitle: {
    ...TextStyles.bodyLarge,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: Spacing.sm,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    ...TextStyles.body,
    color: colors.ink,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  selectedSlotInfo: {
    marginBottom: Spacing.md,
  },
  selectedSlotLabel: {
    ...TextStyles.caption,
    color: colors.soft,
  },
  selectedSlotTime: {
    ...TextStyles.h4,
    color: colors.ink,
    marginTop: Spacing.xs,
  },
  selectedSlotPrice: {
    ...TextStyles.body,
    color: colors.grass,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },
  bookButton: {
    ...ComponentStyles.button.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  bookButtonText: {
    ...TextStyles.bodyLarge,
    fontWeight: '600',
    color: colors.chalk,
  },
});
